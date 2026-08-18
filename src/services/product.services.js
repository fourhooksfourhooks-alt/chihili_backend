import Product from "../models/product.model.js";
import Vendor from "../models/vendor.model.js";
import Payment from "../models/payment.model.js";
import AppError from "../utils/appError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { generateUniqueSlug } from "../utils/slug-generator.js";
import { generateSKU } from "../utils/sku-generator.js";
import { deleteFile as deleteFromStorage } from "../utils/uploader.js";
import mongoose from "mongoose";
import Category from "../models/category.model.js";


export class ProductService {
  // Helper method to create search match stage
  static _getSearchMatchStage(searchTerm) {
    if (!searchTerm) return null;
    
    return {
      $match: {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { slug: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    };
  }

  // Helper method to build aggregation pipeline for all queries
  static _buildProductAggregationPipeline(baseFilter, queryParams) {
    const { sortBy, search, fields, page = 1, limit = 10 } = queryParams;
    
    const pipeline = [
      { $match: baseFilter }
    ];

    // Add search stage if needed
    const searchStage = this._getSearchMatchStage(search);
    if (searchStage) {
      pipeline.push(searchStage);
    }

    // Add computed fields for price sorting (always add for consistency)
    pipeline.push({
      $addFields: {
        minPrice: { $min: "$variants.price" },
        maxPrice: { $max: "$variants.price" }
      }
    });

    // Add sorting stage
    const sortStage = {};
    switch (sortBy) {
      case "lowToHigh":
        sortStage.minPrice = 1;
        sortStage.createdAt = -1;
        break;
      case "highToLow":
        sortStage.maxPrice = -1;
        sortStage.createdAt = -1;
        break;
      case "popularity":
        sortStage.salesCount = -1;
        sortStage.createdAt = -1;
        break;
      case "newest":
      default:
        sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Add field projection if specified
    if (fields) {
      const fieldProjection = fields.split(',').reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {});
      // Always include _id unless explicitly excluded
      if (!fieldProjection._id) fieldProjection._id = 1;
      pipeline.push({ $project: fieldProjection });
    }

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    return pipeline;
  }

  
  static async getAllProducts(queryParams = {}) {
    const {
      minPrice,
      maxPrice,
      size,
      color,
      category,
      tag,
      status,
      createdAt,
      minDiscount,
      ...rest
    } = queryParams || {};

    const baseFilter = { isDeleted: false };

    // Status handling:
    // - If a concrete status is provided (and not 'all'), honor it
    // - Otherwise, default to 'active' for public catalog
    if (
      typeof status !== "undefined" &&
      String(status).toLowerCase() !== "all"
    ) {
      baseFilter.status = status;
    } else {
      baseFilter.status = "active";
    }

    if (category) {
      const categoryDocs = await Category.find({
        $or: [{ _id: category }, { parent: category }]
      }).select("_id");
    
      const categoryIds = categoryDocs.map(c => c._id);
      baseFilter.categories = { $in: categoryIds };
    }

    if (tag) baseFilter.tags = tag;

    // Build variants elemMatch if needed
    const variantsElem = {};
    if (minPrice != null || maxPrice != null) {
      variantsElem.price = {};
      if (minPrice != null) variantsElem.price.$gte = Number(minPrice);
      if (maxPrice != null) variantsElem.price.$lte = Number(maxPrice);
    }
    if (size) variantsElem["attributes.size"] = size;
    if (color) variantsElem["attributes.color"] = color;
    if (Object.keys(variantsElem).length > 0) {
      baseFilter.variants = { $elemMatch: variantsElem };
    }

    // Min discount filter (only percentage now)
    if (minDiscount != null) {
      baseFilter.$expr = {
        $and: [
          { $eq: ["$discountType", "percentage"] },
          { $gte: ["$discountValue", Number(minDiscount)] }
        ]
      };
    }

    // Use aggregation pipeline for all queries (consistency)
    const pipeline = this._buildProductAggregationPipeline(baseFilter, rest);
    
    // Build count pipeline with same filters
    const countPipeline = [
      { $match: baseFilter }
    ];
    
    // Add search stage to count pipeline if needed
    const searchStage = this._getSearchMatchStage(rest.search);
    if (searchStage) {
      countPipeline.push(searchStage);
    }
    countPipeline.push({ $count: "total" });
    
    // Execute both queries in parallel
    const [products, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);
    
    const total = countResult[0]?.total || 0;
    return { products, total };
  }

  static async getProductById(productId, currentUser) {
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      throw new AppError("Product not found", 404);
    }
    // Restrict non-active products to owner/admin
    if (product.status !== "active") {
      const vendor = await Vendor.findById(product.vendorId);
      const isOwner =
        currentUser &&
        vendor &&
        vendor.userId?.toString() === currentUser._id.toString();
      const isAdmin =
        currentUser && ["admin", "superadmin"].includes(currentUser.role);
      if (!isOwner && !isAdmin) {
        throw new AppError("Product not found", 404);
      }
    }
    return product;
  }

  static async getProductBySlug(slug, currentUser) {
    const product = await Product.findOne({ slug, isDeleted: false });
    if (!product) {
      throw new AppError("Product not found", 404);
    }
    if (product.status !== "active") {
      const vendor = await Vendor.findById(product.vendorId);
      const isOwner =
        currentUser &&
        vendor &&
        vendor.userId?.toString() === currentUser._id.toString();
      const isAdmin =
        currentUser && ["admin", "superadmin"].includes(currentUser.role);
      if (!isOwner && !isAdmin) {
        throw new AppError("Product not found", 404);
      }
    }
    return product;
  }

  static async getVendorProducts(vendorId, queryParams = {}, currentUser) {
    // Ensure vendor exists for ownership checks
    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    const isOwner =
      currentUser && vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);

    const {
      minPrice,
      maxPrice,
      size,
      color,
      category,
      tag,
      status,
      ...rest
    } = queryParams;

    const baseFilter = { vendorId, isDeleted: false };

    // Default to active for non-owners unless explicitly owner/admin
    if (!isOwner && !isAdmin) {
      baseFilter.status = "active";
    } else if (status && (isOwner || isAdmin)) {
      baseFilter.status = status;
    }

    if (category) baseFilter.categories = category;
    if (tag) baseFilter.tags = tag;

    // Build variants elemMatch if needed
    const variantsElem = {};
    if (minPrice != null || maxPrice != null) {
      variantsElem.price = {};
      if (minPrice != null) variantsElem.price.$gte = Number(minPrice);
      if (maxPrice != null) variantsElem.price.$lte = Number(maxPrice);
    }
    if (size) variantsElem["attributes.size"] = size;
    if (color) variantsElem["attributes.color"] = color;
    if (Object.keys(variantsElem).length > 0) {
      baseFilter.variants = { $elemMatch: variantsElem };
    }

    // Use ApiFeatures for filtering, searching, sorting, pagination
    const searchFields = ['name', 'slug', 'description', 'tags'];
    const filterFeatures = new ApiFeatures(Product.find(baseFilter), rest).filter().search(searchFields);
    const total = await filterFeatures.query.countDocuments();

    const productsQuery = new ApiFeatures(Product.find(baseFilter), rest)
      .filter()
      .search(searchFields)
      .sort()
      .limitFields()
      .paginate();

    const products = await productsQuery.query;

    return { products, total };
  }

  static async createProduct(data, currentUser) {
    const {
      vendorId,
      name,
      shortDescription,
      description,
      categories,
      tags,
      images,
      variants,
      status,
      isFeatured,
      discountType,
      discountValue,
      buyXGetY,
    } = data;

    if (!vendorId) {
      throw new AppError("vendorId is required", 400);
    }

    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    const isOwner =
      currentUser && vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Not authorized to create product for this vendor",
        403
      );
    }

    // Ensure at least one variant is provided
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      throw new AppError("At least one variant is required", 400);
    }

    // Validate that each variant has required fields
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant.price || variant.price <= 0) {
        throw new AppError(`Variant ${i + 1} must have a valid price`, 400);
      }
    }

    // Auto-generate unique slug
    const uniqueSlug = await generateUniqueSlug(name, "product");

    // Auto-generate SKUs for variants
    const processedVariants = variants.map((variant) => ({
      ...variant,
      sku: generateSKU(vendorId, variant),
    }));

    const product = await Product.create({
      vendorId,
      name,
      slug: uniqueSlug,
      shortDescription: shortDescription || "",
      description: description || "",
      categories: categories || undefined,
      tags: tags || undefined,
      images: images || undefined,
      variants: processedVariants,
      status: isAdmin ? status || undefined : undefined,
      isFeatured: isAdmin ? isFeatured || false : false,
      discountType: discountType || undefined,
      discountValue: discountValue || undefined,
      buyXGetY: buyXGetY || undefined,
    });

    return product;
  }

  static async updateProduct(productId, data, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    // Ownership / admin check
    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to update this product", 403);
    }

    const updatable = { ...data };

    // Restrict vendorId change to admin and validate vendor
    if (Object.prototype.hasOwnProperty.call(updatable, "vendorId")) {
      if (!isAdmin) {
        delete updatable.vendorId;
      } else if (
        updatable.vendorId &&
        updatable.vendorId.toString() !== product.vendorId.toString()
      ) {
        const newVendor = await Vendor.findOne({
          _id: updatable.vendorId,
          isDeleted: false,
        });
        if (!newVendor) {
          throw new AppError("Target vendor not found", 404);
        }
      }
    }

    // Auto-generate new slug if name changes
    if (updatable.name && updatable.name !== product.name) {
      updatable.slug = await generateUniqueSlug(updatable.name, "product");
    } else if (updatable.slug) {
      // If slug is manually provided, ensure uniqueness
      updatable.slug = updatable.slug.trim().toLowerCase();
      const exists = await Product.findOne({
        slug: updatable.slug,
        _id: { $ne: productId },
      });
      if (exists) {
        throw new AppError("Slug already in use", 409);
      }
    }

    // Restrict status/isFeatured updates to admin only
    if (Object.prototype.hasOwnProperty.call(updatable, "status") && !isAdmin) {
      delete updatable.status;
    }
    if (
      Object.prototype.hasOwnProperty.call(updatable, "isFeatured") &&
      !isAdmin
    ) {
      delete updatable.isFeatured;
    }

    // Remove variants and images from updatable to prevent accidental overwrites
    // These should be managed through dedicated endpoints
    delete updatable.variants;
    delete updatable.images;

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: updatable },
      { new: true, runValidators: true }
    );

    return updated;
  }

  static async deleteProduct(productId, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to delete this product", 403);
    }

    product.isDeleted = true;
    await product.save();
    return;
  }

  static async updateProductStatus(productId, status, currentUser) {
    // const isAdmin =
    //   currentUser && ["admin", "superadmin"].includes(currentUser.role);
    // if (!isAdmin) {
    //   throw new AppError("Only admin can update product status", 403);
    // }
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!updated || updated.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    return updated;
  }

  static async toggleFeatured(productId, isFeatured, currentUser) {
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isAdmin) {
      throw new AppError("Only admin can update featured flag", 403);
    }
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: { isFeatured: !!isFeatured } },
      { new: true, runValidators: true }
    );
    if (!updated || updated.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    return updated;
  }

  static async addVariants(productId, incomingVariants = [], currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify variants", 403);
    }

    const existingSkus = new Set(
      (product.variants || []).map((v) => v.sku).filter(Boolean)
    );

    // Auto-generate SKUs for new variants
    const processedVariants = incomingVariants.map((variant) => {
      if (!variant.sku) {
        // Generate SKU if not provided
        variant.sku = generateSKU(product.vendorId, variant);
      }

      // Check if generated SKU already exists
      if (existingSkus.has(variant.sku)) {
        throw new AppError(
          `Variant with sku ${variant.sku} already exists`,
          409
        );
      }

      existingSkus.add(variant.sku);
      return variant;
    });

    product.variants = [...(product.variants || []), ...processedVariants];
    await product.save();
    return product;
  }

  static async updateVariant(productId, sku, updates = {}, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify variants", 403);
    }

    const variants = product.variants || [];
    const index = variants.findIndex((v) => v.sku === sku);
    if (index === -1) {
      throw new AppError("Variant not found", 404);
    }

    const allowed = ["title", "attributes", "price", "mrp", "stock"];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        variants[index][key] = updates[key];
      }
    }
    product.variants = variants;
    await product.save();
    return product;
  }

  static async removeVariant(productId, sku, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify variants", 403);
    }

    // Check if removing this variant would leave the product with no variants
    const currentVariants = product.variants || [];
    if (currentVariants.length <= 1) {
      throw new AppError(
        "Cannot remove the last variant. A product must have at least one variant.",
        400
      );
    }

    const before = product.variants?.length || 0;
    product.variants = (product.variants || []).filter((v) => v.sku !== sku);
    if (product.variants.length === before) {
      throw new AppError("Variant not found", 404);
    }
    await product.save();
    return product;
  }

  static async updateStock(productId, updates = [], currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }
    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to update stock", 403);
    }

    const variants = product.variants || [];
    const skuToIndex = new Map(variants.map((v, idx) => [v.sku, idx]));
    for (const u of updates) {
      const idx = skuToIndex.get(u.sku);
      if (idx == null) {
        throw new AppError(`Variant with sku ${u.sku} not found`, 404);
      }
      variants[idx].stock = Math.max(0, Number(u.stock));
    }
    product.variants = variants;
    await product.save();
    return product;
  }

  // Image management methods
  static async addProductImages(productId, imageUrls, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify product images", 403);
    }

    // Initialize images array if it doesn't exist
    if (!product.images) {
      product.images = [];
    }

    // Add new images
    product.images = [...product.images, ...imageUrls];
    await product.save();
    return product;
  }

  static async addVariantImages(productId, sku, imageUrls, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify variant images", 403);
    }

    const variants = product.variants || [];
    const variantIndex = variants.findIndex((v) => v.sku === sku);
    if (variantIndex === -1) {
      throw new AppError("Variant not found", 404);
    }

    // Initialize images array if it doesn't exist
    if (!variants[variantIndex].images) {
      variants[variantIndex].images = [];
    }

    // Add new images
    variants[variantIndex].images = [
      ...variants[variantIndex].images,
      ...imageUrls,
    ];
    product.variants = variants;
    await product.save();
    return product;
  }

  static async removeProductImage(productId, imageUrl, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify product images", 403);
    }

    if (!product.images) {
      throw new AppError("No images to remove", 400);
    }

    const exists = product.images.includes(imageUrl);
    if (!exists) {
      throw new AppError("Image not found", 404);
    }
    // Delete from storage first
    try {
      await deleteFromStorage(imageUrl);
    } catch (err) {
      console.error("Storage image delete failed:", err);
      throw new AppError("Failed to delete image from storage", 500);
    }

    // Then remove reference from DB
    product.images = product.images.filter((img) => img !== imageUrl);
    await product.save();
    return product;
  }

  static async removeVariantImage(productId, sku, imageUrl, currentUser) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError("Product not found", 404);
    }

    const vendor = await Vendor.findById(product.vendorId);
    const isOwner =
      currentUser &&
      vendor &&
      vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin =
      currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to modify variant images", 403);
    }

    const variants = product.variants || [];
    const variantIndex = variants.findIndex((v) => v.sku === sku);
    if (variantIndex === -1) {
      throw new AppError("Variant not found", 404);
    }

    if (!variants[variantIndex].images) {
      throw new AppError("No images to remove", 400);
    }

    const exists = variants[variantIndex].images.includes(imageUrl);
    if (!exists) {
      throw new AppError("Image not found", 404);
    }
    // Delete from storage first
    try {
      await deleteFromStorage(imageUrl);
    } catch (err) {
      console.error("Storage image delete failed:", err);
      throw new AppError("Failed to delete image from storage", 500);
    }

    // Then remove reference from DB
    variants[variantIndex].images = variants[variantIndex].images.filter(
      (img) => img !== imageUrl
    );
    product.variants = variants;
    await product.save();
    return product;
  }

  // Home page specific methods
  static async getBestSellingProducts(queryParams = {}) {
    const { page = 1, limit = 12, category, minRating } = queryParams;

    const baseFilter = {
      isDeleted: false,
      status: "active",
      salesCount: { $gt: 0 }, // Only products with sales
    };

    // Add category filter if provided
    if (category) {
      baseFilter.categories = category;
    }

    // Add rating filter if provided
    if (minRating != null) {
      baseFilter.avgRating = { $gte: minRating };
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(baseFilter)
      .select("name slug images price salesCount avgRating")
      .sort({ salesCount: -1, avgRating: -1, createdAt: -1 }) // Sort by sales count first, then rating, then newest
      .populate("categories", "name slug")
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Product.countDocuments(baseFilter);

    return { products, total, page, limit };
  }

  static async getFestivalFavorites(queryParams = {}) {
    const {
      page = 1,
      limit = 12,
      category,
      festivalTag,
      minRating,
    } = queryParams;

    const baseFilter = {
      isDeleted: false,
      status: "active",
      $or: [
        { isFeatured: true }, // Featured products
        {
          tags: {
            $in: festivalTag
              ? [festivalTag]
              : [
                  "festival",
                  "diwali",
                  "christmas",
                  "eid",
                  "holi",
                  "navratri",
                  "dussehra",
                  "wedding",
                  "celebration",
                ],
          },
        },
      ],
    };

    // Add category filter if provided
    if (category) {
      baseFilter.categories = category;
    }

    // Add rating filter if provided
    if (minRating != null) {
      baseFilter.avgRating = { $gte: minRating };
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(baseFilter)
      .select("name slug images price avgRating tags")
      .sort({ isFeatured: -1, avgRating: -1, salesCount: -1, createdAt: -1 }) // Featured first, then by rating, sales, newest
      .populate("categories", "name slug")
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Product.countDocuments(baseFilter);

    return { products, total, page, limit };
  }

  static async getPeopleAlsoBought(productId) {
    // 1. Try to find co-purchased products
    const coPurchased = await Payment.aggregate([
      {
        $match: {
          "products.productId": new mongoose.Types.ObjectId(productId),
          status: "SUCCESS",
        },
      },
      { $unwind: "$products" },
      {
        $match: {
          "products.productId": { $ne: new mongoose.Types.ObjectId(productId) },
        },
      },
      { $group: { _id: "$products.productId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    let relatedProducts = [];

    if (coPurchased.length > 0) {
      // If co-purchase data exists → fetch those products
      const relatedIds = coPurchased.map((p) => p._id);
      relatedProducts = await Product.find({
        _id: { $in: relatedIds },
        status: "active",
        isDeleted: false,
      })
        .select("name slug images price avgRating salesCount")
        .lean();
    } else {
      // 2. Fallback: use same-category products
      const currentProduct =
        await Product.findById(productId).select("categories");
      if (!currentProduct) {
        throw new AppError("Product not found", 404);
      }

      relatedProducts = await Product.find({
        _id: { $ne: currentProduct._id },
        categories: { $in: currentProduct.categories },
        status: "active",
        isDeleted: false,
      })
        .select("name slug images price avgRating salesCount")
        .sort({ salesCount: -1, avgRating: -1, createdAt: -1 })
        .limit(8)
        .lean();
    }

    return relatedProducts;
  }
}

export default ProductService;
