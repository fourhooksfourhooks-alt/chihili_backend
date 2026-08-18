// lib/jwt.js
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

// Backward-compatible helpers (use access token config)
export function signJwt(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpire,
  });
}

export function verifyJwt(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

// Access/Refresh helpers
export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpire,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

// Deprecated helper kept for compatibility
export const generateToken = (payload) => signAccessToken(payload);

// Deprecated send helper; prefer controllers building responses
export const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const accessToken = signAccessToken({ id: user._id, role: user.role });
  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    data: user,
  });
};
