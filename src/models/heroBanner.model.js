import mongoose from "mongoose";

const HeroBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true }, // URL or path to the banner image
    title: { type: String, required: true },
    description: { type: String },
    buttonText: { type: String },
    buttonLink: { type: String }, // e.g. /products/bridal
    order: { type: Number, default: 0 }, // sort order in carousel
    isActive: { type: Boolean, default: true }, // enable/disable banner
  },
  { timestamps: true }
);

export default mongoose.model("HeroBanner", HeroBannerSchema);
