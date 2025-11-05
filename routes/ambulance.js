// ===== routes/ambulance.routes.js =====
import express from  'express'
const router = express.Router();
import {getAmbulanceIncidents , acceptIncident ,updateLocation , updateStatus , getActiveIncident, AfterAccept ,getInciFromID} from '../controllers/ambulanceController.js'

// Ambulance Driver Routes
router.get('/incidents/:ambulance_id',getAmbulanceIncidents);
router.get('/getincident/:incident_id',getInciFromID);
router.get('/afteraccept',AfterAccept);
router.post('/accept-incident',acceptIncident);
// router.post('/update-location',updateLocation);
router.post('/update-status',updateStatus);
// router.get('/active-incident/:ambulance_driver_id',getActiveIncident);

export default router