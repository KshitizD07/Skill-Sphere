import express from 'express';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as activityService from '../services/activityService.js';

const router = express.Router();

// GET /api/activity/:userId
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  res.json(await activityService.getUserActivity(req.params.userId, limit));
}));

export default router;