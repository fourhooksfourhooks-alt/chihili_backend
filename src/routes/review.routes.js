import { Router } from "express";
import multer from "multer";
import * as reviewController from "../controllers/review.controller.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import {
  createReviewValidation,
  getProductReviewsValidation,
  updateReviewValidation,
  deleteReviewValidation,
  toggleLikeValidation,
} from "../validations/review.validation.js";

const reviewRouter = Router();

// Configure memory storage for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// Review CRUD operations
reviewRouter.post('/addReview', protect, upload.array('images', 5), createReviewValidation, handleValidationErrors, reviewController.createReview)
reviewRouter.get('/getAllReviews/:productId', getProductReviewsValidation, handleValidationErrors, reviewController.getProductReviews)
reviewRouter.get('/productpage/:productId',optionalAuth, getProductReviewsValidation, handleValidationErrors, reviewController.getProductPageReviews)
reviewRouter.put('/updateReview/:reviewId', protect, upload.array('images', 5), updateReviewValidation, handleValidationErrors, reviewController.updateReview)
reviewRouter.delete('/deleteReview/:reviewId', protect, deleteReviewValidation, handleValidationErrors, reviewController.deleteReview)
reviewRouter.post('/Like/:reviewId', protect, toggleLikeValidation, handleValidationErrors, reviewController.toggleLike)

// Rating validation and debug endpoints
reviewRouter.get('/validate-consistency/:productId', getProductReviewsValidation, handleValidationErrors, reviewController.validateRatingConsistency)
reviewRouter.post('/recalculate-ratings/:productId', getProductReviewsValidation, handleValidationErrors, reviewController.recalculateProductRatings)

export default reviewRouter;
