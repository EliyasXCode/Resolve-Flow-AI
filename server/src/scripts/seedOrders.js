import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

const seedOrders = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('Connected to MongoDB for order seeding.');

    // Look for our demo customer
    let customer = await User.findOne({ email: 'john.customer@example.com' });
    if (!customer) {
      // Find any customer
      customer = await User.findOne({ role: 'customer' });
    }

    if (!customer) {
      logger.warn('No customer found. Please run seedAdmin first (npm run seed:admin)');
      process.exit(1);
    }

    logger.info(`Seeding orders for customer: ${customer.name} (${customer.email})`);

    // Remove existing seeded orders for this demo customer to avoid duplicates
    await Order.deleteMany({ customerId: customer._id });

    const ordersData = [
      {
        customerId: customer._id,
        orderNumber: 'ORD-2026-8801',
        items: [
          { name: 'AeroGlide Pro Wireless Earbuds (Matte Black)', quantity: 1, price: 129.99, sku: 'AG-EAR-01' },
          { name: 'Silicone Protective Carrying Case', quantity: 1, price: 19.99, sku: 'AG-ACC-03' },
        ],
        totalAmount: 149.98,
        currency: 'USD',
        deliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        status: 'DELIVERED',
      },
      {
        customerId: customer._id,
        orderNumber: 'ORD-2026-8802',
        items: [
          { name: 'ErgoWave Executive Mesh Office Chair', quantity: 1, price: 349.0, sku: 'FUR-CHR-10' },
        ],
        totalAmount: 349.0,
        currency: 'USD',
        deliveryDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        status: 'DELIVERED',
      },
      {
        customerId: customer._id,
        orderNumber: 'ORD-2026-8803',
        items: [
          { name: 'SmartHome Ultra 4K Security Camera (2-Pack)', quantity: 1, price: 189.95, sku: 'SH-CAM-02' },
          { name: 'Weatherproof Outdoor Mount Bracket', quantity: 2, price: 15.0, sku: 'SH-MNT-01' },
        ],
        totalAmount: 219.95,
        currency: 'USD',
        deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'DELIVERED',
      },
      {
        customerId: customer._id,
        orderNumber: 'ORD-2026-8804',
        items: [
          { name: 'BaristaTouch Espresso & Cappuccino Maker', quantity: 1, price: 499.0, sku: 'KIT-ESP-99' },
          { name: 'Organic Colombian Whole Bean Coffee (1kg)', quantity: 2, price: 24.5, sku: 'KIT-COF-01' },
        ],
        totalAmount: 548.0,
        currency: 'USD',
        deliveryDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        status: 'DELIVERED',
      },
      {
        customerId: customer._id,
        orderNumber: 'ORD-2026-8805',
        items: [
          { name: 'Precision Mechanical Gaming Keyboard (RGB)', quantity: 1, price: 119.5, sku: 'PC-KEY-04' },
        ],
        totalAmount: 119.5,
        currency: 'USD',
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Expected in 2 days
        status: 'SHIPPED',
      },
    ];

    const createdOrders = await Order.insertMany(ordersData);
    logger.info(`✅ Successfully seeded ${createdOrders.length} realistic fictional orders.`);

    await mongoose.disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding orders:', error.message);
    process.exit(1);
  }
};

seedOrders();
