import Address from "../models/address.model.js";
import AppError from "../utils/appError.js";

class AddressService {
  // Create or Add Address
  async createAddress(userId, addressData) {
    const address = await Address.create({ userId, ...addressData });
    return address;
  }

  // Get all addresses of a user
  async getUserAddresses(userId, page , limit ) {
    const skip = (page - 1) * limit;
  
    const addresses = await Address.find({ userId, isDeleted: false })
      .sort({ isDefault: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
  
    const totalAddresses = await Address.countDocuments({ userId, isDeleted: false });
  
    return {
      addresses,
      pagination: {
        totalAddresses,
        currentPage: page,
        totalPages: Math.ceil(totalAddresses / limit),
        pageSize: limit,
      },
    };
  }
  
  // Get single address by ID
  async getAddressById(userId, addressId) {
    const address = await Address.findOne({ _id: addressId, userId, isDeleted: false });
    if (!address) throw new AppError("Address not found", 404);
    return address;
  }

  // Update address
  async updateAddress(userId, addressId, updateData) {
    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId, isDeleted: false },
      updateData,
      { new: true }
    );
    if (!address) throw new AppError("Address not found", 404);
    return address;
  }

  // Soft delete address
  async deleteAddress(userId, addressId) {
    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!address) throw new AppError("Address not found", 404);
    return address;
  }
}

// Export instance
export default new AddressService();
