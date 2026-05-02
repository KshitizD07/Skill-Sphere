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

  const headers = {
    Accept:       'application/vnd.github+json',
    'User-Agent': 'SkillSphere-Verifier',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  // ── Fetch repo metadata ───────────────────────────────────────────────────
  const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });

  if (repoRes.status === 404) throw ApiError.notFound('Repository not found — check the URL or make it public');
  if (repoRes.status === 401) throw ApiError.badRequest('GitHub authentication failed — add a valid GITHUB_TOKEN to your .env');
  if (repoRes.status === 403) throw new ApiError(429, 'GITHUB_RATE_LIMIT', 'GitHub rate limit exceeded — try again later or add GITHUB_TOKEN');
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

  let score       = 5;
  let breakdownMsg = 'AI analysis completed';
  let topFiles    = [];

  const isRepoEmpty = !treeData.tree || treeData.tree.length === 0;

  if (isRepoEmpty) {
    score        = 0;
    breakdownMsg = 'Repository is completely empty. Scored as absolute beginner baseline (0/10).';
  } else {
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb', '.swift', '.kt'];
    const candidates      = treeData.tree
      .filter((item) => item.type === 'blob')
      .filter((item) => validExtensions.some((ext) => item.path.endsWith(ext)))
      .filter((item) => !item.path.includes('node_modules') && !item.path.includes('dist') && !item.path.includes('build') && !item.path.toLowerCase().includes('test'));

    if (candidates.length === 0) {
      score        = 0;
      breakdownMsg = `Could not find valid source files to analyze for ${normalized}. Scored as baseline.`;
    } else {
      topFiles = candidates.slice(0, 3);
      let aggregatedCode = '';

      for (const file of topFiles) {
        const content = await fetchFileContent(parsed.owner, parsed.repo, repo.default_branch, file.path);
        if (content) aggregatedCode += `\n\n--- File: ${file.path} ---\n${content.slice(0, 3000)}`;
      }

      if (aggregatedCode) {
        if (!process.env.GOOGLE_API_KEY) throw ApiError.internal('AI verifier disabled (missing GOOGLE_API_KEY)');

        const genAI   = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const aiPrompt = `Analyze this code for architecture, paradigm adherence, efficiency, and complexity.
Score the user's proficiency from 1 to 10 as an integer.

Code Snippets:
${aggregatedCode}

Respond ONLY with a valid JSON in exactly this format, no markdown wrapping, no extra text:
{"score": 7, "reasoning": "A brief 2-sentence explanation of the score based on code patterns."}`;

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
    update: { isVerified: true, verificationUrl: repoUrl, verifiedAt: new Date(), calculatedScore: score, showLevel: !!showLevel, level },
    create: { userId, name: normalized, level, isVerified: true, verificationUrl: repoUrl, verifiedAt: new Date(), calculatedScore: score, showLevel: !!showLevel },
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