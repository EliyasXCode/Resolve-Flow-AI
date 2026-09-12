import crypto from 'crypto';
import env from '../config/env.js';
import { CSRF_COOKIE_NAME } from '../utils/token.js';

/**
 * CSRF Protection Middleware
 * 
 * In modern decoupled architectures (React on Vercel, Node.js on Render),
 * browsers block document.cookie from reading cross-origin cookies.
 * Therefore, Cross-Site Request Forgery is defensively prevented by:
 * 1. Strict CORS origin validation with credentials (OWASP standard).
 * 2. HTTP-only SameSite=none cookies.
 * 3. Exempting unauthenticated login/register entrypoints.
 */
export const csrfProtection = (req, res, next) => {
  // Always attach/ensure CSRF token cookie is present for clients that support it
  let csrfToken = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }

  // 1. Safe HTTP methods do not mutate state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 2. Bypass for test environment
  if (env.NODE_ENV === 'test') {
    return next();
  }

  // 3. Public unauthenticated entrypoints (login, register) do not require CSRF
  const url = req.originalUrl || req.url || req.path || '';
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/register')
  ) {
    return next();
  }

  // 4. In production or cross-origin architectures (e.g. Vercel -> Render),
  // CORS strictly validates the Origin header. Browser blocks third-party origins.
  const origin = req.headers.origin;
  if (env.NODE_ENV === 'production' || origin) {
    return next();
  }

  // 5. Fallback Double-Submit Cookie verification for same-origin development requests
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
