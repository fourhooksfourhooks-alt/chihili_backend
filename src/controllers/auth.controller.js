import { AuthService } from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { config } from "../config/env.js";
import Cart from "../models/cart.model.js";
import Wishlist from "../models/wishlist.model.js";

// Firebase Authentication
export const firebaseLogin = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.body?.idToken;

  if (!idToken) {
    throw new AppError("Missing Firebase ID token", 400);
  }

  console.log("Firebase ID Token:", idToken);
  const { user, accessToken, refreshToken } = await AuthService.authenticateWithFirebase(idToken);

  // Set both access and refresh tokens in cookies
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  return new ApiResponse(200, { user, accessToken }, "Firebase authentication successful").send(res);
});

// Unified Signup - handles both email and mobile
export const signup = asyncHandler(async (req, res) => {
  const { email, mobile } = req.body;

  const result = await AuthService.signup({
    email,
    mobile, 
  });

  return new ApiResponse(
    201,
    result,
    "Signup initiated. Please verify with OTP"
  ).send(res);
});

// Unified Login - handles email/mobile with password + Firebase
export const login = asyncHandler(async (req, res) => {
  // Check if it's Firebase login
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.body?.idToken;

  if (idToken) {
    // Handle Firebase login
    console.log("Firebase ID Token:", idToken);
    const { user, accessToken, refreshToken } = await AuthService.authenticateWithFirebase(idToken);

    // Set both access and refresh tokens in cookies
    AuthService.setAuthCookies(res, accessToken, refreshToken);

    return new ApiResponse(
      200,
      { user, accessToken },
      "Firebase authentication successful"
    ).send(res);
  }

  // Handle regular email/mobile login
  const { identifier, password } = req.body;

  const { user, accessToken, refreshToken } = await AuthService.login({
    identifier,
    password
  });

  // Set both access and refresh tokens in cookies
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  return new ApiResponse(200, { user, accessToken }, "Login successful").send(res);
});


// Send OTP - for signup and password reset only
export const sendOtp = asyncHandler(async (req, res) => {

  const { email, mobile } = req.body;

  const result = await AuthService.sendOtp({
    email,
    mobile
  });

  return new ApiResponse(200, result, "OTP sent successfully").send(res);
});

// Verify OTP - for signup and password reset only
export const verifyOtp = asyncHandler(async (req, res) => {

  const { email, mobile, otp } = req.body;

  const result = await AuthService.verifyOtp({
    email,
    mobile,
    otp
  });

  return new ApiResponse(200, result, "OTP verified successfully").send(res);
});

// Create Password - after signup OTP verification
export const createPassword = asyncHandler(async (req, res) => {
  const { password, verificationToken } = req.body;

  const result = await AuthService.createPassword({
    password,
    verificationToken
  });

  return new ApiResponse(
    200,
    result,
    "Account created successfully. Please login."
  ).send(res);
});

// Forgot Password - sends reset OTP
export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  const result = await AuthService.forgotPassword({ identifier });

  return new ApiResponse(200, result, "Password reset OTP sent").send(res);
});

// Reset Password - using OTP
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  const { user, accessToken, refreshToken } = await AuthService.resetPassword({
    email,
    otp,
    password
  });

  // Set both access and refresh tokens in cookies
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  return new ApiResponse(200, { user, accessToken }, "Password reset successful").send(res);
});

// Get Current User
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch cart with populated product details
  const cart = await Cart.findOne({ userId }).populate('items.productId').populate('saveForLater.productId');

  // Fetch wishlist and get only product IDs
  const wishlistDoc = await Wishlist.findOne({ user: userId });
  const wishlist = wishlistDoc ? wishlistDoc.items : [];

  return new ApiResponse(
    200,
    { user: req.user, cart, wishlist },
    "User retrieved successfully"
  ).send(res);
});

// Logout (client-side token removal)
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[config.refreshCookieName];
  await AuthService.revokeRefreshTokenByToken(refreshToken);
  
  // Clear both access and refresh token cookies
  AuthService.clearAuthCookies(res);
  
  return new ApiResponse(200, null, "Logout successful").send(res);
});

export const refresh = asyncHandler(async (req, res) => {
  const headerToken = req.headers["x-refresh-token"]; // optional support
  const cookieToken = req.cookies?.[config.refreshCookieName];
  const token = headerToken || cookieToken;
  const { user, accessToken, refreshToken } = await AuthService.refreshTokens(token);

  // Set both access and refresh tokens in cookies (token rotation)
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  return new ApiResponse(200, { user, accessToken }, "Token refreshed").send(res);
});

export const resendOtp = asyncHandler(async (req, res) => {
  return sendOtp(req, res);
});
