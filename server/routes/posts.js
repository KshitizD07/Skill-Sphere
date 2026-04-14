const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, ApiError } = require('../utils/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../services/activityService'); // ✅ added
const { getIO } = require('../socket');

const router = express.Router();
const prisma  = new PrismaClient();

const COMMENT_INCLUDE = {
  user:         { select: { id: true, name: true, avatar: true } },
  commentLikes: { select: { userId: true } },
  replies: {
    include: {
      user:         { select: { id: true, name: true, avatar: true } },
      commentLikes: { select: { userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
};

const POST_INCLUDE = {
  user:     { select: { id: true, name: true, avatar: true, college: true } },
  likes:    { select: { userId: true } },
  comments: {
    where:   { parentId: null },
    include: COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  },
};

function normaliseComment(c) {
  return {
    ...c,
    author:  c.user,
    likes:   c.commentLikes || [],
    replies: (c.replies || []).map(r => ({ ...r, author: r.user, likes: r.commentLikes || [] })),
  };
}

function normalisePosts(posts) {
  return posts.map(p => ({
    ...p,
    author:   p.user,
    comments: (p.comments || []).map(normaliseComment),
  }));
}

router.get('/all', optionalAuth, asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    include: POST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(normalisePosts(posts));
}));

router.get('/user/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { userId: req.params.userId },
    include: POST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  res.json(normalisePosts(posts));
}));

// ✅ CREATE POST + LOG ACTIVITY
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { content, imageUrl } = req.body;

  if (!content?.trim()) throw ApiError.badRequest('Content is required');
  if (content.length > 500) throw ApiError.badRequest('Post exceeds 500 character limit');

  const post = await prisma.post.create({
    data: {
      userId: req.user.userId,
      content: content.trim(),
      imageUrl: imageUrl || null
    },
    include: POST_INCLUDE
  });

  // 🔥 Log major activity
  const preview = content.trim()
    ? (content.trim().length > 80 ? content.trim().substring(0, 77) + '...' : content.trim())
    : (imageUrl ? 'Shared an image' : 'New post');
  await logActivity(req.user.userId, 'POST_CREATED', preview);

  res.status(201).json(normalisePosts([post])[0]);
}));

router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) throw ApiError.badRequest('Content is required');
  if (content.length > 500) throw ApiError.badRequest('Post exceeds 500 character limit');

  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw ApiError.notFound('Post');
  if (post.userId !== req.user.userId) throw ApiError.forbidden('Cannot edit another user post');

  const updated = await prisma.post.update({
    where: { id: req.params.id },
    data: { content: content.trim() },
    include: POST_INCLUDE
  });

  res.json(normalisePosts([updated])[0]);
}));

// ✅ DELETE POST + LOG ACTIVITY
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });

  if (!post) throw ApiError.notFound('Post');
  if (post.userId !== req.user.userId) throw ApiError.forbidden('Cannot delete another user post');

  await prisma.post.delete({ where: { id: req.params.id } });

  // 🔥 Log major activity
  const preview = post.content?.trim()
    ? (post.content.trim().length > 80 ? post.content.trim().substring(0, 77) + '...' : post.content.trim())
    : (post.imageUrl ? 'Removed an image post' : 'Removed a post');
  await logActivity(req.user.userId, 'POST_DELETED', preview);

  res.json({ success: true });
}));

router.post('/:id/like', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const postId = req.params.id;

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } }
  });

  if (existing) {
    await prisma.like.delete({
      where: { postId_userId: { postId, userId } }
    });
    return res.json({ liked: false });
  }

  await prisma.like.create({ data: { postId, userId } });

  const post = await prisma.post.findUnique({ where: { id: postId }, include: { user: true } });
  if (post && post.userId !== userId) {
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    if (sender) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: post.userId,
          type: 'LIKE',
          title: sender.name,
          message: 'liked your post.',
          actionUrl: '/grid',
          senderAvatar: sender.avatar
        }
      });
      getIO().to(post.userId).emit('NOTIFICATION', notif);
    }
  }

  res.json({ liked: true });
}));

router.post('/:id/comment', authenticateToken, asyncHandler(async (req, res) => {
  const { content, parentId } = req.body;

  if (!content?.trim()) throw ApiError.badRequest('Comment cannot be empty');
  if (content.length > 300) throw ApiError.badRequest('Comment exceeds 300 characters');

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) throw ApiError.notFound('Parent comment');
    if (parent.postId !== req.params.id) throw ApiError.badRequest('Parent comment mismatch');
  }

  const comment = await prisma.comment.create({
    data: {
      postId: req.params.id,
      userId: req.user.userId,
      content: content.trim(),
      parentId: parentId || null
    },
    include: COMMENT_INCLUDE,
  });

  const sender = await prisma.user.findUnique({ where: { id: req.user.userId } });
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  
  if (sender) {
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (parentComment && parentComment.userId !== req.user.userId) {
        const notif = await prisma.inAppNotification.create({
          data: {
            userId: parentComment.userId,
            type: 'REPLY',
            title: sender.name,
            message: 'replied to your comment.',
            actionUrl: '/grid',
            senderAvatar: sender.avatar
          }
        });
        getIO().to(parentComment.userId).emit('NOTIFICATION', notif);
      }
    } else if (post && post.userId !== req.user.userId) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: post.userId,
          type: 'COMMENT',
          title: sender.name,
          message: 'commented on your post.',
          actionUrl: '/grid',
          senderAvatar: sender.avatar
        }
      });
      getIO().to(post.userId).emit('NOTIFICATION', notif);
    }
  }

  res.status(201).json(normaliseComment(comment));
}));

router.delete('/:postId/comment/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user.userId;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw ApiError.notFound('Comment');
  if (comment.postId !== postId) throw ApiError.badRequest('Comment/post mismatch');

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (comment.userId !== userId && post?.userId !== userId)
    throw ApiError.forbidden('Cannot delete this comment');

  await prisma.comment.delete({ where: { id: commentId } });
  res.json({ success: true });
}));

router.post('/:postId/comment/:commentId/like', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.userId;

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } }
  });

  if (existing) {
    await prisma.commentLike.delete({
      where: { commentId_userId: { commentId, userId } }
    });
    return res.json({ liked: false });
  }

  await prisma.commentLike.create({ data: { commentId, userId } });

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (comment && comment.userId !== userId) {
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    if (sender) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: comment.userId,
          type: 'LIKE',
          title: sender.name,
          message: 'liked your comment.',
          actionUrl: '/grid',
          senderAvatar: sender.avatar
        }
      });
      getIO().to(comment.userId).emit('NOTIFICATION', notif);
    }
  }

  res.json({ liked: true });
}));

module.exports = router;