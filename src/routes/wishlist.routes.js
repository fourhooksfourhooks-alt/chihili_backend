import { Router } from "express";
import * as cartController from "../controllers/cart.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { handleValidationErrors } from "../middleware/validation.middleware.js";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";
import { addToWishlistValidation, removeFromWishlistValidation } from "../validations/wishlist.validation.js";
const wishlistRouter = Router();


wishlistRouter.post('/addtowishlist' , protect , addToWishlistValidation , handleValidationErrors , addToWishlist);
wishlistRouter.delete('/removeFromWishlist/:productId' , protect , removeFromWishlistValidation , handleValidationErrors , removeFromWishlist);
wishlistRouter.get('/getWishlist' , protect , getWishlist);



export default wishlistRouter;
