require('dotenv').config();
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const { PrismaClient } = require('@prisma/client');

const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { sendOtp, verifyOtp } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const registerSchema = z.object({
  email:    z.string().email('Invalid email format').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
  name:     z.string().min(2, 'Name must be at least 2 characters').max(60),
  role:     z.enum(['STUDENT', 'ALUMNI'], { errorMap: () => ({ message: 'Role must be STUDENT or ALUMNI' }) }),
  college:  z.string().min(1).optional(),
  otp:      z.string().length(6, 'OTP must be 6 digits'),
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

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Step 1 of registration: validate email is whitelisted, send OTP
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required');

  const normalised = email.toLowerCase().trim();

  // Whitelist check
  const allowed = await prisma.allowedEmail.findUnique({ where: { email: normalised } });
  if (!allowed) {
    throw new ApiError(403, 'EMAIL_NOT_WHITELISTED',
      'This email is not on the invite list. Contact the SkillSphere team to get access.'
    );
  }

  // Already registered
  if (allowed.usedAt) throw ApiError.conflict('An account with this email already exists');

  const exists = await prisma.user.findUnique({ where: { email: normalised } });
  if (exists) throw ApiError.conflict('Email already registered');

  await sendOtp(normalised);

  res.json({ success: true, message: 'Verification code sent to your email' });
}));

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Step 2: verify OTP + create account
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  // Whitelist check
  const allowed = await prisma.allowedEmail.findUnique({ where: { email: data.email } });
  if (!allowed) {
    throw new ApiError(403, 'EMAIL_NOT_WHITELISTED',
      'This email is not on the invite list.'
    );
  }
  if (allowed.usedAt) throw ApiError.conflict('Account already exists for this email');

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw ApiError.conflict('Email already registered');

  // Verify OTP
  await verifyOtp(data.email, data.otp);

  // Create user
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

  // Mark whitelist entry as used
  await prisma.allowedEmail.update({
    where: { email: data.email },
    data:  { usedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'ACCOUNT_CREATED', details: `Joined as ${data.role}` },
  });

  res.status(201).json({
    token: signToken(user),
    user:  { id: user.id, name: user.name, email: user.email, role: user.role, college: user.college },
  });
}));

// ── POST /api/auth/login ──────────────────────────────────────────────────────
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
  }).catch(() => {});

  const { password: _, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser });
}));

// ── GET /api/auth/verify ──────────────────────────────────────────────────────
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, college: true, avatar: true, headline: true },
  });
  if (!user) throw ApiError.notFound('User');
  res.json({ valid: true, user });
}));

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (userId) {
    await prisma.activityLog.create({
      data: { userId, action: 'USER_LOGOUT', details: 'Logged out' },
    }).catch(() => {});
  }
  res.json({ success: true });
}));

module.exports = router;