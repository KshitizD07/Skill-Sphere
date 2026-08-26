/**
 * Copyright (c) 2026 Kshitiz Dixit. All Rights Reserved.
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 */

import 'dotenv/config';

console.log('🚀 SkillSphere API: Process starting...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HAS_DB: !!process.env.DATABASE_URL,
  HAS_JWT: !!process.env.JWT_SECRET
});

// ── Startup validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example → .env and fill in the values.\n');
  process.exit(1);
}

import http from 'http';
import axios from 'axios';
import { app, prisma } from './app.js';
import logger from './utils/logger.js';
import cache from './utils/cache.js';
import { setupJobs } from './jobs/squadMaintenance.js';
import { init as initSocket } from './socket.js';

const server = http.createServer(app);
initSocket(server);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5001;

async function start() {
  // Initialise cache (connects to Redis if REDIS_URL set, else in-memory)
  await cache.init();

  // Test DB
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    logger.info('Database connected', { users: userCount });
  } catch (err) {
    logger.error('Database connection failed — check DATABASE_URL', { err: err.message });
    process.exit(1);
  }

  // Schedule background jobs
  setupJobs();

  // Signal pm2 that we're ready (for wait_ready: true in cluster mode)
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`SkillSphere API running`, {
      port:    PORT,
      env:     process.env.NODE_ENV || 'development',
      cache:   cache.isRedis() ? 'Redis' : 'in-memory',
      workers: process.env.NODE_APP_INSTANCE ?? 'single',
    });

    if (process.send) process.send('ready'); // pm2 cluster signal

    // Start self-ping keep-alive
    startSelfPing();
  });
}

function startSelfPing() {
  // Only ping in production
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Self-ping keep-alive skipped (not in production)');
    return;
  }

  const url = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/ping`
    : 'https://skill-sphere-backend-29kn.onrender.com/ping';

  logger.info(`Self-ping keep-alive initialized targeting: ${url}`);

  // Ping every 10 minutes (600,000 ms)
  setInterval(async () => {
    try {
      const res = await axios.get(url);
      logger.info('Self-ping success', { status: res.status });
    } catch (err) {
      logger.warn('Self-ping failed', { error: err.message });
    }
  }, 10 * 60 * 1000);
}

start();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting', { err: err.message, stack: err.stack });
  process.exit(1);
});
