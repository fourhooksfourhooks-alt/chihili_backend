// services/wishlist.service.js
import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import AppError from "../utils/appError.js";

class WishlistService {
  async addToWishlist(userId, productId) {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("Invalid product ID", 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // Find existing wishlist (before update)
    let wishlist = await Wishlist.findOne({ user: userId });

    const alreadyInWishlist = wishlist?.items.some(
      (item) => item.toString() === productId.toString()
    );

    // Add product
    wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $addToSet: { items: productId } },
      { upsert: true, new: true }
    );

    if (!alreadyInWishlist) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { wishlistCount: 1 },
      });
    }

    return wishlist;
  }

  async removeFromWishlist(userId, productId) {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("Invalid product ID", 400);
    }

    const wishlist = await Wishlist.findOne({ user: userId });

    const wasInWishlist = wishlist?.items.some(
      (item) => item.toString() === productId.toString()
    );

    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { items: productId } },
      { new: true }
    );

    if (wasInWishlist) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { wishlistCount: -1 },
      });
    }

    return updatedWishlist;
  }

  async getUserWishlist(userId) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate("items");
    return wishlist || { user: userId, items: [] };
  }
}

export default new WishlistService();
