import express from 'express';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { squadCreateLimiter, squadApplyLimiter } from '../middleware/rateLimiter.js';
import * as squadService from '../services/squadService.js';

const router = express.Router();

// ── GET /api/squads & GET /api/squads/feed — Browse squads ───────────────────
const handleGetSquads = asyncHandler(async (req, res) => {
  const { skill, event, status, search, maxScore, cursor, page, limit } = req.query;
  const result = await squadService.getFeed({
    skill,
    event,
    status,
    search,
    maxScore,
    cursor,
    page: +page || 1,
    limit: +limit || 12,
  });
  res.json(result);
});

router.get('/', authenticateToken, handleGetSquads);
router.get('/feed', authenticateToken, handleGetSquads);

// ── GET /api/squads/my-squads ────────────────────────────────────────────────
router.get('/my-squads', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await squadService.getMySquads(req.user.userId));
}));

// ── GET /api/squads/my-applications ──────────────────────────────────────────
router.get('/my-applications', authenticateToken, asyncHandler(async (req, res) => {
  const applications = await squadService.getMyApplications(req.user.userId);
  res.json({ success: true, applications });
}));

// ── POST /api/squads — Create new squad ──────────────────────────────────────
router.post('/', authenticateToken, squadCreateLimiter, asyncHandler(async (req, res) => {
  const { title, description, event, maxMembers, visibility, expiresAt, slots } = req.body;
  const squad = await squadService.createSquad(
    { title, description, event, maxMembers, visibility, expiresAt, slots: slots || [] },
    req.user.userId
  );
  res.status(201).json({ success: true, data: squad });
}));

// ── GET /api/squads/:id — Single squad details ───────────────────────────────
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const squad = await squadService.getSquad(req.params.id);
  res.json({ success: true, data: squad });
}));

// ── PUT /api/squads/:id — Edit squad (Leader only) ───────────────────────────
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { title, description, event, expiresAt } = req.body;
  const updated = await squadService.editSquad(
    req.params.id,
    { title, description, event, expiresAt },
    req.user.userId
  );
  res.json({ success: true, data: updated });
}));

// ── DELETE /api/squads/:id — Close squad (Leader only) ───────────────────────
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const result = await squadService.deleteSquad(req.params.id, req.user.userId);
  res.json(result);
}));

// ── DELETE /api/squads/:id/leave — Leave squad (Member only) ──────────────────
router.delete('/:id/leave', authenticateToken, asyncHandler(async (req, res) => {
  const result = await squadService.leaveSquad(req.params.id, req.user.userId);
  res.json(result);
}));

// ── GET /api/squads/:id/qualify?userId= ──────────────────────────────────────
router.get('/:id/qualify', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.user.userId;
  res.json(await squadService.checkQualification(req.params.id, userId));
}));

// ── POST /api/squads/:id/apply — Apply to squad slot ─────────────────────────
router.post('/:id/apply', authenticateToken, squadApplyLimiter, asyncHandler(async (req, res) => {
  const { message, slotId } = req.body;
  const application = await squadService.applyToSquad(
    req.params.id, req.user.userId, message, slotId
  );
  res.status(201).json({ success: true, data: application });
}));

// ── GET /api/squads/:id/applications — List applications for leader ──────────
router.get('/:id/applications', authenticateToken, asyncHandler(async (req, res) => {
  const squad = await squadService.getSquad(req.params.id);
  if (squad.leaderId !== req.user.userId) {
    throw ApiError.forbidden('Only the squad leader can view applications');
  }
  res.json({ success: true, applications: squad.applications || [] });
}));

// ── PATCH /api/squads/:id/applications/:appId & PUT ──────────────────────────
const handleApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw ApiError.badRequest('Status must be ACCEPTED or REJECTED');
  }
  const result = await squadService.updateApplicationStatus(
    req.params.id, req.params.appId, status, req.user.userId
  );
  res.json({ success: true, data: result });
});

router.patch('/:id/applications/:appId', authenticateToken, handleApplicationStatus);
router.put('/:id/applications/:appId', authenticateToken, handleApplicationStatus);

// ── Slot Management (Leader only) ─────────────────────────────────────────────
router.post('/:id/slots', authenticateToken, asyncHandler(async (req, res) => {
  const slot = await squadService.addSlot(req.params.id, req.body, req.user.userId);
  res.status(201).json({ success: true, data: slot });
}));

router.put('/:id/slots/:slotId', authenticateToken, asyncHandler(async (req, res) => {
  const slot = await squadService.editSlot(req.params.id, req.params.slotId, req.body, req.user.userId);
  res.json({ success: true, data: slot });
}));

router.delete('/:id/slots/:slotId', authenticateToken, asyncHandler(async (req, res) => {
  const result = await squadService.deleteSlot(req.params.id, req.params.slotId, req.user.userId);
  res.json(result);
}));

// ── DELETE /api/squads/applications/:appId — Withdraw / Delete application ─────
router.delete('/applications/:appId', authenticateToken, asyncHandler(async (req, res) => {
  const result = await squadService.withdrawApplication(req.params.appId, req.user.userId);
  res.json(result);
}));

// ── GET /api/squads/:id/slots/:slotId/recommendations (Leader only) ───────────
router.get('/:id/slots/:slotId/recommendations', authenticateToken, asyncHandler(async (req, res) => {
  const recommendations = await squadService.getSlotRecommendations(
    req.params.id, req.params.slotId, req.user.userId
  );
  res.json({ success: true, data: recommendations });
}));

export default router;
