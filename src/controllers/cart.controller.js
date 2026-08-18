import { CartService } from "../services/cart.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";




export const getAllCarts = asyncHandler(async (req, res) => {
  const result = await CartService.getAllCarts(req.query);
  
  return new ApiResponse(
    200, 
    { 
      carts: result.carts, 
      pagination: result.pagination 
    }, 
    "Carts retrieved successfully"
  ).send(res);
});

// Get user's cart (specific user)
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  
  // Check if requesting own cart or has admin privileges
  if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
    return new ApiResponse(403, null, "Not authorized to access this cart").send(res);
  }
  
  const result = await CartService.getUserCart(userId);
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Cart retrieved successfully"
  ).send(res);
});

// Get cart by ID (admin functionality)
export const getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await CartService.getCartById(id);
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Cart retrieved successfully"
  ).send(res);
});

// Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantSku, quantity , couponCode } = req.body;
  
  const result = await CartService.addToCart(
    req.user._id, 
    productId, 
    variantSku, 
    quantity || 1,
    couponCode
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Item added to cart successfully"
  ).send(res);
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, variantSku } = req.params;
  const { quantity } = req.body;
  
  const result = await CartService.updateCartItem(
    req.user._id, 
    productId, 
    variantSku, 
    quantity
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Cart updated successfully"
  ).send(res);
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId, variantSku } = req.params;
  
  // Handle case where variantSku might be undefined or "null" string
  let processedVariantSku = variantSku;
  if (variantSku === "null" || variantSku === "undefined" || variantSku === "" || variantSku === undefined) {
    processedVariantSku = null;
  }
  
  console.log("Controller - productId:", productId, "variantSku:", variantSku, "processedVariantSku:", processedVariantSku);
  
  const result = await CartService.removeFromCart(
    req.user._id, 
    productId, 
    processedVariantSku
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Item removed from cart successfully"
  ).send(res);
});

// Clear cart
export const clearCart = asyncHandler(async (req, res) => {
  const result = await CartService.clearCart(req.user._id);
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Cart cleared successfully"
  ).send(res);
});

// Move item from cart to save for later
export const moveToSaveForLater = asyncHandler(async (req, res) => {
  const { productId, variantSku } = req.params;
  
  // Handle case where variantSku might be undefined or "null" string
  let processedVariantSku = variantSku;
  if (variantSku === "null" || variantSku === "undefined" || variantSku === "" || variantSku === undefined) {
    processedVariantSku = null;
  }
  
  const result = await CartService.moveToSaveForLater(
    req.user._id, 
    productId, 
    processedVariantSku
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Item moved to save for later successfully"
  ).send(res);
});

// Move item from save for later to cart
export const moveToCart = asyncHandler(async (req, res) => {
  const { productId, variantSku } = req.params;
  
  // Handle case where variantSku might be undefined or "null" string
  let processedVariantSku = variantSku;
  if (variantSku === "null" || variantSku === "undefined" || variantSku === "" || variantSku === undefined) {
    processedVariantSku = null;
  }
  
  const result = await CartService.moveToCart(
    req.user._id, 
    productId, 
    processedVariantSku
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Item moved to cart successfully"
  ).send(res);
});

// Get save for later items
export const getSaveForLater = asyncHandler(async (req, res) => {
  const result = await CartService.getSaveForLater(req.user._id);
  
  return new ApiResponse(
    200, 
    { 
      saveForLater: result.saveForLater,
      summary: result.summary 
    }, 
    "Save for later items retrieved successfully"
  ).send(res);
});

// Remove item from save for later
export const removeFromSaveForLater = asyncHandler(async (req, res) => {
  const { productId, variantSku } = req.params;
  
  // Handle case where variantSku might be undefined or "null" string
  let processedVariantSku = variantSku;
  if (variantSku === "null" || variantSku === "undefined" || variantSku === "" || variantSku === undefined) {
    processedVariantSku = null;
  }
  
  const result = await CartService.removeFromSaveForLater(
    req.user._id, 
    productId, 
    processedVariantSku
  );
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Item removed from save for later successfully"
  ).send(res);
});

// Clear all save for later items
export const clearSaveForLater = asyncHandler(async (req, res) => {
  const result = await CartService.clearSaveForLater(req.user._id);
  
  return new ApiResponse(
    200, 
    { 
      cart: result.cart, 
      summary: result.summary 
    }, 
    "Save for later cleared successfully"
  ).send(res);
});

