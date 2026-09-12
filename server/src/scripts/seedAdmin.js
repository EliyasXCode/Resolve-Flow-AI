import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('Connected to MongoDB for admin & staff seeding.');

    const initialUsers = [
      {
        name: 'System Admin',
        email: 'admin@resolveflow.ai',
        password: 'AdminPassword123!',
        role: 'admin',
      },
      {
        name: 'Sarah Connor (Support Lead)',
        email: 'support@resolveflow.ai',
        password: 'SupportPassword123!',
        role: 'support',
      },
      {
        name: 'John Doe (Demo Customer)',
        email: 'john.customer@example.com',
        password: 'CustomerPassword123!',
        role: 'customer',
      },
    ];

    for (const userData of initialUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        logger.info(`User already exists: ${userData.email} (Role: ${existing.role})`);
      } else {
        const passwordHash = await User.hashPassword(userData.password);
        await User.create({
          name: userData.name,
          email: userData.email,
          passwordHash,
          role: userData.role,
          tokenVersion: 0,
        });
        logger.info(`✅ Created ${userData.role.toUpperCase()} account: ${userData.email}`);
      }
    }

    logger.info('--- Initial Credentials ---');
    logger.info('Admin:    admin@resolveflow.ai    / AdminPassword123!');
    logger.info('Support:  support@resolveflow.ai  / SupportPassword123!');
    logger.info('Customer: john.customer@example.com / CustomerPassword123!');
    logger.info('---------------------------');

    await mongoose.disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin users:', error.message);
    process.exit(1);
  }
};

seedAdmin();
