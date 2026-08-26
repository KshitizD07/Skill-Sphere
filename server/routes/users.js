import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import axios from 'axios';

import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── Shared select shapes ─────────────────────────────────────────────────────

const PROFILE_SELECT = {
  id: true, name: true, email: true, role: true, college: true,
  headline: true, bio: true, avatar: true, github: true, linkedin: true, createdAt: true,
  leetcodeUsername: true, leetcodeDSAScore: true, leetcodeDSALevel: true,
  leetcodeEasy: true, leetcodeMedium: true, leetcodeHard: true,
  leetcodeTotalPoints: true, leetcodeLanguages: true, leetcodeSyncedAt: true,
  skills: {
    orderBy: [{ isVerified: 'desc' }, { calculatedScore: 'desc' }],
    select: {
      id: true, name: true, level: true, isVerified: true,
      calculatedScore: true, showLevel: true, verificationUrl: true,
      verificationSource: true, verifiedAt: true,
    },
  },
};

// Public profile omits email
const { email: _email, ...PUBLIC_PROFILE_SELECT } = PROFILE_SELECT;

function normaliseSkills(user) {
  if (!user?.skills) return user;
  return {
    ...user,
    skills: user.skills.map((s) => ({
      ...s,
      skill: { id: s.id, name: s.name },
    })),
  };
}

// ── GET /api/users/me ────────────────────────────────────────────────────────
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.user.userId}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: PROFILE_SELECT });
  if (!user) throw ApiError.notFound('User');

  const result = normaliseSkills(user);
  await cache.set(cacheKey, result, 300);

  logger.info('Profile fetched', { userId: req.user.userId });
  res.json({ success: true, data: result });
}));

// ── PATCH /api/users/me ──────────────────────────────────────────────────────
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    name:     z.string().min(2).max(80).optional(),
    headline: z.string().max(120).optional(),
    bio:      z.string().max(500).optional(),
    avatar:   z.string().max(500_000).optional(), // base64 or URL
    github:   z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    college:  z.string().optional(),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where:  { id: req.user.userId },
    data,
    select: PROFILE_SELECT,
  });

  // Invalidate cache so next /me read is fresh
  await cache.del(`user:profile:${req.user.userId}`);

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'PROFILE_UPDATED', details: 'Updated profile fields' },
  });

  logger.info('Profile updated', { userId: req.user.userId, fields: Object.keys(data) });
  res.json({ success: true, data: normaliseSkills(user) });
}));

// ── POST /api/users/me/skills  — bulk replace non-verified skills ─────────────
router.post('/me/skills', authenticateToken, asyncHandler(async (req, res) => {
  const { skillIds } = z.object({ skillIds: z.array(z.string()) }).parse(req.body);

  await prisma.skill.deleteMany({
    where: { userId: req.user.userId, isVerified: false, verificationUrl: null },
  });

  if (skillIds.length) {
    await prisma.skill.createMany({
      data: skillIds.map((name) => ({
        userId: req.user.userId, name, level: 'Beginner', isVerified: false, showLevel: true,
      })),
      skipDuplicates: true,
    });
  }

  await cache.del(`user:profile:${req.user.userId}`);
  res.json({ success: true, count: skillIds.length });
}));

// ── PATCH /api/users/me/skills/:id — Add proof URL for manual/credential verification
router.patch('/me/skills/:id', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    verificationUrl: z.string().url(),
    source: z.enum(['CREDENTIAL', 'MANUAL']).default('MANUAL'),
  });

  const { verificationUrl, source } = schema.parse(req.body);

  const skill = await prisma.skill.update({
    where: { id: req.params.id, userId: req.user.userId },
    data: {
      verificationUrl,
      verificationSource: source,
      isVerified: verificationUrl.includes('credly.com') ||
                  verificationUrl.includes('aws.amazon.com') ||
                  verificationUrl.includes('coursera.org'),
      verifiedAt: new Date(),
    },
  });

  await cache.del(`user:profile:${req.user.userId}`);
  res.json({ success: true, data: skill });
}));

// ── GET /api/users/me/github-stats ────────────────────────────────────────────
// Returns: publicRepos, totalStars, topLanguages[], recentEvents[]
router.get('/me/github-stats', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: { github: true },
  });

  if (!user?.github) {
    return res.json({ success: true, data: null });
  }

  // Extract username from stored value (may be "github.com/username" or just "username")
  const username = user.github.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').trim();

  const cacheKey = `github:stats:${username}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const headers = {
    Accept:       'application/vnd.github+json',
    'User-Agent': 'SkillSphere',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  const [profileRes, reposRes] = await Promise.allSettled([
    axios.get(`https://api.github.com/users/${username}`,                             { headers }),
    axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
  ]);

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const repos   = reposRes.status   === 'fulfilled' ? reposRes.value.data  : [];

  if (!profile) {
    logger.warn('GitHub user not found', { username, userId: req.user.userId });
    return res.json({ success: true, data: null });
  }

  // Aggregate top languages
  const langMap = {};
  for (const repo of repos) {
    if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + 1;
  }
  const topLanguages = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);

  const stats = {
    username,
    publicRepos:  profile.public_repos,
    followers:    profile.followers,
    following:    profile.following,
    totalStars,
    topLanguages,
    avatarUrl:    profile.avatar_url,
    profileUrl:   profile.html_url,
    bio:          profile.bio,
    company:      profile.company,
    blog:         profile.blog,
    location:     profile.location,
    createdAt:    profile.created_at,
  };

  // Cache for 1 hour
  await cache.set(cacheKey, stats, 3600);

  logger.info('GitHub stats fetched', { username, userId: req.user.userId });
  res.json({ success: true, data: stats });
}));

// ── GET /api/users/me/completeness ────────────────────────────────────────────
// Returns 0-100 score + checklist of what's missing
router.get('/me/completeness', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: {
      avatar: true, headline: true, bio: true, college: true,
      github: true, linkedin: true, leetcodeUsername: true,
      skills: { select: { id: true, isVerified: true } },
      githubRepos: { where: { isSelected: true }, select: { id: true } },
    },
  });

  if (!user) throw ApiError.notFound('User');

  const verifiedSkills = user.skills.filter(s => s.isVerified).length;
  const totalSkills    = user.skills.length;
  const hasPortfolio   = user.githubRepos.length > 0;

  const checks = [
    { key: 'avatar',          label: 'Profile photo',             done: !!user.avatar,          points: 10 },
    { key: 'headline',        label: 'Professional headline',     done: !!user.headline,         points: 10 },
    { key: 'bio',             label: 'Bio / About',               done: !!user.bio,              points: 10 },
    { key: 'college',         label: 'Institution / College',     done: !!user.college,          points: 10 },
    { key: 'github',          label: 'GitHub account linked',     done: !!user.github,           points: 20 },
    { key: 'linkedin',        label: 'LinkedIn profile',          done: !!user.linkedin,         points: 5  },
    { key: 'skills',          label: '3 or more skills added',    done: totalSkills >= 3,        points: 10 },
    { key: 'verifiedSkills',  label: 'At least 1 verified skill', done: verifiedSkills >= 1,     points: 20 },
    { key: 'portfolio',       label: 'Portfolio repos selected',  done: hasPortfolio,            points: 5  },
    { key: 'leetcode',        label: 'LeetCode profile linked',   done: !!user.leetcodeUsername, points: 0  }, // bonus
  ];

  const earnedPoints = checks.reduce((sum, c) => sum + (c.done ? c.points : 0), 0);
  const maxPoints    = checks.reduce((sum, c) => sum + c.points, 0);
  const score        = Math.round((earnedPoints / maxPoints) * 100);

  res.json({
    success: true,
    data:    { score, checks, earnedPoints, maxPoints },
  });
}));

// ── GET /api/users/search?q= ─────────────────────────────────────────────────
router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json({ success: true, data: [] });

  const users = await prisma.user.findMany({
    where: {
      github: { not: null },
      NOT: { github: '' },
      OR: [
        { name:     { contains: q, mode: 'insensitive' } },
        { college:  { contains: q, mode: 'insensitive' } },
        { headline: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, avatar: true, college: true, role: true, headline: true },
    take: 10,
  });

  res.json({ success: true, data: users });
}));

// ── GET /api/users/filter?role=&college=&search= ─────────────────────────────
router.get('/filter', authenticateToken, asyncHandler(async (req, res) => {
  const { role, college, search } = req.query;

  const where = {
    github: { not: null },
    NOT: { github: '' },
  };
  if (role && role !== 'ALL') where.role = role;
  if (college) where.college = college;
  if (search?.trim()) {
    where.OR = [
      { name:     { contains: search, mode: 'insensitive' } },
      { college:  { contains: search, mode: 'insensitive' } },
      { headline: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, avatar: true, college: true, role: true, headline: true },
    take: 50,
  });

  res.json({ success: true, data: users });
}));

// ── GET /api/users/:id — public profile ──────────────────────────────────────
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.params.id}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: PUBLIC_PROFILE_SELECT });
  if (!user) throw ApiError.notFound('User');

  const result = normaliseSkills(user);
  await cache.set(cacheKey, result, 300);
  res.json({ success: true, data: result });
}));

// ── DELETE /api/users/me ─────────────────────────────────────────────────────
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.user.userId } });

  res.clearCookie('ss_token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  });

  logger.info('Account deleted', { userId: req.user.userId });
  res.json({ success: true, message: 'Account deleted' });
}));

export default router;