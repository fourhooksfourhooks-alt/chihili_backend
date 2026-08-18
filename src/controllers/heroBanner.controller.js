import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { HeroBannerService } from "../services/heroBanner.service.js";
import { uploadImage } from "../utils/uploader.js";

export const getAllHeroBanners = asyncHandler(async (req, res) => {
  const result = await HeroBannerService.getAllHeroBanners(req.query);
  return new ApiResponse(
    200,
    { heroBanners: result.heroBanners, total: result.total },
    "Hero banners retrieved successfully"
  ).send(res);
});

export const getHeroBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const heroBanner = await HeroBannerService.getHeroBannerById(id);
  return new ApiResponse(
    200,
    { heroBanner },
    "Hero banner retrieved successfully"
  ).send(res);
});

export const createHeroBanner = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new AppError("Authentication required", 401);
  }

  // Handle image upload
  const imageFile = req.file;
  if (!imageFile) {
    throw new AppError("Image is required for hero banner", 400);
  }

  const body = { ...req.body };
  body.image = await uploadImage(imageFile, "hero-banners");

  const heroBanner = await HeroBannerService.createHeroBanner(body, req.user);
  return new ApiResponse(
    201,
    { heroBanner },
    "Hero banner created successfully"
  ).send(res);
});

export const updateHeroBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Handle optional image upload
  const imageFile = req.file;
  const body = { ...req.body };
  
  if (imageFile) {
    body.image = await uploadImage(imageFile, "hero-banners");
  }

  const updated = await HeroBannerService.updateHeroBanner(id, body, req.user);
  return new ApiResponse(
    200,
    { heroBanner: updated },
    "Hero banner updated successfully"
  ).send(res);
});

export const deleteHeroBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await HeroBannerService.deleteHeroBanner(id, req.user);
  return new ApiResponse(
    200,
    null,
    "Hero banner deleted successfully"
  ).send(res);
});

export const updateHeroBannerOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order } = req.body;
  const updated = await HeroBannerService.updateOrder(id, order, req.user);
  return new ApiResponse(
    200,
    { heroBanner: updated },
    "Hero banner order updated successfully"
  ).send(res);
});

export const bulkUpdateOrder = asyncHandler(async (req, res) => {
  const { banners } = req.body;
  if (!Array.isArray(banners)) {
    throw new AppError("Banners must be an array", 400);
  }
  
  const updated = await HeroBannerService.bulkUpdateOrder(banners, req.user);
  return new ApiResponse(
    200,
    { heroBanners: updated },
    "Hero banner order updated successfully"
  ).send(res);
});
