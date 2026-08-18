import wishlistService from "../services/wishlist.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";


export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;
  const wishlist = await wishlistService.addToWishlist(userId, productId);
  return new ApiResponse(200, wishlist, "Added to wishlist").send(res);
});


export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;
  const wishlist = await wishlistService.removeFromWishlist(userId, productId);
  return new ApiResponse(200, wishlist, "Removed from wishlist").send(res);
});


export const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const wishlist = await wishlistService.getUserWishlist(userId);
  return new ApiResponse(200, wishlist, "Wishlist fetched").send(res);
});
