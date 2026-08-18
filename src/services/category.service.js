import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import AppError from "../utils/appError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { generateUniqueSlug } from "../utils/slug-generator.js";
import { deleteFile } from "../utils/uploader.js";

export class CategoryService {
  static async getAllCategories(queryParams = {}) {
    const { parent, isActive, ...rest } = queryParams || {};

    const baseFilter = {};
    if (isActive != null)
      baseFilter.isActive = isActive === true || isActive === "true";
    if (parent != null) baseFilter.parent = parent;

    let query = Category.find(baseFilter);

    const features = new ApiFeatures(query, rest);
    features.filter().search(["name", "slug"]);

    const filteredQuery = features.query;
    const total = await Category.countDocuments(filteredQuery.getQuery());

    features.sort().limitFields().paginate();
    const categoriesDocs = await features.query;
    // Map categories to plain objects and ensure image/banner fields are present
    const categories = categoriesDocs.map((cat) => {
      const obj = cat.toObject ? cat.toObject() : cat;
      return {
        ...obj,
        image: obj.image || null,
        banner: obj.banner || null,
      };
    });

    return { categories, total };
  }

  static async getCategoryById(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return category;
  }

  static async getCategoryBySlug(slug) {
    const category = await Category.findOne({ slug });
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return category;
  }

  static async createCategory(data) {
    const { name, parent, isActive, image, banner } = data;

    if (!name) {
      throw new AppError("name is required", 400);
    }

    // Generate unique slug using the utility
    const uniqueSlug = await generateUniqueSlug(name, "category");

    let parentId = parent || null;
    if (parentId) {
      const parentExists = await Category.findById(parentId);
      if (!parentExists) {
        throw new AppError("Parent category not found", 404);
      }
    }

    const category = await Category.create({
      name,
      slug: uniqueSlug,
      parent: parentId,
      isActive: isActive != null ? !!isActive : true,
      ...(image ? { image } : {}),
      ...(banner ? { banner } : {}),
    });

    return category;
  }

  static async updateCategory(categoryId, data, currentUser) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const updatable = { ...data };

    // If name is being updated, generate new slug
    if (updatable.name && updatable.name !== category.name) {
      updatable.slug = await generateUniqueSlug(updatable.name, "category");
    }

    if (Object.prototype.hasOwnProperty.call(updatable, "parent")) {
      const parentId = updatable.parent || null;
      if (parentId && parentId.toString() === categoryId.toString()) {
        throw new AppError("Category cannot be its own parent", 400);
      }
      if (parentId) {
        const parentExists = await Category.findById(parentId);
        if (!parentExists) {
          throw new AppError("Parent category not found", 404);
        }
      }
    }

    // --- Image ---
    if ("image" in updatable) {
      if (updatable.image === null) {
        if (category.image) await deleteFile(category.image);
      } else if (updatable.image && updatable.image !== category.image) {
        if (category.image) await deleteFile(category.image);
      }
    }

    // --- Banner ---
    if ("banner" in updatable) {
      if (updatable.banner === null) {
        if (category.banner) await deleteFile(category.banner);
      } else if (updatable.banner && updatable.banner !== category.banner) {
        if (category.banner) await deleteFile(category.banner);
      }
    }

    const updated = await Category.findByIdAndUpdate(
      categoryId,
      { $set: updatable },
      { new: true, runValidators: true }
    );

    return updated;
  }

  static async deleteCategory(categoryId, currentUser) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Use a session/transaction when supported by the MongoDB deployment.
    // If transactions are not available, fall back to sequential operations.
    let session;
    let useTransaction = false;
    try {
      session = await Category.startSession();
      // Some deployments may not allow transactions; starting one may throw
      // or later commit may fail. We handle that by falling back.
      try {
        session.startTransaction();
        useTransaction = true;
      } catch (tErr) {
        // cannot start a transaction, continue without a transaction
        useTransaction = false;
      }

      const opts = useTransaction ? { session } : {};

      // Step 1: Re-parent children to null
      await Category.updateMany({ parent: categoryId }, { $set: { parent: null } }, opts);

      // Step 2: Remove category from products
      await Product.updateMany({ categories: categoryId }, { $pull: { categories: categoryId } }, opts);

      // Step 3: Delete category
      await Category.findByIdAndDelete(categoryId, opts);

      if (useTransaction) await session.commitTransaction();
      if (session) session.endSession();
      return;
    } catch (err) {
      // Abort transaction if one was started
      if (session && useTransaction) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          // ignore
        }
      }
      if (session) session.endSession();
      // Bubble up as AppError for consistent handling
      throw new AppError(err.message || "Failed to delete category", 500);
    }
  }

  static async toggleActive(categoryId, isActive, currentUser) {
    const updated = await Category.findByIdAndUpdate(
      categoryId,
      { $set: { isActive: !!isActive } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw new AppError("Category not found", 404);
    }
    return updated;
  }
}

export default CategoryService;
