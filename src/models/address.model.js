// models/Address.js
import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, default: 'Home' },
  name: String,
  street: String,
  landmark: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  phone: String,
  isDefault: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Address || mongoose.model("Address", AddressSchema);
