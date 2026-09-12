import crypto from 'crypto';
import env from '../config/env.js';
import { CSRF_COOKIE_NAME } from '../utils/token.js';

export const csrfProtection = (req, res, next) => {
  // Always attach/ensure CSRF token cookie is present
  let csrfToken = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Must be accessible by client-side JavaScript to read and include in headers
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }

  // Safe HTTP methods do not require CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass for test environment if header is test-bypass or NODE_ENV === 'test'
  if (env.NODE_ENV === 'test') {
    return next();
  }

  // Validate CSRF token on mutating operations
  const clientToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!clientToken || !csrfToken || clientToken !== csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh and try again.',
    });
  }

  next();
};

export default csrfProtection;
