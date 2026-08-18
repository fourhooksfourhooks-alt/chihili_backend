import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { User } from "../models/user.model.js";
import AppError from "../utils/appError.js";

export class CartService {
  // Get all carts (admin functionality)
  static async getAllCarts(queryParams = {}) {
    const { userId, page, limit, sortBy, sortOrder, ...filters } = queryParams;

    const baseFilter = {};
    if (userId) baseFilter.userId = userId;

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== "") {
        baseFilter[key] = filters[key];
      }
    });

    let query = Cart.find(baseFilter)
      .populate({ path: "userId", select: "name email" })
      .populate({
        path: "items.productId",
        select: "name slug images price variants",
        match: { isDeleted: false },
      });

    const sortOptions = {};
    sortOptions[sortBy || "createdAt"] = sortOrder === "desc" ? -1 : 1;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const carts = await query
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .exec();
    const total = await Cart.countDocuments(baseFilter);

    // ✅ Add total price calculation for each cart
    const cartsWithTotals = carts.map((cart) => {
      const totalPrice = cart.items.reduce(
        (sum, item) => sum + item.priceAtAdd * item.quantity,
        0
      );
      return {
        ...cart.toObject(),
        totalPrice,
      };
    });

    return {
      carts: cartsWithTotals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  // Get user's cart
  static async getUserCart(userId) {
    let cart = await Cart.findOne({ userId })
      .populate({ path: "userId", select: "name email" })
      .populate({
        path: "items.productId",
        select: "name slug images price variants stock status",
        match: { isDeleted: false, status: "active" },
      })
      .populate({
        path: "saveForLater.productId",
        select: "name slug images price variants stock status",
        match: { isDeleted: false, status: "active" },
      });

    if (!cart) {
      cart = await Cart.create({ userId, items: [], saveForLater: [] });
      await cart.populate([
        { path: "userId", select: "name email" },
        {
          path: "items.productId",
          select: "name slug images price variants stock status",
        },
        {
          path: "saveForLater.productId",
          select: "name slug images price variants stock status",
        },
      ]);
    }

    // Filter out invalid items
    const validItems = cart.items.filter((item) => item.productId !== null);
    const validSaveForLaterItems = cart.saveForLater.filter((item) => item.productId !== null);
    
    if (validItems.length !== cart.items.length || validSaveForLaterItems.length !== cart.saveForLater.length) {
      cart.items = validItems;
      cart.saveForLater = validSaveForLaterItems;
      await cart.save();
    }

    return { 
      cart, 
      summary: {
        ...this.calculateCartSummary(cart),
        saveForLater: this.calculateSaveForLaterSummary(cart)
      }
    };
  }

  // Calculate cart totals
  static calculateCartSummary(cart) {
    let itemCount = 0,
      subtotal = 0,
      discount = 0;

    for (const item of cart.items) {
      if (item.productId) {
        itemCount += item.quantity;
        subtotal += item.priceAtAdd * item.quantity;

        const currentPrice = item.productId.price;
        if (currentPrice < item.priceAtAdd) {
          discount += (item.priceAtAdd - currentPrice) * item.quantity;
        }
      }
    }

    const total = subtotal - discount;
    return {
      itemCount,
      subtotal: +subtotal.toFixed(2),
      discount: +discount.toFixed(2),
      total: +total.toFixed(2),
      items: cart.items.length,
    };
  }

  // Get cart by ID (admin)
  static async getCartById(cartId) {
    const cart = await Cart.findById(cartId)
      .populate({ path: "userId", select: "name email" })
      .populate({
        path: "items.productId",
        select: "name slug images price variants",
        match: { isDeleted: false },
      })
      .populate({
        path: "saveForLater.productId",
        select: "name slug images price variants",
        match: { isDeleted: false },
      });

    if (!cart) throw new AppError("Cart not found", 404);

    return { 
      cart, 
      summary: {
        ...this.calculateCartSummary(cart),
        saveForLater: this.calculateSaveForLaterSummary(cart)
      }
    };
  }

  // Add item to cart
  static async addToCart(userId, productId, variantSku, quantity = 1) {
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new AppError("Product not found or unavailable", 404);

    let variant = null;
    let price = product.price;

    if (variantSku) {
      variant = product.variants.find((v) => v.sku === variantSku);
      if (!variant) throw new AppError("Variant not found", 404);
      if (variant.stock < quantity)
        throw new AppError("Insufficient stock", 400);
      price = variant.price;
    } else if (product.stock < quantity) {
      throw new AppError("Insufficient stock", 400);
    }

    let cart = await Cart.findOne({ userId });

    // ✅ If no cart exists, create with first item
    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId,
            variantSku: variantSku || null,
            quantity,
            priceAtAdd: price * quantity, // store total price
            vendorId: product.vendorId,
          },
        ],
      });
      await cart.save();
      return cart;
    }

    // ✅ If cart exists, check for existing item
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.variantSku === variantSku
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (variant ? variant.stock < newQuantity : product.stock < newQuantity) {
        throw new AppError("Insufficient stock for requested quantity", 400);
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].priceAtAdd = price * newQuantity; // update total
    } else {
      // Push new item
      cart.items.push({
        productId,
        variantSku: variantSku || null,
        quantity,
        priceAtAdd: price * quantity, // store total price
        vendorId: product.vendorId,
      });
    }

    await cart.save();
    return cart;
  }

  // Update cart item
  static async updateCartItem(userId, productId, variantSku, quantity) {
    if (quantity <= 0)
      return await this.removeFromCart(userId, productId, variantSku);

    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.variantSku === variantSku
    );
    if (itemIndex === -1) throw new AppError("Item not found in cart", 404);

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new AppError("Product no longer available", 404);

    let variant = null;
    if (variantSku) {
      variant = product.variants.find((v) => v.sku === variantSku);
      if (!variant) throw new AppError("Variant no longer available", 404);
      if (variant.stock < quantity)
        throw new AppError("Insufficient stock", 400);
    } else if (product.stock < quantity) {
      throw new AppError("Insufficient stock", 400);
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    return cart;
  }

  // Remove item by productId + variantSku
  static async removeFromCart(userId, productId, variantSku) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    // Find the specific item to remove
    const itemIndex = cart.items.findIndex((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;

      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      throw new AppError("Item not found in cart", 404);
    }

    // Remove the item using MongoDB's $pull operation
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      {
        $pull: {
          items: {
            productId: productId,
            variantSku: variantSku || null,
          },
        },
      },
      { new: true }
    );

    return {
      cart: updatedCart,
      summary: this.calculateCartSummary(updatedCart),
    };
  }

  // Clear cart
  static async clearCart(userId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    cart.items = [];
    await cart.save();
    return await this.getUserCart(userId);
  }

  // Move item from cart to save for later
  static async moveToSaveForLater(userId, productId, variantSku) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    // Find the item in cart
    const itemIndex = cart.items.findIndex((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;
      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      throw new AppError("Item not found in cart", 404);
    }

    // Check if item already exists in save for later
    const existsInSaveForLater = cart.saveForLater.find((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;
      return productMatch && variantMatch;
    });

    if (existsInSaveForLater) {
      throw new AppError("Item already exists in save for later", 400);
    }

    // Move item from cart to save for later
    const itemToMove = cart.items[itemIndex];
    cart.saveForLater.push(itemToMove);
    cart.items.splice(itemIndex, 1);

    await cart.save();
    return await this.getUserCart(userId);
  }

  // Move item from save for later to cart
  static async moveToCart(userId, productId, variantSku) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    // Find the item in save for later
    const itemIndex = cart.saveForLater.findIndex((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;
      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      throw new AppError("Item not found in save for later", 404);
    }

    // Validate product availability and stock
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new AppError("Product no longer available", 404);

    let variant = null;
    const itemToMove = cart.saveForLater[itemIndex];

    if (variantSku) {
      variant = product.variants.find((v) => v.sku === variantSku);
      if (!variant) throw new AppError("Variant no longer available", 404);
      if (variant.stock < itemToMove.quantity) {
        throw new AppError("Insufficient stock", 400);
      }
    } else if (product.stock < itemToMove.quantity) {
      throw new AppError("Insufficient stock", 400);
    }

    // Check if item already exists in cart
    const existsInCart = cart.items.find((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;
      return productMatch && variantMatch;
    });

    if (existsInCart) {
      // Update quantity if item exists in cart
      const totalQuantity = existsInCart.quantity + itemToMove.quantity;
      if (variant ? variant.stock < totalQuantity : product.stock < totalQuantity) {
        throw new AppError("Insufficient stock for requested quantity", 400);
      }
      existsInCart.quantity = totalQuantity;
      existsInCart.priceAtAdd = (variant ? variant.price : product.price) * totalQuantity;
    } else {
      // Move item from save for later to cart
      cart.items.push(itemToMove);
    }

    // Remove from save for later
    cart.saveForLater.splice(itemIndex, 1);

    await cart.save();
    return await this.getUserCart(userId);
  }

  // Get save for later items
  static async getSaveForLater(userId) {
    let cart = await Cart.findOne({ userId })
      .populate({ path: "userId", select: "name email" })
      .populate({
        path: "saveForLater.productId",
        select: "name slug images price variants stock status",
        match: { isDeleted: false, status: "active" },
      });

    if (!cart) {
      cart = await Cart.create({ userId, items: [], saveForLater: [] });
      await cart.populate([
        { path: "userId", select: "name email" },
        {
          path: "saveForLater.productId",
          select: "name slug images price variants stock status",
        },
      ]);
    }

    // Filter out invalid items
    const validSaveForLaterItems = cart.saveForLater.filter((item) => item.productId !== null);
    if (validSaveForLaterItems.length !== cart.saveForLater.length) {
      cart.saveForLater = validSaveForLaterItems;
      await cart.save();
    }

    return { 
      saveForLater: cart.saveForLater, 
      summary: this.calculateSaveForLaterSummary(cart) 
    };
  }

  // Calculate save for later summary
  static calculateSaveForLaterSummary(cart) {
    let itemCount = 0,
      subtotal = 0;

    for (const item of cart.saveForLater) {
      if (item.productId) {
        itemCount += item.quantity;
        subtotal += item.priceAtAdd * item.quantity;
      }
    }

    return {
      itemCount,
      subtotal: +subtotal.toFixed(2),
      items: cart.saveForLater.length,
    };
  }

  // Remove item from save for later
  static async removeFromSaveForLater(userId, productId, variantSku) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    // Find the specific item to remove from save for later
    const itemIndex = cart.saveForLater.findIndex((item) => {
      const productMatch = item.productId.toString() === productId.toString();
      const variantMatch =
        variantSku === null || variantSku === undefined || variantSku === ""
          ? item.variantSku === null || item.variantSku === undefined
          : item.variantSku === variantSku;

      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      throw new AppError("Item not found in save for later", 404);
    }

    // Remove the item using MongoDB's $pull operation
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      {
        $pull: {
          saveForLater: {
            productId: productId,
            variantSku: variantSku || null,
          },
        },
      },
      { new: true }
    );

    return await this.getUserCart(userId);
  }

  // Clear all save for later items
  static async clearSaveForLater(userId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found", 404);

    cart.saveForLater = [];
    await cart.save();
    return await this.getUserCart(userId);
  }
}
