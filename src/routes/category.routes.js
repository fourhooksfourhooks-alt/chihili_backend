import { Router } from "express";
import multer from "multer";
import * as categoryController from "../controllers/category.controller.js";
import {
  listCategoriesValidation,
  getCategoryByIdValidation,
  getCategoryBySlugValidation,
  createCategoryValidation,
  updateCategoryValidation,
  deleteCategoryValidation,
  toggleActiveValidation,
} from "../validations/category.validation.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Configure memory storage for optional image/banner uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get(
  "/",
  listCategoriesValidation,
  handleValidationErrors,
  categoryController.getAllCategories
);
router.get(
  "/slug/:slug",
  getCategoryBySlugValidation,
  handleValidationErrors,
  categoryController.getCategoryBySlug
);
router.get(
  "/:id",
  getCategoryByIdValidation,
  handleValidationErrors,
  categoryController.getCategoryById
);

// Admin endpoints
router.post(
  "/",
  protect,
  // authorize('admin'),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createCategoryValidation,
  handleValidationErrors,
  categoryController.createCategory
);

router.put(
  "/:id",
  protect,
  // authorize('admin'),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateCategoryValidation,
  handleValidationErrors,
  categoryController.updateCategory
);

router.delete(
  "/:id",
  protect,
  // authorize("admin"),
  deleteCategoryValidation,
  handleValidationErrors,
  categoryController.deleteCategory
);
router.patch(
  "/:id/active",
  protect,
  // authorize("admin"),
  toggleActiveValidation,
  handleValidationErrors,
  categoryController.toggleActiveCategory
);

export default router;
