import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';

const prisma = new PrismaClient();
let genAI = null;

// Lazy-init client — avoids crashing at startup when key is missing
function getClient() {
  if (!genAI) {
    if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI service not configured (missing GOOGLE_API_KEY)');
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

// ── Default standard industry roles if database is empty ──────────────────────
export const DEFAULT_JOB_ROLES = [
  {
    title: 'Frontend Developer',
    description: 'Builds scalable, responsive, and high-performance user interfaces and web applications.',
    skills: [
      { name: 'JavaScript', importance: 'Required' },
      { name: 'TypeScript', importance: 'Required' },
      { name: 'React', importance: 'Required' },
      { name: 'HTML5', importance: 'Required' },
      { name: 'CSS3', importance: 'Required' },
      { name: 'Next.js', importance: 'Nice to have' },
      { name: 'Tailwind CSS', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Backend Developer',
    description: 'Architects robust server systems, APIs, database schemas, and microservices.',
    skills: [
      { name: 'Node.js', importance: 'Required' },
      { name: 'Python', importance: 'Required' },
      { name: 'PostgreSQL', importance: 'Required' },
      { name: 'REST APIs', importance: 'Required' },
      { name: 'Docker', importance: 'Required' },
      { name: 'Redis', importance: 'Nice to have' },
      { name: 'System Design', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Full Stack Developer',
    description: 'End-to-end web engineering across client interfaces, backend servers, and databases.',
    skills: [
      { name: 'JavaScript', importance: 'Required' },
      { name: 'TypeScript', importance: 'Required' },
      { name: 'React', importance: 'Required' },
      { name: 'Node.js', importance: 'Required' },
      { name: 'PostgreSQL', importance: 'Required' },
      { name: 'Docker', importance: 'Nice to have' },
      { name: 'GraphQL', importance: 'Nice to have' },
    ],
  },
  {
    title: 'DevOps / Cloud Engineer',
    description: 'Automates CI/CD pipelines, provisions cloud infrastructure, and manages container orchestration.',
    skills: [
      { name: 'Docker', importance: 'Required' },
      { name: 'Kubernetes', importance: 'Required' },
      { name: 'AWS', importance: 'Required' },
      { name: 'CI/CD', importance: 'Required' },
      { name: 'Linux', importance: 'Required' },
      { name: 'Terraform', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Machine Learning Engineer',
    description: 'Develops, trains, and deploys predictive statistical and neural network models.',
    skills: [
      { name: 'Python', importance: 'Required' },
      { name: 'PyTorch', importance: 'Required' },
      { name: 'Machine Learning', importance: 'Required' },
      { name: 'Data Analysis', importance: 'Required' },
      { name: 'Docker', importance: 'Nice to have' },
      { name: 'SQL', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Data Engineer',
    description: 'Designs and builds large-scale data pipelines, ETL workflows, and data warehousing systems.',
    skills: [
      { name: 'Python', importance: 'Required' },
      { name: 'SQL', importance: 'Required' },
      { name: 'PostgreSQL', importance: 'Required' },
      { name: 'Apache Spark', importance: 'Required' },
      { name: 'Docker', importance: 'Nice to have' },
      { name: 'AWS', importance: 'Nice to have' },
    ],
  },
];

// ── GET Job Roles ─────────────────────────────────────────────────────────────
export async function getJobRoles() {
  let dbRoles = await prisma.jobRole.findMany({
    include: { skills: true },
    orderBy: { title: 'asc' },
  });

  // Seed default roles if none exist
  if (dbRoles.length === 0) {
    for (const def of DEFAULT_JOB_ROLES) {
      await prisma.jobRole.create({
        data: {
          title: def.title,
          description: def.description,
          skills: {
            create: def.skills.map((s) => ({
              skillName: s.name,
              importance: s.importance,
            })),
          },
        },
      });
    }

    dbRoles = await prisma.jobRole.findMany({
      include: { skills: true },
      orderBy: { title: 'asc' },
    });
  }

  return dbRoles.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    requiredSkills: (r.skills || []).map((s) => ({
      skillName: s.skillName,
      importance: s.importance,
    })),
  }));
}

// ── GET Skill Gap Analysis ────────────────────────────────────────────────────
export async function getSkillGapAnalysis(userId, roleId) {
  if (!roleId) throw ApiError.badRequest('roleId is required');

  const [jobRole, user] = await Promise.all([
    prisma.jobRole.findUnique({
      where: { id: roleId },
      include: { skills: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { skills: true },
    }),
  ]);

  if (!jobRole) throw ApiError.notFound('Job role not found');
  if (!user) throw ApiError.notFound('User not found');

  const userSkillMap = new Map();
  for (const s of user.skills || []) {
    userSkillMap.set(s.name.toLowerCase(), {
      name: s.name,
      score: s.calculatedScore ?? 5,
      isVerified: !!s.isVerified,
      level: s.level,
    });
  }

  const existingSkills = [];
  const missingSkills = [];
  let totalScoreWeight = 0;
  let earnedScoreWeight = 0;

  for (const reqSkill of jobRole.skills) {
    const isRequired = reqSkill.importance === 'Required';
    const weight = isRequired ? 1.0 : 0.5;
    totalScoreWeight += weight * 10;

    const userSkill = userSkillMap.get(reqSkill.skillName.toLowerCase());

    if (userSkill && userSkill.score > 0) {
      const gap = Math.max(0, 10 - userSkill.score);
      earnedScoreWeight += weight * userSkill.score;
      existingSkills.push({
        skillName: reqSkill.skillName,
        userScore: userSkill.score,
        isVerified: userSkill.isVerified,
        importance: reqSkill.importance,
        gap,
      });
    } else {
      missingSkills.push({
        skillName: reqSkill.skillName,
        importance: reqSkill.importance,
        reason: isRequired ? 'Core required skill for this role' : 'Valuable secondary differentiator',
      });
    }
  }

  const overallReadiness = totalScoreWeight > 0
    ? Math.min(100, Math.round((earnedScoreWeight / totalScoreWeight) * 100))
    : 0;

  return {
    role: {
      id: jobRole.id,
      title: jobRole.title,
      description: jobRole.description,
    },
    existingSkills,
    missingSkills,
    overallReadiness,
  };
}

// ── POST AI Roadmap Generation & Persistence ───────────────────────────────────
export async function generateRoadmap({ skill, role, currentScore, existingSkills = [], userId = null }) {
  if (!skill?.trim() || !role?.trim()) throw ApiError.badRequest('Skill and role are required');

  const targetSkill = skill.trim();
  const targetRole = role.trim();

  // Check 24hr cache if userId is present
  const cacheKey = `ai:roadmap:${userId || 'anon'}:${targetRole.toLowerCase()}:${targetSkill.toLowerCase()}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
    };
  }

  const model = getClient().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

  // Proficiency classification
  let proficiencyText;
  if (currentScore === 0) proficiencyText = '0/10 (Absolute Beginner)';
  else if (currentScore <= 4) proficiencyText = `${currentScore}/10 (Beginner+)`;
  else if (currentScore <= 7) proficiencyText = `${currentScore}/10 (Intermediate)`;
  else proficiencyText = `${currentScore}/10 (Advanced)`;

  const verifiedSkillsList = existingSkills.length > 0
    ? existingSkills.map((s) => `${s.name} (${s.calculatedScore || 5}/10)`).join(', ')
    : 'None yet';

  const prompt = `You are a senior engineering mentor creating a personalized learning roadmap.

STUDENT CONTEXT:
- Target Role: ${targetRole}
- Skill to Learn: ${targetSkill}
- Current Skill Score: ${proficiencyText}
- Current Verified Skills: ${verifiedSkillsList}

INSTRUCTIONS:
1. Skip topics the student already knows from their existing skill set
2. Use analogies to their known technologies where helpful (e.g. if they know Python, relate backend concepts to Python paradigms)
3. Structure your response in clean Markdown with these exact sections:
   # ${targetSkill} Mastery Roadmap for ${targetRole}
   ## Overview
   (Brief synopsis and realistic timeline)
   ## Week 1–2: Foundations & Core Paradigms
   (4-6 actionable bullet points, including a designated "Quick Win" mini-project)
   ## Week 3–4: Production-Grade Integration
   (4-6 actionable bullet points with architectural best practices)
   ## Week 5–8: Capstone Project & Applied Mastery
   (4-6 actionable bullet points tailored specifically for a ${targetRole})
   ## Key Resources
   (List 3 free + 2 paid high-quality courses/docs with URLs)
   ## Readiness Checklist
   (3-5 milestone verification tasks)
4. Be specific: name actual tools, libraries, architectural patterns, and projects to build.

FORMAT: Return clean Markdown only. No preamble.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (!text) throw ApiError.internal('AI returned empty response');

    let savedRoadmap = null;
    if (userId) {
      // Save or update in database
      savedRoadmap = await prisma.roadmap.create({
        data: {
          userId,
          targetRole,
          targetSkill,
          content: text,
          progress: 0,
          completedItems: [],
        },
      });
    }

    const responsePayload = {
      roadmap: savedRoadmap || {
        targetRole,
        targetSkill,
        content: text,
        progress: 0,
        completedItems: [],
      },
      roadmapMarkdown: text,
      cacheHit: false,
      generatedAt: new Date(),
    };

    // Cache for 24 hours (86400 seconds)
    await cache.set(cacheKey, responsePayload, 86400);
    logger.info('Roadmap generated and persisted', { targetSkill, targetRole, userId });

    return responsePayload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error('Gemini roadmap generation error', { err: err.message });
    throw ApiError.internal('AI generation failed — please try again shortly');
  }
}

// ── GET User Roadmaps ─────────────────────────────────────────────────────────
export async function getUserRoadmaps(userId) {
  return prisma.roadmap.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      targetRole: true,
      targetSkill: true,
      progress: true,
      completedItems: true,
      shareToken: true,
      generatedAt: true,
      updatedAt: true,
    },
  });
}

// ── GET Single Roadmap by ID ──────────────────────────────────────────────────
export async function getRoadmapById(roadmapId, userId) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
  });

  if (!roadmap) throw ApiError.notFound('Roadmap not found');
  if (roadmap.userId !== userId) throw ApiError.forbidden('Access denied to this roadmap');

  return roadmap;
}

// ── PUT Update Roadmap Progress ───────────────────────────────────────────────
export async function updateRoadmapProgress(roadmapId, completedItems, userId) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
  });

  if (!roadmap) throw ApiError.notFound('Roadmap not found');
  if (roadmap.userId !== userId) throw ApiError.forbidden('Access denied to this roadmap');

  const items = Array.isArray(completedItems) ? completedItems : [];
  
  // Count total milestone bullet points in markdown (lines starting with - [ ] or - or *)
  const totalBulletMatches = roadmap.content.match(/^\s*[-*]\s+/gm) || [];
  const estimatedTotal = Math.max(5, totalBulletMatches.length);
  const calculatedProgress = Math.min(100, Math.round((items.length / estimatedTotal) * 100));

  const updated = await prisma.roadmap.update({
    where: { id: roadmapId },
    data: {
      completedItems: items,
      progress: calculatedProgress,
    },
  });

  return updated;
}

// ── GET Share Token ───────────────────────────────────────────────────────────
export async function generateShareToken(roadmapId, userId) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
  });

  if (!roadmap) throw ApiError.notFound('Roadmap not found');
  if (roadmap.userId !== userId) throw ApiError.forbidden('Access denied to this roadmap');

  if (roadmap.shareToken) {
    return {
      shareToken: roadmap.shareToken,
      shareUrl: `/roadmap/shared/${roadmap.shareToken}`,
    };
  }

  const token = crypto.randomBytes(12).toString('hex');
  const updated = await prisma.roadmap.update({
    where: { id: roadmapId },
    data: { shareToken: token },
  });

  return {
    shareToken: updated.shareToken,
    shareUrl: `/roadmap/shared/${updated.shareToken}`,
  };
}

// ── GET Public Shared Roadmap (Unauthenticated) ────────────────────────────────
export async function getSharedRoadmap(token) {
  if (!token) throw ApiError.badRequest('Share token is required');

  const roadmap = await prisma.roadmap.findUnique({
    where: { shareToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
        },
      },
    },
  });

  if (!roadmap) throw ApiError.notFound('Shared roadmap not found or expired');

  return {
    id: roadmap.id,
    targetRole: roadmap.targetRole,
    targetSkill: roadmap.targetSkill,
    content: roadmap.content,
    progress: roadmap.progress,
    completedItems: roadmap.completedItems,
    generatedAt: roadmap.generatedAt,
    creator: roadmap.user,
  };
}

export async function generateRoleRequirements(roleTitle, existingSkills = []) {
  if (!roleTitle?.trim()) throw ApiError.badRequest('Role title is required');
  
  const model = getClient().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
  
  const existingSkillsContext = existingSkills.length > 0
    ? `\nHere is a list of standard skills currently defined in our database catalogue: [${existingSkills.join(', ')}]. If any of these standard skills match the role requirements, use their exact names. `
    : '';

  const prompt = `You are an expert technical recruiter and engineering manager.
Define the standard industry requirements for the role of "${roleTitle}".

Respond ONLY with a valid JSON in exactly this format, with no markdown wrapping and no extra text.
Do not use markdown code blocks like \`\`\`json. Just output the raw JSON object.

{
  "title": "${roleTitle}",
  "description": "A 1-2 sentence description of this role.",
  "skills": [
    { "name": "Skill Name (e.g., Python)", "importance": "Required" },
    { "name": "Another Skill", "importance": "Required" },
    { "name": "Optional Skill", "importance": "Nice to have" }
  ]
}

Provide 5-8 highly relevant skills. Ensure 'importance' is exactly "Required" or "Nice to have".

CRITICAL INSTRUCTIONS FOR SKILL NAMES:
- The skill names must be atomic, standardized industry terms (e.g. "JavaScript", "Node.js", "Python", "React", "Docker", "SQL", "REST APIs", "Data Structures").
- For software engineering roles (e.g. Backend Developer, Frontend Developer, Full Stack), prioritize standard foundational languages and core pillars (such as JavaScript/TypeScript, Python, Node.js, SQL/Databases, REST APIs, Git, Data Structures).
- NEVER output generic grouping descriptions like "modern programming language like Python, Java, JS" or "frontend tools".
- Each skill name must represent a single technical skill, language, framework, tool, or engineering concept. ${existingSkillsContext}However, do not be biased towards only using this list — if the role requires other standard industry skills not present in this list, output them using their standard industry names.`;

  try {
    const result = await model.generateContent(prompt);
    let aiText = result.response.text().trim();
    if (aiText.startsWith('```json')) aiText = aiText.slice(7, -3).trim();
    if (aiText.startsWith('```')) aiText = aiText.slice(3, -3).trim();
    
    return JSON.parse(aiText);
  } catch (err) {
    logger.error('Gemini role generation error', { err: err.message });
    throw ApiError.internal('AI role generation failed.');
  }
}

export async function generateDiagnosticReport({ role, currentScore, missingSkills, verifiedSkills }) {
  const model = getClient().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

  const verifiedList = verifiedSkills.length > 0 ? verifiedSkills.map(s => `${s.name} (${s.calculatedScore}/10)`).join(', ') : 'None';
  const missingList = missingSkills.length > 0 ? missingSkills.map(s => s.name).join(', ') : 'None';

  const prompt = `Act as a technical career advisor. Write a short, encouraging 3-bullet diagnostic report for a user targeting the "${role}" role.
Their competency match score is ${currentScore}%.
Verified Skills (1-10): ${verifiedList}
Missing Core Skills: ${missingList}

Output format (Markdown):
- **Strengths:** [Highlight what they do well based on verified skills]
- **Vulnerability:** [Highlight the critical gap from missing skills]
- **Immediate Action:** [Give exactly 1 concrete next step, e.g. "We recommend verifying a repository with X"]

Keep it under 80 words total.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error('Gemini diagnostic report error', { err: err.message });
    return '- **Strengths:** Your profile is building up.\n- **Vulnerability:** You are missing some core skills.\n- **Immediate Action:** Start verifying your missing skills.';
  }
}
