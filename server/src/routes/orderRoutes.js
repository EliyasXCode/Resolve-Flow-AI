import { Router } from 'express';
import { getMyOrders, ensureSampleOrders } from '../controllers/orderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Customer only or any authenticated user viewing their own orders
router.use(authenticate);

router.get('/my-orders', getMyOrders);
router.post('/ensure-sample', ensureSampleOrders);

export default router;
