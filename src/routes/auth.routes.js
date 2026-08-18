import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as authValidation from '../validations/auth.validation.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Main authentication endpoints (as per your table)

// Unified signup endpoint - handles both email and mobile-sends otp to both email and mobile
router.post('/signup', 
  authValidation.signupValidation, 
  handleValidationErrors, 
  authController.signup
);

// Unified login endpoint - handles email/mobile with password + Firebase
router.post('/login', 
  authValidation.loginValidation, 
  handleValidationErrors, 
  authController.login
);

// Refresh access token
router.post('/refresh', authController.refresh);

// Send OTP endpoint - for password reset only
// router.post('/send-otp', 
//   authValidation.sendOtpValidation, 
//   handleValidationErrors, 
//   authController.sendOtp
// );

// Verify OTP endpoint 
router.post('/verify-otp', 
  authValidation.verifyOtpValidation, 
  handleValidationErrors, 
  authController.verifyOtp
);

// Resend OTP endpoint - for signup and password reset
router.post('/resend-otp', 
  authValidation.resendOtpValidation, 
  handleValidationErrors, 
  authController.resendOtp
);


// Create password after signup OTP verification
router.post('/create-password', 
  authValidation.createPasswordValidation, 
  handleValidationErrors, 
  authController.createPassword
);

// Forgot password sends a link to the user to reset the password
router.post('/forgot-password', 
  authValidation.forgotPasswordValidation, 
  handleValidationErrors, 
  authController.forgotPassword
);

// Reset password using the link sent to the user's email or mobile
router.post('/reset-password', 
  authValidation.resetPasswordValidation, 
  handleValidationErrors, 
  authController.resetPassword
);


// // update-contact
// router.post('/update-contact', 
//   authValidation.updateContactValidation, 
//   handleValidationErrors, 
//   authController.updateContact
// );

// // verify-contact
// router.post('/verify-contact', 
//   authValidation.verifyContactValidation, 
//   handleValidationErrors, 
//   authController.verifyContact
// );


// Protected routes
router.get('/me', protect, authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
