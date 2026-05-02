import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

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
      // Fail open — a broken rate limiter must not block legitimate traffic
      logger.error('Rate limiter error (failing open)', { err: err.message });
      next();
    }
  };
}

// 5 attempts per IP per 15 minutes — protects login/register
export const authLimiter = makeLimiter({
  maxAttempts:   5,
  windowSeconds: 900,
  prefix:        'auth',
  keyFn:         (req) => req.ip || 'anon',
  message:       'Too many login attempts. Try again in 15 minutes.',
});

// 100 requests per user/IP per minute — general API guard
export const apiLimiter = makeLimiter({
  maxAttempts:   100,
  windowSeconds: 60,
  prefix:        'api',
});

// 10 create-type operations per hour
export const createLimiter = makeLimiter({
  maxAttempts:   10,
  windowSeconds: 3600,
  prefix:        'create',
  message:       'Creating too quickly — wait an hour.',
});

// 20 skill verifications per hour (GitHub API quota protection)
export const verifyLimiter = makeLimiter({
  maxAttempts:   20,
  windowSeconds: 3600,
  prefix:        'verify',
  message:       'Too many verification attempts. Wait an hour.',
});

// 20 AI generations per hour (Gemini quota protection)
export const aiLimiter = makeLimiter({
  maxAttempts:   20,
  windowSeconds: 3600,
  prefix:        'ai',
  message:       'AI request limit reached. Wait an hour.',
});

export { makeLimiter };