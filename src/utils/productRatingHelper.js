// utils/productRatingHelper.js
import Product from "../models/product.model.js";
import Review from "../models/review.model.js";
import mongoose from "mongoose";

/**
 * Core function to calculate and update product ratings
 * This is the single source of truth for rating calculations
 * @param {string} productId - The product ID to update ratings for
 * @param {object} session - Optional MongoDB session for transaction support
 */
const calculateAndUpdateProductRatings = async (productId, session = null) => {
  try {
    // Aggregate review statistics for this product
    const stats = await Review.aggregate([
      {
        $match: { productId: new mongoose.Types.ObjectId(productId) }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingCounts: {
            $push: "$rating"
          }
        }
      }
    ]).session(session);

    if (stats.length === 0) {
      // No reviews found, reset all rating fields
      const updateOptions = session ? { session } : {};
      await Product.findByIdAndUpdate(productId, {
        avgRating: 0,
        ratingsCount: 0,
        totalReviews: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      }, updateOptions);
      return {
        avgRating: 0,
        ratingsCount: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const { totalReviews, averageRating, ratingCounts } = stats[0];

    // Calculate rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    ratingCounts.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    const calculatedData = {
      avgRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      ratingsCount: totalReviews,
      totalReviews: totalReviews,
      ratingDistribution: ratingDistribution
    };

    // Update product with calculated values
    const updateOptions = session ? { session } : {};
    await Product.findByIdAndUpdate(productId, calculatedData, updateOptions);

    return calculatedData;

  } catch (error) {
    console.error('Error updating product ratings:', error);
    throw error;
  }
};

/**
 * Update product ratings based on all reviews for that product
 * This function should be called after any review CRUD operation
 * @param {string} productId - The product ID to update ratings for
 * @param {object} session - Optional MongoDB session for transaction support
 * @returns {object} Updated rating data
 */
export const updateProductRatings = async (productId, session = null) => {
  try {
    return await calculateAndUpdateProductRatings(productId, session);
  } catch (error) {
    console.error(`Failed to update ratings for product ${productId}:`, error);
    // Don't throw error to prevent review operations from failing
    // if rating update fails (unless in transaction)
    if (session) {
      throw error; // In transaction, we want to rollback
    }
    return null;
  }
};

/**
 * Batch update ratings for multiple products
 * Useful for data migration or bulk operations
 * @param {string[]} productIds - Array of product IDs to update
 */
export const updateMultipleProductRatings = async (productIds) => {
  const updatePromises = productIds.map(productId => updateProductRatings(productId));
  
  try {
    await Promise.allSettled(updatePromises);
  } catch (error) {
    console.error('Error in batch rating update:', error);
  }
};

/**
 * Get product rating summary
 * @param {string} productId - The product ID
 * @returns {Object} Rating summary object
 */
export const getProductRatingSummary = async (productId) => {
  try {
    const product = await Product.findById(productId).select('avgRating ratingsCount totalReviews ratingDistribution');
    
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      avgRating: product.avgRating,
      ratingsCount: product.ratingsCount,
      totalReviews: product.totalReviews,
      ratingDistribution: product.ratingDistribution,
      ratingPercentages: {
        5: product.ratingsCount > 0 ? Math.round((product.ratingDistribution[5] / product.ratingsCount) * 100) : 0,
        4: product.ratingsCount > 0 ? Math.round((product.ratingDistribution[4] / product.ratingsCount) * 100) : 0,
        3: product.ratingsCount > 0 ? Math.round((product.ratingDistribution[3] / product.ratingsCount) * 100) : 0,
        2: product.ratingsCount > 0 ? Math.round((product.ratingDistribution[2] / product.ratingsCount) * 100) : 0,
        1: product.ratingsCount > 0 ? Math.round((product.ratingDistribution[1] / product.ratingsCount) * 100) : 0,
      }
    };
  } catch (error) {
    console.error(`Failed to get rating summary for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Validate product rating consistency
 * Checks if the stored ratings match the actual reviews
 * @param {string} productId - The product ID to validate
 * @returns {Object} Validation result with consistency status and actual vs stored data
 */
export const validateProductRatingConsistency = async (productId) => {
  try {
    // Get current stored ratings
    const product = await Product.findById(productId).select('avgRating ratingsCount totalReviews ratingDistribution');
    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate actual ratings from reviews
    const actualStats = await Review.aggregate([
      {
        $match: { productId: new mongoose.Types.ObjectId(productId) }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingCounts: { $push: "$rating" }
        }
      }
    ]);

    let actualData = {
      avgRating: 0,
      ratingsCount: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (actualStats.length > 0) {
      const { totalReviews, averageRating, ratingCounts } = actualStats[0];
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingCounts.forEach(rating => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });

      actualData = {
        avgRating: Math.round(averageRating * 10) / 10,
        ratingsCount: totalReviews,
        totalReviews: totalReviews,
        ratingDistribution: ratingDistribution
      };
    }

    // Compare stored vs actual
    const isConsistent = (
      product.avgRating === actualData.avgRating &&
      product.ratingsCount === actualData.ratingsCount &&
      product.totalReviews === actualData.totalReviews &&
      JSON.stringify(product.ratingDistribution) === JSON.stringify(actualData.ratingDistribution)
    );

    return {
      isConsistent,
      storedData: {
        avgRating: product.avgRating,
        ratingsCount: product.ratingsCount,
        totalReviews: product.totalReviews,
        ratingDistribution: product.ratingDistribution
      },
      actualData,
      discrepancies: isConsistent ? null : {
        avgRating: product.avgRating !== actualData.avgRating,
        ratingsCount: product.ratingsCount !== actualData.ratingsCount,
        totalReviews: product.totalReviews !== actualData.totalReviews,
        ratingDistribution: JSON.stringify(product.ratingDistribution) !== JSON.stringify(actualData.ratingDistribution)
      }
    };

  } catch (error) {
    console.error(`Failed to validate rating consistency for product ${productId}:`, error);
    throw error;
  }
};
