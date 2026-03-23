const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const LANGUAGE_MAP = {
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  python: 'Python',         py: 'Python',
  java:   'Java',
  go:     'Go',
  rust:   'Rust',
  cpp:    'C++',            'c++': 'C++',
  c:      'C',
  ruby:   'Ruby',           rb: 'Ruby',
  swift:  'Swift',
  kotlin: 'Kotlin',
};

function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '');
    const u = new URL(cleaned);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

function buildScore({ bytes, commits, lastUpdated, isOwner }) {
  let score = 0;

  // Volume (0-4)
  if      (bytes >= 100_000) score += 4;
  else if (bytes >= 50_000)  score += 3;
  else if (bytes >= 20_000)  score += 2;
  else if (bytes >= 10_000)  score += 1;

  // Commits (0-3)
  if      (commits >= 50) score += 3;
  else if (commits >= 20) score += 2;
  else if (commits >= 5)  score += 1;

  // Recency (0-2)
  const monthsAgo = (Date.now() - new Date(lastUpdated)) / (1000 * 60 * 60 * 24 * 30);
  if      (monthsAgo < 3)  score += 2;
  else if (monthsAgo < 12) score += 1;

  // Ownership bonus (0-1)
  if (isOwner) score += 1;

  return Math.min(10, score);
}

async function verifySkill({ userId, skillName, repoUrl, showLevel }) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) throw ApiError.badRequest('Invalid GitHub repository URL');

  const normalized = LANGUAGE_MAP[skillName.toLowerCase()] || skillName;

  const headers = {
    Accept:       'application/vnd.github+json',
    'User-Agent': 'SkillSphere-Verifier',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  // ── Fetch repo ──────────────────────────────────────────────────────────
  const repoRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    { headers }
  );

  if (repoRes.status === 404) throw ApiError.notFound('Repository not found — check the URL or make it public');
  if (repoRes.status === 401) throw ApiError.badRequest('GitHub authentication failed — add a valid GITHUB_TOKEN to your .env');
  if (repoRes.status === 403) throw new ApiError(429, 'GITHUB_RATE_LIMIT', 'GitHub rate limit exceeded — try again later or add GITHUB_TOKEN');
  if (!repoRes.ok) {
    logger.error('GitHub API non-200', { status: repoRes.status, owner: parsed.owner, repo: parsed.repo });
    throw ApiError.internal(`GitHub API error (HTTP ${repoRes.status})`);
  }

  const repo = await repoRes.json();
  if (repo.fork) throw ApiError.badRequest('Forked repositories are not accepted — must be original work');

  const isOwner = repo.owner.login.toLowerCase() === parsed.owner.toLowerCase();

  // ── Check duplicate ────────────────────────────────────────────────────
  const existing = await prisma.skill.findFirst({
    where: { userId, name: normalized, verificationUrl: repoUrl },
  });
  if (existing) throw ApiError.conflict('This repository is already verified for this skill');

  // ── Languages ──────────────────────────────────────────────────────────
  const langRes  = await fetch(repo.languages_url, { headers });
  const languages = await langRes.json();
  const targetBytes = languages[normalized] || 0;

  if (targetBytes < 5000) {
    throw ApiError.badRequest(
      `Not enough ${normalized} code (found ${targetBytes} bytes, need ≥5000)`
    );
  }

  // ── Commit count (via Link header trick) ───────────────────────────────
  let commits = 5;
  try {
    const cRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`,
      { headers }
    );
    const link = cRes.headers.get('Link');
    if (link) {
      const m = link.match(/page=(\d+)>; rel="last"/);
      if (m) commits = parseInt(m[1]);
    }
  } catch { /* use default */ }

  // ── Score ──────────────────────────────────────────────────────────────
  const score = buildScore({
    bytes:       targetBytes,
    commits,
    lastUpdated: repo.updated_at,
    isOwner,
  });

  const level = score >= 8 ? 'Advanced' : score >= 5 ? 'Intermediate' : 'Beginner';

  // ── Persist ────────────────────────────────────────────────────────────
  const skill = await prisma.skill.upsert({
    where:  { userId_name: { userId, name: normalized } },
    update: { isVerified: true, verificationUrl: repoUrl, verifiedAt: new Date(), calculatedScore: score, showLevel: !!showLevel, level },
    create: { userId, name: normalized, level, isVerified: true, verificationUrl: repoUrl, verifiedAt: new Date(), calculatedScore: score, showLevel: !!showLevel },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'VERIFIED_SKILL', details: `GitHub verified: ${normalized} (${score}/10)` },
  });

  logger.info('Skill verified', { userId, skill: normalized, score, repo: repoUrl });

  return {
    success: true,
    score,
    skill,
    breakdown: {
      codeVolume: `${targetBytes.toLocaleString()} bytes`,
      commits,
      lastUpdate: new Date(repo.updated_at).toLocaleDateString(),
      ownership:  isOwner ? 'Owner' : 'Contributor',
    },
  };
}

module.exports = { verifySkill };