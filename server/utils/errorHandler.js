const logger = require('./logger');

// ── Custom error class ───────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(msg, details)   { return new ApiError(400, 'BAD_REQUEST', msg, details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'Access denied')   { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(resource = 'Resource')    { return new ApiError(404, 'NOT_FOUND', `${resource} not found`); }
  static conflict(msg)              { return new ApiError(409, 'CONFLICT', msg); }
  static validation(details)        { return new ApiError(422, 'VALIDATION_ERROR', 'Invalid input', details); }
  static internal(msg = 'Server error') { return new ApiError(500, 'INTERNAL_ERROR', msg); }
}

// ── asyncHandler — eliminates try/catch boilerplate in routes ───────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Global error middleware ──────────────────────────────────────────────────
function errorMiddleware(err, req, res, next) {
  // Structured log — always include request context
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    code: err.code || 'UNKNOWN',
    message: err.message,
    userId: req.user?.userId,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Our own errors — send exactly as defined
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Zod validation
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'DUPLICATE_ENTRY', message: 'Record already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
  }
  if (err.code?.startsWith('P')) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Database operation failed' });
  }

  // JWT errors (shouldn't reach here normally but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Session expired' });
  }

  // Fallback
  res.status(err.status || 500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
}

module.exports = { ApiError, asyncHandler, errorMiddleware };