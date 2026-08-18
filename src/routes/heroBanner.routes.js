import { Router } from "express";
import multer from "multer";
import * as heroBannerController from "../controllers/heroBanner.controller.js";
import {
  listHeroBannersValidation,
  getHeroBannerByIdValidation,
  createHeroBannerValidation,
  updateHeroBannerValidation,
  deleteHeroBannerValidation,
  updateOrderValidation,
  bulkUpdateOrderValidation,
} from "../validations/heroBanner.validation.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Configure memory storage for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints - for frontend to fetch banners
router.get(
  "/",
  listHeroBannersValidation,
  handleValidationErrors,
  heroBannerController.getAllHeroBanners
);

router.get(
  "/:id",
  getHeroBannerByIdValidation,
  handleValidationErrors,
  heroBannerController.getHeroBannerById
);

// Admin endpoints - only admin can manage hero banners
router.post(
  "/",
  protect,
  authorize('admin'),
  upload.single('image'),
  createHeroBannerValidation,
  handleValidationErrors,
  heroBannerController.createHeroBanner
);

router.put(
  "/:id",
  protect,
  authorize('admin'),
  upload.single('image'),
  updateHeroBannerValidation,
  handleValidationErrors,
  heroBannerController.updateHeroBanner
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteHeroBannerValidation,
  handleValidationErrors,
  heroBannerController.deleteHeroBanner
);

router.patch(
  "/:id/order",
  protect,
  authorize("admin"),
  updateOrderValidation,
  handleValidationErrors,
  heroBannerController.updateHeroBannerOrder
);

// Bulk update order endpoint
router.patch(
  "/order/bulk",
  protect,
  authorize("admin"),
  bulkUpdateOrderValidation,
  handleValidationErrors,
  heroBannerController.bulkUpdateOrder
);

export default router;
