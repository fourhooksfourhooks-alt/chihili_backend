import { Router } from "express";
import * as addressController from "../controllers/address.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/add", protect, addressController.createAddress);          // Create
router.get("/getAllAddess", protect, addressController.getUserAddresses);        // Get all
router.get("/:addressId", protect, addressController.getAddressById); // Get one
router.put("/update/:addressId", protect, addressController.updateAddress); // Update
router.delete("/delete/:addressId", protect, addressController.deleteAddress); // Delete


export default router;
