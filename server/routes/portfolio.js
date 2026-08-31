import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import * as githubPortfolioService from '../services/githubPortfolioService.js';
import cache from '../utils/cache.js';
import { makeLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting for sync (expensive GitHub API calls)
const syncLimiter = makeLimiter({
  maxAttempts:   5,
  windowSeconds: 900,
  prefix:        'portfolio-sync',
  keyFn:         (req) => req.user?.userId || req.ip || 'anon',
  message:       'Too many sync attempts. Please try again later.',
});

// POST /api/portfolio/sync
// Trigger GitHub repo sync for authenticated user
router.post('/sync', authenticateToken, syncLimiter, asyncHandler(async (req, res) => {
  const repos = await githubPortfolioService.syncUserRepos(req.user.userId);
  
  // Clear any cached showcase
  await cache.del(`portfolio:showcase:${req.user.userId}`);
  
  res.json({ success: true, repos });
}));

// GET /api/portfolio/repos
// List all fetched repos for the user (for selection UI)
router.get('/repos', authenticateToken, asyncHandler(async (req, res) => {
  const repos = await prisma.gitHubRepo.findMany({
    where: { userId: req.user.userId },
    orderBy: { stars: 'desc' },
  });
  res.json(repos);
}));

// PUT /api/portfolio/selection
// Save selected repo IDs (max 3+3 validation)
router.put('/selection', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    selectedRepoIds: z.array(z.string()),
  });

  const { selectedRepoIds } = schema.parse(req.body);

  try {
    const updatedRepos = await githubPortfolioService.updateSelectedRepos(req.user.userId, selectedRepoIds);
    
    // Clear cache
    await cache.del(`portfolio:showcase:${req.user.userId}`);
    
    res.json({ success: true, selectedRepos: updatedRepos });
  } catch (error) {
    res.status(400).json({ error: 'BAD_REQUEST', message: error.message });
  }
}));

// GET /api/portfolio/showcase/:userId
// Authenticated endpoint returning selected repos for a user profile
router.get('/showcase/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `portfolio:showcase:${userId}`;
  
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const repos = await githubPortfolioService.getShowcaseRepos(userId);
  
  await cache.set(cacheKey, repos, 300); // 5 min cache
  res.json(repos);
}));

export default router;
