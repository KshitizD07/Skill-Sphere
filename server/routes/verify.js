import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as verifyService from '../services/verifyService.js';
import { verifyLeetCodeSkill, scanLeetCodeProfile } from '../services/leetcodeService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── POST /api/verify/skill ───────────────────────────────────────────────────
// Authenticated route to verify a specific skill using GitHub repo analysis
router.post('/skill', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    skillName: z.string().min(1, 'Skill name is required'),
    repoUrl: z.string().url('A valid repository URL is required'),
    showLevel: z.boolean().optional().default(true),
    force: z.boolean().optional().default(false),
  });

  const { skillName, repoUrl, showLevel, force } = schema.parse(req.body);

  const result = await verifyService.verifySkill({
    userId: req.user.userId,
    skillName,
    repoUrl,
    showLevel,
    force,
  });

  res.json(result);
}));

// ── POST /api/verify/batch ───────────────────────────────────────────────────
// Auto-discovery batch verification against linked GitHub repositories
router.post('/batch', authenticateToken, asyncHandler(async (req, res) => {
  const { selectedRepoUrls } = req.body || {};
  const result = await verifyService.batchVerifySkills({
    userId: req.user.userId,
    selectedRepoUrls,
  });

  res.json(result);
}));

// ── GET /api/verify/cooldown/:skillName ──────────────────────────────────────
// Check if a skill is in 7-day re-verification cooldown
router.get('/cooldown/:skillName', authenticateToken, asyncHandler(async (req, res) => {
  const { skillName } = req.params;
  const cooldown = await verifyService.checkSkillCooldown({
    userId: req.user.userId,
    skillName,
  });

  res.json({ success: true, data: cooldown });
}));

// ── POST /api/verify/leetcode ────────────────────────────────────────────────
router.post('/leetcode', authenticateToken, asyncHandler(async (req, res) => {
  const { skillName, username, showLevel } = req.body;
  const targetUserId = req.body.userId || req.user.userId;

  if (req.user.userId !== targetUserId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Can only verify your own skills' });
  }

  const result = await verifyLeetCodeSkill({ userId: req.user.userId, skillName, username, showLevel });
  res.json(result);
}));

// ── POST /api/verify/leetcode-scan ───────────────────────────────────────────
router.post('/leetcode-scan', authenticateToken, asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'BAD_REQUEST', message: 'LeetCode username is required' });
  const result = await scanLeetCodeProfile({ username });
  res.json(result);
}));

// ── POST /api/verify/leetcode-bulk ───────────────────────────────────────────
router.post('/leetcode-bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { username, skills, showLevel } = req.body;
  
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'skills array is required' });
  }

  const results = [];
  for (const { skillName, addNew } of skills) {
    try {
      const result = await verifyLeetCodeSkill({
        userId: req.user.userId,
        skillName,
        username,
        showLevel,
        addNewSkill: addNew,
      });
      results.push({ skillName, success: true, score: result.score });
    } catch (err) {
      results.push({ skillName, success: false, error: err.message });
    }
  }

  res.json({ success: true, results });
}));

// ── GET /api/verify/rate-limit ───────────────────────────────────────────────
router.get('/rate-limit', authenticateToken, asyncHandler(async (_req, res) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SkillSphere-Verifier',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  try {
    const data = await fetch('https://api.github.com/rate_limit', { headers }).then((r) => r.json());
    res.json({
      limit: data.resources?.core?.limit || 60,
      remaining: data.resources?.core?.remaining || 0,
      reset: data.resources?.core?.reset ? new Date(data.resources.core.reset * 1000).toISOString() : new Date().toISOString(),
      status: (data.resources?.core?.remaining || 0) < 10 ? 'low' : 'ok',
    });
  } catch {
    res.json({ limit: 60, remaining: 60, reset: new Date().toISOString(), status: 'ok' });
  }
}));

// ── POST /api/verify/leetcode-profile-sync ────────────────────────────────────
router.post('/leetcode-profile-sync', authenticateToken, asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'LeetCode username is required' });
  }

  const trimmed = username.trim();

  // Check if LeetCode username is already linked to another user
  const duplicate = await prisma.user.findFirst({
    where: {
      leetcodeUsername: { equals: trimmed, mode: 'insensitive' },
      id: { not: req.user.userId },
    },
  });

  if (duplicate) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'This LeetCode account is already linked to another SkillSphere profile.',
    });
  }

  const scanResult = await scanLeetCodeProfile({ username: trimmed });

  const updated = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      leetcodeUsername: scanResult.username,
      leetcodeDSAScore: scanResult.dsa.score,
      leetcodeDSALevel: scanResult.dsa.level,
      leetcodeEasy: scanResult.dsa.easy,
      leetcodeMedium: scanResult.dsa.medium,
      leetcodeHard: scanResult.dsa.hard,
      leetcodeTotalPoints: scanResult.dsa.totalPoints,
      leetcodeLanguages: scanResult.languages,
      leetcodeSyncedAt: new Date(),
    },
    select: {
      leetcodeUsername: true,
      leetcodeDSAScore: true,
      leetcodeDSALevel: true,
      leetcodeEasy: true,
      leetcodeMedium: true,
      leetcodeHard: true,
      leetcodeTotalPoints: true,
      leetcodeLanguages: true,
      leetcodeSyncedAt: true,
    },
  });

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'LEETCODE_CONNECTED', details: `LeetCode profile synced: ${scanResult.username}` },
  });

  res.json({ success: true, leetcode: updated });
}));

// ── GET /api/verify/leetcode-profile/:userId ──────────────────────────────────
router.get('/leetcode-profile/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: {
      leetcodeUsername: true,
      leetcodeDSAScore: true,
      leetcodeDSALevel: true,
      leetcodeEasy: true,
      leetcodeMedium: true,
      leetcodeHard: true,
      leetcodeTotalPoints: true,
      leetcodeLanguages: true,
      leetcodeSyncedAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
  if (!user.leetcodeUsername) return res.json({ success: true, leetcode: null });

  res.json({ success: true, leetcode: user });
}));

// ── DELETE /api/verify/leetcode-profile ───────────────────────────────────────
router.delete('/leetcode-profile', authenticateToken, asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      leetcodeUsername: null,
      leetcodeDSAScore: null,
      leetcodeDSALevel: null,
      leetcodeEasy: null,
      leetcodeMedium: null,
      leetcodeHard: null,
      leetcodeTotalPoints: null,
      leetcodeLanguages: null,
      leetcodeSyncedAt: null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'LEETCODE_UNLINKED', details: 'LeetCode profile unlinked' },
  });

  res.json({ success: true, message: 'LeetCode profile unlinked' });
}));

export default router;
