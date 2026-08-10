import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Prunes accounts that have not linked their GitHub account.
 * Deletes accounts where github is null or empty string after a grace period (default: 24 hours).
 *
 * @param {number} gracePeriodHours - Hours before an unlinked account is pruned.
 */
export async function pruneUnlinkedAccounts(gracePeriodHours = 24) {
  try {
    const cutoffDate = new Date(Date.now() - gracePeriodHours * 60 * 60 * 1000);

    const result = await prisma.user.deleteMany({
      where: {
        OR: [
          { github: null },
          { github: '' },
        ],
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info('User pruning: removed accounts missing GitHub link', { count: result.count });
    }
    return result.count;
  } catch (err) {
    logger.error('User pruning job error', { err: err.message });
    return 0;
  }
}

export function setupUserPruningJob() {
  // Run daily at 01:00 UTC
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running daily user pruning job');
    await pruneUnlinkedAccounts();
  });

  // Run once on startup to clean up stale unlinked accounts immediately
  pruneUnlinkedAccounts().catch((err) => {
    logger.error('Startup user pruning error', { err: err.message });
  });

  logger.info('User pruning job scheduled (daily at 01:00 UTC)');
}
