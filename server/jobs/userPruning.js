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
  // Pruning unlinked accounts is disabled to preserve user and recruiter accounts without a GitHub link
  return 0;
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
