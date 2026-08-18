import { body, param } from "express-validator";

// Validation for adding to cart
export const addToCartValidation = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
  body("variantSku")
    .optional()
    .isString()
    .withMessage("Variant SKU must be a string"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("couponCode")
    .optional()
    .isString()
    .withMessage("Coupon code must be a string"),
];

// Validation for updating cart item
export const updateCartItemValidation = [
  param("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
  param("variantSku")
    .optional()
    .isString()
    .withMessage("Variant SKU must be a string"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
];

// Validation for removing from cart
export const removeFromCartValidation = [
  param("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
  param("variantSku")
    .optional()
    .isString()
    .withMessage("Variant SKU must be a string"),
];

// Validation for save for later operations
export const saveForLaterValidation = [
  param("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
  param("variantSku")
    .optional()
    .isString()
    .withMessage("Variant SKU must be a string"),
];

// Validation for getting cart by ID
export const getCartByIdValidation = [
  param("id")
    .notEmpty()
    .withMessage("Cart ID is required")
    .isMongoId()
    .withMessage("Invalid cart ID"),
];