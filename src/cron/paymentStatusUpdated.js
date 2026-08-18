import cron from "node-cron";
import Payment from "../models/payment.model.js";
import Shipment from "../models/shipment.model.js";
import { getPhonePeClient } from "../utils/payment.js";
import shipmentService from "../services/shipment.service.js";
import { sendEmailNotification } from "../utils/msg91.js";



const phonePeClient = getPhonePeClient();


const updatePendingOrders = async () => {

  try {

    const pendingOrders = await Payment.find();

    for (const order of pendingOrders) {
      const response = await phonePeClient.getOrderStatus(order.orderId);

      if (!response || !response.state) continue;

       await Payment.findByIdAndUpdate(
        order._id,
        { status: response.state },
        { new: true }
      );

      console.log(`✅ Updated order ${order.orderId} status to "${response.state}"`);

      if (response.state === "COMPLETED") {
        try {
          const existingShipment = await Shipment.findOne({ orderId: order.orderId });
          if (existingShipment) {
            console.log(`⚠️ Shipment already exists for order ${order.orderId}`);
            continue;
          }

          await shipmentService.createShipment({
            userId: order.userId,
            orderId: order.orderId,
            addressId: order.address,
          });

          console.log(`🚚 Shipment created for order ${order.orderId}`);
          await sendEmailNotification(order);
          
        } catch (err) {
          console.error(`❌ Shipment creation failed for order ${order.orderId}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error updating pending orders:", err.message);
  }
};


cron.schedule("*/1 * * * *", updatePendingOrders);
