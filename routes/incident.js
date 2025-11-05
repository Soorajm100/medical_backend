
import express from "express";
import { IncidentList } from "../controllers/incidentController.js";
const router = express.Router();



router.post("/incidentlist" ,IncidentList);




export default router;
