import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import { VendorService } from "../services/vendor.service.js";
import Vendor from "../models/vendor.model.js";

export const getAllVendors = asyncHandler(async (req, res) => {
  const result = await VendorService.getAllVendors(req.query);
  return new ApiResponse(
    200,
    { vendors: result.vendors, total: result.total },
    "Vendors retrieved successfully"
  ).send(res);
});

export const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await VendorService.getVendorById(id);
  return new ApiResponse(200, { vendor }, "Vendor retrieved successfully").send(
    res
  );
});

export const createVendor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role === "admin") {
    throw new AppError("Admin users cannot register as vendors", 403);
  }
  const existingVendor = await Vendor.findOne({ userId: req.user._id });
  if (existingVendor) {
    throw new AppError("Vendor already exists for this user");
  }
  const vendor = await VendorService.createVendor(req.body, req.user._id);
  return new ApiResponse(201, { vendor }, "Vendor created successfully").send(
    res
  );
});

export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingVendor = await Vendor.findOne({ userId: req.user._id });
  if (existingVendor) {
    return res
      .status(400)
      .json({ error: "Vendor already exists for this user" });
  }
  const updated = await VendorService.updateVendor(id, req.body, req.user);
  return new ApiResponse(
    200,
    { vendor: updated },
    "Vendor updated successfully"
  ).send(res);
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await VendorService.deleteVendor(id, req.user);
  return new ApiResponse(200, null, "Vendor deleted successfully").send(res);
});

export const getMyVendor = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new AppError("Authentication required", 401);
  }
  const vendor = await VendorService.getVendorByUserId(req.user._id);
  return new ApiResponse(
    200,
    { vendor: vendor || null },
    "Current user's vendor fetched"
  ).send(res);
});
