import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';
import productRoutes from './products';
import invoiceRoutes from './invoices';
import irbRoutes from './irb';
import invoiceTemplateRoutes from './invoiceTemplates';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/irb', irbRoutes);
router.use('/invoice-templates', invoiceTemplateRoutes);

export default router;
