import Vendor from "../models/vendor.model.js";
import AppError from "../utils/appError.js";
import ApiFeatures from "../utils/apiFeatures.js";

export class VendorService {
  static async getVendorByUserId(userId) {
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }
    const vendor = await Vendor.findOne({ userId, isDeleted: false });
    return vendor; // can be null
  }

  static async getAllVendors(queryParams = {}) {
    const baseQuery = Vendor.find({ isDeleted: false });

    const features = new ApiFeatures(baseQuery, queryParams);
    // Apply filters and search first to compute total count on filtered set
    features.filter().search(["shopName", "description", "address.city", "address.state"]);

    // Clone the query filter to compute total before pagination/field limiting
    const filteredQuery = features.query;
    const total = await Vendor.countDocuments(filteredQuery.getQuery());

    // Apply sorting, field limiting and pagination for the data result
    features.sort().limitFields().paginate();
    const vendors = await features.query;

    return { vendors, total };
  }

  static async getVendorById(vendorId) {
    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }
    return vendor;
  }

  static async createVendor(data, userId) {
    const { shopName, description, address, documents, bankDetails } = data;

    if (!shopName) {
      throw new AppError("Shop name is required", 400);
    }

    const vendor = await Vendor.create({
      userId,
      shopName,
      description: description || "",
      address: address || undefined,
      documents: documents || undefined,
      bankDetails: bankDetails || undefined,
    });

    return vendor;
  }

  static async updateVendor(vendorId, data, currentUser) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    // Only vendor owner or admin/superadmin can update
    const isOwner = currentUser && vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin = currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to update this vendor", 403);
    }

    const updatable = { ...data };

    // Restrict status updates to admins only
    if (Object.prototype.hasOwnProperty.call(updatable, "status") && !isAdmin) {
      delete updatable.status;
    }

    const updated = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updatable },
      { new: true, runValidators: true }
    );

    return updated;
  }

  static async deleteVendor(vendorId, currentUser) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.isDeleted) {
      throw new AppError("Vendor not found", 404);
    }

    const isOwner = currentUser && vendor.userId?.toString() === currentUser._id.toString();
    const isAdmin = currentUser && ["admin", "superadmin"].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to delete this vendor", 403);
    }

    vendor.isDeleted = true;
    await vendor.save();
    return;
  }
}

export default VendorService;


