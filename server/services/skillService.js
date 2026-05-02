import { PrismaClient } from '@prisma/client';
import cache from '../utils/cache.js';
import { ApiError } from '../utils/errorHandler.js';

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

// ── Skill gap analysis ────────────────────────────────────────────────────────
export async function analyzeSkillGap(userId, roleId) {
  const [user, role] = await Promise.all([
    prisma.user.findUnique({
      where:   { id: userId },
      include: { skills: { select: { name: true, isVerified: true, calculatedScore: true } } },
    }),
    prisma.jobRole.findUnique({
      where:   { id: roleId },
      include: { skills: { select: { skillName: true, importance: true } } },
    }),
  ]);

  if (!user) throw ApiError.notFound('User');
  if (!role) throw ApiError.notFound('Role');

  const userSkillNames = new Set(user.skills.map((s) => s.name.toLowerCase()));
  const requiredSkills = role.skills.filter((s) => s.importance === 'Required');
  const totalRequired  = requiredSkills.length || 1;

  const missingSkills  = requiredSkills
    .filter((rs) => !userSkillNames.has(rs.skillName.toLowerCase()))
    .map((rs) => ({ id: rs.skillName, name: rs.skillName }));

  const matchedCount = totalRequired - missingSkills.length;
  const score        = Math.round((matchedCount / totalRequired) * 100);

  return { role: role.title, score, matchedCount, totalRequired, missingSkills, userSkills: user.skills };
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