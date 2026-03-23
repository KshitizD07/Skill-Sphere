const cache = require('../utils/cache');
const logger = require('../utils/logger');

function makeLimiter({ maxAttempts, windowSeconds, prefix, keyFn, message }) {
  const getKey = keyFn || ((req) => req.user?.userId || req.ip || 'anon');

  return async (req, res, next) => {
    try {
      const id     = getKey(req);
      const result = await cache.checkRateLimit(id, prefix, maxAttempts, windowSeconds);

      res.setHeader('X-RateLimit-Limit',     maxAttempts);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset',     result.resetIn);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', { prefix, id, resetIn: result.resetIn });
        return res.status(429).json({
          error:      'RATE_LIMIT_EXCEEDED',
          message:    message || 'Too many requests — please slow down.',
          retryAfter: result.resetIn,
        });
      }
      next();
    } catch (err) {
      logger.error('Rate limiter error (failing open)', { err: err.message });
      next();
    }
  };
}

const authLimiter = makeLimiter({
  maxAttempts:   5,
  windowSeconds: 900,
  prefix:        'auth',
  keyFn:         (req) => req.ip || 'anon',
  message:       'Too many login attempts. Try again in 15 minutes.',
});

const apiLimiter = makeLimiter({
  maxAttempts:   100,
  windowSeconds: 60,
  prefix:        'api',
});

const createLimiter = makeLimiter({
  maxAttempts:   10,
  windowSeconds: 3600,
  prefix:        'create',
  message:       'Creating too quickly — wait an hour.',
});

const verifyLimiter = makeLimiter({
  maxAttempts:   20,
  windowSeconds: 3600,
  prefix:        'verify',
  message:       'Too many verification attempts. Wait an hour.',
});

const aiLimiter = makeLimiter({
  maxAttempts:   20,
  windowSeconds: 3600,
  prefix:        'ai',
  message:       'AI request limit reached. Wait an hour.',
});

module.exports = { makeLimiter, createLimiter, authLimiter, apiLimiter, verifyLimiter, aiLimiter };