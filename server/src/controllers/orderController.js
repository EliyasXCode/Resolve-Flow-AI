import Order from '../models/Order.js';

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convenience helper to ensure a test customer has realistic sample orders.
 */
export const ensureSampleOrders = async (req, res, next) => {
  try {
    const count = await Order.countDocuments({ customerId: req.user._id });
    if (count === 0) {
      const sampleOrders = [
        {
          customerId: req.user._id,
          orderNumber: `ORD-${Date.now().toString().slice(-6)}-1`,
          items: [
            { name: 'Ultra Noise-Canceling Wireless Headphones', quantity: 1, price: 199.99, sku: 'TECH-AUD-01' },
            { name: 'Braided USB-C Fast Charger Cable', quantity: 2, price: 14.99, sku: 'TECH-ACC-05' },
          ],
          totalAmount: 229.97,
          currency: 'USD',
          deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          status: 'DELIVERED',
        },
        {
          customerId: req.user._id,
          orderNumber: `ORD-${Date.now().toString().slice(-6)}-2`,
          items: [
            { name: 'Ergonomic Memory Foam Lumbar Cushion', quantity: 1, price: 49.50, sku: 'HOME-ERG-09' },
          ],
          totalAmount: 49.50,
          currency: 'USD',
          deliveryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          status: 'DELIVERED',
        },
      ];
      await Order.insertMany(sampleOrders);
    }

    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};
