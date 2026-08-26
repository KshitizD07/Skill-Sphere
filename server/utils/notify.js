import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient();

/**
 * Creates an in-app notification record and emits it to the target user's
 * Socket.io room. Failures are logged but never propagated — notifications
 * are non-critical side-effects.
 *
 * Supports both signatures:
 * 1. sendNotification(userId, { type, title, message, actionUrl, senderAvatar })
 * 2. sendNotification(userId, type, title, message, actionUrl, senderAvatar)
 */
export async function sendNotification(userId, typeOrOptions, title, message, actionUrl, senderAvatar) {
  try {
    let payload = {};

    if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      payload = {
        type: typeOrOptions.type || 'SYSTEM',
        title: typeOrOptions.title || 'Notification',
        message: typeOrOptions.message || '',
        actionUrl: typeOrOptions.actionUrl || null,
        senderAvatar: typeOrOptions.senderAvatar || null,
      };
    } else {
      payload = {
        type: typeOrOptions || 'SYSTEM',
        title: title || 'Notification',
        message: message || '',
        actionUrl: actionUrl || null,
        senderAvatar: senderAvatar || null,
      };
    }

    const notification = await prisma.inAppNotification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
        senderAvatar: payload.senderAvatar,
        isRead: false,
      },
    });

    // Emit real-time notification to user's socket room
    try {
      const { getIO } = await import('../socket.js');
      getIO().to(userId).emit('NOTIFICATION', notification);
    } catch {
      // Socket emission is non-blocking
    }

    return notification;
  } catch (err) {
    logger.error('Failed to send notification', { err: err.message, userId });
    return null;
  }
}
