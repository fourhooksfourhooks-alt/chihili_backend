import { config } from '../config/env.js';
import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error (schema validation)
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      location: 'body',
      message: e.message,
      value: e.value,
    }));
    error = { message: 'Validation failed', statusCode: 422, errors: details };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    statusCode,
    // Do not include code for validation errors to keep payload minimal
    code: statusCode === 422 ? undefined : error.code,
    message: error.message || 'Server Error',
    errors: error.errors || undefined,
  };

  // if (config.env === 'development') {
  //   response.stack = err.stack;
  // }

  res.status(statusCode).json(response);
};

export default errorHandler;
