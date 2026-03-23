const express = require('express');
const { asyncHandler } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const skillService = require('../services/skillService');
const activityService = require('../services/activityService');

const router = express.Router();

// GET /api/skills/list
router.get('/list', asyncHandler(async (req, res) => {
  res.json(await skillService.getAllSkills());
}));

// GET /api/skills/roles
router.get('/roles', asyncHandler(async (req, res) => {
  res.json(await skillService.getAllRoles());
}));

// GET /api/skills/analyze?userId=&roleId=
router.get('/analyze', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, roleId } = req.query;
  const analysis = await skillService.analyzeSkillGap(userId, roleId);
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

module.exports = router;