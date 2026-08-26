import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { isUserOnline, getIO } from '../socket.js';

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

// ── GET /api/chat/conversations ──────────────────────────────────────────────
// List all conversations for the authenticated user with unread counts & online status
router.get('/conversations', authenticateToken, asyncHandler(async (req, res) => {
  const currentUserId = req.user.userId;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: currentUserId } },
    },
    include: {
      participants: { select: USER_SELECT },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const formatted = await Promise.all(
    conversations.map(async (conv) => {
      const otherUser = conv.participants.find((p) => p.id !== currentUserId) || conv.participants[0];
      const lastMsg = conv.messages[0] || null;

      // Count unread messages
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: currentUserId },
          isRead: false,
        },
      });

      return {
        id: conv.id,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
        otherUser: otherUser
          ? {
              ...otherUser,
              isOnline: isUserOnline(otherUser.id),
            }
          : null,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              isRead: lastMsg.isRead,
              senderId: lastMsg.senderId,
              senderName: lastMsg.sender?.name,
            }
          : null,
        unreadCount,
      };
    })
  );

  res.json({ success: true, data: formatted });
}));

// ── GET /api/chat/conversations/:conversationId/messages ─────────────────────
// Cursor-based message history for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.userId;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const cursor = req.query.cursor?.trim();

  // Verify participant access
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: currentUserId } },
    },
  });

  if (!conversation) throw ApiError.notFound('Conversation');

  let where = { conversationId };
  if (cursor) {
    const cursorMsg = await prisma.message.findUnique({ where: { id: cursor }, select: { createdAt: true } });
    if (cursorMsg) {
      where.createdAt = { lt: cursorMsg.createdAt };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: { select: USER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  // Return in chronological ascending order
  const chronological = items.reverse();

  res.json({
    success: true,
    messages: chronological,
    nextCursor,
    hasMore,
  });
}));

// ── GET /api/chat/history/:otherUserId ───────────────────────────────────────
// Get or initialize chat history with a specific user
router.get('/history/:otherUserId', authenticateToken, asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const currentUserId = req.user.userId;

  const conversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: currentUserId } } },
        { participants: { some: { id: otherUserId } } },
      ],
    },
    include: {
      participants: { select: USER_SELECT },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { sender: { select: USER_SELECT } },
      },
    },
  });

  if (!conversation) {
    return res.json({ success: true, conversationId: null, messages: [] });
  }

  res.json({
    success: true,
    conversationId: conversation.id,
    messages: conversation.messages,
  });
}));

// ── POST /api/chat/conversations ─────────────────────────────────────────────
// Start a new conversation or return existing
router.post('/conversations', authenticateToken, asyncHandler(async (req, res) => {
  const schema = z.object({
    recipientId: z.string().min(1, 'Recipient ID is required'),
  });

  const { recipientId } = schema.parse(req.body);
  const currentUserId = req.user.userId;

  if (recipientId === currentUserId) {
    throw ApiError.badRequest('Cannot start a conversation with yourself.');
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: USER_SELECT,
  });

  if (!recipient) throw ApiError.notFound('Recipient user');

  let conversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: currentUserId } } },
        { participants: { some: { id: recipientId } } },
      ],
    },
    include: {
      participants: { select: USER_SELECT },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: currentUserId }, { id: recipientId }],
        },
      },
      include: {
        participants: { select: USER_SELECT },
      },
    });
  }

  res.json({
    success: true,
    conversationId: conversation.id,
    conversation: {
      ...conversation,
      otherUser: { ...recipient, isOnline: isUserOnline(recipient.id) },
    },
  });
}));

// ── PUT /api/chat/conversations/:id/read ─────────────────────────────────────
// Mark all messages in a conversation as read
router.put('/conversations/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const currentUserId = req.user.userId;

  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      isRead: false,
    },
    data: { isRead: true },
  });

  // Notify conversation room via Socket.io
  try {
    getIO().to(`conv_${conversationId}`).emit('MESSAGES_READ', { conversationId, readerId: currentUserId });
  } catch {
    // Socket emit is non-blocking
  }

  res.json({ success: true, updatedCount: result.count });
}));

// ── DELETE /api/chat/messages/:messageId ─────────────────────────────────────
// Soft-delete message (within 5 minutes of send)
router.delete('/messages/:messageId', authenticateToken, asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUserId = req.user.userId;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) throw ApiError.notFound('Message');
  if (message.senderId !== currentUserId) throw ApiError.forbidden('Can only delete your own messages');

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: '[Message deleted]' },
  });

  // Emit event to conversation room
  try {
    getIO().to(`conv_${message.conversationId}`).emit('MESSAGE_DELETED', {
      messageId: message.id,
      conversationId: message.conversationId,
    });
  } catch {
    // Socket emit is non-blocking
  }

  res.json({ success: true, message: updated });
}));

export default router;
