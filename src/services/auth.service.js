import admin from "../config/firebase.config.js";
import { User } from "../models/user.model.js";
import { generateNumericOtp, hashOtp } from "../lib/otp.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import {
  generateRandomString,
  generateSecureHash,
} from "../utils/authUtils.js";
import { sendOtpSmsMsg91, sendOtpEmailMsg91 } from "../utils/msg91.js";
import AppError from "../utils/appError.js";
import { config } from "../config/env.js";
import jwt from "jsonwebtoken";

export class AuthService {
  static buildTokenPair(user) {
    const payload = { id: user._id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  static async persistRefreshToken(user, refreshToken) {
    // Persist hashed refresh token with expiry
    const decoded = jwt.decode(refreshToken);
    const expiryMs = (decoded?.exp || 0) * 1000;
    const { generateSecureHash } = await import("../utils/authUtils.js");
    user.refreshTokenHash = generateSecureHash(refreshToken);
    user.refreshTokenExpires = expiryMs ? new Date(expiryMs) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();
  }

  static async issueTokensForUser(user) {
    const { accessToken, refreshToken } = this.buildTokenPair(user);
    await this.persistRefreshToken(user, refreshToken);
    return { user, accessToken, refreshToken };
  }

  // Helper method to set auth cookies in response
static setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === "production";

  // Decode tokens to get expiry (exp is in seconds)
  const accessExp = jwt.decode(accessToken)?.exp;
  const refreshExp = jwt.decode(refreshToken)?.exp;

  const accessMaxAge = accessExp ? (accessExp * 1000 - Date.now()) : 24 * 60 * 60 * 1000;
  const refreshMaxAge = refreshExp ? (refreshExp * 1000 - Date.now()) : 7 * 24 * 60 * 60 * 1000;

  // Access token cookie
  res.cookie(config.accessCookieName, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: accessMaxAge,
    path: "/",
  });

  // Refresh token cookie
  res.cookie(config.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: refreshMaxAge,
    path: "/",
  });
}

// Helper method to clear auth cookies
static clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie(config.accessCookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.clearCookie(config.refreshCookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}


  // Firebase authentication - handles auto-create or login
  static async authenticateWithFirebase(idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, email_verified } = decoded;
      const provider = decoded?.firebase?.sign_in_provider || "firebase";

      const [firstname = "", ...rest] = (name || "").split(" ");
      const lastname = rest.join(" ") || "";

      let user = await User.findOne({ firebaseUid: uid });
      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (user) {
        // Update existing user
        user.firebaseUid = uid;
        user.providerId = provider;
        user.isEmailVerified = !!email_verified;
        user.loginType = this.getLoginType(provider);
        user.lastLogin = new Date();
        user.loginAttempts = 0;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          firebaseUid: uid,
          email: email || null,
          firstname: firstname || "User",
          lastname,
          providerId: provider,
          isEmailVerified: !!email_verified,
          loginType: this.getLoginType(provider),
          lastLogin: new Date(),
        });
      }

      return await this.issueTokensForUser(user);
    } catch (error) {
      throw new AppError("Invalid Firebase token", 401);
    }
  }

  // Unified signup - creates pending user and sends OTP
  static async signup(data) {
    const { email, mobile } = data;

    if (!email && !mobile) {
      throw new AppError("Either email or mobile is required", 400);
    }

    // Check if user already exists
    const query = {};
    if (email) query.email = email;
    if (mobile) query.mobile = mobile;

    const existingUser = await User.findOne({
      $or: Object.keys(query).map((key) => ({ [key]: query[key] })),
    });

    if (
      existingUser &&
      ((email && existingUser.isEmailVerified) ||
        (mobile && existingUser.isMobileVerified))
    ) {
      throw new AppError("User already exists and is verified", 409);
    }

    // Generate OTP
    const otpLength = 6;
    const otp = generateNumericOtp(otpLength);
    const otpHash = hashOtp(otp);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const channel = email ? "email" : "mobile";
    const identifier = email || mobile;

    let user;
    if (existingUser) {
      // Update existing user
      existingUser.otp = {
        codeHash: otpHash,
        expiry: otpExpiry,
        channel,
      };
      if (email) existingUser.email = email;
      if (mobile) existingUser.mobile = mobile;
      await existingUser.save();
      user = existingUser;
    } else {
      // Create new user
      const userData = {
        loginType: email ? "email" : "mobile",
        otp: {
          codeHash: otpHash,
          expiry: otpExpiry,
          channel,
        },
      };
      if (email) userData.email = email;
      if (mobile) userData.mobile = mobile;
      user = await User.create(userData);
    }

    // Send OTP via email/SMS service
    if (channel === "mobile") {
      try {
        await sendOtpSmsMsg91({ mobile: identifier, otp });
      } catch (err) {
        console.error("Failed to send OTP SMS via MSG91:", err.message);
      }
    } else {
      try {
        await sendOtpEmailMsg91({ email: identifier, name: data?.name, otp });
      } catch (err) {
        console.error("Failed to send OTP EMAIL via MSG91:", err.message);
      }
    }

    return {
      message: `OTP sent to your ${channel}`,
      identifier,
      channel,
      otp: config.env === "development" ? otp : undefined,
    };
  }

  // Unified login - handles email/mobile with password
  static async login(data) {
    const { identifier, password } = data;

    if (!identifier) {
      throw new AppError("Either email or mobile is required", 400);
    }

    if (!password) {
      throw new AppError("Password is required", 400);
    }

    // Find user
    const query = {};
    if (identifier.includes("@")) {
      query.email = identifier;
    } else {
      query.mobile = identifier;
    }
    const user = await User.findOne(query).select("+password");

    // Explicitly check for user existence to provide clearer errors.
    // Note: if you prefer not to reveal user existence for security, keep a generic message instead.
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // If the user exists but has no password (e.g. signup via social or OTP-only), inform client
    // so frontend can guide user to set a password or use the appropriate login flow.
    if (!user.password) {
      throw new AppError(
        "Password is not set for this account. Please use the password setup or social login flow.",
        400
      );
    }

    // Check if user is verified
    if (identifier.includes("@")) {
      if (!user.isEmailVerified) {
        throw new AppError("Please verify your email first", 401);
      }
    } else {
      if (!user.isMobileVerified) {
        throw new AppError("Please verify your mobile first", 401);
      }
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      user.loginAttempts += 1;
      await user.save();
      throw new AppError("Invalid credentials", 401);
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    return await this.issueTokensForUser(user);
  }

  // Send OTP - for signup and password reset only
  static async sendOtp(data) {
    const { email, mobile } = data;

    if (!email && !mobile) {
      throw new AppError("Either email or mobile is required", 400);
    }


    const identifier = email || mobile;
    const channel = email ? "email" : "mobile";

    // Find user
    const query = email ? { email } : { mobile };
    const user = await User.findOne(query);

    if (!user) {
      throw new AppError(`No account found with this ${channel}`, 404);
    }
    // Generate OTP
    const otp = generateNumericOtp(6);
    const otpHash = hashOtp(otp);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = {
      codeHash: otpHash,
      expiry: otpExpiry,
      channel,
    };
    await user.save();

    // Send OTP via email/SMS service
    if (channel === "mobile") {
      try {
        await sendOtpSmsMsg91({ mobile: identifier, otp });
      } catch (err) {
        console.error("Failed to send OTP SMS via MSG91:", err.message);
      }
    } else {
      try {
        await sendOtpEmailMsg91({ email: identifier, name: user?.firstname || user?.email, otp });
      } catch (err) {
        console.error("Failed to send OTP EMAIL via MSG91:", err.message);
      }
    }

    return {
      message: `OTP sent to your ${channel}`,
      identifier,
      channel,
    };
  }




  // Verify OTP - for signup and password reset only
  static async verifyOtp(data) {
  const { email, mobile, otp } = data;

    if (!email && !mobile) {
      throw new AppError("Either email or mobile is required", 400);
    }

    if (!otp) {
      throw new AppError("OTP is required", 400);
    }

  // Only support signup OTP verification

    const identifier = email || mobile;
    const channel = email ? "email" : "mobile";

    // Find user with valid OTP
    const query = email ? { email } : { mobile };
    const user = await User.findOne({
      ...query,
      "otp.expiry": { $gt: new Date() },
      "otp.channel": channel,
    });

    if (!user) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    // Verify OTP
    const otpHash = hashOtp(otp);
    if (user.otp.codeHash !== otpHash) {
      throw new AppError("Invalid OTP", 400);
    }


    // Mark user as verified
    if (email) {
      user.isEmailVerified = true;
    } else {
      user.isMobileVerified = true;
    }

    // Issue short-lived JWT for verification (10 min)
    const verificationToken = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: "10m" })

    // Clear OTP
    user.otp = undefined;
    await user.save();

    // For signup OTP, check if user needs to create password
    if (!user.password) {
      return {
        message: "OTP verified successfully",
        identifier,
        needsPassword: true,
        userId: user._id,
        verificationToken
      };
    }

    return {
      message: "OTP verified successfully",
      identifier,
      verificationToken
    };
  }

  // Create password after signup OTP verification
  static async createPassword(data) {
    const { password, verificationToken } = data;

    if (!password) {
      throw new AppError("Password is required", 400);
    }
    if (!verificationToken) {
      throw new AppError("Verification JWT is required", 400);
    }

    // Verify JWT
    let payload;
    try {
      payload = jwt.verify(verificationToken, config.jwtSecret);
    } catch (err) {
      throw new AppError("Invalid or expired verification JWT", 401);
    }

    // Find user by userId in JWT
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (user.password) {
      throw new AppError("Password already exists for this user", 400);
    }

    // Check user is verified
    if (!(user.isEmailVerified || user.isMobileVerified)) {
      throw new AppError("User is not verified", 400);
    }

    // Password requirements (min 8 chars, at least one uppercase, one lowercase, one number, one special char)

    user.password = password;
    await user.save();

    return;
  }

  // Forgot password - sends reset link via email or SMS
  static async forgotPassword(data) {
    const { identifier } = data;
    if (!identifier) {
      throw new AppError("Either email or mobile number is required", 400);
    }

    // Find user by email or mobile
    let user;
    let channel;
    if (identifier.includes("@")) {
      user = await User.findOne({ email: identifier });
      channel = "email";
    } else {
      user = await User.findOne({ mobile: identifier });
      channel = "mobile";
    }
    if (!user) {
      throw new AppError(`No account found with this ${channel}`, 404);
    }

    // Generate secure reset token
    const resetToken = generateRandomString(32);
    const resetTokenHash = generateSecureHash(resetToken);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Construct reset link (replace with your frontend URL)
    const resetLink = `https://yourfrontend.com/reset-password?token=${resetToken}&identifier=${encodeURIComponent(identifier)}`;

    // Send link via email or SMS
    if (channel === "email") {
      // TODO: Implement email sending logic here
      console.log(
        `Send password reset link to email: ${identifier} -> ${resetLink}`
      );
    } else {
      // Send SMS using MSG91 or other service
      try {
        await sendOtpSmsMsg91({ mobile: identifier, otp: resetLink });
      } catch (err) {
        console.error("Failed to send reset link SMS via MSG91:", err.message);
      }
    }

    return {
      message: `Password reset link sent to your ${channel}`,
      identifier,
      channel,
      resetLink: config.env === "development" ? resetLink : undefined,
    };
  }

  // Reset password using OTP
  static async resetPassword(data) {
    const { email, otp, password } = data;

    if (!email || !otp || !password) {
      throw new AppError("Email, OTP and password are required", 400);
    }

    // Verify OTP first
    const verifyResult = await this.verifyOtp({
      email,
      otp,
    });

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.password = password;
    await user.save();

    return await this.issueTokensForUser(user);
  }

  // Helper method to determine login type from provider
  static getLoginType(provider) {
    if (provider.includes("google")) return "google";
    if (provider.includes("facebook")) return "facebook";
    return "email";
  }

  // Refresh tokens rotation
  static async refreshTokens(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await User.findById(payload.id);
    if (!user || user.isDeleted) {
      throw new AppError("User not found", 404);
    }

    // Compare hashed token
    const { generateSecureHash } = await import("../utils/authUtils.js");
    const providedHash = generateSecureHash(refreshToken);
    if (
      !user.refreshTokenHash ||
      user.refreshTokenHash !== providedHash ||
      (user.refreshTokenExpires && user.refreshTokenExpires < new Date())
    ) {
      throw new AppError("Refresh token not recognized", 401);
    }

    // Rotate
    const { accessToken, refreshToken: newRefreshToken } = this.buildTokenPair(user);
    await this.persistRefreshToken(user, newRefreshToken);
    return { user, accessToken, refreshToken: newRefreshToken };
  }

  // Revoke refresh token (logout)
  static async revokeRefreshTokenByToken(refreshToken) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.id);
      if (!user) return;
      user.refreshTokenHash = null;
      user.refreshTokenExpires = null;
      await user.save();
    } catch (_) {
      // ignore
    }
  }
}
