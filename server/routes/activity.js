import express from 'express';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as activityService from '../services/activityService.js';

const router = express.Router();

// GET /api/activity/:userId
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  // Prevent IDOR: users can only view their own activity history, admins can view any
  if (req.params.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Access denied: You can only view your own activity log.');
  }

  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  res.json(await activityService.getUserActivity(req.params.userId, limit));
}));

export default router;