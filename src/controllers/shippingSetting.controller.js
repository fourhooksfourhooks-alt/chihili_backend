import { ShippingSettingService } from '../services/shippingSetting.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';

export const getShippingSettings = asyncHandler(async (req, res) => {
  const shippingSettings = await ShippingSettingService.getShippingSettings();

  return new ApiResponse(
    200,
    shippingSettings,
    'Shipping settings retrieved successfully'
  ).send(res);
});

export const upsertShippingSettings = asyncHandler(async (req, res) => {
  const {
    baseCharge,
    freeAbove,
    active,
    inclusiveGST
  } = req.body;

  // Validate input
  if (baseCharge !== undefined && (baseCharge < 0 || !Number.isFinite(baseCharge))) {
    throw new AppError('Base charge must be a valid positive number', 400);
  }

  if (freeAbove !== undefined && (freeAbove < 0 || !Number.isFinite(freeAbove))) {
    throw new AppError('Free shipping threshold must be a valid positive number', 400);
  }

  if (active !== undefined && typeof active !== 'boolean') {
    throw new AppError('Active status must be a boolean value', 400);
  }

  if (inclusiveGST !== undefined && typeof inclusiveGST !== 'boolean') {
    throw new AppError('Inclusive GST must be a boolean value', 400);
  }

  // Prepare update data
  const updateData = {};
  if (baseCharge !== undefined) updateData.baseCharge = baseCharge;
  if (freeAbove !== undefined) updateData.freeAbove = freeAbove;
  if (active !== undefined) updateData.active = active;
  if (inclusiveGST !== undefined) updateData.inclusiveGST = inclusiveGST;

  // Update shipping settings using service
  const shippingSettings = await ShippingSettingService.updateShippingSettings(updateData);

  return new ApiResponse(
    200,
    shippingSettings,
    'Shipping settings updated successfully'
  ).send(res);
});

export const resetShippingSettings = asyncHandler(async (req, res) => {
  const shippingSettings = await ShippingSettingService.resetToDefault();

  return new ApiResponse(
    200,
    shippingSettings,
    'Shipping settings reset to default values successfully'
  ).send(res);
});

export const calculateShippingCharge = asyncHandler(async (req, res) => {
  const { cartTotal } = req.body;

  if (!cartTotal || cartTotal < 0) {
    throw new AppError('Valid cart total is required', 400);
  }

  const shippingCharge = await ShippingSettingService.calculateShippingCharge(cartTotal);
  const isFreeShipping = await ShippingSettingService.isFreeShippingApplicable(cartTotal);

  return new ApiResponse(
    200,
    {
      cartTotal,
      shippingCharge,
      isFreeShipping,
      finalTotal: cartTotal + shippingCharge
    },
    'Shipping charge calculated successfully'
  ).send(res);
});
