import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import {
  createCoupon,
  getAllCoupons,
} from "../controllers/coupon.controller.js";
const couponRouter = Router();

couponRouter.post(
  "/createCoupon",
  protect,
  authorize("admin", "superadmin", "user"),
  createCoupon
);

couponRouter.get(
  "/getAllCoupons",
  protect,
  authorize("admin", "superadmin", "user"),
  getAllCoupons
);

export default couponRouter;
