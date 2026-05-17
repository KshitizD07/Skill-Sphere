import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as aiService from '../services/aiService.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/ai/generate-roadmap
router.post('/generate-roadmap', authenticateToken, asyncHandler(async (req, res) => {
  const { skill, role } = req.body;
  const userId = req.user.userId;

  const existingSkill = await prisma.skill.findFirst({
    where: { userId, name: { equals: skill, mode: 'insensitive' } }
  });

  let currentScore = 0;
  if (existingSkill) {
    if (!existingSkill.isVerified) {
      throw ApiError.forbidden('SKILL_NOT_VERIFIED');
    }
    currentScore = existingSkill.calculatedScore || 0;
  }

  const verifiedSkills = await prisma.skill.findMany({
    where: { userId, isVerified: true },
    select: { name: true, calculatedScore: true }
  });

  res.json(await aiService.generateRoadmap({ 
    skill, 
    role, 
    currentScore,
    existingSkills: verifiedSkills
  }));
}));

export default router;