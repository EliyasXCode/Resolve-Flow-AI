import User from '../models/User.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { signToken, setAuthCookie, clearAuthCookie, CSRF_COOKIE_NAME } from '../utils/token.js';

export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await User.hashPassword(validatedData.password);

    // Explicitly enforce 'customer' role regardless of request body
    const newUser = await User.create({
      name: validatedData.name,
      email: validatedData.email.toLowerCase(),
      passwordHash,
      role: 'customer',
      tokenVersion: 0,
    });

    const token = signToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +tokenVersion');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
    csrfToken: req.cookies[CSRF_COOKIE_NAME] || null,
  });
};
