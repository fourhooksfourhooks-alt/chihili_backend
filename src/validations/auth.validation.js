import { body } from "express-validator";

// Unified signup validation - handles both email and mobile
export const signupValidation = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("mobile")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid mobile number"),
  // Custom validation to ensure either email or mobile is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.mobile) {
      throw new Error("Either email or mobile number is required");
    }
    return true;
  }),
];

// Unified login validation - handles both email/mobile with password + Firebase
export const loginValidation = [
  body("identifier")
    .notEmpty()
    .custom((value) => {
      // Check if identifier is a valid email or mobile
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isMobile = /^91[6-9]\d{9}$/.test(value); // Indian mobile format
      if (!isEmail && !isMobile) {
        throw new Error("Identifier must be a valid email or mobile number");
      }
      return true;
    }),
  body("password").notEmpty().withMessage("Password is required"),
  body("idToken")
    .optional()
    .notEmpty()
    .withMessage("Firebase ID token is required for Firebase login"),
  // Custom validation for login method
  body().custom((value, { req }) => {
    const { identifier, password, idToken } = req.body;
    const authHeader = req.headers.authorization || "";
    const hasFirebaseToken = authHeader.startsWith("Bearer ") || idToken;
    if (hasFirebaseToken) {
      return true;
    }
    if (!identifier) {
      throw new Error("Identifier is required");
    }
    if (!password) {
      throw new Error("Password is required for login");
    }
    return true;
  }),
];

// Send OTP validation - for signup and password reset only
export const sendOtpValidation = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("mobile")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid mobile number"),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.mobile) {
      throw new Error("Either email or mobile number is required");
    }
    return true;
  }),
];

// OTP verification validation - for signup and password reset only
export const verifyOtpValidation = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("mobile")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid mobile number"),
  body("otp")
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 4-6 digit number"),
  // Custom validation to ensure either email or mobile is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.mobile) {
      throw new Error("Either email or mobile number is required");
    }
    return true;
  }),
];

// Create password validation
export const createPasswordValidation = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  body("verificationToken")
    .notEmpty()
    .withMessage("Verification token is required for account creation"),
];

// Firebase login validation
export const firebaseLoginValidation = [
  body("idToken")
    .optional()
    .notEmpty()
    .withMessage("Firebase ID token is required"),
];

// Forgot password validation
export const forgotPasswordValidation = [
  body("identifier")
    .notEmpty()
    .custom((value) => {
      // Check if identifier is a valid email or mobile
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isMobile = /^91[6-9]\d{9}$/.test(value); // Indian mobile format
      if (!isEmail && !isMobile) {
        throw new Error("Identifier must be a valid email or mobile number");
      }
      return true;
    }),
];

// Reset password validation (using OTP)
export const resetPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("otp")
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 4-6 digit number"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

// Legacy validations for backward compatibility
export const emailSignupValidation = signupValidation;
export const mobileSignupValidation = signupValidation;
export const emailLoginValidation = loginValidation;
export const resendOtpValidation = sendOtpValidation;
