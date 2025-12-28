import express from "express";
import { registerUser , loginUser, verifyToken } from "../controllers/authController.js";
const router = express.Router();

router.post("/register" , registerUser); 

router.post("/login" , loginUser);

// debug endpoint to verify token and show associated user (safe, minimal info)
router.get('/verify-token', verifyToken);

export default router;