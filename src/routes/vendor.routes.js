import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller.js';
import {
  listVendorsValidation,
  getVendorByIdValidation,
  createVendorValidation,
  updateVendorValidation,
  deleteVendorValidation,
} from '../validations/vendor.validation.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listVendorsValidation, handleValidationErrors, vendorController.getAllVendors);
router.get('/me', protect, vendorController.getMyVendor);
router.get('/:id', getVendorByIdValidation, handleValidationErrors, vendorController.getVendorById);
router.post('/', protect, createVendorValidation, handleValidationErrors, vendorController.createVendor);
router.put('/:id', protect, updateVendorValidation, handleValidationErrors, vendorController.updateVendor);
router.delete('/:id', protect, deleteVendorValidation, handleValidationErrors, vendorController.deleteVendor);

export default router;