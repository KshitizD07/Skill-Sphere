import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

const ADMIN_EMAILS = new Set([
  'kshitizd171@gmail.com',
  'kshitizd777@gmail.com',
  'kshitijdhyani07@gmail.com',
]);

// ── POST /api/feedback (Submit User Feedback) ─────────────────────────────────
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { category, rating, feedback, mostValuable, improvement, wantsToContribute, contributorAreas, contributorContact, deviceInfo } = req.body;

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 5) {
      throw ApiError.badRequest('Please provide feedback of at least 5 characters');
    }

    // Fetch user profile details
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        role: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    logger.info('Saving user feedback to database', {
      userId: user.id,
      email: user.email,
      category: category || 'General',
      rating: rating || 5,
      wantsToContribute: !!wantsToContribute,
    });

    // 1. Persist directly into PlatformFeedback table
    const record = await prisma.platformFeedback.create({
      data: {
        userId: user.id,
        userName: user.name || 'Anonymous',
        userEmail: user.email,
        userCollege: user.college || 'Not Specified',
        userRole: user.role || 'STUDENT',
        category: category || 'General Feedback',
        rating: Number(rating) || 5,
        feedback: feedback.trim(),
        mostValuable: mostValuable ? String(mostValuable).trim() : '',
        improvement: improvement ? String(improvement).trim() : '',
        wantsToContribute: Boolean(wantsToContribute),
        contributorAreas: Array.isArray(contributorAreas) ? contributorAreas : (contributorAreas ? [String(contributorAreas)] : []),
        contributorContact: contributorContact ? String(contributorContact).trim() : '',
        deviceInfo: deviceInfo || req.headers['user-agent'] || 'Web App',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded directly in the Developer Inbox.',
      feedbackId: record.id,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/feedback (Admin / Developer Inbox) ──────────────────────────────
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true },
    });

    const isAuthorized = user?.role === 'ADMIN' || (user?.email && ADMIN_EMAILS.has(user.email.toLowerCase()));
    if (!isAuthorized) {
      throw ApiError.forbidden('Access restricted to platform administrators and core developers');
    }

    const { category, contributorOnly, limit = 100 } = req.query;

    const where = {};
    if (category && category !== 'ALL') where.category = category;
    if (contributorOnly === 'true') where.wantsToContribute = true;

    const [items, totalCount, contributorCount, avgRatingResult] = await Promise.all([
      prisma.platformFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      }),
      prisma.platformFeedback.count(),
      prisma.platformFeedback.count({ where: { wantsToContribute: true } }),
      prisma.platformFeedback.aggregate({
        _avg: { rating: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      stats: {
        totalSubmissions: totalCount,
        contributorLeads: contributorCount,
        averageRating: avgRatingResult._avg.rating ? Number(avgRatingResult._avg.rating.toFixed(1)) : 5.0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/feedback/:id (Admin Delete) ──────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, role: true },
    });

    const isAuthorized = user?.role === 'ADMIN' || (user?.email && ADMIN_EMAILS.has(user.email.toLowerCase()));
    if (!isAuthorized) {
      throw ApiError.forbidden('Access restricted to platform administrators');
    }

    await prisma.platformFeedback.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({ success: true, message: 'Feedback entry deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
