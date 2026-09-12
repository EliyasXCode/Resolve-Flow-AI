import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 ResolveFlow AI Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
      logger.info(`👉 CORS configured for Client at: ${env.CLIENT_URL}`);
      logger.info(`✨ Ready for Phase 1 MERN operations`);
    });

    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Initiating graceful shutdown...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
