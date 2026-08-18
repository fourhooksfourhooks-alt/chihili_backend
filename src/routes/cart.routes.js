import { Router } from "express";
import * as cartController from "../controllers/cart.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import {
  addToCartValidation,
  updateCartItemValidation,
  removeFromCartValidation,
  saveForLaterValidation,
  getCartByIdValidation,
} from "../validations/cartvalidaton.js";

const cartRouter = Router();
cartRouter.get("/getAllCarts", protect, cartController.getAllCarts);
cartRouter.get("/getCart/:id", protect, getCartByIdValidation, handleValidationErrors, cartController.getCartById);
cartRouter.get("/getCart", protect, cartController.getCart);
cartRouter.post("/addToCart", protect, addToCartValidation, handleValidationErrors, cartController.addToCart);
cartRouter.put(
  "/update/:productId/:variantSku",
  protect,
  updateCartItemValidation,
  handleValidationErrors,
  cartController.updateCartItem
);

// Route for removing items with variant
cartRouter.delete(
  "/remove/:productId/:variantSku",
  protect,
  removeFromCartValidation,
  handleValidationErrors,
  cartController.removeFromCart
);

// Route for removing items without variant (when variantSku is not needed)
cartRouter.delete(
  "/remove/:productId",
  protect,
  removeFromCartValidation,
  handleValidationErrors,
  cartController.removeFromCart
);

cartRouter.delete("/clear", protect, cartController.clearCart);

// Save for Later routes
// Move from cart → saveForLater
cartRouter.post(
  "/saveForLater/:productId/:variantSku?",
  protect,
  saveForLaterValidation,
  handleValidationErrors,
  cartController.moveToSaveForLater
);

// Move back from saveForLater → cart
cartRouter.post(
  "/moveToCart/:productId/:variantSku?",
  protect,
  saveForLaterValidation,
  handleValidationErrors,
  cartController.moveToCart
);

// Get save for later items
cartRouter.get(
  "/saveForLater",
  protect,
  cartController.getSaveForLater
);

// Clear all save for later items
cartRouter.delete(
  "/saveForLater/clear",
  protect,
  cartController.clearSaveForLater
);

// Remove item from save for later
cartRouter.delete(
  "/saveForLater/:productId/:variantSku?",
  protect,
  saveForLaterValidation,
  handleValidationErrors,
  cartController.removeFromSaveForLater
);

export default cartRouter;
