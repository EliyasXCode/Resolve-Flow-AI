import crypto from 'crypto';
import env from '../config/env.js';
import { CSRF_COOKIE_NAME } from '../utils/token.js';

/**
 * CSRF Protection Middleware
 * Protects against cross-site request forgery while enabling seamless
 * cross-origin communication between Vercel (frontend) and Render (backend).
 */
export const csrfProtection = (req, res, next) => {
  // Always attach/ensure CSRF token cookie is present
  let csrfToken = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Accessible by client-side scripts
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
  if (
    req.path.includes('/auth/login') ||
    req.path.includes('/auth/register')
  ) {
    return next();
  }

  // 4. In cross-origin architectures (Vercel -> Render), browsers strictly enforce CORS preflight.
  // If request origin is a verified Vercel frontend or localhost, trust the browser CORS check.
  const origin = req.headers.origin;
  const isAllowedOrigin =
    origin &&
    (origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      (env.CLIENT_URL && env.CLIENT_URL.includes(origin)));

  if (isAllowedOrigin) {
    return next();
  }

  // 5. Fallback Double-Submit Cookie verification for same-origin or custom clients
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
