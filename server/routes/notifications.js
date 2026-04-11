const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.inAppNotification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
