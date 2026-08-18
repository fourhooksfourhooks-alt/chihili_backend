import UserService from '../services/user.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';

// Get user profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  
  return new ApiResponse(200, { user }, "User profile retrieved successfully").send(res);
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { firstname, lastname } = req.body;
  const userId = req.user._id;

  const user = await UserService.updateProfile(userId, { 
    firstname: firstname || req.user.firstname, 
    lastname: lastname || req.user.lastname 
  });
  
  return new ApiResponse(200, { user }, "Profile updated successfully").send(res);
});

// Get all users (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await UserService.getAllUsers();
  return new ApiResponse(200, result, "Users retrieved successfully").send(res);
});

// Delete user account (soft delete)
export const deleteUserAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await UserService.softDeleteUser(userId);
  return new ApiResponse(200, null, "Account deleted successfully").send(res);
});

// Add product to recently viewed
export const addRecentlyViewed = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;

  await UserService.addToRecentlyViewed(userId, productId);
  return new ApiResponse(200, null, "Product added to recently viewed").send(res);
});

// Get recently viewed products
export const getRecentlyViewed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 10;

  const result = await UserService.getRecentlyViewed(userId, limit);
  return new ApiResponse(200, result, "Recently viewed products retrieved successfully").send(res);
});
