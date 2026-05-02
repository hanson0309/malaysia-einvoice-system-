import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);

export default router;
