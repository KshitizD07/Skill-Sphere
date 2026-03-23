const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/errorHandler');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// ── Squad select shape reused across queries ─────────────────────────────────
const SQUAD_SELECT = {
  id: true, title: true, description: true, event: true,
  visibility: true, maxMembers: true, currentMembers: true, status: true,
  createdAt: true, expiresAt: true,
  leader: { select: { id: true, name: true, avatar: true, college: true } },
  slots:   { select: { id: true, roleTitle: true, requiredSkill: true, minScore: true, requireVerified: true, status: true, filledBy: true, position: true }, orderBy: { position: 'asc' } },
  _count:  { select: { applications: true } },
};

// ── Create squad ─────────────────────────────────────────────────────────────
async function createSquad({ title, description, event, maxMembers = 4, visibility = 'PUBLIC', slots = [] }, leaderId) {
  if (!title?.trim())       throw ApiError.badRequest('Title is required');
  if (!description?.trim()) throw ApiError.badRequest('Description is required');

  const squad = await prisma.squad.create({
    data: {
      title:      title.trim(),
      description: description.trim(),
      event:      event?.trim() || null,
      maxMembers,
      visibility,
      leaderId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      slots: {
        create: slots.map((s, i) => ({
          roleTitle:      s.roleTitle || 'Member',
          requiredSkill:  s.requiredSkill || null,
          minScore:       s.minScore || 0,
          requireVerified: s.requireVerified || false,
          position:       i,
        })),
      },
    },
    include: { slots: true, leader: { select: { id: true, name: true, avatar: true } } },
  });

  await prisma.activityLog.create({
    data: { userId: leaderId, action: 'SQUAD_CREATED', details: `Created squad: ${title}` },
  });

  logger.info('Squad created', { squadId: squad.id, leaderId, title });
  return squad;
}

// ── Feed ─────────────────────────────────────────────────────────────────────
async function getFeed({ skill, maxScore, page = 1, limit = 12 } = {}) {
  const where = {
    status: 'OPEN',
    ...(skill && { slots: { some: { requiredSkill: { contains: skill, mode: 'insensitive' } } } }),
    ...(maxScore && { slots: { some: { minScore: { lte: parseInt(maxScore) } } } }),
  };

  const [squads, total] = await Promise.all([
    prisma.squad.findMany({
      where,
      select: SQUAD_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.squad.count({ where }),
  ]);

  return { squads, total, page, limit };
}

// ── Single squad ──────────────────────────────────────────────────────────────
async function getSquad(squadId) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: {
      leader:       { select: { id: true, name: true, avatar: true, college: true } },
      slots:        { orderBy: { position: 'asc' } },
      applications: {
        include: {
          user: {
            select: {
              id: true, name: true, avatar: true, college: true, role: true,
              skills: { select: { id: true, name: true, isVerified: true, calculatedScore: true, skill: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!squad) throw ApiError.notFound('Squad');
  return squad;
}

// ── Gatekeeper: check if user qualifies for a squad ─────────────────────────
async function checkQualification(squadId, userId) {
  const [squad, user] = await Promise.all([
    prisma.squad.findUnique({
      where: { id: squadId },
      include: { slots: { where: { status: 'OPEN' } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { skills: true },
    }),
  ]);

  if (!squad) throw ApiError.notFound('Squad');
  if (!user)  throw ApiError.notFound('User');
  if (squad.status !== 'OPEN') return { qualifies: false, reason: 'Squad is not open' };
  if (squad.currentMembers >= squad.maxMembers) return { qualifies: false, reason: 'Squad is full' };

  // Check each open slot — user qualifies if they can fill at least one
  const openSlots = squad.slots.filter((s) => s.status === 'OPEN');

  for (const slot of openSlots) {
    if (!slot.requiredSkill || slot.minScore === 0) {
      return { qualifies: true, matchScore: 5, slotId: slot.id };
    }

    const userSkill = user.skills.find(
      (s) => s.name.toLowerCase() === slot.requiredSkill.toLowerCase()
    );

    if (!userSkill) continue;
    if (slot.requireVerified && !userSkill.isVerified) continue;

    const score = userSkill.calculatedScore ?? 5;
    if (score >= slot.minScore) {
      return { qualifies: true, matchScore: score, slotId: slot.id };
    }
  }

  return { qualifies: false, reason: `Score too low or missing required skill` };
}

// ── Apply to squad ────────────────────────────────────────────────────────────
async function applyToSquad(squadId, userId, message) {
  const qual = await checkQualification(squadId, userId);
  if (!qual.qualifies) throw ApiError.forbidden(qual.reason || 'You do not qualify for this squad');

  const existing = await prisma.squadApplication.findUnique({
    where: { squadId_userId: { squadId, userId } },
  });
  if (existing) throw ApiError.conflict('You have already applied to this squad');

  const application = await prisma.squadApplication.create({
    data: { squadId, userId, message: message?.trim() || null, matchScore: qual.matchScore },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'SQUAD_APPLIED', details: `Applied to squad ${squadId}` },
  });

  return application;
}

// ── Update application status (leader only) ──────────────────────────────────
async function updateApplicationStatus(squadId, applicationId, status, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad)                 throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can manage applications');

  const application = await prisma.squadApplication.update({
    where: { id: applicationId },
    data:  { status, decidedAt: new Date() },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  if (status === 'ACCEPTED') {
    await prisma.squad.update({
      where: { id: squadId },
      data:  { currentMembers: { increment: 1 } },
    });

    // Auto-close if full
    const updated = await prisma.squad.findUnique({ where: { id: squadId } });
    if (updated.currentMembers >= updated.maxMembers) {
      await prisma.squad.update({ where: { id: squadId }, data: { status: 'FULL' } });
    }
  }

  return application;
}

// ── My squads (led or applied) ───────────────────────────────────────────────
async function getMySquads(userId) {
  const [led, applied] = await Promise.all([
    prisma.squad.findMany({
      where:   { leaderId: userId },
      select:  SQUAD_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.squadApplication.findMany({
      where:   { userId },
      include: { squad: { select: SQUAD_SELECT } },
      orderBy: { appliedAt: 'desc' },
    }),
  ]);

  return { led, applications: applied };
}

module.exports = {
  createSquad, getFeed, getSquad,
  checkQualification, applyToSquad,
  updateApplicationStatus, getMySquads,
};