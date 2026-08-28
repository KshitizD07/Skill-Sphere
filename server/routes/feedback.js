import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { sendFeedbackEmail } from '../services/emailService.js';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/feedback
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { category, rating, feedback, mostValuable, improvement, wantsToContribute, contributorAreas, contributorContact, deviceInfo } = req.body;

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 5) {
      throw ApiError.badRequest('Please provide feedback of at least 5 characters');
    }

    // Fetch fresh user profile details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        role: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    logger.info('Received user feedback', {
      userId: user.id,
      email: user.email,
      category: category || 'General',
      rating: rating || 5,
      wantsToContribute: !!wantsToContribute,
    });

    // Send the email directly to developer inbox
    await sendFeedbackEmail({
      user,
      category: category || 'General Feedback',
      rating: Number(rating) || 5,
      feedback: feedback.trim(),
      mostValuable: mostValuable ? String(mostValuable).trim() : '',
      improvement: improvement ? String(improvement).trim() : '',
      wantsToContribute: Boolean(wantsToContribute),
      contributorAreas: Array.isArray(contributorAreas) ? contributorAreas : (contributorAreas ? [String(contributorAreas)] : []),
      contributorContact: contributorContact ? String(contributorContact).trim() : '',
      deviceInfo: deviceInfo || req.headers['user-agent'] || 'Web App',
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your feedback has been received and delivered directly to the team.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
