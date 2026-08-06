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

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const registerSchema = z.object({
  email:    z.string().email('Invalid email format').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character'),
  name:     z.string().min(2, 'Name must be at least 2 characters').max(60),
  role:     z.enum(['STUDENT', 'PROFESSIONAL', 'GUEST', 'RECRUITER'], { errorMap: () => ({ message: 'Role must be STUDENT, PROFESSIONAL, GUEST, or RECRUITER' }) }),
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

  if (data.role === 'RECRUITER') {
    throw ApiError.badRequest('Recruiter accounts will be available soon!');
  }

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
    token
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

  res.json({ user: safeUser, token });
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
// ── GET /api/auth/google ──────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  const role = req.query.role || 'STUDENT';
  const backendUrl = req.protocol + '://' + req.get('host');
  const cb = `${backendUrl}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${cb}&response_type=code&scope=email profile&state=${role}`;
  res.redirect(url);
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get('/google/callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  const role = req.query.state || 'STUDENT';
  if (!code) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=OAuthCodeMissing`);

  const backendUrl = req.protocol + '://' + req.get('host');
  const cb = `${backendUrl}/api/auth/google/callback`;

  // Exchange code for token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: cb,
    })
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=GoogleOAuthFailed`);

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userData = await userRes.json();
  if (!userData.email) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=EmailMissing`);

  // Find or create user
  await handleOAuthLogin(userData.email, userData.name, res, null, null, role);
}));

// ── GET /api/auth/github ──────────────────────────────────────────────────────
router.get('/github', (req, res) => {
  const role = req.query.role || 'STUDENT';
  const backendUrl = req.protocol + '://' + req.get('host');
  const cb = `${backendUrl}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${cb}&scope=user:email&state=${role}`;
  res.redirect(url);
});

// ── GET /api/auth/github/callback ─────────────────────────────────────────────
router.get('/github/callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  const role = req.query.state || 'STUDENT';
  if (!code) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=OAuthCodeMissing`);

  const backendUrl = req.protocol + '://' + req.get('host');
  const cb = `${backendUrl}/api/auth/github/callback`;

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: cb,
    })
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=GithubOAuthFailed`);

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/json',
      'User-Agent': 'SkillSphere-App'
    }
  });
  const userData = await userRes.json();
  
  let email = userData.email;
  if (!email) {
    // Fetch emails
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'SkillSphere-App'
      }
    });
    const emails = await emailsRes.json();
    if (Array.isArray(emails)) {
      const primaryEmail = emails.find(e => e.primary) || emails[0];
      if (primaryEmail) email = primaryEmail.email;
    }
  }
  
  if (!email) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=EmailMissing`);

  await handleOAuthLogin(email, userData.name || userData.login, res, userData.login, tokenData.access_token, role);
}));

async function handleOAuthLogin(email, name, res, githubUsername = null, githubAccessToken = null, role = 'STUDENT') {
  const normalised = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email: normalised } });

  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!1aA';
    const hashed = await bcrypt.hash(randomPassword, 12);
    const finalRole = ['STUDENT', 'PROFESSIONAL', 'GUEST', 'RECRUITER'].includes(role) ? role : 'STUDENT';
    user = await prisma.user.create({
      data: {
        email: normalised,
        password: hashed,
        name: name || 'OAuth User',
        role: finalRole,
        github: githubUsername || null,
        githubAccessToken: githubAccessToken || null,
      },
    });
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'ACCOUNT_CREATED', details: 'Joined via OAuth' },
    });
  } else {
    const updateData = {};
    if (githubUsername && !user.github) updateData.github = githubUsername;
    if (githubAccessToken) updateData.githubAccessToken = githubAccessToken;

    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'USER_LOGIN', details: 'Logged in via OAuth' },
    }).catch(() => {});
  }

  const token = signToken(user);
  setTokenCookie(res, token);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!user.github || !user.college) {
    res.redirect(`${frontendUrl}/my-profile?token=${token}`);
  } else {
    res.redirect(`${frontendUrl}/dashboard?token=${token}`);
  }
}

export default router;