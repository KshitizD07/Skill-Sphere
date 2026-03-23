const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const { PrismaClient } = require('@prisma/client');

const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  role:     z.enum(['STUDENT', 'ALUMNI']),
  college:  z.string().min(1).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw ApiError.conflict('Email already registered');

  const hashed = await bcrypt.hash(data.password, 12);
  const user   = await prisma.user.create({
    data: {
      email:    data.email,
      password: hashed,
      name:     data.name,
      role:     data.role,
      college:  data.college || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'ACCOUNT_CREATED', details: `Joined as ${data.role}` },
  });

  res.status(201).json({
    token: signToken(user),
    user:  { id: user.id, name: user.name, email: user.email, role: user.role, college: user.college },
  });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where:  { email: data.email },
    select: { id: true, name: true, email: true, password: true, role: true, college: true, avatar: true, headline: true },
  });

  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'USER_LOGIN', details: 'Logged in' },
  });

  const { password: _, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser });
}));

// GET /api/auth/verify
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, college: true, avatar: true, headline: true },
  });
  if (!user) throw ApiError.notFound('User');
  res.json({ valid: true, user });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (userId) {
    await prisma.activityLog.create({
      data: { userId, action: 'USER_LOGOUT', details: 'Logged out' },
    }).catch(() => {}); // non-critical
  }
  res.json({ success: true });
}));

module.exports = router;