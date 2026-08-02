import { PrismaClient } from '@prisma/client';
import cache from '../utils/cache.js';
import { ApiError } from '../utils/errorHandler.js';
import * as aiService from './aiService.js';

const prisma = new PrismaClient();

// ── Public skill / role catalogue — cached aggressively (rarely changes) ─────
export async function getAllSkills() {
  return cache.getOrSet('catalogue:skills', 3600, async () => {
    // Pull from the seeded JobRoleSkill table to avoid user-created noise
    const rows   = await prisma.jobRoleSkill.findMany({
      select:   { skillName: true },
      distinct: ['skillName'],
      orderBy:  { skillName: 'asc' },
    });
    const unique = [...new Set(rows.map((r) => r.skillName))].sort();
    return unique.map((name, i) => ({ id: String(i + 1), name }));
  });
}

export async function getAllRoles() {
  return cache.getOrSet('catalogue:roles', 3600, () =>
    prisma.jobRole.findMany({
      select:  { id: true, title: true, description: true },
      orderBy: { title: 'asc' },
    })
  );
}

// ── Dynamic Role Resolution ───────────────────────────────────────────────────
export async function getOrCreateRole(roleIdentifier) {
  let role = await prisma.jobRole.findFirst({
    where: { OR: [{ id: roleIdentifier }, { title: { equals: roleIdentifier, mode: 'insensitive' } }] },
    include: { skills: { select: { skillName: true, importance: true } } },
  });

  if (!role) {
    const existingSkillsList = await getAllSkills();
    const existingSkillNames = existingSkillsList.map(s => s.name);

    const generatedRole = await aiService.generateRoleRequirements(roleIdentifier, existingSkillNames);
    role = await prisma.jobRole.create({
      data: {
        title: generatedRole.title,
        description: generatedRole.description,
        skills: {
          create: generatedRole.skills.map(s => ({
            skillName: s.name,
            importance: s.importance
          }))
        }
      },
      include: { skills: { select: { skillName: true, importance: true } } },
    });
    await cache.del('catalogue:roles');
    await cache.del('catalogue:skills');
  }

  return role;
}

// ── Skill gap analysis ────────────────────────────────────────────────────────
export async function analyzeSkillGap(userId, roleIdOrName) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { skills: { select: { name: true, isVerified: true, calculatedScore: true } } },
  });

  if (!user) throw ApiError.notFound('User');
  const role = await getOrCreateRole(roleIdOrName);

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
    verifiedSkills: user.skills.filter(s => s.isVerified && userSkillsMap.has(s.name.toLowerCase()))
  });

  return { role: role.title, score, missingSkills, userSkills: user.skills, diagnosticReport };
}

// ── Update user skills (bulk replace unverified) ──────────────────────────────
export async function updateUserSkills(userId, skillIds) {
  await prisma.skill.deleteMany({ where: { userId, isVerified: false } });

  if (skillIds.length === 0) return { count: 0 };

  const catalogue = await getAllSkills();
  const idToName  = Object.fromEntries(catalogue.map((s) => [s.id, s.name]));

  const toCreate = skillIds.map((id) => ({
    userId,
    name:       idToName[id] || id,
    level:      'Beginner',
    isVerified: false,
    showLevel:  true,
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
        role:   'ALUMNI',
        skills: { some: { name: { equals: skillName, mode: 'insensitive' }, isVerified: true } },
      },
      select: {
        id: true, name: true, avatar: true, headline: true, college: true, role: true,
        skills: {
          where:  { name: { equals: skillName, mode: 'insensitive' } },
          select: { calculatedScore: true, level: true },
        },
      },
      take:    10,
      orderBy: { createdAt: 'asc' },
    })
  );
}