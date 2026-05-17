import { Router } from 'express';
import authRoutes from './auth';
import customerRoutes from './customers';
import productRoutes from './products';
import invoiceRoutes from './invoices';
import irbRoutes from './irb';
import invoiceTemplateRoutes from './invoiceTemplates';
import classificationCodesRoutes from './classificationCodes';
import analyticsRoutes from './analytics';
import profileRoutes from './profile';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/irb', irbRoutes);
router.use('/invoice-templates', invoiceTemplateRoutes);
router.use('/classification-codes', classificationCodesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/profile', profileRoutes);

export default router;
