import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get conversations for current user
router.get('/conversations', async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: currentUserId } }
      },
      include: {
        participants: {
          select: { id: true, name: true, avatar: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

// Get chat history with specific user
router.get('/history/:otherUserId', async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: currentUserId } } },
          { participants: { some: { id: otherUserId } } }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, avatar: true } } }
        }
      }
    });

    if (!conversation) return res.json([]);
    res.json(conversation.messages);
  } catch (error) {
    next(error);
  }
});

export default router;
