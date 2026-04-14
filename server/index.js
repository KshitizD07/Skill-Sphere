require('dotenv').config();

// ── Startup validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example → .env and fill in the values.\n');
  process.exit(1);
}

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const { PrismaClient } = require('@prisma/client');

const logger   = require('./utils/logger');
const cache    = require('./utils/cache');
const { errorMiddleware } = require('./utils/errorHandler');
const { apiLimiter, authLimiter, verifyLimiter, aiLimiter } = require('./middleware/rateLimiter');
const { setupJobs } = require('./jobs/squadMaintenance');

// Routes
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const skillRoutes    = require('./routes/skills');
const verifyRoutes   = require('./routes/verify');
const squadRoutes    = require('./routes/squads');
const postsRoutes    = require('./routes/posts');
const activityRoutes = require('./routes/activity');
const aiRoutes       = require('./routes/ai');
const chatRoutes     = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');

const app    = express();
const http   = require('http');
const server = http.createServer(app);
const { init: initSocket } = require('./socket');
initSocket(server);

const prisma = new PrismaClient();

// ── Security headers (helmet) ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow avatar images
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(cors({
  origin:      (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ── HTTP request logging (Morgan → Winston) ──────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.path === '/health', // don't log health polls
}));

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
  res.status(healthy ? 200 : 503).json({
    status:  healthy ? 'ok' : 'degraded',
    checks,
    uptime:  Math.floor(process.uptime()),
    memory:  `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    version: require('./package.json').version,
    ts:      new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter,   authRoutes);
app.use('/api/users',                   userRoutes);
app.use('/api/skills',                  skillRoutes);
app.use('/api/verify',   verifyLimiter, verifyRoutes);
app.use('/api/squads',                  squadRoutes);
app.use('/api/posts',                   postsRoutes);
app.use('/api/activity',                activityRoutes);
app.use('/api/ai',       aiLimiter,     aiRoutes);
app.use('/api/chat',                    chatRoutes);
app.use('/api/notifications',           notificationRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:   'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// ── Global error handler — MUST be last ──────────────────────────────────────
app.use(errorMiddleware);

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
  server.listen(PORT, () => {
    logger.info(`SkillSphere API running`, {
      port:    PORT,
      env:     process.env.NODE_ENV || 'development',
      cache:   cache.isRedis() ? 'Redis' : 'in-memory',
      workers: process.env.NODE_APP_INSTANCE ?? 'single',
    });

    if (process.send) process.send('ready'); // pm2 cluster signal
  });
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