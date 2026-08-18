import slugify from "slugify";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

export async function generateUniqueSlug(name, model = 'product', suffixLength = 4) {
  const baseSlug = slugify(name, { lower: true, strict: true });

  let slug;
  let isUnique = false;

  while (!isUnique) {
    const randomSuffix = Math.random().toString(16).slice(2, 2 + suffixLength);
    slug = `${baseSlug}-${randomSuffix}`;

    // Check if it exists in the specified model
    let exists;
    if (model === 'category') {
      exists = await Category.findOne({ slug });
    } else {
      exists = await Product.findOne({ slug });
    }
    
    if (!exists) isUnique = true;
  }

  return slug;
}
