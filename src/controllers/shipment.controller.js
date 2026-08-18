// controllers/shipment.controller.js
import shipmentService from "../services/shipment.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";



// Create Shipment (when order confirmed)
export const createShipment = asyncHandler(async (req, res) => {
  const { orderId, addressId } = req.body;
  const userId = req.user._id;

  if (!orderId || !addressId) {
    throw new AppError("Order ID and Address ID are required", 400);
  }

  const result = await shipmentService.createShipment({
    orderId,
    userId,
    addressId,
  });

  return new ApiResponse(
    200,
    { shipment: result },
    "Shipment created successfully"
  ).send(res);
});

// Track Shipment (by shipmentId or orderId)
export const trackShipment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new AppError("Order ID is required", 400);
  }

  const result = await shipmentService.trackShipment(orderId);

  return new ApiResponse(
    200,
    { tracking: result },
    "Shipment Status Track Successfully"
  ).send(res);
});

// Cancel Shipment
export const cancelShipment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new AppError("Order ID is required", 400);
  }

  const result = await shipmentService.cancelShipment(orderId);

  return new ApiResponse(
    200,
    { cancelled: result },
    "Shipment cancelled successfully"
  ).send(res);
});

// (Optional) DeliveryOne Webhook Callback
export const shipmentCallback = asyncHandler(async (req, res) => {
  const { eventType, data } = req.body;

  // Process callback from DeliveryOne (status updates, delivery complete, etc.)
  await shipmentService.handleWebhook(eventType, data);

  return new ApiResponse(
    200,
    null,
    "Shipment callback processed successfully"
  ).send(res);
});
