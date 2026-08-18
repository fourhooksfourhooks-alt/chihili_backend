import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUserAccount,
  addRecentlyViewed,
  getRecentlyViewed
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { 
  updateProfileValidation,
  addRecentlyViewedValidation,
  getRecentlyViewedValidation
} from '../validations/user.validation.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = Router();

// All routes are protected (require authentication)

// User profile routes

router.use(protect);
router.get('/profile', getUserProfile);
router.put('/profile', 
  updateProfileValidation,
  handleValidationErrors,
  updateUserProfile
);

router.delete('/account', deleteUserAccount);

// Recently viewed products routes
router.post('/recently-viewed',
  addRecentlyViewedValidation,
  handleValidationErrors,
  addRecentlyViewed
);

router.get('/recently-viewed',
  getRecentlyViewedValidation,
  handleValidationErrors,
  getRecentlyViewed
);

// Admin only routes
router.get('/', authorize('admin', 'superadmin'), getAllUsers);

export default router;

