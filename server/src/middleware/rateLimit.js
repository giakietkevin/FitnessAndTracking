/**
 * Lightweight in-memory rate limiter per route instance.
 * Each router creates its own store so unit test suites remain isolated.
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, message } = {}) {
  const buckets = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;

    if (buckets.size > 1000) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }

    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: message || 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
        }
      });
    }

    next();
  };
}
