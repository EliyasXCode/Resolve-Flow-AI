import { Router } from 'express';
import { getPolicies, createPolicy, deletePolicy } from '../controllers/policyController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticate);

// Staff and Admin can view policies
router.get('/', authorizeRoles('support', 'admin'), getPolicies);

// Admin only can add or delete policies
router.post('/', authorizeRoles('admin'), createPolicy);
router.delete('/:id', authorizeRoles('admin'), deletePolicy);

export default router;
