import { PrismaClient } from '@prisma/client';
import cache from '../utils/cache.js';
import { ApiError } from '../utils/errorHandler.js';
import * as aiService from './aiService.js';
import { normalizeSkillCanonical } from '../utils/skillNormalizer.js';

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
  const skillName = normalizeSkillCanonical(name);

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

// ── Related skill families & aliases for intelligent matching ──────────────────
const SKILL_FAMILIES = {
  javascript: ['js', 'javascript', 'typescript', 'ts', 'node.js', 'nodejs', 'express', 'express.js', 'next.js', 'nextjs', 'react', 'react.js'],
  'node.js': ['nodejs', 'node.js', 'javascript', 'js', 'typescript', 'ts', 'express', 'express.js', 'nest.js', 'nestjs', 'backend development'],
  typescript: ['ts', 'typescript', 'javascript', 'js', 'node.js', 'nodejs'],
  python: ['py', 'python', 'django', 'fastapi', 'flask', 'backend development'],
  java: ['java', 'spring', 'spring boot', 'springboot', 'backend development'],
  'c++': ['cpp', 'c++', 'c', 'systems programming'],
  sql: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'database', 'databases', 'relational databases', 'database design'],
  postgresql: ['postgres', 'postgresql', 'sql', 'database', 'relational databases'],
  mysql: ['mysql', 'sql', 'database', 'relational databases'],
  mongodb: ['mongodb', 'mongo', 'nosql', 'database', 'mongoose'],
  nosql: ['nosql', 'mongodb', 'mongo', 'redis', 'dynamodb', 'cassandra', 'database'],
  react: ['react', 'react.js', 'reactjs', 'next.js', 'nextjs', 'frontend development'],
  docker: ['docker', 'containerization', 'containers', 'kubernetes', 'k8s', 'devops'],
  kubernetes: ['kubernetes', 'k8s', 'docker', 'devops', 'cloud'],
  aws: ['aws', 'amazon web services', 'cloud', 'cloud computing', 'devops', 'gcp', 'azure'],
  'rest apis': ['rest', 'rest api', 'rest apis', 'restful apis', 'api design', 'graphql', 'apis', 'api development'],
  graphql: ['graphql', 'api design', 'rest apis', 'apis'],
  git: ['git', 'github', 'version control', 'git/github'],
  'data structures': ['dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'problem solving'],
  algorithms: ['dsa', 'algorithms', 'data structures', 'data structures and algorithms', 'problem solving'],
  html: ['html', 'html5', 'frontend development', 'web development'],
  css: ['css', 'css3', 'tailwind', 'tailwindcss', 'frontend development'],
  pandas: ['pandas', 'numpy', 'python', 'data analysis', 'eda', 'data science'],
  'power bi': ['power bi', 'powerbi', 'dax', 'business intelligence', 'bi', 'tableau', 'data visualization'],
  tableau: ['tableau', 'power bi', 'business intelligence', 'bi', 'data visualization'],
  excel: ['excel', 'advanced excel', 'spreadsheets', 'vba', 'google sheets', 'data analysis'],
  figma: ['figma', 'ui/ux', 'ui/ux design', 'wireframing', 'prototyping', 'design systems', 'product design'],
};

function normalizeSkillName(name) {
  return (name || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\.js\b/g, '').trim();
}

function findMatchingUserSkill(requiredSkillName, userSkills = []) {
  const reqNormalized = (requiredSkillName || '').toLowerCase().trim();
  
  // 1. Direct exact match
  let matched = userSkills.find((s) => s.name.toLowerCase().trim() === reqNormalized);
  if (matched) return { skill: matched, matchType: 'EXACT' };

  // 2. Normalized / clean match (e.g. "React.js" vs "React", "Node.js" vs "Nodejs")
  const reqClean = normalizeSkillName(requiredSkillName);
  matched = userSkills.find((s) => normalizeSkillName(s.name) === reqClean);
  if (matched) return { skill: matched, matchType: 'EXACT' };

  // 3. Family / Synonym match (e.g. required "Node.js" and user has "JavaScript" or "TypeScript")
  for (const [canonical, aliases] of Object.entries(SKILL_FAMILIES)) {
    const isTargetInFamily = canonical === reqNormalized || reqNormalized.includes(canonical) || aliases.some(a => reqNormalized === a || reqNormalized.includes(a));
    if (isTargetInFamily) {
      const familyUserSkill = userSkills.find((s) => {
        const uName = s.name.toLowerCase().trim();
        return uName === canonical || aliases.some(a => uName === a || uName.includes(a));
      });
      if (familyUserSkill) {
        return { skill: familyUserSkill, matchType: 'FAMILY' };
      }
    }
  }

  // 4. Substring / Inclusion match (e.g. "REST APIs" vs "API", "Database Design" vs "SQL")
  matched = userSkills.find((s) => {
    const uName = s.name.toLowerCase().trim();
    return (reqNormalized.length > 3 && uName.includes(reqNormalized)) || (uName.length > 3 && reqNormalized.includes(uName));
  });
  if (matched) return { skill: matched, matchType: 'RELATED' };

  return null;
}

// ── Skill gap analysis ────────────────────────────────────────────────────────
export async function analyzeSkillGap(userId, roleIdOrName, forceRegenerate = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: { select: { name: true, isVerified: true, calculatedScore: true } } },
  });

  if (!user) throw ApiError.notFound('User');
  const role = await getOrCreateRole(roleIdOrName, forceRegenerate);

  let totalWeight = 0;
  let earnedScore = 0;
  const missingSkills = [];

  for (const rs of role.skills) {
    const weight = rs.importance === 'Required' ? 1.0 : 0.5;
    totalWeight += weight;

    const match = findMatchingUserSkill(rs.skillName, user.skills);
    
    if (match) {
      const userSkill = match.skill;
      const isFamilyOrRelated = match.matchType !== 'EXACT';

      let coefficient = isFamilyOrRelated ? 0.35 : 0.4;
      if (userSkill.isVerified) {
        coefficient = isFamilyOrRelated ? 0.95 : 1.0;
        if (userSkill.calculatedScore >= 8) coefficient = isFamilyOrRelated ? 1.05 : 1.1;
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
    verifiedSkills: user.skills.filter((s) => s.isVerified),
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
    name: normalizeSkillCanonical(idToName[id] || id),
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
