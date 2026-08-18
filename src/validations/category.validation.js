import { body, param, query } from 'express-validator';

export const listCategoriesValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString(),
  query('fields').optional().isString(),
  query('search').optional().isString(),
  query('parent').optional().isMongoId(),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const getCategoryByIdValidation = [
  param('id').isMongoId().withMessage('Invalid category id'),
];

export const getCategoryBySlugValidation = [
  param('slug').isSlug().withMessage('Invalid slug'),
];

export const createCategoryValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters'),
  body('parent')
    .optional()
    .isMongoId().withMessage('Parent must be a valid MongoDB ObjectId'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
  body('image').optional().isString().withMessage('image must be a string'),
  body('banner').optional().isString().withMessage('banner must be a string'),
];

export const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category id'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters'),
  body('parent')
    .optional()
    .isMongoId().withMessage('Invalid parent id'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
  body('image').optional().isString().withMessage('image must be a string'),
  body('banner').optional().isString().withMessage('banner must be a string'),
];

export const deleteCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category id'),
];

export const toggleActiveValidation = [
  param('id').isMongoId().withMessage('Invalid category id'),
  body('isActive').isBoolean().toBoolean(),
];


