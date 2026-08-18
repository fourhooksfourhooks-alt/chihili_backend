import { body, param } from 'express-validator';

export const addToWishlistValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
];

export const removeFromWishlistValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
];