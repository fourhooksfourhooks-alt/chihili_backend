import HeroBanner from "../models/heroBanner.model.js";
import AppError from "../utils/appError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { deleteFile } from "../utils/uploader.js";

export class HeroBannerService {
  static async getAllHeroBanners(queryParams = {}) {
    const { isActive, ...rest } = queryParams || {};

    const baseFilter = {};
    if (isActive != null) {
      baseFilter.isActive = isActive === true || isActive === "true";
    }

    let query = HeroBanner.find(baseFilter);

    const features = new ApiFeatures(query, rest);
    features.filter().search(["title", "description", "buttonText"]);

    const filteredQuery = features.query;
    const total = await HeroBanner.countDocuments(filteredQuery.getQuery());

    features.sort("order createdAt").limitFields().paginate();
    const heroBannersDocs = await features.query;

    // Map hero banners to plain objects
    const heroBanners = heroBannersDocs.map((banner) => {
      const obj = banner.toObject ? banner.toObject() : banner;
      return {
        ...obj,
        image: obj.image || null,
      };
    });

    return { heroBanners, total };
  }

  static async getHeroBannerById(bannerId) {
    const heroBanner = await HeroBanner.findById(bannerId);
    if (!heroBanner) {
      throw new AppError("Hero banner not found", 404);
    }
    return heroBanner;
  }

  static async createHeroBanner(data, currentUser) {
    const { title, description, buttonText, buttonLink, order, isActive, image } = data;

    if (!title) {
      throw new AppError("Title is required", 400);
    }

    if (!image) {
      throw new AppError("Image is required", 400);
    }

    // If no order is specified, set it to the highest order + 1
    let bannerOrder = order;
    if (bannerOrder == null) {
      const lastBanner = await HeroBanner.findOne().sort({ order: -1 });
      bannerOrder = lastBanner ? lastBanner.order + 1 : 1;
    }

    const heroBanner = await HeroBanner.create({
      title,
      description,
      buttonText,
      buttonLink,
      order: bannerOrder,
      isActive: isActive != null ? !!isActive : true,
      image,
    });

    return heroBanner;
  }

  static async updateHeroBanner(bannerId, data, currentUser) {
    const heroBanner = await HeroBanner.findById(bannerId);
    if (!heroBanner) {
      throw new AppError("Hero banner not found", 404);
    }

    const updatable = { ...data };

    // Handle image update
    if ("image" in updatable) {
      if (updatable.image === null) {
        // Delete old image if setting to null
        if (heroBanner.image) {
          await deleteFile(heroBanner.image);
        }
      } else if (updatable.image && updatable.image !== heroBanner.image) {
        // Delete old image if uploading new one
        if (heroBanner.image) {
          await deleteFile(heroBanner.image);
        }
      }
    }

    const updated = await HeroBanner.findByIdAndUpdate(
      bannerId,
      { $set: updatable },
      { new: true, runValidators: true }
    );

    return updated;
  }

  static async deleteHeroBanner(bannerId, currentUser) {
    const heroBanner = await HeroBanner.findById(bannerId);
    if (!heroBanner) {
      throw new AppError("Hero banner not found", 404);
    }

    // Delete associated image
    if (heroBanner.image) {
      try {
        await deleteFile(heroBanner.image);
      } catch (error) {
        console.error("Failed to delete hero banner image:", error);
        // Continue with deletion even if image deletion fails
      }
    }

    await HeroBanner.findByIdAndDelete(bannerId);
    return;
  }

  static async updateOrder(bannerId, order, currentUser) {
    if (typeof order !== "number" || order < 0) {
      throw new AppError("Order must be a non-negative number", 400);
    }

    const updated = await HeroBanner.findByIdAndUpdate(
      bannerId,
      { $set: { order } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError("Hero banner not found", 404);
    }
    return updated;
  }

  static async bulkUpdateOrder(banners, currentUser) {
    if (!Array.isArray(banners)) {
      throw new AppError("Banners must be an array", 400);
    }

    const updates = [];
    for (const banner of banners) {
      if (!banner.id || typeof banner.order !== "number") {
        throw new AppError("Each banner must have id and order fields", 400);
      }

      updates.push(
        HeroBanner.findByIdAndUpdate(
          banner.id,
          { $set: { order: banner.order } },
          { new: true, runValidators: true }
        )
      );
    }

    const updated = await Promise.all(updates);
    
    // Filter out null results (not found banners)
    const validUpdates = updated.filter(banner => banner !== null);
    
    if (validUpdates.length !== banners.length) {
      throw new AppError("Some hero banners were not found", 404);
    }

    return validUpdates;
  }
}

export default HeroBannerService;


