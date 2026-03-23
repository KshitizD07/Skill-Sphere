const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const cache = require('../utils/cache');

const router = express.Router();
const prisma = new PrismaClient();

const PROFILE_SELECT = {
  id: true, name: true, email: true, role: true, college: true,
  headline: true, bio: true, avatar: true, github: true, linkedin: true, createdAt: true,
  skills: {
    orderBy: [{ isVerified: 'desc' }, { calculatedScore: 'desc' }],
    select: {
      id: true, name: true, level: true, isVerified: true,
      calculatedScore: true, showLevel: true, verificationUrl: true,
    },
  },
};

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

// GET /api/users/me
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.user.userId}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: PROFILE_SELECT });
  if (!user) throw ApiError.notFound('User');

  const result = normaliseSkills(user);
  await cache.set(cacheKey, result, 300);
  res.json(result);
}));

// PATCH /api/users/me
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    name:     z.string().min(2).optional(),
    headline: z.string().max(120).optional(),
    bio:      z.string().max(500).optional(),
    avatar:   z.string().url().or(z.literal('')).optional(),
    github:   z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    college:  z.string().optional(),
  });

  const data = schema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.userId }, data });

  await cache.del(`user:profile:${req.user.userId}`);
  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'PROFILE_UPDATED', details: 'Updated profile' },
  });

  res.json(user);
}));

// POST /api/users/me/skills  — bulk replace non-verified skills
router.post('/me/skills', authenticateToken, asyncHandler(async (req, res) => {
  const { skillIds } = z.object({ skillIds: z.array(z.string()) }).parse(req.body);

  // Delete all unverified skills then recreate
  await prisma.skill.deleteMany({ where: { userId: req.user.userId, isVerified: false } });

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

// GET /api/users/search?q=
router.get('/search', optionalAuth, asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name:     { contains: q, mode: 'insensitive' } },
        { college:  { contains: q, mode: 'insensitive' } },
        { headline: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, avatar: true, college: true, role: true, headline: true },
    take: 10,
  });

  res.json(users);
}));

// GET /api/users/filter?role=&college=&search=
router.get('/filter', optionalAuth, asyncHandler(async (req, res) => {
  const { role, college, search } = req.query;

  const where = {};
  if (role && role !== 'ALL') where.role = role;
  if (college) where.college = college;
  if (search?.trim()) {
    where.OR = [
      { name:     { contains: search, mode: 'insensitive' } },
      { college:  { contains: search, mode: 'insensitive' } },
      { headline: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (!Object.keys(where).length) return res.json([]);

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, avatar: true, college: true, role: true, headline: true },
    take: 50,
  });

  res.json(users);
}));

// GET /api/users/:id  — public profile
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.params.id}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: PROFILE_SELECT });
  if (!user) throw ApiError.notFound('User');

  const result = normaliseSkills(user);
  await cache.set(cacheKey, result, 300);
  res.json(result);
}));

module.exports = router;