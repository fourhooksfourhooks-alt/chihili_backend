import { body, param, query } from 'express-validator';

// Helpers to support multipart form-data where arrays may arrive as JSON strings
const parseArrayLike = (value) => {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (_) {
      return [value];
    }
  }
  return value;
};

const parseJSONIfString = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return value;
    }
  }
  return value;
};

// Common enums
const SIZE_ENUM = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const STATUS_ENUM = ['draft', 'active', 'inactive', 'archived'];
const DISCOUNT_ENUM = ['percentage', 'flat'];
const SORT_BY_ENUM = ['newest', 'lowToHigh', 'highToLow', 'popularity'];

export const listProductsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString(), // For basic field sorting like 'createdAt', '-name'
  query('sortBy').optional().isIn(SORT_BY_ENUM).withMessage('Invalid sortBy value. Must be one of: newest, lowToHigh, highToLow, popularity'), // For predefined sorting options
  query('fields').optional().isString(),
  query('search').optional().isString(),
  query('vendorId').optional().isMongoId(),
  query('category').optional().isMongoId(),
  query('tag').optional().isString(),
  query('isFeatured').optional().isBoolean().toBoolean(),
  query('status').optional().isIn(STATUS_ENUM),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('size').optional().isIn(SIZE_ENUM),
  query('color').optional().isString(),
  query('minDiscount').optional().isFloat({ min: 0 }).toFloat(),
];

export const getProductByIdValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
];

export const getProductBySlugValidation = [
  param('slug').isSlug().withMessage('Invalid slug'),
];

export const getVendorProductsValidation = [
  param('vendorId').isMongoId().withMessage('Invalid vendor id'),
  ...listProductsValidation,
];

export const createProductValidation = [
  body('vendorId').isMongoId().withMessage('vendorId is required'),
  body('name').notEmpty().isLength({ min: 2, max: 200 }),
  // slug is now auto-generated, so removed from validation
  body('shortDescription').optional().isString(),
  body('description').optional().isString(),
  body('categories').optional().customSanitizer(parseArrayLike).isArray(),
  body('categories.*').optional().isMongoId(),
  body('tags').optional().customSanitizer(parseArrayLike).isArray(),
  body('tags.*').optional().isString(),

  // Product-level discount validation
  body('discountType').optional().isIn(DISCOUNT_ENUM),
  body('discountValue').optional().isFloat({ min: 0 }).toFloat(),
  body('buyXGetY.x').optional().isInt({ min: 1 }).toInt(),
  body('buyXGetY.y').optional().isInt({ min: 1 }).toInt(),

  body('variants').customSanitizer(parseJSONIfString).isArray({ min: 1 }).withMessage('At least one variant is required'),
  // sku is now auto-generated, so removed from validation
  body('variants.*.title').optional().isString(),
  body('variants.*.attributes.size').optional().isIn(SIZE_ENUM),
  body('variants.*.attributes.color').optional().isString(),
  body('variants.*.price').isFloat({ min: 0 }).toFloat().withMessage('Variant price is required'),
  body('variants.*.mrp').optional().isFloat({ min: 0 }).toFloat(),
  body('variants.*.stock').optional().isInt({ min: 0 }).toInt(),
];

export const updateProductValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('vendorId').optional().isMongoId(),
  body('name').optional().isLength({ min: 2, max: 200 }),
  body('slug').optional().isSlug(),
  body('shortDescription').optional().isString(),
  body('description').optional().isString(),
  body('categories').optional().customSanitizer(parseArrayLike).isArray(),
  body('categories.*').optional().isMongoId(),
  body('tags').optional().customSanitizer(parseArrayLike).isArray(),
  body('tags.*').optional().isString(),
  body('isFeatured').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(STATUS_ENUM),
  
  // Product-level discount validation
  body('discountType').optional().isIn(DISCOUNT_ENUM),
  body('discountValue').optional().isFloat({ min: 0 }).toFloat(),
  body('buyXGetY.x').optional().isInt({ min: 1 }).toInt(),
  body('buyXGetY.y').optional().isInt({ min: 1 }).toInt(),
  
  body('variants').optional().customSanitizer(parseJSONIfString).isArray(),
  body('variants.*.sku').optional().isString(),
  body('variants.*.title').optional().isString(),
  body('variants.*.attributes.size').optional().isIn(SIZE_ENUM),
  body('variants.*.attributes.color').optional().isString(),
  body('variants.*.price').optional().isFloat({ min: 0 }).toFloat(),
  body('variants.*.mrp').optional().isFloat({ min: 0 }).toFloat(),
  body('variants.*.stock').optional().isInt({ min: 0 }).toInt(),
  // Ensure variant images are arrays if they somehow get through
  body('variants.*.images').optional().isArray(),
  body('variants.*.images.*').optional().isString(),
];

export const deleteProductValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
];

export const updateProductStatusValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('status').isIn(STATUS_ENUM),
];

export const toggleFeaturedValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('isFeatured').isBoolean().toBoolean(),
];

export const addVariantsValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('variants').customSanitizer(parseJSONIfString).isArray({ min: 1 }),
  // sku is now auto-generated, so removed from validation
  body('variants.*.title').optional().isString(),
  body('variants.*.attributes.size').optional().isIn(SIZE_ENUM),
  body('variants.*.attributes.color').optional().isString(),
  body('variants.*.price').optional().isFloat({ min: 0 }).toFloat(),
  body('variants.*.mrp').optional().isFloat({ min: 0 }).toFloat(),
  body('variants.*.stock').optional().isInt({ min: 0 }).toInt(),
  // Ensure variant images are arrays if they somehow get through
  body('variants.*.images').optional().isArray(),
  body('variants.*.images.*').optional().isString(),
];

export const updateVariantValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  param('sku').isString().withMessage('Invalid sku'),
  body('title').optional().isString(),
  body('attributes.size').optional().isIn(SIZE_ENUM),
  body('attributes.color').optional().isString(),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('mrp').optional().isFloat({ min: 0 }).toFloat(),
  body('stock').optional().isInt({ min: 0 }).toInt(),
];

export const removeVariantValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  param('sku').isString().withMessage('Invalid sku'),
];

export const updateStockValidation = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('updates').isArray({ min: 1 }),
  body('updates.*.sku').isString(),
  body('updates.*.stock').isInt({ min: 0 }).toInt(),
];

export const getBestSellingValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('category').optional().isMongoId(),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
];

export const getFestivalFavoritesValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('category').optional().isMongoId(),
  query('festivalTag').optional().isString(),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
];

