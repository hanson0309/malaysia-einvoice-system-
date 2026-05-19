import { Router } from 'express';
import devicesRouter from './devices';
import transactionsRouter from './transactions';
import productsRouter from './products';
import inventoryRouter from './inventory';
import appointmentsRouter from './appointments';
import employeesRouter from './employees';
import settingsRouter from './settings';

const router = Router();

router.use('/devices', devicesRouter);
router.use('/transactions', transactionsRouter);
router.use('/products', productsRouter);
router.use('/inventory', inventoryRouter);
router.use('/appointments', appointmentsRouter);
router.use('/employees', employeesRouter);
router.use('/settings', settingsRouter);

export default router;
