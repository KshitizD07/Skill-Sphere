const express = require('express');
const { asyncHandler } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const verifyService = require('../services/verifyService');

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

module.exports = router;