const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserActivity(userId, limit = 20) {
  return prisma.activityLog.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });
}

async function logActivity(userId, action, details) {
  const detailStr = details
    ? (typeof details === 'string' ? details : JSON.stringify(details))
    : null;
  return prisma.activityLog.create({
    data: { userId, action, details: detailStr },
  });
}

module.exports = { getUserActivity, logActivity };