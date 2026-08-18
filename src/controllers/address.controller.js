import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import addressService from "../services/address.service.js";

// Create Address
export const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const addressData = req.body;

  const address = await addressService.createAddress(userId, addressData);

  return new ApiResponse(201, { address }, "Address created successfully").send(
    res
  );
});

// Get all addresses
export const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page, limit } = req.query;
  const addresses = await addressService.getUserAddresses(userId, page, limit);

  return new ApiResponse(
    200,
    { addresses },
    "Addresses retrieved successfully"
  ).send(res);
});

// Get single address
export const getAddressById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { addressId } = req.params;

  const address = await addressService.getAddressById(userId, addressId);

  return new ApiResponse(
    200,
    { address },
    "Address retrieved successfully"
  ).send(res);
});

// Update address
export const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { addressId } = req.params;
  const updateData = req.body;

  const address = await addressService.updateAddress(
    userId,
    addressId,
    updateData
  );

  return new ApiResponse(200, { address }, "Address updated successfully").send(
    res
  );
});

// Delete address
export const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { addressId } = req.params;

  const address = await addressService.deleteAddress(userId, addressId);

  return new ApiResponse(200, { address }, "Address deleted successfully").send(
    res
  );
});
