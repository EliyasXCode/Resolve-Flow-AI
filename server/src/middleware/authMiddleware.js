import { verifyToken, COOKIE_NAME } from '../utils/token.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies[COOKIE_NAME];

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id).select('+tokenVersion');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this token no longer exists.',
      });
    }

    // Verify tokenVersion for session revocation
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked or invalidated. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

export default authenticate;
