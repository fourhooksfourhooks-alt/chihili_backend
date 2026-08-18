import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { ProductService } from "../services/product.services.js";
import { uploadImage } from "../utils/uploader.js";
import { cleanupFailedUploads, cleanupAllFiles } from "../utils/cleanup.js";
import { getProductRatingSummary as getRatingSummaryHelper } from "../utils/productRatingHelper.js";

// Helper function to normalize categories and tags to arrays
const normalizeArrayField = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

export const getAllProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getAllProducts(req.query);
  return new ApiResponse(
    200,
    { products: result.products, total: result.total },
    "Products retrieved successfully"
  ).send(res);
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await ProductService.getProductById(id, req.user);
  return new ApiResponse(
    200,
    { product },
    "Product retrieved successfully"
  ).send(res);
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await ProductService.getProductBySlug(slug, req.user);
  return new ApiResponse(
    200,
    { product },
    "Product retrieved successfully"
  ).send(res);
});

export const getPeopleAlsoBought = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const relatedProducts = await ProductService.getPeopleAlsoBought(id);
  return new ApiResponse(
    200, 
    { related: relatedProducts }, 
    "Related products retrieved successfully"
  ).send(res);
});

export const getVendorProducts = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const result = await ProductService.getVendorProducts(
    vendorId,
    req.query,
    req.user
  );
  return new ApiResponse(
    200,
    { products: result.products, total: result.total },
    "Vendor products retrieved successfully"
  ).send(res);
});

export const createProduct = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new AppError("Authentication required", 401);
  }

  let productData = { ...req.body };

  // Normalize categories and tags to arrays
  productData.categories = normalizeArrayField(productData.categories);
  productData.tags = normalizeArrayField(productData.tags);

  // Remove any image-related fields from product data
  // Images should be uploaded separately via dedicated endpoints
  delete productData.images;
  delete productData.variantImages;
  
  // Clean any images from variants if they exist
  if (productData.variants && Array.isArray(productData.variants)) {
    productData.variants = productData.variants.map(variant => {
      const cleanVariant = { ...variant };
      delete cleanVariant.images;
      return cleanVariant;
    });
  }

  const product = await ProductService.createProduct(productData, req.user);
  return new ApiResponse(201, { product }, "Product created successfully").send(
    res
  );
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let updateData = { ...req.body };

  // Normalize categories and tags to arrays if they exist
  if (updateData.categories !== undefined) {
    updateData.categories = normalizeArrayField(updateData.categories);
  }
  if (updateData.tags !== undefined) {
    updateData.tags = normalizeArrayField(updateData.tags);
  }

  // Remove any image-related fields from update data
  // Images should be managed separately via dedicated endpoints
  delete updateData.images;
  delete updateData.existingImages;
  delete updateData.variantImages;
  delete updateData._uploadedImages;
  
  // Remove variants from update data - variants should be managed 
  // separately via dedicated variant endpoints to preserve existing images
  delete updateData.variants;

  const updated = await ProductService.updateProduct(id, updateData, req.user);
  return new ApiResponse(
    200,
    { product: updated },
    "Product updated successfully"
  ).send(res);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await ProductService.deleteProduct(id, req.user);
  return new ApiResponse(200, null, "Product deleted successfully").send(res);
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await ProductService.updateProductStatus(
    id,
    status,
    req.user
  );
  return new ApiResponse(
    200,
    { product: updated },
    "Product status updated successfully"
  ).send(res);
});

export const toggleFeaturedProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;
  const updated = await ProductService.toggleFeatured(id, isFeatured, req.user);
  return new ApiResponse(
    200,
    { product: updated },
    "Product feature flag updated successfully"
  ).send(res);
});

export const addVariants = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { variants } = req.body;
  
  // Remove any image-related fields from variants data
  // Images should be uploaded separately via dedicated endpoints
  if (Array.isArray(variants)) {
    variants = variants.map(variant => {
      const cleanVariant = { ...variant };
      delete cleanVariant.images;
      return cleanVariant;
    });
  } else if (variants && typeof variants === 'object') {
    delete variants.images;
  }

  const updated = await ProductService.addVariants(id, variants, req.user);
  return new ApiResponse(
    200,
    { product: updated },
    "Variants added successfully"
  ).send(res);
});

export const updateVariant = asyncHandler(async (req, res) => {
  const { id, sku } = req.params;
  
  let updateData = { ...req.body };
  
  // Remove any image-related fields from update data
  // Images should be managed separately via dedicated endpoints
  delete updateData.images;
  delete updateData.existingImages;
  delete updateData._uploadedImages;

  const updated = await ProductService.updateVariant(
    id,
    sku,
    updateData,
    req.user
  );
  return new ApiResponse(
    200,
    { product: updated },
    "Variant updated successfully"
  ).send(res);
});

export const removeVariant = asyncHandler(async (req, res) => {
  const { id, sku } = req.params;
  const updated = await ProductService.removeVariant(id, sku, req.user);
  return new ApiResponse(
    200,
    { product: updated },
    "Variant removed successfully"
  ).send(res);
});

export const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body;
  const updated = await ProductService.updateStock(id, updates, req.user);
  return new ApiResponse(
    200,
    { product: updated },
    "Stock updated successfully"
  ).send(res);
});

// Image upload controllers
export const uploadProductImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!req.files || req.files.length === 0) {
    throw new AppError("No images provided", 400);
  }

  const uploadedImages = [];
  const failedUploads = [];
  
  try {
    // Process each file
    for (const file of req.files) {
      try {
        const imageUrl = await uploadImage(file, "products");
        uploadedImages.push(imageUrl);
      } catch (error) {
        failedUploads.push(file);
        console.error(`Image upload failed for: ${file.originalname}`, error);
      }
    }
    
    // Cleanup failed uploads
    if (failedUploads.length > 0) {
      await cleanupFailedUploads(req.files, failedUploads);
    }
    
    // Only proceed if we have successful uploads
    if (uploadedImages.length === 0) {
      throw new AppError("All image uploads failed", 500);
    }
    
    // Add images to product
    const updated = await ProductService.addProductImages(id, uploadedImages, req.user);
    
    return new ApiResponse(
      200,
      { 
        product: updated, 
        uploadedImages,
        failedCount: failedUploads.length,
        totalAttempted: req.files.length
      },
      "Product images uploaded successfully"
    ).send(res);
    
  } catch (error) {
    // Cleanup all files on error
    await cleanupAllFiles(req.files);
    throw error;
  }
});

export const uploadVariantImages = asyncHandler(async (req, res) => {
  const { id, sku } = req.params;
  
  if (!req.files || req.files.length === 0) {
    throw new AppError("No images provided", 400);
  }

  const uploadedImages = [];
  const failedUploads = [];
  
  try {
    // Process each file
    for (const file of req.files) {
      try {
        const imageUrl = await uploadImage(file, "product-variants");
        uploadedImages.push(imageUrl);
      } catch (error) {
        failedUploads.push(file);
        console.error(`Variant image upload failed for: ${file.originalname}`, error);
      }
    }
    
    // Cleanup failed uploads
    if (failedUploads.length > 0) {
      await cleanupFailedUploads(req.files, failedUploads);
    }
    
    // Only proceed if we have successful uploads
    if (uploadedImages.length === 0) {
      throw new AppError("All variant image uploads failed", 500);
    }
    
    // Add images to variant
    const updated = await ProductService.addVariantImages(id, sku, uploadedImages, req.user);
    
    return new ApiResponse(
      200,
      { 
        product: updated, 
        uploadedImages,
        failedCount: failedUploads.length,
        totalAttempted: req.files.length
      },
      "Variant images uploaded successfully"
    ).send(res);
    
  } catch (error) {
    // Cleanup all files on error
    await cleanupAllFiles(req.files);
    throw error;
  }
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const { id, imageUrl } = req.params;
  
  // Decode the imageUrl from the URL parameter
  const decodedImageUrl = decodeURIComponent(imageUrl);
  
  const updated = await ProductService.removeProductImage(id, decodedImageUrl, req.user);
  
  return new ApiResponse(
    200,
    { product: updated },
    "Product image removed successfully"
  ).send(res);
});

export const deleteVariantImage = asyncHandler(async (req, res) => {
  const { id, sku, imageUrl } = req.params;
  
  // Decode the imageUrl from the URL parameter
  const decodedImageUrl = decodeURIComponent(imageUrl);
  
  const updated = await ProductService.removeVariantImage(id, sku, decodedImageUrl, req.user);
  
  return new ApiResponse(
    200,
    { product: updated },
    "Variant image removed successfully"
  ).send(res);
});

// Home page specific controllers
export const getBestSellingProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getBestSellingProducts(req.query);
  return new ApiResponse(
    200,
    { 
      products: result.products, 
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit)
    },
    "Best selling products retrieved successfully"
  ).send(res);
});

export const getFestivalFavorites = asyncHandler(async (req, res) => {
  const result = await ProductService.getFestivalFavorites(req.query);
  return new ApiResponse(
    200,
    { 
      products: result.products, 
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit)
    },
    "Festival favorites retrieved successfully"
  ).send(res);
});

export const getProductRatingSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  const ratingSummary = await getRatingSummaryHelper(id);
  
  return new ApiResponse(
    200,
    { ratingSummary },
    "Product rating summary retrieved successfully"
  ).send(res);
});
