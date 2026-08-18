// models/Product.js
import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, index: true },
    title: String, // e.g. "Red / L"
    attributes: {
      size: { type: String, enum: ["XS", "S", "M", "L", "XL", "XXL"] },
      color: { type: String },
    },
    price: { 
      type: Number, 
      required: [true, 'Variant price is required'],
      min: [0, 'Price cannot be negative']
    },
    mrp: Number,
    images: [String],
    stock: { type: Number, default: 0 }, // inline inventory
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: String,
    description: String,
    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    ],
    tags: [String],
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },
    images: [String], // fallback images

    // Discount details (applies to all variants of this product)
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: null,
    },
    discountValue: { type: Number, default: 0 },

    // Optional: buy X get Y
    buyXGetY: {
      x: { type: Number },
      y: { type: Number },
    },
    variants: {
      type: [VariantSchema],
      required: true,
      validate: {
        validator: function(variants) {
          return variants && variants.length > 0;
        },
        message: 'At least one variant is required'
      }
    }, // if single SKU, put one variant
    createdAt: { type: Date, default: Date.now },
    avgRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    returnPolicy: { type: String, default: "7-day return/exchange available" },
  },
  { timestamps: true }
);

// text index for search: name + description + tags
ProductSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
