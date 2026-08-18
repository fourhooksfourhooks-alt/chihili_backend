import { Router } from 'express';
import {
  getShippingSettings,
  upsertShippingSettings,
  resetShippingSettings,
  calculateShippingCharge
} from '../controllers/shippingSetting.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateShippingSettings, validateCartTotal } from '../validations/shippingSetting.validation.js';

const router = Router();

router.get('/', getShippingSettings);

router.put(
  '/',
  protect,
  authorize('admin'),
  validateShippingSettings,
  upsertShippingSettings
);

router.post(
  '/reset',
  protect,
  authorize('admin'),
  resetShippingSettings
);

router.post(
  '/calculate',
  validateCartTotal,
  calculateShippingCharge
);

export default router;
