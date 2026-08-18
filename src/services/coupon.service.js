import Coupon from "../models/coupon.model.js";


class CouponService {

  static async createCoupon(data) {

    const { code, description, discountType, discountValue, expiryDate, usageLimit } = data;

    const coupons = await Coupon.create({
      code,
      description,
      discountType,
      discountValue,
      expiryDate,
      usageLimit,
    });
    await coupons.save()
    return coupons;
  }

  static async getAllCoupons({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;

    const [coupons, totalCount] = await Promise.all([
      Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Coupon.countDocuments(),
    ]);

    return {
      coupons,
      pagination: {
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / limit),
        pageSize: Number(limit),
      },
    };
  }


  static async getCouponByCode(code) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) throw new Error("Invalid or expired coupon code");

    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      coupon.isActive = false;
      await coupon.save();
      throw new Error("Coupon has expired");
    }

    return coupon;
  }


  static async updateCoupon(couponId, data) {
    const coupon = await Coupon.findByIdAndUpdate(couponId, data, { new: true });
    if (!coupon) throw new Error("Coupon not found");
    return coupon;
  }


  static async deleteCoupon(couponId) {
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) throw new Error("Coupon not found");
    return coupon;
  }
}

export default CouponService;
