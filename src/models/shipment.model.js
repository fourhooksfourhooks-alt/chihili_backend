// models/shipment.model.js
import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true }, 
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    waybill: { type: String, required: true, unique: true },
    status: { type: String, default: "CREATED" }, 
    statusHistory: { type: Array, default: [] },
    consigneeName: String,
    consigneePhone: String,
    consigneeAddress: String,
    city: String,
    state: String,
    pinCode: String,
    country: { type: String, default: "India" },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    canceledAt: Date,
  },
  { timestamps: true }
);



export default mongoose.model("Shipment", shipmentSchema);
