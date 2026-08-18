import mongoose from "mongoose";

const ShippingSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, unique: true, default: "GLOBAL" },
    baseCharge: { type: Number, default: 80 }, // ₹80 standard
    freeAbove: { type: Number, default: 2999 }, // free shipping threshold
    active: { type: Boolean, default: true },
    inclusiveGST: { type: Boolean, default: true }, // whether shipping charge includes GST
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ShippingSetting ||
  mongoose.model("ShippingSetting", ShippingSettingsSchema);
