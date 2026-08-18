// models/User.js (update)
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true,
    },
    mobile: { type: String, unique: true, trim: true, sparse: true },
    password: { type: String, minlength: 6 }, // hashed
    firstname: { type: String, required: false, trim: true },
    lastname: { type: String, required: false, trim: true },

    // firebase linkage
    firebaseUid: { type: String, index: true, sparse: true },
    providerId: { type: String }, // e.g. 'google.com'

    recentlyViewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    role: {
      type: String,
      enum: ["user", "vendor", "admin"],
      default: "user",
      index: true, 
    },
    loginType: {
      type: String,
      enum: ["google", "facebook", "mobile", "email"],
      default: "email",
    },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },

    // OTP for verification (store hashed)
    otp: {
      codeHash: { type: String }, // hashed OTP
      expiry: { type: Date },
      channel: { type: String, enum: ["email", "mobile"] }, // where OTP was sent
    },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // Refresh token persistence (hashed)
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpires: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.otp;
  delete obj.refreshTokenHash;
  delete obj.refreshTokenExpires;
  return obj;
};

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
