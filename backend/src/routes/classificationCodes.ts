import { Router } from 'express';
import { CLASSIFICATION_CODES } from '../constants/classificationCodes';

const router = Router();

/**
 * GET /api/v1/classification-codes
 * Get all MyInvois classification codes
 */
router.get('/', (req, res) => {
  res.json(CLASSIFICATION_CODES);
});

export default router;
