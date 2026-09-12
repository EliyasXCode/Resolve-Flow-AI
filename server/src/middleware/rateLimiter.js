const ipBuckets = new Map();

/**
 * Lightweight in-memory rate limiter for Phase 1.
 * Prevents brute force credential stuffing without external service dependencies.
 */
export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests, please try again later.' }) => {
  return (req, res, next) => {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let bucket = ipBuckets.get(ip);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      ipBuckets.set(ip, bucket);
    } else {
      bucket.count += 1;
    }

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 requests per 15 mins
  message: 'Too many login or registration attempts. Please wait 15 minutes before trying again.',
});

export default authRateLimiter;
