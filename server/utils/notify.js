const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sendNotification(userId, type, title, message) {
  try {
    const notification = await prisma.inAppNotification.create({
      data: { userId, type, title, message }
    });

    const socketIO = require('../socket').getIO();
    socketIO.to(userId).emit('NOTIFICATION', notification);
    
    return notification;
  } catch (err) {
    console.error('Failed to send notification', err);
  }
}

module.exports = { sendNotification };
