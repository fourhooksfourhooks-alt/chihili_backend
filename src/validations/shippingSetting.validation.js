import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

export const validateShippingSettings = [
  body('baseCharge')
    .optional()
    .isNumeric()
    .withMessage('Base charge must be a number')
    .isFloat({ min: 0 })
    .withMessage('Base charge must be a positive number'),

  body('freeAbove')
    .optional()
    .isNumeric()
    .withMessage('Free shipping threshold must be a number')
    .isFloat({ min: 0 })
    .withMessage('Free shipping threshold must be a positive number'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),

  body('inclusiveGST')
    .optional()
    .isBoolean()
    .withMessage('Inclusive GST must be a boolean value'),

  // Custom validation to ensure freeAbove is greater than baseCharge
  body('freeAbove')
    .optional()
    .custom((value, { req }) => {
      if (req.body.baseCharge && value <= req.body.baseCharge) {
        throw new Error('Free shipping threshold should be greater than base charge');
      }
      return true;
    }),

  handleValidationErrors
];

export const validateCartTotal = [
  body('cartTotal')
    .notEmpty()
    .withMessage('Cart total is required')
    .isNumeric()
    .withMessage('Cart total must be a number')
    .isFloat({ min: 0 })
    .withMessage('Cart total must be a positive number'),

  handleValidationErrors
];
