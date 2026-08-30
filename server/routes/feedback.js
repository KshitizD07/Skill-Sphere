import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── Schema Resilience Helper (Auto-heals missing columns on production without manual migration)
let schemaInitialized = false;
async function ensureFeedbackSchema() {
  if (schemaInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PlatformFeedback') THEN
          ALTER TABLE "PlatformFeedback" ADD COLUMN IF NOT EXISTS "userAvatar" TEXT;
          ALTER TABLE "PlatformFeedback" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';
          ALTER TABLE "PlatformFeedback" ADD COLUMN IF NOT EXISTS "adminResponse" TEXT;
          ALTER TABLE "PlatformFeedback" ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3);
          ALTER TABLE "PlatformFeedback" ADD COLUMN IF NOT EXISTS "respondedBy" TEXT;
        END IF;
      END $$;
    `);
    schemaInitialized = true;
  } catch (err) {
    logger.warn('Schema self-healing notice for PlatformFeedback:', err?.message);
  }
}

// ── POST /api/feedback (Submit User Feedback) ─────────────────────────────────
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    await ensureFeedbackSchema();
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
        avatar: true,
        college: true,
        role: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    const parsedRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    logger.info('Saving user feedback to database', {
      userId: user.id,
      email: user.email,
      category: category || 'General',
      rating: parsedRating,
      wantsToContribute: !!wantsToContribute,
    });

    // 1. Persist directly into PlatformFeedback table
    const record = await prisma.platformFeedback.create({
      data: {
        userId: user.id,
        userName: user.name || 'Anonymous',
        userEmail: user.email,
        userAvatar: user.avatar || null,
        userCollege: user.college || 'Not Specified',
        userRole: user.role || 'STUDENT',
        category: category || 'General Feedback',
        rating: parsedRating,
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
    await ensureFeedbackSchema();
    if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Access restricted to platform administrators and core developers');
    }

    const { category, contributorOnly, limit = 100 } = req.query;

    const where = {};
    if (category && category !== 'ALL') where.category = category;
    if (contributorOnly === 'true') where.wantsToContribute = true;

    let items = [];
    let totalCount = 0;
    let contributorCount = 0;
    let avgRatingResult = { _avg: { rating: 5.0 } };

    try {
      [items, totalCount, contributorCount, avgRatingResult] = await Promise.all([
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
    } catch (_queryErr) {
      // If error occurred (e.g. column missing on un-migrated DB), force-heal and retry once
      schemaInitialized = false;
      await ensureFeedbackSchema();
      [items, totalCount, contributorCount, avgRatingResult] = await Promise.all([
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
    }

    // Backward-compatibility: Enrich items with current user avatars if missing on historical records
    const missingAvatarUserIds = [...new Set(items.filter((i) => !i.userAvatar && i.userId).map((i) => i.userId))];
    let userAvatarMap = {};
    if (missingAvatarUserIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: missingAvatarUserIds } },
          select: { id: true, avatar: true },
        });
        userAvatarMap = Object.fromEntries(users.map((u) => [u.id, u.avatar]));
      } catch {
        // Fallback silently if user query has any issue
      }
    }

    const enrichedItems = items.map((item) => ({
      ...item,
      userAvatar: item.userAvatar || userAvatarMap[item.userId] || null,
    }));

    return res.status(200).json({
      success: true,
      data: enrichedItems,
      stats: {
        totalSubmissions: totalCount,
        contributorLeads: contributorCount,
        averageRating: avgRatingResult._avg?.rating ? Number(avgRatingResult._avg.rating.toFixed(1)) : 5.0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/feedback/my (User's own submitted feedback & responses) ─────────
router.get('/my', authenticateToken, async (req, res, next) => {
  try {
    await ensureFeedbackSchema();
    const myFeedback = await prisma.platformFeedback.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: myFeedback });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/feedback/:id/respond (Admin respond & resolve feedback) ───────
router.patch('/:id/respond', authenticateToken, async (req, res, next) => {
  try {
    await ensureFeedbackSchema();
    if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Access restricted to platform administrators');
    }

    const { status, adminResponse } = req.body;
    const feedbackRecord = await prisma.platformFeedback.findUnique({
      where: { id: req.params.id },
    });

    if (!feedbackRecord) {
      throw ApiError.notFound('Feedback entry not found');
    }

    const updated = await prisma.platformFeedback.update({
      where: { id: req.params.id },
      data: {
        status: status || feedbackRecord.status,
        adminResponse: adminResponse !== undefined ? adminResponse : feedbackRecord.adminResponse,
        respondedAt: new Date(),
        respondedBy: req.user.email || 'SkillSphere Core',
      },
    });

    // Create in-app notification for the user if userId exists
    if (feedbackRecord.userId) {
      try {
        const notif = await prisma.inAppNotification.create({
          data: {
            userId: feedbackRecord.userId,
            type: 'FEEDBACK_RESPONSE',
            title: `Feedback Update: ${status || 'Reviewed'}`,
            message: adminResponse || `Your feedback regarding "${feedbackRecord.category}" was marked as ${status}.`,
            actionUrl: '/notifications',
          },
        });

        try {
          const { getIO } = await import('../socket.js');
          getIO().to(feedbackRecord.userId).emit('NOTIFICATION', notif);
        } catch { /* non-blocking */ }
      } catch (notifErr) {
        logger.warn('Failed to dispatch feedback response notification:', notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Response recorded and notification sent to user.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
