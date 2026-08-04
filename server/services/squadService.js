import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import gatekeeper from './gatekeeper.js';
import matchOrchestrator from './matchOrchestrator.js';
import decisionLogger from './decisionLogger.js';

const prisma = new PrismaClient();

// ── Reusable select shape ─────────────────────────────────────────────────────
const SQUAD_SELECT = {
  id: true, title: true, description: true, event: true,
  visibility: true, maxMembers: true, currentMembers: true, status: true,
  createdAt: true, expiresAt: true,
  leader: { select: { id: true, name: true, avatar: true, college: true } },
  slots:  { select: { id: true, roleTitle: true, requiredSkill: true, minScore: true, requireVerified: true, status: true, filledBy: true, position: true }, orderBy: { position: 'asc' } },
  _count: { select: { applications: true } },
};

// ── Create squad ──────────────────────────────────────────────────────────────
export async function createSquad({ title, description, event, maxMembers = 4, visibility = 'PUBLIC', slots = [] }, leaderId) {
  if (!title?.trim())       throw ApiError.badRequest('Title is required');
  if (title.trim().length < 3 || title.trim().length > 200) throw ApiError.badRequest('Title must be 3-200 characters');
  if (!description?.trim()) throw ApiError.badRequest('Description is required');
  if (description.trim().length < 10 || description.trim().length > 5000) throw ApiError.badRequest('Description must be 10-5000 characters');
  if (slots.length > 10)    throw ApiError.badRequest('Maximum 10 slots per squad');

  const squad = await prisma.squad.create({
    data: {
      title:       title.trim(),
      description: description.trim(),
      event:       event?.trim() || null,
      maxMembers,
      visibility,
      leaderId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      slots: {
        create: slots.map((s, i) => ({
          roleTitle:      s.roleTitle || 'Member',
          requiredSkill:  s.requiredSkill || null,
          minScore:       Math.min(10, Math.max(0, s.minScore || 0)),
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

// ── Feed ──────────────────────────────────────────────────────────────────────
export async function getFeed({ skill, maxScore, page = 1, limit = 12 } = {}) {
  const where = {
    status: 'OPEN',
    ...(skill    && { slots: { some: { requiredSkill: { contains: skill, mode: 'insensitive' } } } }),
    ...(maxScore && { slots: { some: { minScore: { lte: parseInt(maxScore) } } } }),
  };

  const [squads, total] = await Promise.all([
    prisma.squad.findMany({ where, select: SQUAD_SELECT, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.squad.count({ where }),
  ]);

  return { squads, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── Single squad ──────────────────────────────────────────────────────────────
export async function getSquad(squadId) {
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
              skills: { select: { id: true, name: true, isVerified: true, calculatedScore: true } },
            },
          },
          slot: { select: { id: true, roleTitle: true, requiredSkill: true } },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!squad) throw ApiError.notFound('Squad');
  return squad;
}

// ── Gatekeeper: check if user qualifies for a squad ──────────────────────────
export async function checkQualification(squadId, userId) {
  const [squad, user] = await Promise.all([
    prisma.squad.findUnique({ where: { id: squadId }, include: { slots: { where: { status: 'OPEN' } } } }),
    prisma.user.findUnique({ where: { id: userId }, include: { skills: true } }),
  ]);

  if (!squad) throw ApiError.notFound('Squad');
  if (!user)  throw ApiError.notFound('User');
  if (squad.status !== 'OPEN')           return { qualifies: false, reason: 'Squad is not open' };
  if (squad.currentMembers >= squad.maxMembers) return { qualifies: false, reason: 'Squad is full' };

  // User qualifies if they can fill at least one open slot
  for (const slot of squad.slots) {
    if (!slot.requiredSkill || slot.minScore === 0) {
      return { qualifies: true, matchScore: 5, slotId: slot.id };
    }

    const userSkill = user.skills.find((s) => s.name.toLowerCase() === slot.requiredSkill.toLowerCase());
    if (!userSkill) continue;
    if (slot.requireVerified && !userSkill.isVerified) continue;

    const score = userSkill.calculatedScore ?? 5;
    if (score >= slot.minScore) return { qualifies: true, matchScore: score, slotId: slot.id };
  }

  return { qualifies: false, reason: 'Score too low or missing required skill' };
}

// ── Apply to squad (with Gatekeeper + Antifragile AI) ─────────────────────────
export async function applyToSquad(squadId, userId, message, slotId = null) {
  // Step 1: Gatekeeper check
  const gate = await gatekeeper.checkEligibility(userId, squadId, slotId);
  if (!gate.allowed) throw ApiError.forbidden(gate.reason || 'You do not qualify for this squad');

  // Step 2: Duplicate check
  const existing = await prisma.squadApplication.findUnique({
    where: { squadId_userId: { squadId, userId } },
  });
  if (existing) {
    if (existing.status === 'PENDING') throw ApiError.conflict('Application already pending');
    if (existing.status === 'ACCEPTED') throw ApiError.conflict('Already a member of this squad');
    // If rejected or withdrawn, delete the old application to allow re-application
    await prisma.squadApplication.delete({ where: { id: existing.id } });
  }

  // Step 3: Antifragile matching (graceful fallback if engine fails)
  let matchResult = null;
  try {
    matchResult = await matchOrchestrator.matchCandidatesForSlot(
      squadId, gate.slot.id, [userId]
    );
  } catch (err) {
    logger.warn('Antifragile matching failed, proceeding with gatekeeper score', { err: err.message });
  }

  // Step 4: Create application with AI results
  const application = await prisma.squadApplication.create({
    data: {
      squadId,
      userId,
      slotId: gate.slot.id,
      message: message?.trim() || null,
      matchScore: matchResult?.explanation?.confidence
        ? Math.round(matchResult.explanation.confidence * 10)
        : gate.matchScore || 5,
      matchDecisionId: matchResult?.decisionId || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'SQUAD_APPLIED', details: `Applied to squad ${squadId}` },
  });

  // Step 5: Notify squad leader
  try {
    const [squad, user] = await Promise.all([
      prisma.squad.findUnique({ where: { id: squadId }, select: { title: true, leaderId: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } }),
    ]);

    if (squad && user) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: squad.leaderId,
          type: 'SQUAD_APPLICATION',
          title: 'New Application',
          message: `${user.name} applied for ${gate.slot.role} in ${squad.title}`,
          actionUrl: `/squad/${squadId}/manage`,
          senderAvatar: user.avatar,
        },
      });

      // Emit real-time notification if socket available
      try {
        const { getIO } = await import('../socket.js');
        getIO().to(squad.leaderId).emit('NOTIFICATION', notif);
      } catch { /* socket not available */ }
    }
  } catch (err) {
    logger.warn('Failed to send application notification', { err: err.message });
  }

  logger.info('Application submitted', { squadId, userId, slotId: gate.slot.id, matchScore: application.matchScore });
  return { ...application, explanation: matchResult?.explanation || null };
}

// ── Update application status (leader only) ───────────────────────────────────
export async function updateApplicationStatus(squadId, applicationId, status, leaderId) {
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad)                      throw ApiError.notFound('Squad');
  if (squad.leaderId !== leaderId) throw ApiError.forbidden('Only the squad leader can manage applications');

  const existingApp = await prisma.squadApplication.findUnique({ where: { id: applicationId } });
  if (!existingApp) throw ApiError.notFound('Application');
  if (existingApp.status !== 'PENDING') {
    throw ApiError.badRequest(`Application is already ${existingApp.status.toLowerCase()}`);
  }

  const application = await prisma.squadApplication.update({
    where:   { id: applicationId },
    data:    { status, decidedAt: new Date() },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  if (status === 'ACCEPTED') {
    await prisma.squad.update({ where: { id: squadId }, data: { currentMembers: { increment: 1 } } });

    // Fill the specific slot if application was slot-targeted
    if (application.slotId) {
      await prisma.squadSlot.update({
        where: { id: application.slotId },
        data:  { status: 'FILLED', filledBy: application.userId },
      });
    }

    // Auto-close if the squad is now full
    const updated = await prisma.squad.findUnique({ where: { id: squadId } });
    if (updated.currentMembers >= updated.maxMembers) {
      await prisma.squad.update({ where: { id: squadId }, data: { status: 'FULL' } });
    }
  }

  // Log outcome for antifragile learning
  if (application.matchDecisionId) {
    try {
      const minutesSinceApplication = Math.round(
        (Date.now() - application.appliedAt.getTime()) / 60000
      );
      await decisionLogger.logOutcome(application.matchDecisionId, {
        accepted: status === 'ACCEPTED',
        timeToDecision: minutesSinceApplication,
      });
    } catch (err) {
      logger.warn('Failed to log match outcome', { err: err.message });
    }
  }

  // Notify applicant of decision
  try {
    const notif = await prisma.inAppNotification.create({
      data: {
        userId: application.userId,
        type: status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
        title: status === 'ACCEPTED' ? 'Application Accepted!' : 'Application Update',
        message: status === 'ACCEPTED'
          ? `You've been accepted to ${squad.title}!`
          : `Your application to ${squad.title} was not selected.`,
        actionUrl: `/squad/${squadId}`,
      },
    });

    try {
      const { getIO } = await import('../socket.js');
      getIO().to(application.userId).emit('NOTIFICATION', notif);
    } catch { /* socket not available */ }
  } catch (err) {
    logger.warn('Failed to send decision notification', { err: err.message });
  }

  return application;
}

// ── My squads (led or applied to) ────────────────────────────────────────────
export async function getMySquads(userId) {
  const [led, applied] = await Promise.all([
    prisma.squad.findMany({ where: { leaderId: userId }, select: SQUAD_SELECT, orderBy: { createdAt: 'desc' } }),
    prisma.squadApplication.findMany({
      where: { userId },
      include: {
        squad: { select: SQUAD_SELECT },
        slot: { select: { id: true, roleTitle: true, requiredSkill: true } },
      },
      orderBy: { appliedAt: 'desc' },
    }),
  ]);

  return { led, applications: applied };
}

// ── My applications (dedicated endpoint) ──────────────────────────────────────
export async function getMyApplications(userId) {
  return prisma.squadApplication.findMany({
    where: { userId },
    include: {
      squad: {
        select: {
          id: true, title: true, status: true, event: true,
          leader: { select: { id: true, name: true, avatar: true } },
        },
      },
      slot: { select: { id: true, roleTitle: true, requiredSkill: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });
}