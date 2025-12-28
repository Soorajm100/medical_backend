import express from 'express';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import { postAddHospital, postAddUser, getHospitals, getUsers, updateHospital, deleteHospital, updateUser, deleteUser } from '../controllers/adminController.js';

const router = express.Router();

// JSON endpoints (expect application/json body)
router.post('/add-hospital', verifyAdmin, postAddHospital);
router.post('/add-user', verifyAdmin, postAddUser);


// Read endpoints (admin-only)
router.get('/hospitals', verifyAdmin, getHospitals);
router.get('/users', verifyAdmin, getUsers);

// Update endpoints
router.put('/update-hospital', verifyAdmin, updateHospital);
router.put('/update-user', verifyAdmin, updateUser);

// Delete endpoints
router.delete('/hospital/:id', verifyAdmin, deleteHospital);
router.delete('/user/:id', verifyAdmin, deleteUser);

export default router;
