// ambulanceController.js
import fs from "fs";
import path from  'path'
import {broadcastToIncident} from './sseController.js'



const __dirname = path.resolve(); 

console.log("the __dirname is", __dirname);

const incidentFile= path.join(__dirname , "data", "incidents.json"); 
const hospitalFile = path.join(__dirname, "data", "hospitals.json");

// Helper functions to read/write JSON files
const readJSONFile = async (filename) => {
  try {
    const filePath = filename;
    const data = await fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

const writeJSONFile = async (filename, data) => {
  try {
    const filePath = filename ; 
    await fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// ===== AMBULANCE DRIVER CONTROLLERS =====

/**
 * Get all pending/active incidents assigned to this ambulance
 * GET /api/ambulances/incidents/:ambulance_id
 */
export const getAmbulanceIncidents = async (req, res) => {
  try {
    const { ambulance_id } = req.params;
    
    const incidents = await readJSONFile(incidentFile);
    
    // Filter incidents for this ambulance that are not completed
    const ambulanceIncidents = incidents.filter(
      incident => 
        incident.ambulance_id === ambulance_id && 
        incident.status !== 'Completed' && 
        incident.status !== 'Cancelled'
    );
    
    // Sort by created_at (newest first)
    ambulanceIncidents.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    return res.status(200).json({
      success: true,
      data: ambulanceIncidents,
      count: ambulanceIncidents.length
    });
  } catch (error) {
    console.error('Error fetching ambulance incidents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
};

/**
 * Ambulance driver accepts the incident
 * POST /api/ambulance/accept-incident
 */
export const acceptIncident = async (req, res) => {
  try {
    const { 
      incident_id, 
      ambulance_driver_id, 
      ambulance_driver_name,
      ambulance_driver_phone 
    } = req.body;
    
    const incidents = await readJSONFile(incidentFile);
    
    // Find the incident
    const incidentIndex = incidents.findIndex(
      inc => inc.incident_id === incident_id
    );
    
    if (incidentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const incident = incidents[incidentIndex];
    
    // Check if incident can be accepted
    if (incident.status !== 'Pending' && incident.status !== 'Dispatched') {
      return res.status(400).json({
        success: false,
        message: 'Incident already accepted or completed'
      });
    }
    
    const accepted_at = new Date().toISOString();
    
    // Update incident
    incidents[incidentIndex] = {
      ...incident,
      ambulance_driver_name,
      ambulance_driver_phone,
      status: 'Dispatched',
      accepted_at,
      status_history: [
        ...(incident.status_history || []),
        {
          status: 'Dispatched',
          timestamp: accepted_at,
          updated_by: 'ambulance_driver'
        }
      ]
    };
    
    // Save to file
    await writeJSONFile(incidentFile, incidents);
    
    // Broadcast to user that ambulance has been dispatched
    broadcastToIncident(incident_id, {
      type: 'incident_accepted',
      data: {
        incident_id,
        status: 'Dispatched',
        ambulance_driver_name,
        ambulance_driver_phone,
        accepted_at
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Incident accepted successfully',
      data: incidents[incidentIndex]
    });
  } catch (error) {
    console.error('Error accepting incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept incident',
      error: error.message
    });
  }
};

/**
 * Update ambulance real-time location
 * POST /api/ambulance/update-location
 */
export const updateLocation = async (req, res) => {
  try {
    const { 
      incident_id, 
      ambulance_id,
      location // { latitude, longitude }
    } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid location (latitude, longitude) is required'
      });
    }
    
    const incidents = await readJSONFile(incidentFile);
    
    const incidentIndex = incidents.findIndex(
      inc => inc.incident_id === incident_id && inc.ambulance_id === ambulance_id
    );
    
    if (incidentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const incident = incidents[incidentIndex];
    const timestamp = new Date().toISOString();
    
    // Calculate distance between current ambulance location and patient location
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      incident.location.latitude,
      incident.location.longitude
    );
    
    // Estimate ETA (assuming average speed of 40 km/h in emergency)
    const eta_minutes = Math.ceil((distance / 40) * 60);
    
    // Update incident with new location
    incidents[incidentIndex] = {
      ...incident,
      current_ambulance_location: {
        latitude: location.latitude,
        longitude: location.longitude,
        last_updated: timestamp
      },
      distance_km: distance.toFixed(2),
      eta_minutes: eta_minutes
    };
    
    await writeJSONFile(incidentFile, incidents);
    
    // *** BROADCAST TO ALL CONNECTED CLIENTS ***
    broadcastToIncident(incident_id, {
      type: 'location_update',
      data: {
        incident_id,
        current_ambulance_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          last_updated: timestamp
        },
        distance_km: distance.toFixed(2),
        eta_minutes: eta_minutes
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        incident_id,
        current_location: location,
        distance_km: distance.toFixed(2),
        eta_minutes,
        last_updated: timestamp
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

/**
 * Update incident status
 * POST /api/ambulance/update-status
 */
export const updateStatus = async (req, res) => {
  try {
    const { 
      incident_id, 
      new_status,
      notes 
    } = req.body;

    console.log(incident_id , new_status , notes)
    
    const validStatuses = [
      'Dispatched',
      'En Route',
      'Arrived at Scene',
      'Patient Loaded',
      'En Route to Hospital',
      'Arrived at Hospital',
      'Completed'
    ];
    
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses
      });
    }
    
    const incidents = await readJSONFile(incidentFile);
    
    const incidentIndex = incidents.findIndex(
      inc => inc.incident_id === incident_id
    );
    
    if (incidentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const incident = incidents[incidentIndex];
    const timestamp = new Date().toISOString();
    
    // Update timestamp fields based on status
    const statusTimestampFields = {
      'Arrived at Scene': 'arrived_at_scene_at',
      'Patient Loaded': 'patient_loaded_at',
      'Arrived at Hospital': 'arrived_at_hospital_at',
      'Completed': 'completed_at'
    };
    
    const updatedIncident = {
      ...incident,
      status: new_status,
      status_history: [
        ...(incident.status_history || []),
        {
          status: new_status,
          timestamp,
          updated_by: 'ambulance_driver',
          notes: notes || ''
        }
      ]
    };
    
    // Set specific timestamp if applicable
    if (statusTimestampFields[new_status]) {
      updatedIncident[statusTimestampFields[new_status]] = timestamp;
    }
    
    incidents[incidentIndex] = updatedIncident;
    
    await writeJSONFile(incidentFile, incidents);
    
    // *** BROADCAST STATUS UPDATE ***
    broadcastToIncident(incident_id, {
      type: 'status_update',
      data: {
        incident_id,
        status: new_status,
        timestamp,
        notes: notes || ''
      }
    });
    
    // If completed, release the ambulance
    if (new_status === 'Completed') {
      await releaseAmbulance(incident.ambulance_id);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: updatedIncident
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

/**
 * Get active incident for ambulance driver
 * GET /api/ambulance/active-incident/:ambulance_driver_id
 */
export const getActiveIncident = async (req, res) => {
  try {
    const { ambulance_driver_id } = req.params;
    
    const incidents = await readJSONFile(incidentFile);
    
    // Find active incident for this driver
    const activeIncident = incidents.find(
      inc => 
        inc.ambulance_driver_id === parseInt(ambulance_driver_id) &&
        inc.status !== 'Completed' &&
        inc.status !== 'Cancelled' 
    );
    
    if (!activeIncident) {
      return res.status(404).json({
        success: false,
        message: 'No active incident found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: activeIncident
    });
  } catch (error) {
    console.error('Error fetching active incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active incident',
      error: error.message
    });
  }
};


export const AfterAccept = async (req , res) => {
  try {
    const incidents = await readJSONFile(incidentFile);

    console.log(incidents , 'the incidents after readinf')
    
    // Find active incident for this driver
    const activeIncident = [incidents.find(
      inc => 
        inc.incident_accepted === true 
    )];

    
    
    if (!activeIncident) {
      return res.status(404).json({
        success: false,
        message: 'No active incident found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: activeIncident
    });
  } catch (error) {
    console.error('Error fetching active incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active incident',
      error: error.message
    });
  }
};


export const getInciFromID = async (req , res) => {
  try {

    const {incident_id} = req.params ; 
    const incidents = await readJSONFile(incidentFile);

   
    // Find active incident for this driver
    const activeIncident = [incidents.find(
      inc => 
        inc.incident_id === incident_id 
    )];

    
    
    if (!activeIncident) {
      return res.status(404).json({
        success: false,
        message: 'No  incident found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: activeIncident
    });
  } catch (error) {
    console.error('Error fetching  incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch  incident',
      error: error.message
    });
  }
};

// ===== USER CONTROLLERS =====

/**
 * Get live tracking data for user's incident
 * GET /api/user/incident/:incident_id/live-tracking
 */
const getLiveTracking = async (req, res) => {
  try {
    const { incident_id } = req.params;
    
    const incidents = await readJSONFile(incidentFile);
    
    const incident = incidents.find(inc => inc.incident_id === incident_id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Return only tracking-relevant data
    const trackingData = {
      incident_id: incident.incident_id,
      status: incident.status,
      ambulance_id: incident.ambulance_id,
      ambulance_driver_name: incident.ambulance_driver_name,
      ambulance_driver_phone: incident.ambulance_driver_phone,
      patient_location: incident.location,
      current_ambulance_location: incident.current_ambulance_location || null,
      distance_km: incident.distance_km,
      eta_minutes: incident.eta_minutes,
      hospital_name: incident.hospital_name,
      created_at: incident.created_at,
      accepted_at: incident.accepted_at,
      status_history: incident.status_history || []
    };
    
    return res.status(200).json({
      success: true,
      data: trackingData
    });
  } catch (error) {
    console.error('Error fetching live tracking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking data',
      error: error.message
    });
  }
};

/**
 * Get incident status
 * GET /api/user/incident/:incident_id/status
 */
const getIncidentStatus = async (req, res) => {
  try {
    const { incident_id } = req.params;
    
    const incidents = await readJSONFile(incidentFile);
    
    const incident = incidents.find(inc => inc.incident_id === incident_id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        incident_id: incident.incident_id,
        status: incident.status,
        eta_minutes: incident.eta_minutes,
        last_updated: incident.current_ambulance_location?.last_updated || incident.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching incident status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch status',
      error: error.message
    });
  }
};

/**
 * Get all incidents for a user
 * GET /api/user/incidents/:user_id
 */
const getUserIncidents = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const incidents = await readJSONFile(incidentFile);
    
    const userIncidents = incidents.filter(
      inc => inc.user_id === parseInt(user_id)
    );
    
    // Sort by created_at (newest first)
    userIncidents.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    return res.status(200).json({
      success: true,
      data: userIncidents,
      count: userIncidents.length
    });
  } catch (error) {
    console.error('Error fetching user incidents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Release ambulance after incident completion
 */
async function releaseAmbulance(ambulance_id) {
  try {
    const hospitals = await readJSONFile(hospitalFile);
    
    const hospitalIndex = hospitals.findIndex(
      h => h.ambulance_id === ambulance_id
    );
    
    if (hospitalIndex !== -1) {
      hospitals[hospitalIndex].ambulance_engaged = false;
      await writeJSONFile(hospitalFile, hospitals);
    }
  } catch (error) {
    console.error('Error releasing ambulance:', error);
  }
}

// Export all controllers
export default {
  // Ambulance driver controllers
  getAmbulanceIncidents,
  acceptIncident,
  updateLocation,
  updateStatus,
  getActiveIncident,
  AfterAccept,
  getInciFromID,
  
  // User controllers
  getLiveTracking,
  getIncidentStatus,
  getUserIncidents
};