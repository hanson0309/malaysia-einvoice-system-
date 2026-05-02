import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';
import productRoutes from './products';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);

export default router;
