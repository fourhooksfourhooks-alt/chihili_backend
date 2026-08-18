import { body, param } from "express-validator";

// Validation for creating a review
export const createReviewValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must be a string with maximum 1000 characters"),
  // Images will be handled by multer middleware, so we don't need body validation for files
];

// Validation for getting product reviews
export const getProductReviewsValidation = [
  param("productId").isMongoId().withMessage("Valid product ID is required"),
];

// Validation for updating a review
export const updateReviewValidation = [
  param("reviewId").isMongoId().withMessage("Valid review ID is required"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must be a string with maximum 1000 characters"),
  // Images will be handled by multer middleware, so we don't need body validation for files
  body("existingImages")
    .optional()
    .isString()
    .custom((value) => {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error("Must be a valid JSON array");
          }
          return true;
        } catch (error) {
          throw new Error("Must be a valid JSON array of image URLs");
        }
      }
      return true;
    })
    .withMessage("Existing images must be a valid JSON array of URLs"),
];

// Validation for deleting a review
export const deleteReviewValidation = [
  param("reviewId").isMongoId().withMessage("Valid review ID is required"),
];

// Validation for toggling like on a review
export const toggleLikeValidation = [
  param("reviewId").isMongoId().withMessage("Valid review ID is required"),
];