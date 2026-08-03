import express from 'express';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as verifyService from '../services/verifyService.js';
import { verifyLeetCodeSkill, scanLeetCodeProfile } from '../services/leetcodeService.js';

const router = express.Router();

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

export default router;