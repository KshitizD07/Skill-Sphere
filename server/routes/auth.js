import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendOtp, verifyOtp, sendVerificationEmail, generateAndSaveOtp } from '../services/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const registerSchema = z.object({
  email:    z.string().email('Invalid email format').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
  name:     z.string().min(2, 'Name must be at least 2 characters').max(60),
  role:     z.enum(['STUDENT', 'ALUMNI', 'GUEST'], { errorMap: () => ({ message: 'Role must be STUDENT, ALUMNI or GUEST' }) }),
  guestPersona: z.string().optional(),
  college:  z.string().min(1).optional(),
  otp:      z.string().length(6, 'OTP must be 6 digits'),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  email:       z.string().email().toLowerCase(),
  otp:         z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
});

// ── Cookie helper ─────────────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';

function setTokenCookie(res, token) {
  res.cookie('ss_token', token, {
    httpOnly:  true,                          // Not accessible via JS
    secure:    IS_PROD,                       // HTTPS only in production
    sameSite:  IS_PROD ? 'none' : 'lax',      // cross-origin in prod (Vercel → Railway)
    maxAge:    7 * 24 * 60 * 60 * 1000,       // 7 days
    path:      '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie('ss_token', {
    httpOnly:  true,
    secure:    IS_PROD,
    sameSite:  IS_PROD ? 'none' : 'lax',
    path:      '/',
  });
}

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

  const exists = await prisma.user.findUnique({ where: { email: normalised } });
  if (exists) throw ApiError.conflict('Email already registered');

  const code = await generateAndSaveOtp(normalised);
  await sendVerificationEmail(normalised, code);

  res.json({ success: true, message: 'Verification code sent to your email' });
}));

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Step 2: verify OTP + create account
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

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
      guestPersona: data.guestPersona || null,
      college:  data.college || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'ACCOUNT_CREATED', details: `Joined as ${data.role}` },
  });

  const token = signToken(user);
  setTokenCookie(res, token);

  res.status(201).json({
    user:  { id: user.id, name: user.name, email: user.email, role: user.role, college: user.college, github: user.github, guestPersona: user.guestPersona },
  });
}));

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where:  { email: { equals: data.email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, password: true, role: true, college: true, avatar: true, headline: true, github: true, guestPersona: true },
  });

  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'USER_LOGIN', details: 'Logged in' },
  }).catch(() => {});

  const { password: _, ...safeUser } = user;
  const token = signToken(user);
  setTokenCookie(res, token);

  res.json({ user: safeUser });
}));

// ── GET /api/auth/verify ──────────────────────────────────────────────────────
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, college: true, avatar: true, headline: true, github: true, guestPersona: true },
  });
  if (!user) throw ApiError.notFound('User');
  res.json({ valid: true, user });
}));

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', asyncHandler(async (req, res) => {
  // Try to log the activity if a userId is in the cookie
  try {
    const token = req.cookies?.ss_token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await prisma.activityLog.create({
        data: { userId: decoded.userId, action: 'USER_LOGOUT', details: 'Logged out' },
      });
    }
  } catch { /* ignore — token may be expired or invalid, still clear cookie */ }

  clearTokenCookie(res);
  res.json({ success: true });
}));

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Send an OTP to reset the password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required');

  const normalised = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalised } });
  // Always return success (even if no user) to prevent email enumeration
  if (!user) {
    return res.json({ success: true, message: 'If an account exists, a verification code has been sent.' });
  }

  const code = await generateAndSaveOtp(normalised);
  await sendVerificationEmail(normalised, code);

  res.json({ success: true, message: 'If an account exists, a verification code has been sent.' });
}));

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Verify OTP and set new password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);

  // Verify OTP
  await verifyOtp(data.email, data.otp);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw ApiError.notFound('User');

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data:  { password: hashed },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'PASSWORD_RESET', details: 'Password was reset via OTP' },
  }).catch(() => {});

  // Clear any existing session after password reset (force re-login)
  clearTokenCookie(res);

  res.json({ success: true, message: 'Password has been reset. Please sign in with your new password.' });
}));

export default router;