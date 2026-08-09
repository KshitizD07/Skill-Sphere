import express from 'express';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as skillService from '../services/skillService.js';
import * as activityService from '../services/activityService.js';

const router = express.Router();

// GET /api/skills/list
router.get('/list', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await skillService.getAllSkills());
}));

// GET /api/skills/roles
router.get('/roles', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await skillService.getAllRoles());
}));

// GET /api/skills/analyze?userId=&roleIdOrName=&forceRegenerate=
router.get('/analyze', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, roleIdOrName, roleId, forceRegenerate } = req.query;
  const analysis = await skillService.analyzeSkillGap(userId, roleIdOrName || roleId, forceRegenerate === 'true');
  await activityService.logActivity(req.user.userId, 'DIAGNOSTIC_RUN', `Analyzed skill gap for: ${analysis.role}`);
  res.json(analysis);
}));

// POST /api/skills/update  (legacy — kept for dashboard compatibility)
router.post('/update', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, skillIds } = req.body;
  const result = await skillService.updateUserSkills(userId, skillIds || []);
  res.json(result);
}));

// GET /api/skills/mentors/:skillName
router.get('/mentors/:skillName', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await skillService.getMentors(req.params.skillName));
}));

export default router;