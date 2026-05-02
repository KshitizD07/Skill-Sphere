import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient();

/**
 * Creates an in-app notification record and emits it to the target user's
 * Socket.io room. Failures are logged but never propagated — notifications
 * are non-critical side-effects.
 */
export async function sendNotification(userId, type, title, message) {
  try {
    const notification = await prisma.inAppNotification.create({
      data: { userId, type, title, message },
    });

    // Lazy-import to avoid circular dependency (socket imports prisma, prisma doesn't import socket)
    const { getIO } = await import('../socket.js');
    getIO().to(userId).emit('NOTIFICATION', notification);

    return notification;
  } catch (err) {
    logger.error('Failed to send notification', { err: err.message, userId, type });
  }
}
