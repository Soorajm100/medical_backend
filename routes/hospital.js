import express from "express";
import {  emergenGencyTrigger } from "../controllers/hospitalController.js";
const router = express.Router();

router.post("/trigger" ,emergenGencyTrigger);

export default router;
