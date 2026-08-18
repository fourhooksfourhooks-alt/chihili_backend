// services/shipmentService.js
import axios from "axios";
import Shipment from "../models/shipment.model.js";
import AppError from "../utils/appError.js";
import Payment from "../models/payment.model.js";
import Address from "../models/address.model.js";
import qs from "qs";

const DELHIVERY_BASE_URL = process.env.DELHIVERY_BASE_URL;
const DELHIVERY_TOKEN = process.env.DELHIVERY_TOKEN;

class ShipmentService {
  static async createShipment({ userId, orderId, addressId }) {
    try {
      console.log("ids...", userId, orderId, addressId);
      const payment = await Payment.findOne({ orderId, userId });
      if (!payment) throw new AppError("Payment not found", 404);

      const address = await Address.findOne({ _id: addressId });
      if (!address) throw new AppError("Address not found", 404);

      const products = payment.products || [];

      const payload = {
        format: "json",
        data: JSON.stringify({
          pickup_location: {
            name: "CHIHILI",
            add: "PLOTNO-561, GROUND FLOOR, GIET, EKAMRA VIHAR",
            city: "Bhubaneswar",
            state: "Orissa",
            country: "India",
            pin: "751015",
            phone: "9777588101",
          },
          shipments: [
            {
              name: address.name,
              add: address.street,
              pin: address.postalCode,
              city: address.city,
              state: address.state,
              country: "India",
              phone: address.phone,
              order: payment.orderId,
              payment_mode: payment.status === "COMPLETED" ? "Prepaid" : "COD",
              products_desc: products.map((p) => p.productId.name).join(", "),
              total_amount: payment.amount,
              cod_amount: 0.0,  
            },
          ],
        }),
      };

      const res = await axios.post(
        `${DELHIVERY_BASE_URL}/api/cmu/create.json`,
        qs.stringify(payload),
        {
          headers: {
            Authorization: `Token ${DELHIVERY_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded", // must be urlencoded
            Accept: "application/json",
          },
        }
      );

      const waybill = res.data?.packages?.[0]?.waybill || null;
      if (!waybill) throw new AppError("Delhivery did not return waybill", 500);

      const shipment = await Shipment.create({
        userId,
        orderId: payment.orderId,
        paymentId: payment._id,
        waybill,
        consigneeName: address.name,
        consigneePhone: address.phone,
        consigneeAddress: address.fullAddress,
        city: address.city,
        state: address.state,
        pinCode: address.pinCode,
        products,
        rawResponse: res.data,
      });

      return shipment;
    } catch (err) {
      console.error(
        "Create Shipment Error:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  static async trackShipment(orderId) {
    // First, find the shipment by orderId to get the waybill
    const shipment = await Shipment.findOne({ orderId });
    if (!shipment) throw new AppError("Shipment not found", 404);

    const waybill = shipment.waybill;

    const res = await axios.get(
      `${DELHIVERY_BASE_URL}/api/v1/packages/json/?waybill=${waybill}&ref_ids=`,
      {
        headers: {
          Authorization: `Token ${DELHIVERY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const status =
      res.data?.ShipmentData?.[0]?.Shipment?.Status?.Status || "UNKNOWN";

    const updatedShipment = await Shipment.findOneAndUpdate(
      { orderId },
      {
        status,
        statusHistory: res.data?.ShipmentData?.[0]?.Shipment?.Scans || [],
        deliveredAt: status === "Delivered" ? new Date() : undefined,
      },
      { new: true }
    );

    return updatedShipment;
  }

  static async cancelShipment(orderId) {
    // First, find the shipment by orderId to get the waybill
    const shipment = await Shipment.findOne({ orderId });
    if (!shipment) throw new AppError("Shipment not found", 404);

    const waybill = shipment.waybill;

    const res = await axios.post(
      `${DELHIVERY_BASE_URL}/api/p/edit`,
      {
        waybill,
        cancellation: "true",
      },
      {
        headers: {
          Authorization: `Token ${DELHIVERY_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const updatedShipment = await Shipment.findOneAndUpdate(
      { orderId },
      { status: "CANCELED", canceledAt: new Date(), rawResponse: res.data },
      { new: true }
    );

    return updatedShipment;
  }
}

export default ShipmentService;
