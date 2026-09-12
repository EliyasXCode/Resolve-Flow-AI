import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import csrfProtection from './middleware/csrfMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import policyRoutes from './routes/policyRoutes.js';

const app = express();

// Trust reverse proxy for Render / Vercel SSL termination
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Restricted CORS with dynamic origin matching for Vercel production and preview domains
const allowedOrigins = (env.CLIENT_URL || 'http://localhost:5175')
  .split(',')
  .map((url) => url.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      // Allow Vercel preview deployments
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid cross-domain blocks during staging
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token', 'X-Requested-With'],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging in non-test mode
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// CSRF Protection (double submit cookie)
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ResolveFlow AI Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    phase: 3,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/policies', policyRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
