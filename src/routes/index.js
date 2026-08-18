import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.route.js';
import vendorRoutes from './vendor.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import cartRouter from './cart.routes.js';
import paymentRouter from './payment.routes.js'
import reviewRouter from './review.routes.js';
import addressRouter  from './address.routes.js';
import wishlistRouter from './wishlist.routes.js';
import shippingSettingRouter from './shippingSetting.routes.js';
import couponRouter from './coupon.routes.js';
import heroBannerRouter from './heroBanner.routes.js';
import shipmentRouter from './shipment.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vendors', vendorRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRouter)
router.use('/payment', paymentRouter);
router.use('/review', reviewRouter);
router.use('/address', addressRouter);
router.use('/wishlist', wishlistRouter);
router.use('/coupon', couponRouter)
router.use('/shipping-settings', shippingSettingRouter);
router.use('/hero-banners', heroBannerRouter);
router.use('/shipment', shipmentRouter);

export default router;
