const express = require('express');
const { asyncHandler } = require('../utils/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const activityService = require('../services/activityService');

const router = express.Router();

// GET /api/activity/:userId
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  res.json(await activityService.getUserActivity(req.params.userId, limit));
}));

module.exports = router;