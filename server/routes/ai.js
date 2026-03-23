const express = require('express');
const { asyncHandler } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

// POST /api/ai/generate-roadmap
router.post('/generate-roadmap', authenticateToken, asyncHandler(async (req, res) => {
  const { skill, role } = req.body;
  res.json(await aiService.generateRoadmap({ skill, role }));
}));

module.exports = router;