const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/ai/generate-roadmap
router.post('/generate-roadmap', authenticateToken, asyncHandler(async (req, res) => {
  const { skill, role } = req.body;
  const userId = req.user.userId;

  const existingSkill = await prisma.skill.findFirst({
    where: { userId, name: { equals: skill, mode: 'insensitive' } }
  });

  if (!existingSkill || !existingSkill.isVerified) {
    throw ApiError.forbidden('SKILL_NOT_VERIFIED');
  }

  res.json(await aiService.generateRoadmap({ skill, role, currentScore: existingSkill.calculatedScore }));
}));

module.exports = router;