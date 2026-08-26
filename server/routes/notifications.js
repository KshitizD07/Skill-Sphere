import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// ── GET /api/notifications ───────────────────────────────────────────────────
// Cursor-based paginated notification list for authenticated user
router.get('/', asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();
  const filterType = req.query.type?.trim(); // e.g. 'UNREAD', 'SQUAD', 'SKILL', 'MESSAGE', 'SOCIAL'

  const where = { userId: currentUserId };

  if (filterType === 'UNREAD') {
    where.isRead = false;
  } else if (filterType === 'SQUAD') {
    where.type = { in: ['SQUAD_APPLICATION', 'SQUAD_ACCEPTED', 'SQUAD_REJECTED', 'MATCH_RECOMMENDED'] };
  } else if (filterType === 'SKILL') {
    where.type = { in: ['SKILL_VERIFIED', 'SKILL_ENDORSED'] };
  } else if (filterType === 'MESSAGE') {
    where.type = 'MESSAGE';
  } else if (filterType === 'SOCIAL') {
    where.type = { in: ['LIKE', 'COMMENT', 'COMMENT_REPLY', 'FOLLOW'] };
  }

  if (cursor) {
    const cursorNotif = await prisma.inAppNotification.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorNotif) {
      where.createdAt = { lt: cursorNotif.createdAt };
    }
  }

  const items = await prisma.inAppNotification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  res.json({
    success: true,
    data,
    nextCursor,
    hasMore,
  });
}));

// ── GET /api/notifications/unread-count ──────────────────────────────────────
// Returns the count of unread notifications for navbar bell
router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await prisma.inAppNotification.count({
    where: {
      userId: req.user.userId,
      isRead: false,
    },
  });

  res.json({ success: true, count });
}));

// ── PUT /api/notifications/read-all & PATCH /api/notifications/read-all ──────
// Mark all user notifications as read
const handleReadAll = asyncHandler(async (req, res) => {
  const result = await prisma.inAppNotification.updateMany({
    where: {
      userId: req.user.userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  res.json({ success: true, count: result.count, message: 'All notifications marked as read' });
});

router.put('/read-all', handleReadAll);
router.patch('/read-all', handleReadAll);

// ── PUT /api/notifications/:id/read & PATCH /api/notifications/:id/read ──────
// Mark a single notification as read
const handleMarkSingleRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notif = await prisma.inAppNotification.findUnique({
    where: { id },
  });

  if (!notif) throw ApiError.notFound('Notification');
  if (notif.userId !== req.user.userId) throw ApiError.forbidden();

  const updated = await prisma.inAppNotification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json({ success: true, data: updated });
});

router.put('/:id/read', handleMarkSingleRead);
router.patch('/:id/read', handleMarkSingleRead);

// ── DELETE /api/notifications/clear-all ──────────────────────────────────────
// Delete all notifications for the user
router.delete('/clear-all', asyncHandler(async (req, res) => {
  const result = await prisma.inAppNotification.deleteMany({
    where: { userId: req.user.userId },
  });

  res.json({ success: true, count: result.count, message: 'All notifications cleared' });
}));

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
// Delete a single notification
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notif = await prisma.inAppNotification.findUnique({
    where: { id },
  });

  if (!notif) throw ApiError.notFound('Notification');
  if (notif.userId !== req.user.userId) throw ApiError.forbidden();

  await prisma.inAppNotification.delete({
    where: { id },
  });

  res.json({ success: true, message: 'Notification deleted' });
}));

export default router;
