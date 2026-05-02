import express from 'express';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as squadService from '../services/squadService.js';

const router = express.Router();

// GET /api/squads/feed
router.get('/feed', authenticateToken, asyncHandler(async (req, res) => {
  const { skill, maxScore, page, limit } = req.query;
  res.json(await squadService.getFeed({ skill, maxScore, page: +page || 1, limit: +limit || 12 }));
}));

// GET /api/squads/my-squads
router.get('/my-squads', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await squadService.getMySquads(req.user.userId));
}));

// GET /api/squads/my-applications  (alias)
router.get('/my-applications', authenticateToken, asyncHandler(async (req, res) => {
  const { applications } = await squadService.getMySquads(req.user.userId);
  res.json(applications);
}));

// POST /api/squads
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { title, description, event, maxMembers, visibility, slots } = req.body;
  const squad = await squadService.createSquad(
    { title, description, event, maxMembers, visibility, slots: slots || [] },
    req.user.userId
  );
  res.status(201).json(squad);
}));

// GET /api/squads/:id
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await squadService.getSquad(req.params.id));
}));

// GET /api/squads/:id/qualify?userId=
router.get('/:id/qualify', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.user.userId;
  res.json(await squadService.checkQualification(req.params.id, userId));
}));

// POST /api/squads/:id/apply
router.post('/:id/apply', authenticateToken, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const application = await squadService.applyToSquad(req.params.id, req.user.userId, message);
  res.status(201).json(application);
}));

// PATCH /api/squads/:id/applications/:appId
router.patch('/:id/applications/:appId', authenticateToken, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw ApiError.badRequest('Status must be ACCEPTED or REJECTED');
  }
  const result = await squadService.updateApplicationStatus(
    req.params.id, req.params.appId, status, req.user.userId
  );
  res.json(result);
}));

export default router;