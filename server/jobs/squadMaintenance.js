import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

async function expireStaleSquads() {
  try {
    const result = await prisma.squad.updateMany({
      where:  { status: 'OPEN', expiresAt: { lt: new Date() } },
      data:   { status: 'ARCHIVED' },
    });
    if (result.count > 0) {
      logger.info('Squad maintenance: expired squads', { count: result.count });
    }
  } catch (err) {
    logger.error('Squad maintenance error', { err: err.message });
  }
}

async function closeFulfilledSquads() {
  try {
    // Mark squads where currentMembers >= maxMembers as FULL
    const squads = await prisma.squad.findMany({
      where: { status: 'OPEN' },
      select: { id: true, currentMembers: true, maxMembers: true },
    });

    const toClose = squads.filter((s) => s.currentMembers >= s.maxMembers).map((s) => s.id);

    if (toClose.length) {
      await prisma.squad.updateMany({
        where: { id: { in: toClose } },
        data:  { status: 'FULL' },
      });
      logger.info('Squad maintenance: marked full squads', { count: toClose.length });
    }
  } catch (err) {
    logger.error('Squad fulfillment check error', { err: err.message });
  }
}

function setupJobs() {
  // Run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running squad maintenance jobs');
    await expireStaleSquads();
    await closeFulfilledSquads();
  });

  logger.info('Squad maintenance jobs scheduled (daily at midnight)');
}

export { setupJobs, expireStaleSquads };