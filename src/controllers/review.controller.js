// controllers/reviewController.js
import reviewService from "../services/review.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { uploadImage, deleteFile } from "../utils/uploader.js";
import { 
  updateProductRatings, 
  validateProductRatingConsistency 
} from "../utils/productRatingHelper.js";

// ✅ Create Review
export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user._id;
  const imageFiles = req.files || [];

  if (!productId || !rating) {
    throw new AppError("Product ID and rating are required", 400);
  }

  // Upload images if provided
  let imageUrls = [];
  if (imageFiles.length > 0) {
    try {
      const uploadPromises = imageFiles.map(file => 
        uploadImage(file, "review-images", 5) // 5MB max per image
      );
      imageUrls = await Promise.all(uploadPromises);
    } catch (error) {
      // Clean up any successfully uploaded images in case of partial failure
      if (imageUrls.length > 0) {
        try {
          await Promise.all(imageUrls.map(url => deleteFile(url)));
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded images:", cleanupError);
        }
      }
      throw new AppError(`Image upload failed: ${error.message}`, 400);
    }
  }

  try {
    const review = await reviewService.createReview(
      userId,
      productId,
      rating,
      comment,
      imageUrls
    );

    return new ApiResponse(201, { review }, "Review created successfully").send(res);
  } catch (error) {
    // If review creation fails, clean up uploaded images
    if (imageUrls.length > 0) {
      try {
        await Promise.all(imageUrls.map(url => deleteFile(url)));
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded images:", cleanupError);
      }
    }
    throw error;
  }
});

// ✅ Get Product Reviews
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const reviews = await reviewService.getProductReviews(productId, req.query);

  return new ApiResponse(200, { reviews }, "Reviews retrieved successfully").send(res);
});

// ✅ Get Product Page Reviews (includes user's review separately)
export const getProductPageReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  let userId = null;

  if(req.user) {
   userId = req.user._id;
  }

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const reviewsData = await reviewService.getProductPageReviews(productId, userId, req.query);

  return new ApiResponse(200, reviewsData, "Product page reviews retrieved successfully").send(res);
});

// ✅ Update Review
export const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params; // reviewId
  const { rating, comment, existingImages } = req.body;
  const userId = req.user._id;
  const imageFiles = req.files || [];

  // Upload new images if provided
  let newImageUrls = [];
  if (imageFiles.length > 0) {
    try {
      const uploadPromises = imageFiles.map(file => 
        uploadImage(file, "review-images", 5) // 5MB max per image
      );
      newImageUrls = await Promise.all(uploadPromises);
    } catch (error) {
      // Clean up any successfully uploaded images in case of partial failure
      if (newImageUrls.length > 0) {
        try {
          await Promise.all(newImageUrls.map(url => deleteFile(url)));
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded images:", cleanupError);
        }
      }
      throw new AppError(`Image upload failed: ${error.message}`, 400);
    }
  }

  try {
    // Combine existing images (if any) with new images
    let existingImagesArray = [];
    if (existingImages) {
      try {
        existingImagesArray = JSON.parse(existingImages);
      } catch (parseError) {
        throw new AppError("Invalid existing images format", 400);
      }
    }
    const allImages = [...existingImagesArray, ...newImageUrls];

    const updated = await reviewService.updateReview(reviewId, userId, rating, comment, allImages);

    return new ApiResponse(200, { review: updated }, "Review updated successfully").send(res);
  } catch (error) {
    // If review update fails, clean up newly uploaded images
    if (newImageUrls.length > 0) {
      try {
        await Promise.all(newImageUrls.map(url => deleteFile(url)));
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded images:", cleanupError);
      }
    }
    throw error;
  }
});

// ✅ Delete Review
export const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params; // reviewId
  const userId = req.user._id;

  await reviewService.deleteReview(reviewId, userId);

  return new ApiResponse(200, {}, "Review deleted successfully").send(res);
});

// ✅ Toggle Like/Unlike Review
export const toggleLike = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  if (!reviewId) {
    throw new AppError("Review ID is required", 400);
  }

  const { review, likesCount } = await reviewService.toggleLikeReview(reviewId, userId);

  return new ApiResponse(
    200,
    { review, likes: likesCount },
    "Review like/unlike updated successfully"
  ).send(res);
});

// ✅ Validate Product Rating Consistency (Debug endpoint)
export const validateRatingConsistency = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const validation = await validateProductRatingConsistency(productId);

  return new ApiResponse(
    200, 
    { validation }, 
    validation.isConsistent 
      ? "Rating data is consistent" 
      : "Rating data inconsistency detected"
  ).send(res);
});

// ✅ Recalculate Product Ratings (Debug endpoint)
export const recalculateProductRatings = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const updatedRatings = await updateProductRatings(productId);

  return new ApiResponse(
    200, 
    { ratings: updatedRatings }, 
    "Product ratings recalculated successfully"
  ).send(res);
});
