import { body, param, query } from 'express-validator';

export const listVendorsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().isString(),
  query('search').optional().isString(),
];

export const getVendorByIdValidation = [
  param('id').isMongoId().withMessage('Invalid vendor id'),
];

export const createVendorValidation = [
  body('shopName')
    .notEmpty()
    .isLength({ min: 2, max: 120 })
    .withMessage('Shop name is required'),
  body('description').optional().isString(),
  body('address').optional().isObject(),
  body('address.street').optional().isString(),
  body('address.city').optional().isString(),
  body('address.state').optional().isString(),
  body('address.postalCode').optional().isString(),
  body('address.country').optional().isString(),
  body('documents').optional().isObject(),
  body('documents.gstNumber').optional().isString(),
  body('documents.gstFile').optional().isString(),
  body('documents.panNumber').optional().isString(),
  body('documents.panFile').optional().isString(),
  body('bankDetails').optional().isObject(),
  body('bankDetails.accountName').optional().isString(),
  body('bankDetails.accountNumber').optional().isString(),
  body('bankDetails.ifscCode').optional().isString(),
  body('bankDetails.bankName').optional().isString(),
];

export const updateVendorValidation = [
  param('id').isMongoId().withMessage('Invalid vendor id'),
  body('shopName').optional().isLength({ min: 2, max: 120 }),
  body('description').optional().isString(),
  body('status').optional().isIn(['pending', 'approved', 'suspended', 'rejected']),
  body('address').optional().isObject(),
  body('address.street').optional().isString(),
  body('address.city').optional().isString(),
  body('address.state').optional().isString(),
  body('address.postalCode').optional().isString(),
  body('address.country').optional().isString(),
  body('documents').optional().isObject(),
  body('documents.gstNumber').optional().isString(),
  body('documents.gstFile').optional().isString(),
  body('documents.panNumber').optional().isString(),
  body('documents.panFile').optional().isString(),
  body('bankDetails').optional().isObject(),
  body('bankDetails.accountName').optional().isString(),
  body('bankDetails.accountNumber').optional().isString(),
  body('bankDetails.ifscCode').optional().isString(),
  body('bankDetails.bankName').optional().isString(),
];

export const deleteVendorValidation = [
  param('id').isMongoId().withMessage('Invalid vendor id'),
];

