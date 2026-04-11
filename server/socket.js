const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

let io;

module.exports = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim()),
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.userId = decoded.userId;
        next();
      });
    });

    io.on('connection', (socket) => {
      socket.join(socket.userId);

      socket.on('disconnect', () => {
        // user disconnected
      });

      socket.on('SEND_MESSAGE', async (data) => {
        try {
          const { receiverId, content } = data;
          
          let conversation = await prisma.conversation.findFirst({
            where: {
              AND: [
                { participants: { some: { id: socket.userId } } },
                { participants: { some: { id: receiverId } } }
              ]
            }
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                participants: {
                  connect: [{ id: socket.userId }, { id: receiverId }]
                }
              }
            });
          }

          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: socket.userId,
              content
            },
            include: { sender: { select: { id: true, name: true, avatar: true } } }
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() }
          });

          if (receiverId !== socket.userId) {
            const notif = await prisma.inAppNotification.create({
              data: {
                userId: receiverId,
                type: 'MESSAGE',
                title: message.sender.name,
                message: content.length > 50 ? content.substring(0, 47) + '...' : content,
                actionUrl: '/dashboard?chat=true',
                senderAvatar: message.sender.avatar
              }
            });
            io.to(receiverId).emit('NOTIFICATION', notif);
          }

          io.to(receiverId).emit('RECEIVE_MESSAGE', message);
          io.to(socket.userId).emit('RECEIVE_MESSAGE', message);
        } catch (err) {
          console.error('Socket SEND_MESSAGE Error:', err);
        }
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  }
};
