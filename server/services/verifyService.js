import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendNotification } from '../utils/notify.js';

const prisma = new PrismaClient();

// Language key normalisation map for common aliases
const LANGUAGE_MAP = {
  javascript: 'JavaScript', js:  'JavaScript',
  typescript: 'TypeScript', ts:  'TypeScript',
  python:     'Python',     py:  'Python',
  java:       'Java',
  go:         'Go',
  rust:       'Rust',
  cpp:        'C++',        'c++': 'C++',
  c:          'C',
  ruby:       'Ruby',       rb:  'Ruby',
  swift:      'Swift',
  kotlin:     'Kotlin',
};

function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '');
    const u       = new URL(cleaned);
    if (u.hostname !== 'github.com') return null;
    const parts   = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function fetchFileContent(owner, repo, branch, path) {
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
  return res.ok ? await res.text() : null;
}

export async function verifySkill({ userId, skillName, repoUrl, showLevel }) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) throw ApiError.badRequest('Invalid GitHub repository URL');

  const normalized = LANGUAGE_MAP[skillName.toLowerCase()] || skillName;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  });

  const authToken = user?.githubAccessToken || process.env.GITHUB_TOKEN;

  const headers = {
    Accept:       'application/vnd.github+json',
    'User-Agent': 'SkillSphere-Verifier',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };

  // ── Fetch repo metadata ───────────────────────────────────────────────────
  let repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });

  // Fallback to unauthenticated fetch if token was invalid/expired (for public repos)
  if (repoRes.status === 401 && headers.Authorization) {
    delete headers.Authorization;
    repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });
  }

  if (repoRes.status === 404) throw ApiError.notFound('Repository not found — check the URL or make it public');
  if (repoRes.status === 401) throw ApiError.badRequest('GitHub authentication failed — please reconnect your GitHub account');
  if (repoRes.status === 403) throw new ApiError(429, 'GITHUB_RATE_LIMIT', 'GitHub rate limit exceeded — try again later');
  if (!repoRes.ok) {
    logger.error('GitHub API non-200', { status: repoRes.status, ...parsed });
    throw ApiError.internal(`GitHub API error (HTTP ${repoRes.status})`);
  }

  const repo = await repoRes.json();
  if (repo.fork) throw ApiError.badRequest('Forked repositories are not accepted — must be original work');

  const isOwner = repo.owner.login.toLowerCase() === parsed.owner.toLowerCase();

  // Guard against re-verifying the same repo for the same skill
  const existing = await prisma.skill.findFirst({ where: { userId, name: normalized, verificationUrl: repoUrl } });
  if (existing) throw ApiError.conflict('This repository is already verified for this skill');

  // ── Fetch file tree and run AI analysis ──────────────────────────────────
  const treeRes  = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${repo.default_branch}?recursive=1`, { headers });
  const treeData = await treeRes.json();

  let score;
  let breakdownMsg;
  let topFiles    = [];

  const isRepoEmpty = !treeData.tree || treeData.tree.length === 0;

  if (isRepoEmpty) {
    score        = 0;
    breakdownMsg = 'Repository is completely empty. Scored as absolute beginner baseline (0/10).';
  } else {
    const isTestingSkill = normalized.toLowerCase().includes('test');
    const isGitCiCdSkill = normalized.toLowerCase().includes('git') || normalized.toLowerCase().includes('ci/cd');
    
    let candidates;
    if (isTestingSkill) {
      candidates = treeData.tree
        .filter((item) => item.type === 'blob')
        .filter((item) => {
          const p = item.path.toLowerCase();
          return p.includes('test') || p.includes('spec') || p.includes('__tests__');
        })
        .filter((item) => !item.path.includes('node_modules') && !item.path.includes('dist') && !item.path.includes('build'));
    } else if (isGitCiCdSkill) {
      candidates = treeData.tree
        .filter((item) => item.type === 'blob')
        .filter((item) => {
          const p = item.path.toLowerCase();
          return p.includes('.github/workflows') || p.includes('.gitlab-ci.yml') || p.includes('dockerfile') || p.includes('docker-compose');
        });
    } else {
      const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb', '.swift', '.kt', '.cs', '.php'];
      candidates = treeData.tree
        .filter((item) => item.type === 'blob')
        .filter((item) => validExtensions.some((ext) => item.path.endsWith(ext)))
        .filter((item) => !item.path.includes('node_modules') && !item.path.includes('dist') && !item.path.includes('build') && !item.path.toLowerCase().includes('test'));
    }

    if (candidates.length === 0) {
      score        = 0;
      breakdownMsg = `Could not find valid source files to analyze for ${normalized}. Scored as baseline.`;
    } else {
      if (isTestingSkill) {
        // Just take the first few test files
        topFiles = candidates.slice(0, 3);
      } else if (isGitCiCdSkill) {
        // Take CI/CD files
        topFiles = candidates.slice(0, 3);
      } else {
        topFiles = candidates.slice(0, 3);
      }
      
      let aggregatedCode = '';

      for (const file of topFiles) {
        const content = await fetchFileContent(parsed.owner, parsed.repo, repo.default_branch, file.path);
        if (content) aggregatedCode += `\n\n--- File: ${file.path} ---\n${content.slice(0, 3000)}`;
      }

      if (isGitCiCdSkill) {
        // Also fetch recent commits for Git practice evaluation
        try {
          const commitsRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=10`, { headers });
          if (commitsRes.ok) {
            const commits = await commitsRes.json();
            const commitMsgs = commits.map(c => `- ${c.commit.message.split('\n')[0]}`).join('\n');
            aggregatedCode += `\n\n--- Recent Commits ---\n${commitMsgs}`;
          }
        } catch (_e) {
          // Ignore commit fetch errors
        }
      }

      let verifiedSkillResults = [];

      if (aggregatedCode) {
        if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI verifier disabled (missing GOOGLE_API_KEY)');

        // Retrieve other unverified skills belonging to the user
        const otherUnverifiedSkills = await prisma.skill.findMany({
          where: {
            userId,
            isVerified: false,
            NOT: { name: normalized }
          },
          select: { name: true }
        });
        const additionalSkillsList = otherUnverifiedSkills.map((s) => s.name);

        const genAI   = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let aiPrompt = `Analyze this code repository for developer proficiency.
Primary skill requested for verification: "${normalized}"
Additional unverified skills on user's profile: ${additionalSkillsList.length > 0 ? JSON.stringify(additionalSkillsList) : '[]'}

Task:
1. Score the primary requested skill ("${normalized}") from 1 to 10 as an integer based on code architecture, efficiency, and quality.
2. For any of the additional unverified skills listed above, if you find clear, substantial code evidence in the repository, also evaluate and score them from 1 to 10 as an integer.

Code Snippets and Data:
${aggregatedCode}

Respond ONLY with valid JSON in this exact structure, no markdown codeblock wrapping, no additional commentary:
{
  "scores": [
    { "skillName": "${normalized}", "score": 7, "reasoning": "A brief 2-sentence explanation." }
  ]
}`;

        if (isTestingSkill) {
          aiPrompt = `Analyze these test files for test coverage, edge cases, assertions quality, and mocking usage.
Primary skill requested for verification: "${normalized}"
Additional unverified skills on user's profile: ${additionalSkillsList.length > 0 ? JSON.stringify(additionalSkillsList) : '[]'}

Score Testing proficiency and any relevant additional skills from 1 to 10.

Code Snippets:
${aggregatedCode}

Respond ONLY with valid JSON in this exact structure:
{
  "scores": [
    { "skillName": "${normalized}", "score": 7, "reasoning": "A brief 2-sentence explanation of testing proficiency." }
  ]
}`;
        } else if (isGitCiCdSkill) {
          aiPrompt = `Analyze these CI/CD workflow files and commit messages for DevOps and Git best practices.
Primary skill requested for verification: "${normalized}"
Additional unverified skills on user's profile: ${additionalSkillsList.length > 0 ? JSON.stringify(additionalSkillsList) : '[]'}

Score Git/DevOps proficiency and any relevant additional skills from 1 to 10.

Data:
${aggregatedCode}

Respond ONLY with valid JSON in this exact structure:
{
  "scores": [
    { "skillName": "${normalized}", "score": 7, "reasoning": "A brief 2-sentence explanation of DevOps/Git proficiency." }
  ]
}`;
        }

        try {
          const result  = await aiModel.generateContent(aiPrompt);
          let aiText    = result.response.text().trim();
          if (aiText.startsWith('```json')) aiText = aiText.slice(7, -3).trim();
          if (aiText.startsWith('```'))     aiText = aiText.slice(3, -3).trim();
          const parsedAI = JSON.parse(aiText);

          let evalList = [];
          if (Array.isArray(parsedAI.scores)) {
            evalList = parsedAI.scores;
          } else if (parsedAI.score !== undefined) {
            evalList = [{ skillName: normalized, score: parsedAI.score, reasoning: parsedAI.reasoning }];
          }

          for (const item of evalList) {
            if (!item.skillName) continue;
            const itemScore = Math.max(1, Math.min(10, Math.floor(Number(item.score) || 0)));
            if (itemScore > 0) {
              verifiedSkillResults.push({
                skillName: item.skillName,
                score: itemScore,
                reasoning: item.reasoning || 'Verified from repository code analysis.'
              });
            }
          }

          const primaryItem = verifiedSkillResults.find(r => r.skillName.toLowerCase() === normalized.toLowerCase());
          if (primaryItem) {
            score = primaryItem.score;
            breakdownMsg = primaryItem.reasoning;
          } else {
            score = 5;
            breakdownMsg = 'Verified baseline based on repository content.';
            verifiedSkillResults.unshift({ skillName: normalized, score, reasoning: breakdownMsg });
          }
        } catch (err) {
          logger.error('Gemini verify error', { err: err.message });
          throw ApiError.internal('AI evaluation failed during code analysis.');
        }
      } else {
        score        = 0;
        breakdownMsg = 'Could not fetch specific source file content, scored as baseline.';
        verifiedSkillResults = [{ skillName: normalized, score: 0, reasoning: breakdownMsg }];
      }
    }
  }

  // ── Persist results for all verified skills ──────────────────────────────
  let primarySkillRecord = null;
  const verifiedList = [];

  for (const item of (verifiedSkillResults.length > 0 ? verifiedSkillResults : [{ skillName: normalized, score, reasoning: breakdownMsg }])) {
    const skillNorm = LANGUAGE_MAP[item.skillName.toLowerCase()] || item.skillName;
    const itemLevel = item.score >= 8 ? 'Advanced' : item.score >= 5 ? 'Intermediate' : item.score > 0 ? 'Beginner' : 'Absolute Beginner';

    const savedSkill = await prisma.skill.upsert({
      where:  { userId_name: { userId, name: skillNorm } },
      update: { 
        isVerified: true, 
        verificationUrl: repoUrl, 
        verificationSource: 'GITHUB',
        verifiedAt: new Date(), 
        calculatedScore: item.score, 
        showLevel: !!showLevel, 
        level: itemLevel 
      },
      create: { 
        userId, 
        name: skillNorm, 
        level: itemLevel, 
        isVerified: true, 
        verificationUrl: repoUrl, 
        verificationSource: 'GITHUB',
        verifiedAt: new Date(), 
        calculatedScore: item.score, 
        showLevel: !!showLevel 
      },
    });

    if (skillNorm.toLowerCase() === normalized.toLowerCase()) {
      primarySkillRecord = savedSkill;
    }

    await prisma.activityLog.create({
      data: { userId, action: 'VERIFIED_SKILL', details: `GitHub verified: ${skillNorm} (${item.score}/10)` },
    });

    await sendNotification(
      userId,
      'SKILL_VERIFIED',
      'Skill Verified',
      `Your ${skillNorm} skill was verified via GitHub repo. Score: ${item.score}/10.`
    );

    verifiedList.push({ skillName: skillNorm, score: item.score });
  }

  logger.info('Skills verified', { userId, verifiedList, repo: repoUrl });

  return {
    success: true,
    score: primarySkillRecord ? primarySkillRecord.calculatedScore : score,
    skill: primarySkillRecord || { name: normalized, calculatedScore: score },
    verifiedSkills: verifiedList,
    breakdown: {
      reasoning:     breakdownMsg,
      filesAnalyzed: topFiles.map((f) => f.path).join(', '),
      lastUpdate:    new Date(repo.updated_at).toLocaleDateString(),
      ownership:     isOwner ? 'Owner' : 'Contributor',
    },
  };
}