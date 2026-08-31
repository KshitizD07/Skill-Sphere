import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import axios from 'axios';

import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { isUserOnline } from '../socket.js';
import { sendNotification } from '../utils/notify.js';
import { normalizeSkillCanonical } from '../utils/skillNormalizer.js';

const router = express.Router();
const prisma = new PrismaClient();

// ── Shared select shapes ─────────────────────────────────────────────────────

const PROFILE_SELECT = {
  id: true, name: true, email: true, role: true, college: true,
  headline: true, bio: true, avatar: true, github: true, linkedin: true, createdAt: true,
  leetcodeUsername: true, leetcodeDSAScore: true, leetcodeDSALevel: true,
  leetcodeEasy: true, leetcodeMedium: true, leetcodeHard: true,
  leetcodeTotalPoints: true, leetcodeLanguages: true, leetcodeSyncedAt: true,
  skills: {
    orderBy: [{ isVerified: 'desc' }, { calculatedScore: 'desc' }],
    select: {
      id: true, name: true, level: true, isVerified: true,
      calculatedScore: true, showLevel: true, verificationUrl: true,
      verificationSource: true, verifiedAt: true,
    },
  },
};

const PUBLIC_PROFILE_SELECT = { ...PROFILE_SELECT };
delete PUBLIC_PROFILE_SELECT.email;

function normaliseSkills(user) {
  if (!user?.skills) return user;
  return {
    ...user,
    skills: user.skills.map((s) => ({
      ...s,
      skill: { id: s.id, name: s.name },
    })),
  };
}

// ── GET /api/users — Paginated Network User Discovery ────────────────────────
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const search = req.query.search?.trim();
  const role = req.query.role?.trim(); // STUDENT | PROFESSIONAL | RECRUITER | ALL
  const skill = req.query.skill?.trim();
  const college = req.query.college?.trim();
  const verifiedOnly = req.query.verifiedOnly === 'true';
  const sort = req.query.sort?.trim() || 'newest'; // newest | most_skills | highest_score
  const cursor = req.query.cursor?.trim();
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  // Cache fingerprint for 60s
  const queryFingerprint = `network:discovery:${JSON.stringify(req.query)}:${currentUserId}`;
  const cached = await cache.get(queryFingerprint);
  if (cached) return res.json(cached);

  const where = {
    id: { not: currentUserId }, // Exclude self
  };

  if (role && role !== 'ALL') {
    where.role = role;
  }

  if (college) {
    where.college = { contains: college, mode: 'insensitive' };
  }

  if (skill) {
    where.skills = {
      some: {
        name: { contains: skill, mode: 'insensitive' },
        ...(verifiedOnly ? { isVerified: true } : {}),
      },
    };
  } else if (verifiedOnly) {
    where.skills = {
      some: { isVerified: true },
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { headline: { contains: search, mode: 'insensitive' } },
      { college: { contains: search, mode: 'insensitive' } },
      { skills: { some: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  if (cursor) {
    const cursorUser = await prisma.user.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorUser) {
      where.createdAt = { lt: cursorUser.createdAt };
    }
  }

  let orderBy = [{ createdAt: 'desc' }];
  if (sort === 'newest') {
    orderBy = [{ createdAt: 'desc' }];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      headline: true,
      college: true,
      createdAt: true,
      skills: {
        orderBy: [{ isVerified: 'desc' }, { calculatedScore: 'desc' }],
        select: {
          id: true,
          name: true,
          level: true,
          isVerified: true,
          calculatedScore: true,
        },
      },
    },
    orderBy,
    take: limit + 1,
  });

  const hasMore = users.length > limit;
  const rawList = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore && rawList.length > 0 ? rawList[rawList.length - 1].id : null;

  // Format and enrich each user
  let formatted = rawList.map((u) => {
    const verifiedSkills = (u.skills || []).filter((s) => s.isVerified);
    const topScore = u.skills?.length > 0 ? Math.max(...u.skills.map((s) => s.calculatedScore || 0)) : 0;

    return {
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      headline: u.headline,
      college: u.college,
      createdAt: u.createdAt,
      verifiedSkillCount: verifiedSkills.length,
      totalSkillCount: (u.skills || []).length,
      topScore,
      topSkills: (u.skills || []).slice(0, 4),
      isOnline: isUserOnline(u.id),
    };
  });

  // Client sorting in memory for aggregate properties if requested
  if (sort === 'most_skills') {
    formatted = formatted.sort((a, b) => b.verifiedSkillCount - a.verifiedSkillCount || b.totalSkillCount - a.totalSkillCount);
  } else if (sort === 'highest_score') {
    formatted = formatted.sort((a, b) => b.topScore - a.topScore);
  }

  const responsePayload = {
    success: true,
    data: formatted,
    nextCursor,
    hasMore,
  };

  // Cache for 60 seconds
  await cache.set(queryFingerprint, responsePayload, 60);

  res.json(responsePayload);
}));

// ── GET /api/users/suggested — "People You May Know" ─────────────────────────
router.get('/suggested', authenticateToken, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      college: true,
      skills: { select: { name: true } },
    },
  });

  if (!currentUser) throw ApiError.notFound('User');

  const mySkills = (currentUser.skills || []).map((s) => s.name.toLowerCase());
  const myCollege = currentUser.college;

  // Find candidate peers
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      OR: [
        ...(myCollege ? [{ college: { equals: myCollege, mode: 'insensitive' } }] : []),
        ...(mySkills.length > 0
          ? [{ skills: { some: { name: { in: mySkills, mode: 'insensitive' } } } }]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      headline: true,
      college: true,
      skills: {
        select: { id: true, name: true, isVerified: true, calculatedScore: true },
      },
    },
    take: 20,
  });

  // Score and rank candidates
  const scored = candidates.map((cand) => {
    let score = 0;
    let matchReasons = [];
    const candSkillNames = (cand.skills || []).map((s) => s.name.toLowerCase());
    const sharedSkills = mySkills.filter((s) => candSkillNames.includes(s));

    if (myCollege && cand.college && myCollege.toLowerCase() === cand.college.toLowerCase()) {
      score += 10;
      matchReasons.push(`Also from ${cand.college}`);
    }

    if (sharedSkills.length > 0) {
      score += sharedSkills.length * 5;
      const formattedSkills = (cand.skills || [])
        .filter((s) => sharedSkills.includes(s.name.toLowerCase()))
        .map((s) => s.name);
      matchReasons.push(`Both know ${formattedSkills.slice(0, 2).join(', ')}`);
    }

    const verifiedCount = (cand.skills || []).filter((s) => s.isVerified).length;
    score += verifiedCount * 2;

    return {
      id: cand.id,
      name: cand.name,
      avatar: cand.avatar,
      role: cand.role,
      headline: cand.headline,
      college: cand.college,
      matchingSkills: sharedSkills,
      matchReason: matchReasons[0] || 'Recommended in your network',
      verifiedSkillCount: verifiedCount,
      topSkills: (cand.skills || []).slice(0, 3),
      isOnline: isUserOnline(cand.id),
      _matchScore: score,
    };
  });

  // Top 6 ranked
  const topSuggestions = scored.sort((a, b) => b._matchScore - a._matchScore).slice(0, 6);

  // If fewer than 6, backfill with most active/verified users
  if (topSuggestions.length < 6) {
    const existingIds = [currentUserId, ...topSuggestions.map((s) => s.id)];
    const backfill = await prisma.user.findMany({
      where: { id: { notIn: existingIds } },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        headline: true,
        college: true,
        skills: {
          select: { id: true, name: true, isVerified: true, calculatedScore: true },
        },
      },
      take: 6 - topSuggestions.length,
    });

    for (const b of backfill) {
      topSuggestions.push({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        role: b.role,
        headline: b.headline,
        college: b.college,
        matchingSkills: [],
        matchReason: 'Active on SkillSphere',
        verifiedSkillCount: (b.skills || []).filter((s) => s.isVerified).length,
        topSkills: (b.skills || []).slice(0, 3),
        isOnline: isUserOnline(b.id),
      });
    }
  }

  res.json({ success: true, data: topSuggestions });
}));

// ── GET /api/users/colleges — Unique Colleges ────────────────────────────────
router.get('/colleges', authenticateToken, asyncHandler(async (_req, res) => {
  const colleges = await prisma.user.findMany({
    where: { college: { not: null }, NOT: { college: '' } },
    select: { college: true },
    distinct: ['college'],
    take: 50,
  });

  const list = colleges.map((c) => c.college).filter(Boolean);
  res.json({ success: true, data: list });
}));

// ── GET /api/users/me ────────────────────────────────────────────────────────
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.user.userId}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: PROFILE_SELECT });
  if (!user) throw ApiError.notFound('User');

  const result = normaliseSkills(user);
  await cache.set(cacheKey, result, 300);

  logger.info('Profile fetched', { userId: req.user.userId });
  res.json({ success: true, data: result });
}));

// ── PATCH /api/users/me ──────────────────────────────────────────────────────
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    name:     z.string().min(2).max(80).optional(),
    headline: z.string().max(120).optional(),
    bio:      z.string().max(500).optional(),
    avatar:   z.string().max(500_000).optional(), // base64 or URL
    github:   z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    college:  z.string().optional(),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where:  { id: req.user.userId },
    data,
    select: PROFILE_SELECT,
  });

  // Invalidate cache so next /me read is fresh
  await cache.del(`user:profile:${req.user.userId}`);

  await prisma.activityLog.create({
    data: { userId: req.user.userId, action: 'PROFILE_UPDATED', details: 'Updated profile fields' },
  });

  logger.info('Profile updated', { userId: req.user.userId, fields: Object.keys(data) });
  res.json({ success: true, data: normaliseSkills(user) });
}));

// ── POST /api/users/me/skills — bulk sync user profile skills (supports skill removal & canonicalization) ───
router.post('/me/skills', authenticateToken, asyncHandler(async (req, res) => {
  const { skillIds } = z.object({ skillIds: z.array(z.string()) }).parse(req.body);
  const normalizedRequested = [...new Set(skillIds.map((s) => normalizeSkillCanonical(s)).filter(Boolean))];

  // Fetch current skills
  const existingSkills = await prisma.skill.findMany({
    where: { userId: req.user.userId },
  });

  // Identify skills to delete (skills in DB that are no longer in the requested list)
  const toDelete = existingSkills.filter((s) =>
    !normalizedRequested.some((reqName) => reqName.toLowerCase() === s.name.toLowerCase())
  );

  if (toDelete.length > 0) {
    await prisma.skill.deleteMany({
      where: { id: { in: toDelete.map((s) => s.id) } },
    });
  }

  // Identify new skills to add
  const existingNamesLower = new Set(
    existingSkills
      .filter((s) => !toDelete.some((d) => d.id === s.id))
      .map((s) => s.name.toLowerCase())
  );

  const toCreate = normalizedRequested
    .filter((name) => !existingNamesLower.has(name.toLowerCase()))
    .map((name) => ({
      userId: req.user.userId,
      name,
      level: 'Beginner',
      isVerified: false,
      showLevel: true,
    }));

  if (toCreate.length > 0) {
    await prisma.skill.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  await cache.del(`user:profile:${req.user.userId}`);
  res.json({ success: true, count: normalizedRequested.length });
}));

// ── PATCH /api/users/me/skills/:id — Add proof URL ───────────────────────────
router.patch('/me/skills/:id', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    verificationUrl: z.string().url(),
    source: z.enum(['CREDENTIAL', 'MANUAL']).default('MANUAL'),
  });

  const { verificationUrl, source } = schema.parse(req.body);

  const skill = await prisma.skill.update({
    where: { id: req.params.id, userId: req.user.userId },
    data: {
      verificationUrl,
      verificationSource: source,
      isVerified: verificationUrl.includes('credly.com') ||
                  verificationUrl.includes('aws.amazon.com') ||
                  verificationUrl.includes('coursera.org'),
      verifiedAt: new Date(),
    },
  });

  await cache.del(`user:profile:${req.user.userId}`);
  res.json({ success: true, data: skill });
}));

// ── GET /api/users/me/github-stats ────────────────────────────────────────────
router.get('/me/github-stats', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: { github: true },
  });

  if (!user?.github) {
    return res.json({ success: true, data: null });
  }

  const username = user.github.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').trim();

  const cacheKey = `github:stats:${username}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const headers = {
    Accept:       'application/vnd.github+json',
    'User-Agent': 'SkillSphere',
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  const [profileRes, reposRes] = await Promise.allSettled([
    axios.get(`https://api.github.com/users/${username}`,                             { headers }),
    axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
  ]);

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const repos   = reposRes.status   === 'fulfilled' ? reposRes.value.data  : [];

  if (!profile) {
    logger.warn('GitHub user not found', { username, userId: req.user.userId });
    return res.json({ success: true, data: null });
  }

  const langMap = {};
  for (const repo of repos) {
    if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + 1;
  }
  const topLanguages = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);

  const stats = {
    username,
    publicRepos:  profile.public_repos,
    followers:    profile.followers,
    following:    profile.following,
    totalStars,
    topLanguages,
    avatarUrl:    profile.avatar_url,
    profileUrl:   profile.html_url,
    bio:          profile.bio,
    company:      profile.company,
    blog:         profile.blog,
    location:     profile.location,
    createdAt:    profile.created_at,
  };

  await cache.set(cacheKey, stats, 3600);
  res.json({ success: true, data: stats });
}));

// ── GET /api/users/me/completeness ────────────────────────────────────────────
router.get('/me/completeness', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: {
      avatar: true, headline: true, bio: true, college: true,
      github: true, linkedin: true, leetcodeUsername: true,
      skills: { select: { id: true, isVerified: true } },
      githubRepos: { where: { isSelected: true }, select: { id: true } },
    },
  });

  if (!user) throw ApiError.notFound('User');

  const verifiedSkills = user.skills.filter(s => s.isVerified).length;
  const totalSkills    = user.skills.length;
  const hasPortfolio   = user.githubRepos.length > 0;

  const checks = [
    { key: 'avatar',          label: 'Profile photo',             done: !!user.avatar,          points: 10 },
    { key: 'headline',        label: 'Professional headline',     done: !!user.headline,         points: 10 },
    { key: 'bio',             label: 'Bio / About',               done: !!user.bio,              points: 10 },
    { key: 'college',         label: 'Institution / College',     done: !!user.college,          points: 10 },
    { key: 'github',          label: 'GitHub account linked',     done: !!user.github,           points: 20 },
    { key: 'linkedin',        label: 'LinkedIn profile',          done: !!user.linkedin,         points: 5  },
    { key: 'skills',          label: '3 or more skills added',    done: totalSkills >= 3,        points: 10 },
    { key: 'verifiedSkills',  label: 'At least 1 verified skill', done: verifiedSkills >= 1,     points: 20 },
    { key: 'portfolio',       label: 'Portfolio repos selected',  done: hasPortfolio,            points: 5  },
    { key: 'leetcode',        label: 'LeetCode profile linked',   done: !!user.leetcodeUsername, points: 0  },
  ];

  const earnedPoints = checks.reduce((sum, c) => sum + (c.done ? c.points : 0), 0);
  const maxPoints    = checks.reduce((sum, c) => sum + c.points, 0);
  const score        = Math.round((earnedPoints / maxPoints) * 100);

  res.json({
    success: true,
    data:    { score, checks, earnedPoints, maxPoints },
  });
}));

// ── GET /api/users/search?q= ─────────────────────────────────────────────────
router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json({ success: true, data: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name:     { contains: q, mode: 'insensitive' } },
        { college:  { contains: q, mode: 'insensitive' } },
        { headline: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, avatar: true, college: true, role: true, headline: true },
    take: 10,
  });

  res.json({ success: true, data: users });
}));

// ── GET /api/users/filter?role=&college=&search= ─────────────────────────────
router.get('/filter', authenticateToken, asyncHandler(async (req, res) => {
  const { role, college, search } = req.query;

  const where = {};
  if (role && role !== 'ALL') where.role = role;
  if (college) where.college = { contains: college, mode: 'insensitive' };
  if (search?.trim()) {
    where.OR = [
      { name:     { contains: search, mode: 'insensitive' } },
      { college:  { contains: search, mode: 'insensitive' } },
      { headline: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      avatar: true,
      college: true,
      role: true,
      headline: true,
      skills: {
        select: { id: true, name: true, level: true, isVerified: true },
        take: 3,
      },
    },
    take: 50,
  });

  res.json({ success: true, data: users });
}));

// ── POST /api/users/:id/follow — Follow a user ──────────────────────────────
router.post('/:id/follow', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.userId;

  if (targetId === currentUserId) {
    throw ApiError.badRequest('You cannot follow yourself');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true },
  });

  if (!targetUser) throw ApiError.notFound('Target user not found');

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, name: true, avatar: true },
  });

  // Create follow record idempotently
  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetId,
      },
    },
    update: {},
    create: {
      followerId: currentUserId,
      followingId: targetId,
    },
  });

  // Clear cache
  await cache.del(`user:profile:${targetId}`);
  await cache.del(`user:profile:${currentUserId}`);

  // Send real-time in-app notification to target user
  await sendNotification(targetId, {
    type: 'FOLLOW',
    title: 'New Follower',
    message: `👤 ${currentUser.name} started following you`,
    actionUrl: `/profile/${currentUser.id}`,
    senderAvatar: currentUser.avatar,
  });

  // Compute counts and mutual status
  const [followerCount, isMutual] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetId } }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetId,
          followingId: currentUserId,
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      following: true,
      followerCount,
      isMutual: !!isMutual,
    },
  });
}));

// ── DELETE /api/users/:id/follow — Unfollow a user ────────────────────────────
router.delete('/:id/follow', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.userId;

  await prisma.follow.deleteMany({
    where: {
      followerId: currentUserId,
      followingId: targetId,
    },
  });

  // Clear cache
  await cache.del(`user:profile:${targetId}`);
  await cache.del(`user:profile:${currentUserId}`);

  const followerCount = await prisma.follow.count({ where: { followingId: targetId } });

  res.json({
    success: true,
    data: {
      following: false,
      followerCount,
      isMutual: false,
    },
  });
}));

// ── GET /api/users/:id/followers — Paginated Followers List ──────────────────
router.get('/:id/followers', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.userId;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();

  const followers = await prisma.follow.findMany({
    where: { followingId: targetId },
    include: {
      follower: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
          college: true,
          role: true,
        },
      },
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = followers.length > limit;
  const resultList = hasMore ? followers.slice(0, limit) : followers;
  const nextCursor = hasMore ? resultList[resultList.length - 1].id : null;

  // Find who the current user is following among these
  const followerIds = resultList.map((f) => f.follower.id);
  const myFollowing = await prisma.follow.findMany({
    where: {
      followerId: currentUserId,
      followingId: { in: followerIds },
    },
    select: { followingId: true },
  });
  const myFollowingSet = new Set(myFollowing.map((f) => f.followingId));

  const data = resultList.map((f) => ({
    ...f.follower,
    isFollowing: myFollowingSet.has(f.follower.id),
    isSelf: f.follower.id === currentUserId,
  }));

  res.json({
    success: true,
    data: {
      followers: data,
      nextCursor,
      hasMore,
    },
  });
}));

// ── GET /api/users/:id/following — Paginated Following List ──────────────────
router.get('/:id/following', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.userId;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();

  const followings = await prisma.follow.findMany({
    where: { followerId: targetId },
    include: {
      following: {
        select: {
          id: true,
          name: true,
          avatar: true,
          headline: true,
          college: true,
          role: true,
        },
      },
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = followings.length > limit;
  const resultList = hasMore ? followings.slice(0, limit) : followings;
  const nextCursor = hasMore ? resultList[resultList.length - 1].id : null;

  // Find who the current user is following among these
  const followingIds = resultList.map((f) => f.following.id);
  const myFollowing = await prisma.follow.findMany({
    where: {
      followerId: currentUserId,
      followingId: { in: followingIds },
    },
    select: { followingId: true },
  });
  const myFollowingSet = new Set(myFollowing.map((f) => f.followingId));

  const data = resultList.map((f) => ({
    ...f.following,
    isFollowing: myFollowingSet.has(f.following.id),
    isSelf: f.following.id === currentUserId,
  }));

  res.json({
    success: true,
    data: {
      following: data,
      nextCursor,
      hasMore,
    },
  });
}));

// ── GET /api/users/:id — public profile ──────────────────────────────────────
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.userId;

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      ...PUBLIC_PROFILE_SELECT,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });
  if (!user) throw ApiError.notFound('User');

  const [isFollowedByMe, isFollowingMe] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetId,
        },
      },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetId,
          followingId: currentUserId,
        },
      },
    }),
  ]);

  const result = {
    ...normaliseSkills(user),
    followerCount: user._count?.followers || 0,
    followingCount: user._count?.following || 0,
    isFollowedByMe: !!isFollowedByMe,
    isFollowingMe: !!isFollowingMe,
    isMutual: !!isFollowedByMe && !!isFollowingMe,
  };

  res.json({ success: true, data: result });
}));

// ── DELETE /api/users/me ─────────────────────────────────────────────────────
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.user.userId } });

  res.clearCookie('ss_token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  });

  logger.info('Account deleted', { userId: req.user.userId });
  res.json({ success: true, message: 'Account deleted' });
}));

export default router;
