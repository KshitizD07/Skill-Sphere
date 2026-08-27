import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import * as aiService from '../services/aiService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/ai/roles — List all predefined job roles ────────────────────────
router.get('/roles', asyncHandler(async (req, res) => {
  const roles = await aiService.getJobRoles();
  res.json({ success: true, data: roles });
}));

// ── GET /api/ai/gap-analysis?roleId= — Authenticated skill gap analysis ───────
router.get('/gap-analysis', authenticateToken, asyncHandler(async (req, res) => {
  const { roleId } = req.query;
  const analysis = await aiService.getSkillGapAnalysis(req.user.userId, roleId);
  res.json({ success: true, data: analysis });
}));

// ── POST /api/ai/roadmap — Personalized AI Career Roadmap Generator ──────────
router.post('/roadmap', authenticateToken, aiLimiter, asyncHandler(async (req, res) => {
  const { targetSkill, targetRole, currentLevel } = req.body;
  const userId = req.user.userId;

  if (!targetSkill?.trim() || !targetRole?.trim()) {
    throw ApiError.badRequest('targetSkill and targetRole are required');
  }

  // Load user's verified skills
  const verifiedSkills = await prisma.skill.findMany({
    where: { userId, isVerified: true },
    select: { name: true, calculatedScore: true },
  });

  const targetSkillRecord = await prisma.skill.findFirst({
    where: { userId, name: { equals: targetSkill.trim(), mode: 'insensitive' } },
  });

  let currentScore = 0;
  if (targetSkillRecord) {
    currentScore = targetSkillRecord.calculatedScore ?? (targetSkillRecord.isVerified ? 7 : 4);
  } else if (currentLevel) {
    currentScore = currentLevel === 'Advanced' ? 8 : currentLevel === 'Intermediate' ? 5 : 2;
  }

  const result = await aiService.generateRoadmap({
    skill: targetSkill,
    role: targetRole,
    currentScore,
    existingSkills: verifiedSkills,
    userId,
  });

  res.json({ success: true, ...result });
}));

// ── GET /api/ai/roadmaps — User's saved roadmaps ─────────────────────────────
router.get('/roadmaps', authenticateToken, asyncHandler(async (req, res) => {
  const roadmaps = await aiService.getUserRoadmaps(req.user.userId);
  res.json({ success: true, data: roadmaps });
}));

// ── GET /api/ai/roadmaps/:id — Single saved roadmap ──────────────────────────
router.get('/roadmaps/:id', authenticateToken, asyncHandler(async (req, res) => {
  const roadmap = await aiService.getRoadmapById(req.params.id, req.user.userId);
  res.json({ success: true, data: roadmap });
}));

// ── PUT /api/ai/roadmaps/:id/progress — Update completed milestones ───────────
router.put('/roadmaps/:id/progress', authenticateToken, asyncHandler(async (req, res) => {
  const { completedItems } = req.body;
  const updated = await aiService.updateRoadmapProgress(req.params.id, completedItems, req.user.userId);
  res.json({ success: true, data: updated });
}));

// ── GET /api/ai/roadmaps/:id/share — Generate public share token ──────────────
router.get('/roadmaps/:id/share', authenticateToken, asyncHandler(async (req, res) => {
  const shareData = await aiService.generateShareToken(req.params.id, req.user.userId);
  res.json({ success: true, data: shareData });
}));

// ── GET /api/ai/roadmaps/shared/:token — Public view ─────────────────────────
router.get('/roadmaps/shared/:token', asyncHandler(async (req, res) => {
  const sharedRoadmap = await aiService.getSharedRoadmap(req.params.token);
  res.json({ success: true, data: sharedRoadmap });
}));

// ── POST /api/ai/generate-roadmap (Legacy compatibility) ─────────────────────
router.post('/generate-roadmap', authenticateToken, asyncHandler(async (req, res) => {
  const { skill, role } = req.body;
  const userId = req.user.userId;

  const existingSkill = await prisma.skill.findFirst({
    where: { userId, name: { equals: skill, mode: 'insensitive' } },
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
    select: { name: true, calculatedScore: true },
  });

  const result = await aiService.generateRoadmap({
    skill,
    role,
    currentScore,
    existingSkills: verifiedSkills,
    userId,
  });

  res.json({ roadmap: result.roadmapMarkdown || result.roadmap?.content });
}));

export default router;