const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Verify token and attach req.user ────────────────────────────────────────
function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(ApiError.unauthorized('Access token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired'));
    return next(ApiError.unauthorized('Invalid token'));
  }
}

// ── Same but won't block unauthenticated requests ────────────────────────────
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) { req.user = null; return next(); }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    req.user = null;
  }
  next();
}

// ── Role guard — use after authenticateToken ─────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { authenticateToken, optionalAuth, requireRole };