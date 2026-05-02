import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Returns the most recent activity log entries for a user. */
export async function getUserActivity(userId, limit = 20) {
  return prisma.activityLog.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });
}

/** Appends a new activity log entry, serialising object details to JSON. */
export async function logActivity(userId, action, details) {
  const detailStr = details
    ? (typeof details === 'string' ? details : JSON.stringify(details))
    : null;
  return prisma.activityLog.create({
    data: { userId, action, details: detailStr },
  });
}