import couponService from "../services/coupon.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";


export const createCoupon = asyncHandler(async (req, res) => {

  const couponData = req.body;
  
  if (!couponData.code || !couponData.discountType || !couponData.discountValue) {
    throw new AppError("Code, discountType, and discountValue are required", 400);
  }

  const coupon = await couponService.createCoupon(couponData, userId);
  return new ApiResponse(201, coupon, "Coupon created successfully").send(res);
  
});


export const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // query params ?page=2&limit=20

  const result = await couponService.getAllCoupons({ page, limit });

  return new ApiResponse(200, result, "Coupons retrieved successfully").send(res);
});


export const getCouponByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  if (!code) {
    throw new AppError("Coupon code is required", 400);
  }

  const coupon = await couponService.getCouponByCode(code);

  return new ApiResponse(200, coupon, "Coupon retrieved successfully").send(res);
});


export const updateCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const data = req.body;

  if (!couponId) {
    throw new AppError("Coupon ID is required", 400);
  }

  const coupon = await couponService.updateCoupon(couponId, data);

  return new ApiResponse(200, coupon, "Coupon updated successfully").send(res);
});


export const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;

  if (!couponId) {
    throw new AppError("Coupon ID is required", 400);
  }

  const coupon = await couponService.deleteCoupon(couponId);

  return new ApiResponse(200, coupon, "Coupon deleted successfully").send(res);
});
