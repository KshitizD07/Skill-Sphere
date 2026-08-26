import { PrismaClient } from '@prisma/client';
import cache from '../utils/cache.js';
import { ApiError } from '../utils/errorHandler.js';
import * as aiService from './aiService.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// ── Public skill / role catalogue — cached aggressively (rarely changes) ─────
export async function getAllSkills() {
  return cache.getOrSet('catalogue:skills', 3600, async () => {
    const rows = await prisma.jobRoleSkill.findMany({
      select: { skillName: true },
      distinct: ['skillName'],
      orderBy: { skillName: 'asc' },
    });
    const unique = [...new Set(rows.map((r) => r.skillName))].sort();
    return unique.map((name, i) => ({ id: String(i + 1), name }));
  });
}

export async function getAllRoles() {
  return cache.getOrSet('catalogue:roles', 3600, () =>
    prisma.jobRole.findMany({
      select: { id: true, title: true, description: true },
      orderBy: { title: 'asc' },
    })
  );
}

// ── User Skills Management ───────────────────────────────────────────────────

/**
 * Returns all skills for a user ordered by verification status and score.
 */
export async function getUserSkills(userId) {
  return prisma.skill.findMany({
    where: { userId },
    orderBy: [
      { isVerified: 'desc' },
      { calculatedScore: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Adds an unverified skill to user's profile (max 20 skills per user).
 */
export async function addUserSkill(userId, { name, level = 'Beginner', showLevel = true }) {
  if (!name || !name.trim()) throw ApiError.badRequest('Skill name is required');
  const skillName = name.trim();

  // Enforce 20 skills limit
  const currentCount = await prisma.skill.count({ where: { userId } });
  if (currentCount >= 20) {
    throw ApiError.badRequest('Maximum 20 skills allowed per profile.');
  }

  const existing = await prisma.skill.findUnique({
    where: { userId_name: { userId, name: skillName } },
  });

  if (existing) {
    throw ApiError.conflict(`Skill '${skillName}' is already on your profile.`);
  }

  const newSkill = await prisma.skill.create({
    data: {
      userId,
      name: skillName,
      level: level || 'Beginner',
      isVerified: false,
      showLevel: !!showLevel,
    },
  });

  await cache.del(`user:profile:${userId}`);
  return newSkill;
}

/**
 * Deletes a skill owned by the user.
 */
export async function deleteUserSkill(userId, skillId) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, userId },
  });

  if (!skill) throw ApiError.notFound('Skill');

  await prisma.skill.delete({ where: { id: skillId } });
  await cache.del(`user:profile:${userId}`);

  return { success: true, message: `Skill '${skill.name}' removed.` };
}

/**
 * Top verified users for a given skill (Leaderboard).
 */
export async function getSkillLeaderboard(skillName, limit = 10) {
  if (!skillName?.trim()) return [];
  const normalized = skillName.trim();

  const cacheKey = `leaderboard:skill:${normalized.toLowerCase()}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const topSkills = await prisma.skill.findMany({
    where: {
      name: { equals: normalized, mode: 'insensitive' },
      isVerified: true,
      calculatedScore: { not: null, gt: 0 },
    },
    orderBy: [
      { calculatedScore: 'desc' },
      { verifiedAt: 'desc' },
    ],
    take: Math.min(Number(limit) || 10, 50),
    select: {
      id: true,
      name: true,
      level: true,
      calculatedScore: true,
      verificationSource: true,
      verificationUrl: true,
      verifiedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
          college: true,
          role: true,
          github: true,
        },
      },
    },
  });

  const leaderboard = topSkills.map((s, idx) => ({
    rank: idx + 1,
    skillId: s.id,
    skillName: s.name,
    level: s.level,
    score: s.calculatedScore,
    verifiedAt: s.verifiedAt,
    verificationSource: s.verificationSource,
    verificationUrl: s.verificationUrl,
    user: s.user,
  }));

  // Cache leaderboard for 5 minutes
  await cache.set(cacheKey, leaderboard, 300);
  return leaderboard;
}

// ── Dynamic Role Resolution ───────────────────────────────────────────────────
export async function getOrCreateRole(roleIdentifier, forceRegenerate = false) {
  let role = await prisma.jobRole.findFirst({
    where: { OR: [{ id: roleIdentifier }, { title: { equals: roleIdentifier, mode: 'insensitive' } }] },
    include: { skills: { select: { skillName: true, importance: true } } },
  });

  if (!role || forceRegenerate) {
    const existingSkillsList = await getAllSkills();
    const existingSkillNames = existingSkillsList.map((s) => s.name);

    const generatedRole = await aiService.generateRoleRequirements(role ? role.title : roleIdentifier, existingSkillNames);
    
    if (role) {
      await prisma.jobRoleSkill.deleteMany({ where: { jobRoleId: role.id } });
      role = await prisma.jobRole.update({
        where: { id: role.id },
        data: {
          description: generatedRole.description,
          skills: {
            create: generatedRole.skills.map((s) => ({
              skillName: s.name,
              importance: s.importance,
            })),
          },
        },
        include: { skills: { select: { skillName: true, importance: true } } },
      });
    } else {
      role = await prisma.jobRole.create({
        data: {
          title: generatedRole.title,
          description: generatedRole.description,
          skills: {
            create: generatedRole.skills.map((s) => ({
              skillName: s.name,
              importance: s.importance,
            })),
          },
        },
        include: { skills: { select: { skillName: true, importance: true } } },
      });
    }
    
    await cache.del('catalogue:roles');
    await cache.del('catalogue:skills');
  }

  return role;
}

// ── Skill gap analysis ────────────────────────────────────────────────────────
export async function analyzeSkillGap(userId, roleIdOrName, forceRegenerate = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: { select: { name: true, isVerified: true, calculatedScore: true } } },
  });

  if (!user) throw ApiError.notFound('User');
  const role = await getOrCreateRole(roleIdOrName, forceRegenerate);

  const userSkillsMap = new Map(user.skills.map((s) => [s.name.toLowerCase(), s]));

  let totalWeight = 0;
  let earnedScore = 0;
  const missingSkills = [];

  for (const rs of role.skills) {
    const weight = rs.importance === 'Required' ? 1.0 : 0.5;
    totalWeight += weight;

    const userSkill = userSkillsMap.get(rs.skillName.toLowerCase());
    
    if (userSkill) {
      let coefficient = 0.4;
      if (userSkill.isVerified) {
        coefficient = 1.0;
        if (userSkill.calculatedScore >= 8) coefficient = 1.1;
      }
      earnedScore += (weight * coefficient);
    } else {
      if (rs.importance === 'Required') {
        missingSkills.push({ id: rs.skillName, name: rs.skillName });
      }
    }
  }

  const rawPercentage = (earnedScore / (totalWeight || 1)) * 100;
  const score = Math.min(100, Math.round(rawPercentage));

  const diagnosticReport = await aiService.generateDiagnosticReport({
    role: role.title,
    currentScore: score,
    missingSkills,
    verifiedSkills: user.skills.filter((s) => s.isVerified && userSkillsMap.has(s.name.toLowerCase())),
  });

  return { role: role.title, score, missingSkills, userSkills: user.skills, diagnosticReport };
}

// ── Update user skills (bulk replace unverified) ──────────────────────────────
export async function updateUserSkills(userId, skillIds) {
  await prisma.skill.deleteMany({ where: { userId, isVerified: false, verificationUrl: null } });

  if (skillIds.length === 0) return { count: 0 };

  const catalogue = await getAllSkills();
  const idToName = Object.fromEntries(catalogue.map((s) => [s.id, s.name]));

  const toCreate = skillIds.map((id) => ({
    userId,
    name: idToName[id] || id,
    level: 'Beginner',
    isVerified: false,
    showLevel: true,
  }));

  await prisma.skill.createMany({ data: toCreate, skipDuplicates: true });
  await cache.del(`user:profile:${userId}`);

  return { count: toCreate.length };
}

// ── Find mentors for a skill ──────────────────────────────────────────────────
export async function getMentors(skillName) {
  return cache.getOrSet(`mentors:${skillName.toLowerCase()}`, 300, () =>
    prisma.user.findMany({
      where: {
        role: 'PROFESSIONAL',
        github: { not: null },
        NOT: { github: '' },
        skills: { some: { name: { equals: skillName, mode: 'insensitive' }, isVerified: true } },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        headline: true,
        college: true,
        role: true,
        skills: {
          where: { name: { equals: skillName, mode: 'insensitive' } },
          select: { calculatedScore: true, level: true },
        },
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    })
  );
}
