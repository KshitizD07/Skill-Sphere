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

      if (aggregatedCode) {
        if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI verifier disabled (missing GOOGLE_API_KEY)');

        const genAI   = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let aiPrompt = `Analyze this code for architecture, paradigm adherence, efficiency, and complexity.
Score the user's proficiency from 1 to 10 as an integer.

Code Snippets:
${aggregatedCode}

Respond ONLY with a valid JSON in exactly this format, no markdown wrapping, no extra text:
{"score": 7, "reasoning": "A brief 2-sentence explanation of the score based on code patterns."}`;

        if (isTestingSkill) {
          aiPrompt = `Analyze these test files for test coverage, edge cases, assertions quality, and mocking usage.
Score the user's Testing proficiency from 1 to 10 as an integer.

Code Snippets:
${aggregatedCode}

Respond ONLY with a valid JSON in exactly this format, no markdown wrapping, no extra text:
{"score": 7, "reasoning": "A brief 2-sentence explanation of the testing proficiency."}`;
        } else if (isGitCiCdSkill) {
          aiPrompt = `Analyze these CI/CD workflow files (if any) and recent commit messages for DevOps and Git best practices (e.g., conventional commits, automated tests, deployment pipelines).
Score the user's Git & CI/CD proficiency from 1 to 10 as an integer.

Data:
${aggregatedCode}

Respond ONLY with a valid JSON in exactly this format, no markdown wrapping, no extra text:
{"score": 7, "reasoning": "A brief 2-sentence explanation of the DevOps/Git proficiency."}`;
        }

        try {
          const result  = await aiModel.generateContent(aiPrompt);
          let aiText    = result.response.text().trim();
          if (aiText.startsWith('```json')) aiText = aiText.slice(7, -3).trim();
          if (aiText.startsWith('```'))     aiText = aiText.slice(3, -3).trim();
          const parsedAI = JSON.parse(aiText);
          score          = Math.max(1, Math.min(10, Math.floor(parsedAI.score)));
          breakdownMsg   = parsedAI.reasoning;
        } catch (err) {
          logger.error('Gemini verify error', { err: err.message });
          throw ApiError.internal('AI evaluation failed during code analysis.');
        }
      } else {
        score        = 0;
        breakdownMsg = 'Could not fetch specific source file content, scored as baseline.';
      }
    }
  }

  const level = score >= 8 ? 'Advanced' : score >= 5 ? 'Intermediate' : score > 0 ? 'Beginner' : 'Absolute Beginner';

  // ── Persist result ────────────────────────────────────────────────────────
  const skill = await prisma.skill.upsert({
    where:  { userId_name: { userId, name: normalized } },
    update: { 
      isVerified: true, 
      verificationUrl: repoUrl, 
      verificationSource: 'GITHUB',
      verifiedAt: new Date(), 
      calculatedScore: score, 
      showLevel: !!showLevel, 
      level 
    },
    create: { 
      userId, 
      name: normalized, 
      level, 
      isVerified: true, 
      verificationUrl: repoUrl, 
      verificationSource: 'GITHUB',
      verifiedAt: new Date(), 
      calculatedScore: score, 
      showLevel: !!showLevel 
    },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'VERIFIED_SKILL', details: `GitHub verified: ${normalized} (${score}/10)` },
  });

  await sendNotification(
    userId,
    'SKILL_VERIFIED',
    'Skill Verified',
    `Your ${normalized} repository was successfully verified. You achieved a score of ${score}/10.`
  );

  logger.info('Skill verified', { userId, skill: normalized, score, repo: repoUrl });

  return {
    success: true,
    score,
    skill,
    breakdown: {
      reasoning:     breakdownMsg,
      filesAnalyzed: topFiles.map((f) => f.path).join(', '),
      lastUpdate:    new Date(repo.updated_at).toLocaleDateString(),
      ownership:     isOwner ? 'Owner' : 'Contributor',
    },
  };
}