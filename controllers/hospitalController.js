import fs from "fs";
import path from "path";
import { sendEmergencyEmail } from "../utils/emailService.js";

const __dirname = path.resolve();
const hospitalFile = path.join(__dirname, "data", "hospitals.json");
const incidentFile = path.join(__dirname, "data", "incidents.json");

const readHospitals = () => {
  if (!fs.existsSync(hospitalFile)) return [];
  return JSON.parse(fs.readFileSync(hospitalFile, "utf-8"));
};

const saveHospitals = (data) => {
  fs.writeFileSync(hospitalFile, JSON.stringify(data, null, 2));
};

const readIncidents = () => {
  if (!fs.existsSync(incidentFile)) return [];
  return JSON.parse(fs.readFileSync(incidentFile, "utf-8"));
};

const saveIncidents = (data) => {
  fs.writeFileSync(incidentFile, JSON.stringify(data, null, 2));
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export const emergenGencyTrigger = async (req, res) => {
  try {
    const { name, latitude, longitude, emergencyType, useremail , user_id } = req.body;

    if (!latitude || !longitude || !emergencyType || !useremail) {
      return res.status(400).json({
        message: "Missing required fields (latitude, longitude, type, email)",
        success: false,
      });
    }

    const hospitals = readHospitals();

    if (hospitals.length === 0) {
      return res.status(404).json({ message: "No hospitals found", success: false });
    }

    // Calculate distance for all ambulances
    const withDistance = hospitals.map((h) => ({
      ...h,
      distance: getDistance(latitude, longitude, h.latitude, h.longitude),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);

    const availableAmbulance = withDistance.find((h) => !h.ambulance_engaged);

    if (!availableAmbulance) {
      return res.status(404).json({
        message: "No available ambulances nearby",
        success: false,
      });
    }

    // Mark ambulance as engaged
    const updatedHospitals = hospitals.map((h) =>
      h.ambulance_id === availableAmbulance.ambulance_id
        ? { ...h, ambulance_engaged: true }
        : h
    );
    saveHospitals(updatedHospitals);

    const eta = Math.floor(Math.random() * 10) + 5; // 5-15 mins

    const incidents = readIncidents();

    const newIncident = {
      incident_id: `INC-${Date.now()}`,
      user_name: name,
      user_email: useremail,
      user_id : user_id , 
      emergency_type: emergencyType,
      hospital_name: availableAmbulance.name,
      hospital_email: availableAmbulance.email,
      ambulance_id: availableAmbulance.ambulance_id,
      location: { latitude, longitude },
      distance_km: availableAmbulance.distance.toFixed(2),
      eta_minutes: eta,
      status: "En Route", // Possible statuses: En Route → Arrived → Completed
      created_at: new Date().toISOString(),
    };

    incidents.push(newIncident);
    saveIncidents(incidents);

    // Prepare email
    const subject = `🚨 Emergency Alert: ${emergencyType}`;
    const message = `
Emergency reported by: ${name}
Type: ${emergencyType}
Ambulance Assigned: ${availableAmbulance.ambulance_id}
Hospital: ${availableAmbulance.name}
Location: https://www.google.com/maps?q=${latitude},${longitude}

ETA: ${eta} minutes
Please respond immediately.
    `;

    // Send email
    const success = await sendEmergencyEmail(
      availableAmbulance.email,
      subject,
      message,
      useremail
    );

    if (success) {
      return res.status(200).json({
        message: `🚑 Ambulance ${availableAmbulance.ambulance_id} dispatched from ${availableAmbulance.name}`,
        hospital: availableAmbulance.name,
        ambulance_id: availableAmbulance.ambulance_id,
        eta: eta,
        incident_id: newIncident.incident_id,
        success: true,
      });
    } else {
      return res.status(500).json({
        message: "Failed to send emergency email",
        success: false,
      });
    }
  } catch (err) {
    console.error("Error in emergencyTrigger:", err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};
