import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/admin/stats — Platform overview metrics & 7-day sparklines ────────
router.get('/stats', authenticateToken, requireRole('ADMIN'), asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    totalPosts,
    newPostsToday,
    totalSquads,
    activeSquads,
    totalVerifications,
    avgScoreAgg,
    recentUsers,
    recentPosts,
    pendingReportsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.post.count(),
    prisma.post.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.squad.count(),
    prisma.squad.count({ where: { status: 'OPEN' } }),
    prisma.skill.count({ where: { isVerified: true } }),
    prisma.skill.aggregate({
      _avg: { calculatedScore: true },
      where: { calculatedScore: { gt: 0 } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.contentReport.count({ where: { status: 'PENDING' } }),
  ]);

  // Aggregate daily counts for 7-day sparklines
  const dayBuckets = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = { date: key, users: 0, posts: 0 };
  }

  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (dayBuckets[key]) dayBuckets[key].users += 1;
  }
  for (const p of recentPosts) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (dayBuckets[key]) dayBuckets[key].posts += 1;
  }

  const sparklines = Object.values(dayBuckets);

  res.json({
    success: true,
    data: {
      totalUsers,
      newUsersToday,
      totalPosts,
      newPostsToday,
      totalSquads,
      activeSquads,
      totalVerifications,
      avgSkillScore: Math.round((avgScoreAgg._avg.calculatedScore || 0) * 10) / 10,
      pendingReportsCount,
      sparklines,
    },
  });
}));

// ── GET /api/admin/users — Paginated & filterable user management list ─────────
router.get('/users', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { search, role, status, cursor, limit = 20 } = req.query;
  const take = Math.min(Number(limit) || 20, 50);

  const where = {};
  if (role && role !== 'ALL') where.role = role;
  if (status === 'ACTIVE') where.isActive = true;
  if (status === 'SUSPENDED') where.isActive = false;

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { email: { contains: search.trim(), mode: 'insensitive' } },
      { college: { contains: search.trim(), mode: 'insensitive' } },
      { github: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      college: true,
      avatar: true,
      github: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          skills: true,
          posts: true,
          applications: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = users.length > take;
  const items = hasMore ? users.slice(0, take) : users;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({
    success: true,
    data: items.map((u) => ({
      ...u,
      verifiedSkillCount: u._count.skills,
      postCount: u._count.posts,
      applicationCount: u._count.applications,
    })),
    nextCursor,
    hasMore,
  });
}));

// ── PUT /api/admin/users/:id/suspend — Toggle account suspension ──────────────
router.put('/users/:id/suspend', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!targetUser) throw ApiError.notFound('User not found');
  if (targetUser.role === 'ADMIN') throw ApiError.forbidden('Cannot suspend admin accounts');

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !targetUser.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Clear cache if suspended
  await cache.del(`user:profile:${targetUser.id}`);

  logger.info(`Admin toggled suspension for user ${targetUser.id}: isActive=${updated.isActive}`);
  res.json({ success: true, data: updated });
}));

// ── DELETE /api/admin/users/:id — Hard delete with cascade ────────────────────
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!targetUser) throw ApiError.notFound('User not found');
  if (targetUser.role === 'ADMIN') throw ApiError.forbidden('Cannot delete admin accounts');

  await prisma.user.delete({
    where: { id: req.params.id },
  });

  await cache.del(`user:profile:${targetUser.id}`);
  logger.warn(`Admin deleted user ${targetUser.id} (${targetUser.email})`);

  res.json({ success: true, message: 'User permanently deleted' });
}));

// ── POST /api/admin/reports — Submit a content/user report (Any authenticated) ──
router.post('/reports', authenticateToken, asyncHandler(async (req, res) => {
  const { targetUserId, targetPostId, targetCommentId, contentPreview, reason } = req.body;
  if (!reason?.trim()) throw ApiError.badRequest('Reason is required for report');

  const report = await prisma.contentReport.create({
    data: {
      reporterId: req.user.userId,
      targetUserId,
      targetPostId,
      targetCommentId,
      contentPreview: contentPreview?.slice(0, 500),
      reason: reason.trim(),
      status: 'PENDING',
    },
  });

  logger.info('Content report filed', { reportId: report.id, reporterId: req.user.userId });
  res.status(201).json({ success: true, data: report });
}));

// ── GET /api/admin/reports — List content reports (Admin only) ────────────────
router.get('/reports', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { status = 'PENDING', cursor, limit = 20 } = req.query;
  const take = Math.min(Number(limit) || 20, 50);

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (cursor) where.reportedAt = { lt: new Date(cursor) };

  const reports = await prisma.contentReport.findMany({
    where,
    include: {
      reporter: {
        select: { id: true, name: true, avatar: true, email: true },
      },
    },
    orderBy: { reportedAt: 'desc' },
    take: take + 1,
  });

  const hasMore = reports.length > take;
  const items = hasMore ? reports.slice(0, take) : reports;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].reportedAt.toISOString() : null;

  res.json({
    success: true,
    data: items,
    nextCursor,
    hasMore,
  });
}));

// ── PUT /api/admin/reports/:id — Resolve report (Dismiss, Remove, Suspend) ────
router.put('/reports/:id', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { action } = req.body; // DISMISS | REMOVE_CONTENT | SUSPEND_USER
  if (!['DISMISS', 'REMOVE_CONTENT', 'SUSPEND_USER'].includes(action)) {
    throw ApiError.badRequest('Invalid report action');
  }

  const report = await prisma.contentReport.findUnique({
    where: { id: req.params.id },
  });
  if (!report) throw ApiError.notFound('Report not found');

  let resolutionDetails = action;

  if (action === 'REMOVE_CONTENT') {
    if (report.targetPostId) {
      await prisma.post.delete({ where: { id: report.targetPostId } }).catch(() => {});
      resolutionDetails = 'Post deleted';
    } else if (report.targetCommentId) {
      await prisma.comment.delete({ where: { id: report.targetCommentId } }).catch(() => {});
      resolutionDetails = 'Comment deleted';
    }
  } else if (action === 'SUSPEND_USER' && report.targetUserId) {
    await prisma.user.update({
      where: { id: report.targetUserId },
      data: { isActive: false },
    }).catch(() => {});
    resolutionDetails = 'Target user suspended';
  }

  const updated = await prisma.contentReport.update({
    where: { id: req.params.id },
    data: {
      status: action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
      resolution: resolutionDetails,
      resolvedAt: new Date(),
    },
  });

  logger.info(`Report ${report.id} resolved with action ${action}`);
  res.json({ success: true, data: updated });
}));

// ── GET /api/admin/health — Comprehensive system status & diagnostic tail ────
router.get('/health', authenticateToken, requireRole('ADMIN'), asyncHandler(async (_req, res) => {
  const checks = {
    database: false,
    cache: false,
    latencyMs: 0,
  };

  const startDb = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    checks.latencyMs = Date.now() - startDb;
  } catch (err) {
    checks.database = false;
    checks.dbError = err.message;
  }

  checks.cache = true; // In-memory fallback is always functional

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Recent system health diagnostics
  const healthSummary = {
    status: checks.database ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    memory: {
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    nodeVersion: process.version,
    platform: process.platform,
    checks,
  };

  res.json({ success: true, data: healthSummary });
}));

// ── POST /api/admin/switch-to-official — Dual-barrier switch to SkillSphere Official ─
router.post('/switch-to-official', authenticateToken, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { masterPassword } = req.body;
  const expectedKey = process.env.OFFICIAL_ACCOUNT_PASSWORD || '#basileusKZ07';

  if (!masterPassword || masterPassword !== expectedKey) {
    throw ApiError.forbidden('Invalid official master key authorization.');
  }

  // Ensure official account exists in DB with system attributes
  let officialUser = await prisma.user.findFirst({
    where: { email: { equals: 'official@skillsphere.com', mode: 'insensitive' } },
  });

  if (!officialUser) {
    const hashedPassword = await bcrypt.hash(expectedKey, 10);
    officialUser = await prisma.user.create({
      data: {
        email: 'official@skillsphere.com',
        name: 'SkillSphere',
        password: hashedPassword,
        role: 'ADMIN',
        avatar: '/logo.jpg',
        headline: 'Official Platform Intelligence · Core Engineering & Dispatch',
        bio: 'The official platform system account for SkillSphere. Managing platform updates, core engineering squads, and network dispatches.',
        college: 'SkillSphere Core',
        isActive: true,
      },
    });
  }

  const token = jwt.sign(
    { userId: officialUser.id, email: officialUser.email, role: officialUser.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  logger.info('Admin switched session to SkillSphere Official account', {
    adminId: req.user.userId,
    officialId: officialUser.id,
  });

  res.json({
    success: true,
    message: 'Switched session to SkillSphere Official account',
    token,
    user: {
      id: officialUser.id,
      name: officialUser.name,
      email: officialUser.email,
      role: officialUser.role,
      avatar: officialUser.avatar,
      headline: officialUser.headline,
      bio: officialUser.bio,
      college: officialUser.college,
      isSystemAccount: true,
    },
  });
}));

export default router;
