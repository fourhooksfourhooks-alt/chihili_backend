// services/user.service.js
import { User } from "../models/user.model.js";
import Product from "../models/product.model.js";

class UserService {
  async addToRecentlyViewed(userId, productId) {
    // Check if product exists and is active
    const product = await Product.findOne({ 
      _id: productId, 
      status: 'active',
      isDeleted: false 
    });

    if (!product) {
      throw new Error('Product not found or not available');
    }

    // Remove product if already exists to avoid duplicates
    await User.findByIdAndUpdate(
      userId,
      { $pull: { recentlyViewedProducts: productId } }
    );

    // Add to front and limit to 20 items
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: { 
          recentlyViewedProducts: { 
            $each: [productId], 
            $position: 0,
            $slice: 20 
          } 
        }
      },
      { new: true }
    );

    return user;
  }

  async getRecentlyViewed(userId, limit = 10) {
    const user = await User.findById(userId)
      .populate({
        path: 'recentlyViewedProducts',
        select: 'name slug shortDescription images variants avgRating ratingsCount totalReviews categories vendorId status',
        match: { status: 'active', isDeleted: false },
        populate: {
          path: 'categories',
          select: 'name slug'
        },
        options: { limit: limit }
      });

    if (!user) {
      throw new Error('User not found');
    }

    // Filter out any null products (deleted/inactive products)
    const recentlyViewed = user.recentlyViewedProducts.filter(product => product !== null);

    return {
      recentlyViewed,
      count: recentlyViewed.length
    };
  }

  async updateProfile(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async softDeleteUser(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getAllUsers() {
    const users = await User.find({ isDeleted: false })
      .select('-password -resetPasswordToken -resetPasswordExpires -otp -refreshTokenHash -refreshTokenExpires')
      .sort({ createdAt: -1 });

    return {
      users,
      count: users.length
    };
  }
}

export default new UserService();
