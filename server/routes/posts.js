const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const POST_INCLUDE = {
  user:     { select: { id: true, name: true, avatar: true, college: true } },
  likes:    { select: { userId: true } },
  comments: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  },
};

// Rename 'user' -> 'author' so frontend shape stays consistent
function normalisePosts(posts) {
  return posts.map(p => ({
    ...p,
    author: p.user,
    comments: (p.comments || []).map(c => ({ ...c, author: c.user })),
  }));
}

// GET /api/posts/all  — global feed
router.get('/all', optionalAuth, asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    include:  POST_INCLUDE,
    orderBy:  { createdAt: 'desc' },
    take:     50,
  });
  res.json(normalisePosts(posts));
}));

// GET /api/posts/user/:userId  — profile feed
router.get('/user/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    where:   { userId: req.params.userId },
    include: POST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take:    30,
  });
  res.json(normalisePosts(posts));
}));

// POST /api/posts  — create post
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { content, imageUrl } = req.body;
  if (!content?.trim()) throw ApiError.badRequest('Content is required');

  const post = await prisma.post.create({
    data:    { userId: req.user.userId, content: content.trim(), imageUrl: imageUrl || null },
    include: POST_INCLUDE,
  });

  res.status(201).json(normalisePosts([post])[0]);
}));

// POST /api/posts/:id/like  — toggle like
router.post('/:id/like', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId  = req.user.userId;

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: id, userId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { postId_userId: { postId: id, userId } } });
    return res.json({ liked: false });
  }

  await prisma.like.create({ data: { postId: id, userId } });
  res.json({ liked: true });
}));

// POST /api/posts/:id/comment
router.post('/:id/comment', authenticateToken, asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw ApiError.badRequest('Comment content is required');

  const comment = await prisma.comment.create({
    data:    { postId: req.params.id, userId: req.user.userId, content: content.trim() },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  res.status(201).json(comment);
}));

// DELETE /api/posts/:id
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw ApiError.notFound('Post');
  if (post.userId !== req.user.userId) throw ApiError.forbidden('Cannot delete another user\'s post');

  await prisma.post.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

module.exports = router;