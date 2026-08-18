// models/Vendor.js
import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique:true
    },
    shopName: { type: String, required: true, trim: true, index: true },
    description: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    documents: {
      // KYC documents, file refs
      gstNumber: String,
      gstFile: String,
      panNumber: String,
      panFile: String,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },

    // status for marketplace onboarding
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
      index: true,
    },

    // quick stats (cached)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
