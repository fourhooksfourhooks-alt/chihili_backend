// services/reviewService.js
import Review from "../models/review.model.js";
import Payment from "../models/payment.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import ApiFeatures from "../utils/apiFeatures.js";
import { deleteFile } from "../utils/uploader.js";
import { updateProductRatings } from "../utils/productRatingHelper.js";
import AppError from "../utils/appError.js";

class ReviewService {
  //  Create Review with transaction support
  static async createReview(userId, productId, rating, comment, images) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingReview = await Review.findOne({
        userId,
        productId,
      }).session(session);
      if (existingReview) {
        throw new AppError("You already reviewed this product.", 400);
      }

      // Verify product exists
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new AppError("Product not found.", 404);
      }

      // const order = await Payment.findOne({
      //   userId,
      //   status: "COMPLETED",
      //   products: { $elemMatch: { productId } },
      // }).session(session);

      // if (!order) {
      //   throw new AppError("You can only review purchased products.", 400);
      // }

      const review = new Review({
        userId,
        productId,
        rating,
        comment,
        images,
        isVerifiedPurchase: true,
      });

      await review.save({ session });

      // Update product ratings within transaction
      await updateProductRatings(productId, session);

      await session.commitTransaction();
      return review;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  //  Get All Reviews with Pagination (for admin panel)
  static async getProductReviews(productId, queryString = {}) {
    // Create base query
    const reviewsQuery = Review.find({ productId })
      .populate("userId", "firstname lastname email")
      .populate("likes", "firstname lastname email");

    // Apply ApiFeatures for sorting and pagination
    const features = new ApiFeatures(reviewsQuery, queryString)
      .sort()
      .paginate();

    const reviews = await features.query;

    // Get total count
    const total = await Review.countDocuments({ productId });

    return {
      reviews,
      pagination: {
        total,
        limit: features.queryString.limit * 1 || 10,
        page: features.queryString.page * 1 || 1,
        pages: Math.ceil(total / (features.queryString.limit * 1 || 10)) || 1,
      },
    };
  }

  //  Get Product Page Reviews (for product page with user's review separated)
  static async getProductPageReviews(productId, userId, queryString = {}) {
    // First, get user's own review separately (not paginated)

    let myReview = null;

    if (userId) {
      myReview = await Review.findOne({ productId, userId })
        .populate("userId", "firstname lastname email")
        .populate("likes", "firstname lastname email");
    }

    const filter = { productId };
    if (userId) {
      filter.userId = { $ne: userId }; // Exclude user's own review
    }

    // Get other reviews with pagination using ApiFeatures
    const otherReviewsQuery = Review.find(filter)
      .populate("userId", "firstname lastname email")
      .populate("likes", "firstname lastname email");

    // Apply ApiFeatures for sorting and pagination
    const features = new ApiFeatures(otherReviewsQuery, queryString)
      .sort()
      .paginate();

    const otherReviews = await features.query;

    // Get total count
    const total = await Review.countDocuments({
      productId,
      userId: { $ne: userId },
    });

    return {
      myReview: myReview || null,
      otherReviews,
      pagination: {
        total,
        limit: features.queryString.limit * 1 || 10,
        page: features.queryString.page * 1 || 1,
        pages: Math.ceil(total / (features.queryString.limit * 1 || 10)) || 1,
      },
    };
  }

  //  Update Review with transaction support
  static async updateReview(reviewId, userId, rating, comment, images) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the existing review to check for old images
      const existingReview = await Review.findOne({
        _id: reviewId,
        userId,
      }).session(session);
      if (!existingReview) {
        throw new AppError("Review not found", 404);
      }

      // Store old images for cleanup after successful update
      const oldImages = existingReview.images || [];

      const updated = await Review.findOneAndUpdate(
        { _id: reviewId, userId },
        {
          rating,
          comment: comment,
          images: images || [],
        },
        { new: true, session }
      );

      if (!updated) {
        throw new AppError("Failed to update review", 500);
      }

      // Update product ratings within transaction
      await updateProductRatings(updated.productId, session);

      await session.commitTransaction();

      // Delete old images that are not in the new images array (after successful commit)
      if (oldImages.length > 0) {
        const imagesToDelete = oldImages.filter(
          (oldImage) => !images || !images.includes(oldImage)
        );

        // Delete old images from storage (async, don't block response)
        if (imagesToDelete.length > 0) {
          Promise.all(
            imagesToDelete.map((imageUrl) => deleteFile(imageUrl))
          ).catch((error) =>
            console.error("Error deleting old review images:", error)
          );
        }
      }

      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  //  Delete Review with transaction support
  static async deleteReview(reviewId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const review = await Review.findOne({ _id: reviewId, userId }).session(
        session
      );
      if (!review) {
        throw new AppError("Review not found", 404);
      }

      // Store images for cleanup after successful deletion
      const imagesToDelete = review.images || [];
      const productId = review.productId;

      const deleted = await Review.findOneAndDelete(
        { _id: reviewId, userId },
        { session }
      );

      if (!deleted) {
        throw new AppError("Failed to delete review", 500);
      }

      // Update product ratings within transaction
      await updateProductRatings(productId, session);

      await session.commitTransaction();

      // Delete associated images from storage (after successful commit)
      if (imagesToDelete.length > 0) {
        Promise.all(
          imagesToDelete.map((imageUrl) => deleteFile(imageUrl))
        ).catch((error) =>
          console.error("Error deleting review images:", error)
        );
      }

      return deleted;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  //  Toggle Like/Unlike Review
  static async toggleLikeReview(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError("Review not found", 404);
    }

    const alreadyLiked = await Review.exists({ _id: reviewId, likes: userId });

    if (alreadyLiked) {
      await Review.findByIdAndUpdate(
        reviewId,
        { $pull: { likes: userId } },
        { new: true }
      );
    } else {
      await Review.findByIdAndUpdate(
        reviewId,
        { $addToSet: { likes: userId } },
        { new: true }
      );
    }

    await review.save();
    return {
      review,
      likesCount: review.likes.length,
    };
  }
}

export default ReviewService;
