import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import hospitalRoutes from './routes/hospital.js';
import incidentRoutes from './routes/incident.js'

import ambulanceRoutes from  './routes/ambulance.js'
import adminRoutes from './routes/admin.js';
import morgan from "morgan";




const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));


// // Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/incidents' , incidentRoutes);
app.use('/api/ambulances' , ambulanceRoutes);
// app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/ambulance', ambulanceRoutes);

export default app;
