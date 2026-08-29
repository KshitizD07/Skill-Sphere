import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/errorHandler.js';

// ── Verify token and attach req.user ─────────────────────────────────────────
// Reads from httpOnly cookie first, falls back to Authorization header
export function authenticateToken(req, res, next) {
  const token =
    req.cookies?.ss_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return next(ApiError.unauthorized('Access token required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      baseRole: decoded.baseRole || null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired'));
    return next(ApiError.unauthorized('Invalid token'));
  }
}

// ── Same but won't block unauthenticated requests ────────────────────────────
export function optionalAuth(req, res, next) {
  const token =
    req.cookies?.ss_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) { req.user = null; return next(); }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    req.user = null;
  }
  next();
}

const SUPER_ADMIN_EMAILS = new Set([
  'kshitizd171@gmail.com',
  'kshitizd777@gmail.com',
]);

// ── Role guard — use after authenticateToken ──────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const userEmail = (req.user.email || '').toLowerCase().trim();
    if (roles.includes('ADMIN') && SUPER_ADMIN_EMAILS.has(userEmail)) {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}