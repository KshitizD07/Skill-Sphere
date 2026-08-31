import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/search — Unified Search Across Users, Squads, and Posts ──────────
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { q, type = 'all', limit = 10 } = req.query;
  const maxLimit = Math.min(Number(limit) || 10, 50);

  if (!q?.trim()) {
    return res.json({
      success: true,
      data: { users: [], squads: [], posts: [] }
    });
  }

  const query = q.trim();
  const searchPromises = {};

  // 1. User Search (name, headline, or skill match)
  if (type === 'all' || type === 'users') {
    searchPromises.users = prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { headline: { contains: query, mode: 'insensitive' } },
          { skills: { some: { name: { contains: query, mode: 'insensitive' } } } }
        ]
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        headline: true,
        college: true,
        role: true,
        skills: {
          select: { name: true, isVerified: true, calculatedScore: true }
        }
      },
      take: maxLimit * 2 // Fetch more to allow JS ranking / sorting
    }).then(users => {
      // Relevance Ranking in JS
      return users.map(user => {
        let score = 0;
        const nameLower = user.name.toLowerCase();
        const queryLower = query.toLowerCase();

        if (nameLower === queryLower) score += 100;
        else if (nameLower.includes(queryLower)) score += 50;

        if (user.headline?.toLowerCase().includes(queryLower)) score += 20;

        const matchingSkill = user.skills.find(s => s.name.toLowerCase().includes(queryLower));
        if (matchingSkill) {
          score += 30;
          if (matchingSkill.isVerified) score += 20;
          score += (matchingSkill.calculatedScore || 0);
        }

        const verifiedCount = user.skills.filter(s => s.isVerified).length;
        score += verifiedCount * 5;

        return { ...user, searchScore: score };
      })
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, maxLimit);
    });
  }

  // 2. Squad Search (title or description match)
  if (type === 'all' || type === 'squads') {
    searchPromises.squads = prisma.squad.findMany({
      where: {
        status: { in: ['OPEN', 'FULL'] },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        maxMembers: true,
        currentMembers: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: maxLimit
    });
  }

  // 3. Post Search (full-text using PostgreSQL tsvector fallback to ILIKE)
  if (type === 'all' || type === 'posts') {
    searchPromises.posts = (async () => {
      try {
        // Try tsvector full-text search first
        const rawPosts = await prisma.$queryRaw`
          SELECT p.id, p."userId", p.content, p."imageUrl", p."createdAt",
                 u.name as "userName", u.avatar as "userAvatar"
          FROM "Post" p
          JOIN "User" u ON p."userId" = u.id
          WHERE to_tsvector('english', p.content) @@ plainto_tsquery('english', ${query})
          ORDER BY ts_rank(to_tsvector('english', p.content), plainto_tsquery('english', ${query})) DESC
          LIMIT ${maxLimit}
        `;
        return rawPosts;
      } catch (err) {
        // Fallback to standard ILIKE search
        const fallbackList = await prisma.post.findMany({
          where: {
            content: { contains: query, mode: 'insensitive' }
          },
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          take: maxLimit,
          orderBy: { createdAt: 'desc' }
        });
        return fallbackList.map(p => ({
          id: p.id,
          userId: p.userId,
          content: p.content,
          imageUrl: p.imageUrl,
          createdAt: p.createdAt,
          userName: p.user?.name,
          userAvatar: p.user?.avatar
        }));
      }
    })();
  }

  const results = await Promise.all(Object.values(searchPromises));
  const keys = Object.keys(searchPromises);
  const responseData = {};

  keys.forEach((key, index) => {
    responseData[key] = results[index];
  });

  res.json({
    success: true,
    data: {
      users: responseData.users || [],
      squads: responseData.squads || [],
      posts: responseData.posts || []
    }
  });
}));

// ── GET /api/search/suggestions — Instant Autocomplete Suggestions ───────────
router.get('/suggestions', authenticateToken, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q?.trim()) {
    return res.json({ success: true, data: [] });
  }

  const query = q.trim();

  // Try retrieving cached suggestions for 30 seconds
  const cacheKey = `search:suggest:${query.toLowerCase()}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const [users, squads] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        name: { contains: query, mode: 'insensitive' }
      },
      select: { id: true, name: true, avatar: true },
      take: 5
    }),
    prisma.squad.findMany({
      where: {
        status: 'OPEN',
        title: { contains: query, mode: 'insensitive' }
      },
      select: { id: true, title: true },
      take: 5
    })
  ]);

  const suggestions = [
    ...users.map(u => ({ id: u.id, text: u.name, type: 'user', avatar: u.avatar })),
    ...squads.map(s => ({ id: s.id, text: s.title, type: 'squad' }))
  ].slice(0, 5);

  // Cache suggestions for 30s
  await cache.set(cacheKey, suggestions, 30);

  res.json({ success: true, data: suggestions });
}));

// ── GET /api/search/trending — Trending Skills & Squads ──────────────────────
router.get('/trending', authenticateToken, asyncHandler(async (_req, res) => {
  const cacheKey = 'search:trending';
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Trending Skills (most verified in last 7 days)
  let skills = await prisma.skill.groupBy({
    by: ['name'],
    _count: { name: true },
    where: {
      isVerified: true,
      verifiedAt: { gte: sevenDaysAgo }
    },
    orderBy: {
      _count: { name: 'desc' }
    },
    take: 8
  });

  if (skills.length === 0) {
    // Fallback: most common verified overall
    skills = await prisma.skill.groupBy({
      by: ['name'],
      _count: { name: true },
      where: { isVerified: true },
      orderBy: { _count: { name: 'desc' } },
      take: 8
    });
  }

  // 2. Trending Squads (most applications in last 7 days)
  const trendingApplications = await prisma.squadApplication.groupBy({
    by: ['squadId'],
    _count: { squadId: true },
    where: {
      appliedAt: { gte: sevenDaysAgo }
    },
    orderBy: {
      _count: { squadId: 'desc' }
    },
    take: 5
  });

  const squadIds = trendingApplications.map(t => t.squadId);
  let squadsList = [];

  if (squadIds.length > 0) {
    squadsList = await prisma.squad.findMany({
      where: { id: { in: squadIds } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        maxMembers: true,
        currentMembers: true
      }
    });
  }

  if (squadsList.length === 0) {
    // Fallback: newest squads
    squadsList = await prisma.squad.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        maxMembers: true,
        currentMembers: true
      }
    });
  }

  const payload = {
    skills: skills.map(s => s.name),
    squads: squadsList
  };

  // Cache for 1 hour (3600 seconds)
  await cache.set(cacheKey, payload, 3600);

  res.json({ success: true, data: payload });
}));

export default router;
