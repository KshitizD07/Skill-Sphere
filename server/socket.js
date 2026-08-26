import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import logger from './utils/logger.js';

const prisma = new PrismaClient();
let io;

// In-memory presence map: userId -> Set of socketIds
const onlineUsers = new Map();

export function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys()).filter((uid) => {
    const s = onlineUsers.get(uid);
    return s && s.size > 0;
  });
}

export function init(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map((s) => s.trim()),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // ── Authentication Middleware ──────────────────────────────────────────────
  io.use((socket, next) => {
    let token = null;

    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      token = cookies.ss_token || null;
    }

    if (!token) {
      token = socket.handshake.auth?.token || socket.handshake.query?.token || null;
    }

    if (!token) {
      return next(new Error('Authentication error'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.userId;
      next();
    });
  });

  // ── Connection Lifecycle & Events ──────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(userId);

    // Track presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast user online to everyone
    io.emit('USER_ONLINE', { userId });

    // Send initial list of online users to connecting socket
    socket.emit('ONLINE_USERS_LIST', { userIds: getOnlineUserIds() });

    // ── Join Conversation Room ──
    socket.on('JOIN_CONVERSATION', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // ── Leave Conversation Room ──
    socket.on('LEAVE_CONVERSATION', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // ── Real-Time Direct Message ──
    socket.on('SEND_MESSAGE', async (data) => {
      try {
        const { receiverId, recipientId, conversationId, content } = data;
        const targetReceiverId = receiverId || recipientId;

        if (!content?.trim()) return;

        let conversation;
        if (conversationId) {
          conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: { select: { id: true } } },
          });
        }

        if (!conversation && targetReceiverId) {
          conversation = await prisma.conversation.findFirst({
            where: {
              AND: [
                { participants: { some: { id: userId } } },
                { participants: { some: { id: targetReceiverId } } },
              ],
            },
            include: { participants: { select: { id: true } } },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                participants: {
                  connect: [{ id: userId }, { id: targetReceiverId }],
                },
              },
              include: { participants: { select: { id: true } } },
            });
          }
        }

        if (!conversation) {
          logger.warn('SEND_MESSAGE: conversation could not be resolved', { userId, data });
          return;
        }

        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            content: content.trim(),
            isRead: false,
          },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true, role: true, headline: true },
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        // Find the other participant
        const recipient = conversation.participants.find((p) => p.id !== userId);

        // Send in-app notification if recipient is not active
        if (recipient) {
          const notif = await prisma.inAppNotification.create({
            data: {
              userId: recipient.id,
              type: 'MESSAGE',
              title: message.sender.name,
              message: content.length > 60 ? `${content.substring(0, 57)}...` : content,
              actionUrl: `/chat/${userId}`,
              senderAvatar: message.sender.avatar,
            },
          });
          io.to(recipient.id).emit('NOTIFICATION', notif);
          io.to(recipient.id).emit('RECEIVE_MESSAGE', message);
        }

        // Emit to sender socket & conversation room
        io.to(userId).emit('RECEIVE_MESSAGE', message);
        io.to(`conv_${conversation.id}`).emit('RECEIVE_MESSAGE', message);
      } catch (err) {
        logger.error('Socket SEND_MESSAGE Error:', { error: err.message });
      }
    });

    // ── Typing Indicators ──
    socket.on('TYPING_START', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(recipientId).emit('TYPING_START', { conversationId, userId });
      } else if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('TYPING_START', { conversationId, userId });
      }
    });

    socket.on('TYPING_STOP', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(recipientId).emit('TYPING_STOP', { conversationId, userId });
      } else if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('TYPING_STOP', { conversationId, userId });
      }
    });

    // ── Mark Messages Read ──
    socket.on('MARK_READ', async ({ conversationId, senderId }) => {
      try {
        if (!conversationId) return;

        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false,
          },
          data: { isRead: true },
        });

        if (senderId) {
          io.to(senderId).emit('MESSAGES_READ', { conversationId, readerId: userId });
        }
        socket.to(`conv_${conversationId}`).emit('MESSAGES_READ', { conversationId, readerId: userId });
      } catch (err) {
        logger.error('Socket MARK_READ error:', { error: err.message });
      }
    });

    // ── Disconnect & Cleanup ──
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('USER_OFFLINE', { userId });
        }
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
}
