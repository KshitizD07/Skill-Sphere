import express from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as skillService from '../services/skillService.js';
import * as activityService from '../services/activityService.js';

const router = express.Router();

// ── GET /api/skills ──────────────────────────────────────────────────────────
// List authenticated user's own skills with verification status
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const skills = await skillService.getUserSkills(req.user.userId);
  res.json({ success: true, data: skills });
}));

// ── POST /api/skills ─────────────────────────────────────────────────────────
// Add a new unverified skill (Max 20 skills per user)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1, 'Skill name is required').max(60),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional().default('Beginner'),
    showLevel: z.boolean().optional().default(true),
  });

  const { name, level, showLevel } = schema.parse(req.body);
  const skill = await skillService.addUserSkill(req.user.userId, { name, level, showLevel });

  await activityService.logActivity(req.user.userId, 'SKILL_ADDED', `Added skill: ${skill.name}`);
  res.status(201).json({ success: true, data: skill });
}));

// ── DELETE /api/skills/:skillId ──────────────────────────────────────────────
// Delete an owned skill
router.delete('/:skillId', authenticateToken, asyncHandler(async (req, res) => {
  const result = await skillService.deleteUserSkill(req.user.userId, req.params.skillId);
  await activityService.logActivity(req.user.userId, 'SKILL_DELETED', `Deleted skill ID: ${req.params.skillId}`);
  res.json(result);
}));

// ── GET /api/skills/leaderboard ──────────────────────────────────────────────
// Top users with highest verified score for a skill
router.get('/leaderboard', authenticateToken, asyncHandler(async (req, res) => {
  const skill = req.query.skill || req.query.name;
  if (!skill) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'skill query parameter is required' });
  }

  const limit = req.query.limit || 10;
  const leaderboard = await skillService.getSkillLeaderboard(skill, limit);
  res.json({ success: true, data: leaderboard });
}));

// ── GET /api/skills/list ─────────────────────────────────────────────────────
router.get('/list', authenticateToken, asyncHandler(async (_req, res) => {
  const catalogue = await skillService.getAllSkills();
  res.json(catalogue);
}));

// ── GET /api/skills/roles ────────────────────────────────────────────────────
router.get('/roles', authenticateToken, asyncHandler(async (_req, res) => {
  const roles = await skillService.getAllRoles();
  res.json(roles);
}));

// ── GET /api/skills/analyze ──────────────────────────────────────────────────
router.get('/analyze', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, roleIdOrName, roleId, forceRegenerate } = req.query;
  const targetUser = userId || req.user.userId;
  const analysis = await skillService.analyzeSkillGap(targetUser, roleIdOrName || roleId, forceRegenerate === 'true');
  await activityService.logActivity(req.user.userId, 'DIAGNOSTIC_RUN', `Analyzed skill gap for: ${analysis.role}`);
  res.json(analysis);
}));

// ── POST /api/skills/update ──────────────────────────────────────────────────
router.post('/update', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, skillIds } = req.body;
  // Prevent IDOR: Standard users can only update their own skills. Admins can update target users.
  const targetUser = (req.user.role === 'ADMIN' && userId) ? userId : req.user.userId;
  const result = await skillService.updateUserSkills(targetUser, skillIds || []);
  res.json(result);
}));

// ── GET /api/skills/mentors/:skillName ───────────────────────────────────────
router.get('/mentors/:skillName', authenticateToken, asyncHandler(async (req, res) => {
  const mentors = await skillService.getMentors(req.params.skillName);
  res.json(mentors);
}));

export default router;
