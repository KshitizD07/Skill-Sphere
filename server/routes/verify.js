import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as verifyService from '../services/verifyService.js';
import { verifyLeetCodeSkill, scanLeetCodeProfile } from '../services/leetcodeService.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/verify/skill
router.post('/skill', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, skillName, repoUrl, showLevel } = req.body;

  // Users can only verify their own skills
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Can only verify your own skills' });
  }

  const result = await verifyService.verifySkill({ userId, skillName, repoUrl, showLevel });
  res.json(result);
}));


// POST /api/verify/leetcode
router.post('/leetcode', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, skillName, username, showLevel } = req.body;

  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Can only verify your own skills' });
  }

  const result = await verifyLeetCodeSkill({ userId, skillName, username, showLevel });
  res.json(result);
}));

// POST /api/verify/leetcode-scan
router.post('/leetcode-scan', authenticateToken, asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'BAD_REQUEST', message: 'LeetCode username is required' });
  const result = await scanLeetCodeProfile({ username });
  res.json(result);
}));

// POST /api/verify/leetcode-bulk
router.post('/leetcode-bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, username, skills, showLevel } = req.body;
  // skills is an array of { skillName, addNew? }
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Can only verify your own skills' });
  }
  
  const results = [];
  for (const { skillName, addNew } of skills) {
    try {
      const result = await verifyLeetCodeSkill({ userId, skillName, username, showLevel, addNewSkill: addNew });
      results.push({ skillName, success: true, score: result.score });
    } catch (err) {
      results.push({ skillName, success: false, error: err.message });
    }
  }
  
  res.json({ success: true, results });
}));

// GET /api/verify/rate-limit  — useful for checking GitHub quota
router.get('/rate-limit', asyncHandler(async (_req, res) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SkillSphere-Verifier',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  const data = await fetch('https://api.github.com/rate_limit', { headers }).then((r) => r.json());
  res.json({
    limit:     data.resources.core.limit,
    remaining: data.resources.core.remaining,
    reset:     new Date(data.resources.core.reset * 1000).toISOString(),
    status:    data.resources.core.remaining < 10 ? 'low' : 'ok',
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// LEETCODE PROFILE CARD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/verify/leetcode-profile-sync  — Scan LeetCode & persist to User record
router.post('/leetcode-profile-sync', authenticateToken, asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'LeetCode username is required' });
  }

  const scanResult = await scanLeetCodeProfile({ username: username.trim() });

  const updated = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      leetcodeUsername:    scanResult.username,
      leetcodeDSAScore:   scanResult.dsa.score,
      leetcodeDSALevel:   scanResult.dsa.level,
      leetcodeEasy:       scanResult.dsa.easy,
      leetcodeMedium:     scanResult.dsa.medium,
      leetcodeHard:       scanResult.dsa.hard,
      leetcodeTotalPoints: scanResult.dsa.totalPoints,
      leetcodeLanguages:  scanResult.languages,
      leetcodeSyncedAt:   new Date(),
    },
    select: {
      leetcodeUsername: true, leetcodeDSAScore: true, leetcodeDSALevel: true,
      leetcodeEasy: true, leetcodeMedium: true, leetcodeHard: true,
      leetcodeTotalPoints: true, leetcodeLanguages: true, leetcodeSyncedAt: true,
    },
  });

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'LEETCODE_CONNECTED', details: `LeetCode profile synced: ${scanResult.username}` },
  });

  res.json({ success: true, leetcode: updated });
}));

// GET /api/verify/leetcode-profile/:userId  — Read cached LeetCode data (public)
router.get('/leetcode-profile/:userId', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: {
      leetcodeUsername: true, leetcodeDSAScore: true, leetcodeDSALevel: true,
      leetcodeEasy: true, leetcodeMedium: true, leetcodeHard: true,
      leetcodeTotalPoints: true, leetcodeLanguages: true, leetcodeSyncedAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  if (!user.leetcodeUsername) return res.json({ success: true, leetcode: null });

  res.json({ success: true, leetcode: user });
}));

// DELETE /api/verify/leetcode-profile  — Unlink LeetCode from own profile
router.delete('/leetcode-profile', authenticateToken, asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      leetcodeUsername: null, leetcodeDSAScore: null, leetcodeDSALevel: null,
      leetcodeEasy: null, leetcodeMedium: null, leetcodeHard: null,
      leetcodeTotalPoints: null, leetcodeLanguages: null, leetcodeSyncedAt: null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'LEETCODE_UNLINKED', details: 'LeetCode profile unlinked' },
  });

  res.json({ success: true, message: 'LeetCode profile unlinked' });
}));

export default router;