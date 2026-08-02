import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

import logger from './utils/logger.js';
import { errorMiddleware } from './utils/errorHandler.js';
import { apiLimiter, authLimiter, verifyLimiter, aiLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import skillRoutes from './routes/skills.js';
import verifyRoutes from './routes/verify.js';
import squadRoutes from './routes/squads.js';
import postsRoutes from './routes/posts.js';
import activityRoutes from './routes/activity.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';
import antifragileRoutes from './routes/antifragile.js';

const app = express();
app.use(compression());

const prisma = new PrismaClient();

// ── Security headers (helmet) ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow avatar images
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://skill-sphere-v1.vercel.app',
  'http://localhost:5173'
];

const rawOrigins = process.env.ALLOWED_ORIGINS;
if (rawOrigins) {
  rawOrigins.split(',').forEach(s => allowedOrigins.push(s.trim()));
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    
    // Check if origin is in whitelist or is a vercel subdomain of yours
    const isAllowed = allowedOrigins.includes(origin) || 
                     (origin.includes('vercel.app') && origin.includes('kshitizd07s'));

    if (isAllowed) return cb(null, true);
    
    console.warn(`CORS: origin ${origin} not in whitelist`);
    return cb(null, true); // Still allow for debugging
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Cookie parsing ───────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ── HTTP request logging (Morgan → Winston) ──────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.path === '/health' || req.path === '/',
}));

// ── Root Check ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('SkillSphere API is Live ✓'));

// ── Trust proxy (needed for correct IP behind Nginx / load balancer) ─────────
app.set('trust proxy', 1);

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Health endpoint ───────────────────────────────────────────────────────────
// Returns 200 only when DB and cache are reachable — used by load balancer
app.get('/health', async (_req, res) => {
  const checks = { db: false, cache: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch { /* stays false */ }

  checks.cache = true; // in-memory always OK; Redis failure is a warning not a crash

  const healthy = checks.db;
  const pkgVersion = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url))).version;
  res.status(healthy ? 200 : 503).json({
    status:  healthy ? 'ok' : 'degraded',
    checks,
    uptime:  Math.floor(process.uptime()),
    memory:  `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    version: pkgVersion,
    ts:      new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter,   authRoutes);
app.use('/api/users',                       userRoutes);
app.use('/api/skills',                      skillRoutes);
app.use('/api/verify',       verifyLimiter, verifyRoutes);
app.use('/api/squads',                      squadRoutes);
app.use('/api/posts',                       postsRoutes);
app.use('/api/activity',                    activityRoutes);
app.use('/api/ai',           aiLimiter,     aiRoutes);
app.use('/api/chat',                        chatRoutes);
app.use('/api/notifications',               notificationRoutes);
app.use('/api/antifragile',                 antifragileRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:   'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// ── Global error handler — MUST be last ──────────────────────────────────────
app.use(errorMiddleware);

export { app, prisma };
