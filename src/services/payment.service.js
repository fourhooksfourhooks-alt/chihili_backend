// services/paymentService.js
import Payment from "../models/payment.model.js";
import Cart from "../models/cart.model.js";
import Coupon from "../models/coupon.model.js";
import { v4 as uuidv4 } from "uuid";
import { StandardCheckoutPayRequest } from "pg-sdk-node";
import { getPhonePeClient } from "../utils/payment.js";
import AppError from "../utils/appError.js";

const phonePeClient = getPhonePeClient();

class PaymentService {
  // 1️⃣ Initiate Payment
  static async initiatePayment({ userId, cartId, couponCode, addressId }) {
    const cartIds = Array.isArray(cartId) ? cartId : [cartId];

    const carts = await Cart.find({
      _id: { $in: cartIds },
      userId,
    }).populate("items.productId");

    if (!carts || carts.length === 0) {
      throw new AppError("Cart not found or empty", 400);
    }

    let allItems = [];
    carts.forEach((cart) => {
      allItems = [...allItems, ...cart.items];
    });

    if (!allItems.length) {
      throw new AppError("No items in cart(s)", 400);
    }

    // Calculate total (including quantity)
    let amount = allItems.reduce((total, item) => total + (item.priceAtAdd * item.quantity), 0);
    if (!amount || amount <= 0) throw new AppError("Invalid cart amount", 400);

    let appliedCoupon = null;

    // Coupon logic
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      });

      if (!coupon) throw new AppError("Invalid coupon code", 400);

      if (coupon.expiryDate && coupon.expiryDate < new Date()) {
        coupon.isActive = false;
        await coupon.save();
        throw new AppError("Coupon has expired", 400);
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        coupon.isActive = false;
        await coupon.save();
        throw new AppError("Coupon usage limit reached", 400);
      }

      if (coupon.discountType === "percentage") {
        amount -= (amount * coupon.discountValue) / 100;
      } else if (coupon.discountType === "fixed") {
        amount = Math.max(0, amount - coupon.discountValue);
      }

      appliedCoupon = coupon;
      coupon.usedCount += 1;
      if (coupon.usedCount >= coupon.usageLimit) coupon.isActive = false;
      await coupon.save();
    }

    // IDs
    const orderId = `CHIHILI_${uuidv4()}`;
    const transactionId = `TXN_${uuidv4()}`;
    const redirectUrl = `${process.env.MERCHANT_REDIRECT_URL}?orderId=${orderId}`;

    // PhonePe request
    const paymentRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(orderId)
      .amount(amount * 100) // paise
      .redirectUrl(redirectUrl)
      .build();

    const response = await phonePeClient.pay(paymentRequest);

    const products = allItems.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.priceAtAdd, // This should be price per unit, not total
    }));

    await Cart.deleteMany({ _id: { $in: cartIds }, userId });

    const payment = await Payment.create({
      userId,
      cartIds,
      address: addressId,
      orderId,
      transactionId,
      amount,
      products,
      status: "PENDING",
      coupon: appliedCoupon ? appliedCoupon._id : null,
      paymentUrl: response.redirectUrl,
    });

    return {
      paymentUrl: response.redirectUrl,
      orderId,
      amount,
      coupon: appliedCoupon ? appliedCoupon.code : null,
      payment,
    };
  }

  // 2️⃣ Check Payment Status
  static async checkPaymentStatus(orderId) {
    const response = await phonePeClient.getOrderStatus(orderId);

    const updated = await Payment.findOneAndUpdate(
      { orderId },
      {
        status: response.state,
        rawResponse: response,
        paidAt: response.state === "COMPLETED" ? new Date() : null,
      },
      { new: true }
    ).populate("userId");

    if(response.state === "COMPLETED") {
      // Clear user's cart(s) after successful payment using stored cartIds
      await Cart.deleteMany({ _id: { $in: updated.cartIds },userId: updated.userId._id });
    }

    return { status: response.state, data: response, payment: updated };
  }


  // 3️⃣ Single Order Details
  static async orderDetails(orderId, userId) {
    const payment = await Payment.findOne({ orderId, userId })
      .populate("userId")
      .populate("products.productId")
      .populate("address"); // 👈 added address population
    if (!payment) throw new AppError("Order not found", 404);

    return { order: payment }; // Changed from payment to order to match API response
  }

  // 4️⃣ Get All Orders of a User (Paginated)
  static async getUserOrders(userId, query) {
    let { page , limit } = query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const filter = { userId };

    const orders = await Payment.find(filter)
      .populate("products.productId")
      .populate('userId')
      .populate("address") // 👈 added address population
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Payment.countDocuments(filter);

    return {
      orders, // Changed to match the frontend API response structure
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        limit,
      }
    };
  }
}

export default PaymentService;
