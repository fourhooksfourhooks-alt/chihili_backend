import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { CategoryService } from "../services/category.service.js";
import { uploadImage } from "../utils/uploader.js";

export const getAllCategories = asyncHandler(async (req, res) => {
  const result = await CategoryService.getAllCategories(req.query);
  return new ApiResponse(
    200,
    { categories: result.categories, total: result.total },
    "Categories retrieved successfully"
  ).send(res);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await CategoryService.getCategoryById(id);
  return new ApiResponse(200, { category }, "Category retrieved successfully").send(res);
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await CategoryService.getCategoryBySlug(slug);
  return new ApiResponse(200, { category }, "Category retrieved successfully").send(res);
});

export const createCategory = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new AppError("Authentication required", 401);
  }
  // Optional uploads
  const imageFile = req.files && Array.isArray(req.files.image) ? req.files.image[0] : undefined;
  const bannerFile = req.files && Array.isArray(req.files.banner) ? req.files.banner[0] : undefined;

  const body = { ...req.body };
  if (imageFile) {
    body.image = await uploadImage(imageFile, "categories/images");
  }
  if (bannerFile) {
    body.banner = await uploadImage(bannerFile, "categories/banners");
  }

  const category = await CategoryService.createCategory(body, req.user);
  return new ApiResponse(201, { category }, "Category created successfully").send(res);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Optional uploads
  const imageFile = req.files && Array.isArray(req.files.image) ? req.files.image[0] : undefined;
  const bannerFile = req.files && Array.isArray(req.files.banner) ? req.files.banner[0] : undefined;

  const body = { ...req.body };
  if (imageFile) {
    body.image = await uploadImage(imageFile, "categories/images");
  }
  if (bannerFile) {
    body.banner = await uploadImage(bannerFile, "categories/banners");
  }

  const updated = await CategoryService.updateCategory(id, body, req.user);
  return new ApiResponse(200, { category: updated }, "Category updated successfully").send(res);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CategoryService.deleteCategory(id, req.user);
  return new ApiResponse(200, null, "Category deleted successfully").send(res);
});

export const toggleActiveCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const updated = await CategoryService.toggleActive(id, isActive, req.user);
  return new ApiResponse(200, { category: updated }, "Category active flag updated successfully").send(res);
});


