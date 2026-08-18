import { body, param, query } from 'express-validator';

export const updateProfileValidation = [
  body('firstname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
];

export const addRecentlyViewedValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
];

export const getRecentlyViewedValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('Limit must be between 1 and 50'),
];
