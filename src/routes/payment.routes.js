import { Router } from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
const paymentRouter = Router();

paymentRouter.post('/initiatePayment' , protect , paymentController.initiatePayment )
paymentRouter.get('/checkPaymentStatus/:orderId' , protect , paymentController.checkPaymentStatus)
paymentRouter.get('/getOrders' , protect , paymentController.getUserOrders);
paymentRouter.get('/orderDetails/:orderId' , protect , paymentController.orderDetails)

export default paymentRouter;
