import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import { cancelShipment, createShipment, trackShipment } from "../controllers/shipment.controller.js";
const shipmentRouter = Router();


shipmentRouter.post('/create' , protect , authorize('user') , createShipment);
shipmentRouter.get('/track/:orderId' , protect , authorize('user') , trackShipment )
shipmentRouter.delete('/cancel/:orderId' , protect , authorize('user') , cancelShipment )


export default shipmentRouter;
