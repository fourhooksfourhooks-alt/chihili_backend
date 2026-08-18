import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field: e.path,
      location: e.location,
      message: e.msg,
      value: e.value,
    }));

    const mainMessage = details[0]?.message || 'Validation failed';
    // Use 422 Unprocessable Entity for validation errors; do not expose code
    return next(new AppError(mainMessage, 422, details));
  }

  next();
};
