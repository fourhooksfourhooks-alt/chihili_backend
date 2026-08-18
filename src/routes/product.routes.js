import { Router } from "express";
import multer from "multer";
import * as productController from "../controllers/product.controller.js";
import {
  listProductsValidation,
  getProductByIdValidation,
  getProductBySlugValidation,
  getVendorProductsValidation,
  createProductValidation,
  updateProductValidation,
  deleteProductValidation,
  updateProductStatusValidation,
  toggleFeaturedValidation,
  addVariantsValidation,
  updateVariantValidation,
  removeVariantValidation,
  updateStockValidation,
  getBestSellingValidation,
  getFestivalFavoritesValidation,
} from "../validations/product.validation.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Configure memory storage for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public catalog endpoints
router.get(
  "/",
  listProductsValidation,
  handleValidationErrors,
  productController.getAllProducts
);

// Home page specific endpoints
router.get(
  "/best-selling",
  getBestSellingValidation,
  handleValidationErrors,
  productController.getBestSellingProducts
);
router.get(
  "/festival-favorites",
  getFestivalFavoritesValidation,
  handleValidationErrors,
  productController.getFestivalFavorites
);

router.get(
  "/slug/:slug",
  getProductBySlugValidation,
  handleValidationErrors,
  productController.getProductBySlug
);
router.get(
  "/:id/also-bought",
  productController.getPeopleAlsoBought
);
router.get(
  "/:id/rating-summary",
  productController.getProductRatingSummary
);
router.get(
  "/vendor/:vendorId",
  protect,
  getVendorProductsValidation,
  handleValidationErrors,
  productController.getVendorProducts
);
router.get(
  "/:id",
  protect,
  getProductByIdValidation,
  handleValidationErrors,
  productController.getProductById
);

// Protected management endpoints
router.post(
  "/",
  protect,
  authorize('admin','vendor'),
  createProductValidation,
  handleValidationErrors,
  productController.createProduct
);
router.put(
  "/:id",
  protect,
  authorize('admin','vendor'),
  updateProductValidation,
  handleValidationErrors,
  productController.updateProduct
);
router.delete(
  "/:id",
  protect,
  authorize('admin','vendor'),
  deleteProductValidation,
  handleValidationErrors,
  productController.deleteProduct
);
router.patch(
  "/:id/status",
  protect,
  authorize('admin','vendor'),
  updateProductStatusValidation,
  handleValidationErrors,
  productController.updateProductStatus
);
router.patch(
  "/:id/feature",
  protect,
  authorize('admin','vendor'),
  toggleFeaturedValidation,
  handleValidationErrors,
  productController.toggleFeaturedProduct
);

// Variants & stock
router.post(
  "/:id/variants",
  protect,
  authorize('admin','vendor'),
  addVariantsValidation,
  handleValidationErrors,
  productController.addVariants
);
router.put(
  "/:id/variants/:sku",
  protect,
  authorize('admin','vendor'),
  updateVariantValidation,
  handleValidationErrors,
  productController.updateVariant
);
router.delete(
  "/:id/variants/:sku",
  protect,
  authorize('admin','vendor'),
  removeVariantValidation,
  handleValidationErrors,
  productController.removeVariant
);
router.patch(
  "/:id/stock",
  protect,
  authorize('admin','vendor'),
  updateStockValidation,
  handleValidationErrors,
  productController.updateStock
);

// Image upload endpoints
router.post(
  "/:id/images",
  protect,
  authorize('admin','vendor'),
  upload.array("images", 10),
  productController.uploadProductImages
);

router.post(
  "/:id/variants/:sku/images",
  protect,
  authorize('admin','vendor'),
  upload.array("images", 5),
  productController.uploadVariantImages
);
router.delete(
  "/:id/images/:imageUrl(*)",
  protect,
  authorize('admin','vendor'),
  productController.deleteProductImage
);
router.delete(
  "/:id/variants/:sku/images/:imageUrl(*)",
  protect,
  authorize('admin','vendor'),
  productController.deleteVariantImage
);

export default router;
