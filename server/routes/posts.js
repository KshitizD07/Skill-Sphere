import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../services/activityService.js';
import { getIO } from '../socket.js';
import { createLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

const USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  headline: true,
  college: true,
  role: true,
};

const COMMENT_INCLUDE = {
  user: { select: USER_SELECT },
  commentLikes: { select: { userId: true } },
  replies: {
    include: {
      user: { select: USER_SELECT },
      commentLikes: { select: { userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
};

function formatComment(c, currentUserId) {
  const isDeleted = c.content === '[deleted]';
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    content: c.content,
    isDeleted,
    createdAt: c.createdAt,
    author: c.user || { id: c.userId, name: isDeleted ? 'Deleted User' : 'User' },
    likes: (c.commentLikes || []).map((l) => l.userId),
    likeCount: c.commentLikes?.length || 0,
    isLikedByMe: c.commentLikes?.some((l) => l.userId === currentUserId) || false,
    replies: (c.replies || []).map((r) => formatComment(r, currentUserId)),
  };
}

function formatPost(p, currentUserId) {
  const likesList = p.likes || [];
  const commentList = p.comments || [];

  return {
    id: p.id,
    userId: p.userId,
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    author: p.user,
    likes: likesList.map((l) => ({ userId: l.userId })),
    likeCount: p._count?.likes ?? likesList.length,
    commentCount: p._count?.comments ?? commentList.length,
    isLikedByMe: likesList.some((l) => l.userId === currentUserId),
    comments: commentList.map((c) => formatComment(c, currentUserId)),
  };
}

// ── GET /api/posts — Paginated feed (Cursor-based) ───────────────────────────
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const cursor = req.query.cursor?.trim();

  let where = {};
  if (cursor) {
    const cursorPost = await prisma.post.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorPost) {
      where = { createdAt: { lt: cursorPost.createdAt } };
    }
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  const formatted = items.map((p) => formatPost(p, req.user.userId));

  res.json({
    success: true,
    posts: formatted,
    nextCursor,
    hasMore,
  });
}));

// ── GET /api/posts/following — Feed from Followed Users ─────────────────────
router.get('/following', authenticateToken, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const cursor = req.query.cursor?.trim();

  // Find all users the current user follows
  const followingRows = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });

  const followingIds = followingRows.map((r) => r.followingId);

  if (followingIds.length === 0) {
    return res.json({
      success: true,
      posts: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  let where = {
    userId: { in: followingIds },
  };

  if (cursor) {
    const cursorPost = await prisma.post.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorPost) {
      where.createdAt = { lt: cursorPost.createdAt };
    }
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  const formatted = items.map((p) => formatPost(p, currentUserId));

  res.json({
    success: true,
    posts: formatted,
    nextCursor,
    hasMore,
  });
}));

// Legacy alias for /all
router.get('/all', authenticateToken, asyncHandler(async (req, res) => {
  const posts = await prisma.post.findMany({
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(posts.map((p) => formatPost(p, req.user.userId)));
}));

// ── GET /api/posts/user/:userId — User's posts ──────────────────────────────
router.get('/user/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();

  let where = { userId: req.params.userId };
  if (cursor) {
    const cursorPost = await prisma.post.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorPost) {
      where.createdAt = { lt: cursorPost.createdAt };
    }
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json(posts.map((p) => formatPost(p, req.user.userId)));
}));

// ── POST /api/posts — Create Post ────────────────────────────────────────────
router.post('/', authenticateToken, createLimiter, asyncHandler(async (req, res) => {
  const schema = z.object({
    content: z.string().min(1, 'Post content cannot be empty').max(2000, 'Post content exceeds 2000 characters'),
    imageUrl: z.string().nullable().optional(),
  });

  const { content, imageUrl } = schema.parse(req.body);

  const post = await prisma.post.create({
    data: {
      userId: req.user.userId,
      content: content.trim(),
      imageUrl: imageUrl || null,
    },
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
      },
    },
  });

  const preview = content.trim().length > 80 ? `${content.trim().substring(0, 77)}...` : content.trim();
  await logActivity(req.user.userId, 'POST_CREATED', preview);

  const formatted = formatPost(post, req.user.userId);
  res.status(201).json({ success: true, data: formatted });
}));

// ── PUT & PATCH /api/posts/:id — Edit Post ───────────────────────────────────
const handleUpdatePost = asyncHandler(async (req, res) => {
  const schema = z.object({
    content: z.string().min(1, 'Post content cannot be empty').max(2000, 'Post content exceeds 2000 characters'),
  });

  const { content } = schema.parse(req.body);

  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw ApiError.notFound('Post');
  if (post.userId !== req.user.userId) throw ApiError.forbidden('Cannot edit another user post');

  // Check 24-hour edit limit
  const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld > 24) {
    throw ApiError.badRequest('Posts can only be edited within 24 hours of creation.');
  }

  const updated = await prisma.post.update({
    where: { id: req.params.id },
    data: { content: content.trim() },
    include: {
      user: { select: USER_SELECT },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { parentId: null },
        include: COMMENT_INCLUDE,
      },
    },
  });

  const formatted = formatPost(updated, req.user.userId);
  res.json({ success: true, data: formatted });
});

router.put('/:id', authenticateToken, handleUpdatePost);
router.patch('/:id', authenticateToken, handleUpdatePost);

// ── DELETE /api/posts/:id — Delete Post ──────────────────────────────────────
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw ApiError.notFound('Post');

  const isAdmin = req.user.role === 'ADMIN';
  if (post.userId !== req.user.userId && !isAdmin) {
    throw ApiError.forbidden('Cannot delete another user post');
  }

  await prisma.post.delete({ where: { id: req.params.id } });

  const preview = post.content?.trim().length > 80 ? `${post.content.trim().substring(0, 77)}...` : post.content?.trim();
  await logActivity(req.user.userId, 'POST_DELETED', preview || 'Deleted post');

  res.json({ success: true, message: 'Post deleted' });
}));

// ── POST /api/posts/:id/like — Toggle Like ───────────────────────────────────
router.post('/:id/like', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const postId = req.params.id;

  const postExists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!postExists) throw ApiError.notFound('Post');

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  let liked;
  if (existing) {
    await prisma.like.delete({
      where: { postId_userId: { postId, userId } },
    });
    liked = false;
  } else {
    await prisma.like.create({ data: { postId, userId } });
    liked = true;

    // Send in-app notification if not self-like
    if (postExists.userId !== userId) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } });
      if (sender) {
        const notif = await prisma.inAppNotification.create({
          data: {
            userId: postExists.userId,
            type: 'LIKE',
            title: sender.name,
            message: 'liked your post.',
            actionUrl: '/grid',
            senderAvatar: sender.avatar,
          },
        });
        getIO().to(postExists.userId).emit('NOTIFICATION', notif);
      }
    }
  }

  const likeCount = await prisma.like.count({ where: { postId } });
  res.json({ success: true, liked, likeCount });
}));

// ── GET /api/posts/:id/likes — Paginated list of users who liked post ─────────
router.get('/:id/likes', authenticateToken, asyncHandler(async (req, res) => {
  const postId = req.params.id;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();

  let where = { postId };
  if (cursor) {
    const cursorLike = await prisma.like.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorLike) {
      where.createdAt = { lt: cursorLike.createdAt };
    }
  }

  const likes = await prisma.like.findMany({
    where,
    include: {
      user: { select: USER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = likes.length > limit;
  const items = hasMore ? likes.slice(0, limit) : likes;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  const users = items.map((l) => l.user);

  res.json({
    success: true,
    users,
    nextCursor,
    hasMore,
  });
}));

// ── POST /api/posts/:id/comments — Add Comment (2-level depth) ────────────────
const handleAddComment = asyncHandler(async (req, res) => {
  const schema = z.object({
    content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment exceeds 500 characters'),
    parentId: z.string().nullable().optional(),
  });

  const { content, parentId } = schema.parse(req.body);
  const postId = req.params.id;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!post) throw ApiError.notFound('Post');

  let finalParentId = parentId || null;
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parentComment) throw ApiError.notFound('Parent comment');
    if (parentComment.postId !== postId) throw ApiError.badRequest('Parent comment mismatch');
    
    // Enforce max 2 levels: if parent is already a reply, attach to its parent
    if (parentComment.parentId) {
      finalParentId = parentComment.parentId;
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId: req.user.userId,
      content: content.trim(),
      parentId: finalParentId,
    },
    include: COMMENT_INCLUDE,
  });

  const sender = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true, avatar: true } });
  if (sender) {
    if (finalParentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: finalParentId } });
      if (parentComment && parentComment.userId !== req.user.userId) {
        const notif = await prisma.inAppNotification.create({
          data: {
            userId: parentComment.userId,
            type: 'REPLY',
            title: sender.name,
            message: 'replied to your comment.',
            actionUrl: '/grid',
            senderAvatar: sender.avatar,
          },
        });
        getIO().to(parentComment.userId).emit('NOTIFICATION', notif);
      }
    } else if (post.userId !== req.user.userId) {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: post.userId,
          type: 'COMMENT',
          title: sender.name,
          message: 'commented on your post.',
          actionUrl: '/grid',
          senderAvatar: sender.avatar,
        },
      });
      getIO().to(post.userId).emit('NOTIFICATION', notif);
    }
  }

  const formatted = formatComment(comment, req.user.userId);
  res.status(201).json({ success: true, data: formatted });
});

router.post('/:id/comments', authenticateToken, handleAddComment);
router.post('/:id/comment', authenticateToken, handleAddComment); // Legacy alias

// ── GET /api/posts/:id/comments — Paginated Comments ─────────────────────────
router.get('/:id/comments', authenticateToken, asyncHandler(async (req, res) => {
  const postId = req.params.id;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor?.trim();

  let where = { postId, parentId: null };
  if (cursor) {
    const cursorComment = await prisma.comment.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorComment) {
      where.createdAt = { lt: cursorComment.createdAt };
    }
  }

  const comments = await prisma.comment.findMany({
    where,
    include: COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  const formatted = items.map((c) => formatComment(c, req.user.userId));

  res.json({
    success: true,
    comments: formatted,
    nextCursor,
    hasMore,
  });
}));

// ── POST /api/posts/:postId/comments/:commentId/like — Comment Like ──────────
const handleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.userId;

  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, userId: true } });
  if (!comment) throw ApiError.notFound('Comment');

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  let liked;
  if (existing) {
    await prisma.commentLike.delete({
      where: { commentId_userId: { commentId, userId } },
    });
    liked = false;
  } else {
    await prisma.commentLike.create({ data: { commentId, userId } });
    liked = true;

    if (comment.userId !== userId) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } });
      if (sender) {
        const notif = await prisma.inAppNotification.create({
          data: {
            userId: comment.userId,
            type: 'LIKE',
            title: sender.name,
            message: 'liked your comment.',
            actionUrl: '/grid',
            senderAvatar: sender.avatar,
          },
        });
        getIO().to(comment.userId).emit('NOTIFICATION', notif);
      }
    }
  }

  const likeCount = await prisma.commentLike.count({ where: { commentId } });
  res.json({ success: true, liked, likeCount });
});

router.post('/:postId/comments/:commentId/like', authenticateToken, handleCommentLike);
router.post('/:postId/comment/:commentId/like', authenticateToken, handleCommentLike); // Legacy

// ── DELETE /api/posts/:postId/comments/:commentId — Soft/Hard Delete ─────────
const handleDeleteComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user.userId;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { replies: { select: { id: true } } },
  });

  if (!comment) throw ApiError.notFound('Comment');
  if (comment.postId !== postId) throw ApiError.badRequest('Comment/post mismatch');

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
  const isAdmin = req.user.role === 'ADMIN';

  if (comment.userId !== userId && post?.userId !== userId && !isAdmin) {
    throw ApiError.forbidden('Cannot delete this comment');
  }

  // Soft-delete if comment has replies; hard-delete otherwise
  let softDeleted = false;
  if (comment.replies && comment.replies.length > 0) {
    await prisma.comment.update({
      where: { id: commentId },
      data: { content: '[deleted]' },
    });
    softDeleted = true;
  } else {
    await prisma.comment.delete({ where: { id: commentId } });
  }

  res.json({ success: true, softDeleted });
});

router.delete('/:postId/comments/:commentId', authenticateToken, handleDeleteComment);
router.delete('/:postId/comment/:commentId', authenticateToken, handleDeleteComment); // Legacy

// ── POST /api/posts/:id/report — Report Post (Abuse Flagging) ────────────────
router.post('/:id/report', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    reason: z.enum(['SPAM', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER']),
    detail: z.string().max(300).optional(),
  });

  const { reason, detail } = schema.parse(req.body);
  const postId = req.params.id;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!post) throw ApiError.notFound('Post');

  const detailsObj = JSON.stringify({ postId, reason, detail: detail || '' });
  await logActivity(req.user.userId, 'POST_REPORTED', detailsObj);

  // Check how many reports this post has
  const reportsCount = await prisma.activityLog.count({
    where: {
      action: 'POST_REPORTED',
      details: { contains: `"postId":"${postId}"` },
    },
  });

  // If >= 3 reports, notify Admins
  if (reportsCount >= 3) {
    logger.warn('Post reported multiple times', { postId, reportsCount });
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
      await prisma.inAppNotification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM',
          title: 'Post Flagged',
          message: `Post ${postId.slice(0, 8)} has received ${reportsCount} reports (${reason}).`,
          actionUrl: '/antifragile-admin',
        },
      });
    }
  }

  res.json({ success: true, message: 'Report submitted. Thank you for keeping SkillSphere safe.' });
}));

export default router;
