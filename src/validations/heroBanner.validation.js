import { body, param, query } from 'express-validator';

export const listHeroBannersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString(),
  query('fields').optional().isString(),
  query('search').optional().isString(),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const getHeroBannerByIdValidation = [
  param('id').isMongoId().withMessage('Invalid hero banner id'),
];

export const createHeroBannerValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('buttonText')
    .optional()
    .isLength({ max: 50 }).withMessage('Button text must not exceed 50 characters'),
  body('buttonLink')
    .optional()
    .isLength({ max: 500 }).withMessage('Button link must not exceed 500 characters'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

export const updateHeroBannerValidation = [
  param('id').isMongoId().withMessage('Invalid hero banner id'),
  body('title')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('buttonText')
    .optional()
    .isLength({ max: 50 }).withMessage('Button text must not exceed 50 characters'),
  body('buttonLink')
    .optional()
    .isLength({ max: 500 }).withMessage('Button link must not exceed 500 characters'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

export const deleteHeroBannerValidation = [
  param('id').isMongoId().withMessage('Invalid hero banner id'),
];

export const updateOrderValidation = [
  param('id').isMongoId().withMessage('Invalid hero banner id'),
  body('order')
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
    .toInt(),
];

export const bulkUpdateOrderValidation = [
  body('banners')
    .isArray({ min: 1 }).withMessage('Banners must be a non-empty array'),
  body('banners.*.id')
    .isMongoId().withMessage('Each banner must have a valid id'),
  body('banners.*.order')
    .isInt({ min: 0 }).withMessage('Each banner order must be a non-negative integer'),
];
