const { PrismaClient } = require('@prisma/client');
const cache = require('../utils/cache');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// ── Public skill / role catalogue — cached aggressively (changes rarely) ────
async function getAllSkills() {
  return cache.getOrSet('catalogue:skills', 3600, async () => {
    // Pull from JobRoleSkill — clean seeded data, no user garbage
    const rows = await prisma.jobRoleSkill.findMany({
      select: { skillName: true },
      distinct: ['skillName'],
      orderBy: { skillName: 'asc' },
    });
    // Deduplicate and build catalogue with stable name-based IDs
    const unique = [...new Set(rows.map(r => r.skillName))].sort();
    return unique.map((name, i) => ({ id: String(i + 1), name }));
  });
}

async function getAllRoles() {
  return cache.getOrSet('catalogue:roles', 3600, async () => {
    return prisma.jobRole.findMany({
      select: { id: true, title: true, description: true },
      orderBy: { title: 'asc' },
    });
  });
}

// ── Skill gap analysis ───────────────────────────────────────────────────────
async function analyzeSkillGap(userId, roleId) {
  const [user, role] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { select: { name: true, isVerified: true, calculatedScore: true } } },
    }),
    prisma.jobRole.findUnique({
      where: { id: roleId },
      include: { skills: { select: { skillName: true, importance: true } } },
    }),
  ]);

  if (!user) throw ApiError.notFound('User');
  if (!role) throw ApiError.notFound('Role');

  const userSkillNames = new Set(user.skills.map((s) => s.name.toLowerCase()));
  const requiredSkills = role.skills.filter((s) => s.importance === 'Required');
  const totalRequired  = requiredSkills.length || 1;

  const missingSkills = requiredSkills
    .filter((rs) => !userSkillNames.has(rs.skillName.toLowerCase()))
    .map((rs) => ({ id: rs.skillName, name: rs.skillName }));

  const matchedCount = totalRequired - missingSkills.length;
  const score = Math.round((matchedCount / totalRequired) * 100);

  return {
    role:         role.title,
    score,
    matchedCount,
    totalRequired,
    missingSkills,
    userSkills:   user.skills,
  };
}

// ── Update user skills (bulk replace) ────────────────────────────────────────
async function updateUserSkills(userId, skillIds) {
  // skillIds are names in our system (the skill catalogue uses name as id)
  // Delete all current non-verified skills, keep verified ones
  await prisma.skill.deleteMany({
    where: { userId, isVerified: false },
  });

  if (skillIds.length === 0) return { count: 0 };

  // Look up actual skill names from the catalogue by id string
  const catalogue = await getAllSkills();
  const idToName  = Object.fromEntries(catalogue.map((s) => [s.id, s.name]));

  const toCreate = skillIds.map((id) => ({
    userId,
    name:       idToName[id] || id, // fallback: treat id as name
    level:      'Beginner',
    isVerified: false,
    showLevel:  true,
  }));

  await prisma.skill.createMany({ data: toCreate, skipDuplicates: true });

  // Invalidate user profile cache
  await cache.del(`user:profile:${userId}`);

  return { count: toCreate.length };
}

// ── Find mentors for a skill ─────────────────────────────────────────────────
async function getMentors(skillName) {
  const cacheKey = `mentors:${skillName.toLowerCase()}`;
  return cache.getOrSet(cacheKey, 300, async () => {
    return prisma.user.findMany({
      where: {
        role: 'ALUMNI',
        skills: {
          some: {
            name:       { equals: skillName, mode: 'insensitive' },
            isVerified: true,
          },
        },
      },
      select: {
        id:       true,
        name:     true,
        avatar:   true,
        headline: true,
        college:  true,
        role:     true,
        skills:   {
          where:  { name: { equals: skillName, mode: 'insensitive' } },
          select: { calculatedScore: true, level: true },
        },
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });
  });
}

module.exports = { getAllSkills, getAllRoles, analyzeSkillGap, updateUserSkills, getMentors };