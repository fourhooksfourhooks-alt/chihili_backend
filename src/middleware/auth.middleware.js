import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// Protect routes - user must be authenticated
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers first, then cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // else if (req.cookies && req.cookies[config.accessCookieName]) {
  //   token = req.cookies[config.accessCookieName];
  // }

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    // Verify access token
    const decoded = jwt.verify(token, config.jwtAccessSecret || config.jwtSecret);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('No user found with this token', 401));
    }
    
    // Check if user is deleted
    if (user.isDeleted) {
      return next(new AppError('User account has been deleted', 401));
    }
    
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers first, then cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies[config.accessCookieName]) {
    token = req.cookies[config.accessCookieName];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret || config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (user && !user.isDeleted) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }

  next();
});
