const { AppError } = require('../utils/app-error');

function createRateLimiter({
  windowMs,
  maxAttempts,
  keyPrefix,
  keyResolver,
  message = 'Too many requests, try again later'
}) {
  const buckets = new Map();

  return (req, _res, next) => {
    const now = Date.now();
    const resolvedKey = keyResolver ? keyResolver(req) : req.ip;
    const key = `${keyPrefix}:${resolvedKey}`;

    const existing = buckets.get(key);
    if (!existing || existing.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (existing.count >= maxAttempts) {
      return next(new AppError(message, 429, {
        retryAfterMs: Math.max(existing.expiresAt - now, 0)
      }));
    }

    existing.count += 1;
    buckets.set(key, existing);
    return next();
  };
}

module.exports = { createRateLimiter };
