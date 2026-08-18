import paymentService from "../services/payment.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";


export const initiatePayment = asyncHandler(async (req, res) => {
  const { cartId, couponCode, addressId } = req.body;
  const userId = req.user._id;

  if (!cartId) throw new AppError("Cart ID is required", 400);

  const result = await paymentService.initiatePayment({
    cartId,
    userId,
    couponCode,
    addressId,
  });

  return new ApiResponse(200, { payment: result }, "Payment initiated successfully").send(res);
});


export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) throw new AppError("Order ID is required", 400);

  const result = await paymentService.checkPaymentStatus(orderId);

  return new ApiResponse(200, result, "Payment status retrieved successfully").send(res);
});


export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await paymentService.getUserOrders(userId, req.query);

  return new ApiResponse(200, result, "User orders retrieved successfully").send(res);
});

export const orderDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderId } = req.params;

  if (!orderId) throw new AppError("Order ID is required", 400);

  const result = await paymentService.orderDetails(orderId, userId);

  return new ApiResponse(200, result, "User order details retrieved successfully").send(res);
});
