// controllers/sseController.js
import fs from "fs";
import path from  'path'

// Store active SSE connections
// Map<incident_id, Set<response_objects>>
const clients = new Map();

/**
 * SSE endpoint for real-time tracking
 * GET /api/sse/track/:incident_id
 */
const streamTracking = (req, res) => {
  const { incident_id } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders(); // Flush headers to establish SSE connection

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', incident_id })}\n\n`);

  // Add this client to the connections map
  if (!clients.has(incident_id)) {
    clients.set(incident_id, new Set());
  }
  clients.get(incident_id).add(res);

  console.log(`✅ Client connected to incident ${incident_id}. Total clients: ${clients.get(incident_id).size}`);

  // Send initial tracking data
  sendInitialTrackingData(incident_id, res);

  // Heartbeat to keep connection alive (every 30 seconds)
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    
    const incidentClients = clients.get(incident_id);
    if (incidentClients) {
      incidentClients.delete(res);
      console.log(`❌ Client disconnected from incident ${incident_id}. Remaining: ${incidentClients.size}`);
      
      // Clean up empty sets
      if (incidentClients.size === 0) {
        clients.delete(incident_id);
        console.log(`🗑️  No more clients for incident ${incident_id}, removed from tracking`);
      }
    }
    
    res.end();
  });
};

/**
 * Send initial tracking data when client connects
 */
async function sendInitialTrackingData(incident_id, res) {
  try {
    const filePath = path.join(__dirname, '../data/incidents.json');
    const data = await fs.readFile(filePath, 'utf8');
    const incidents = JSON.parse(data);
    
    const incident = incidents.find(inc => inc.incident_id === incident_id);
    
    if (incident) {
      const trackingData = {
        type: 'tracking_update',
        data: {
          incident_id: incident.incident_id,
          status: incident.status,
          ambulance_id: incident.ambulance_id,
          ambulance_driver_name: incident.ambulance_driver_name || null,
          ambulance_driver_phone: incident.ambulance_driver_phone || null,
          current_ambulance_location: incident.current_ambulance_location || null,
          distance_km: incident.distance_km,
          eta_minutes: incident.eta_minutes,
          last_updated: incident.current_ambulance_location?.last_updated || incident.created_at
        }
      };
      
      res.write(`data: ${JSON.stringify(trackingData)}\n\n`);
      console.log(`📤 Sent initial data for incident ${incident_id}`);
    }
  } catch (error) {
    console.error('Error sending initial tracking data:', error);
  }
}

/**
 * Broadcast update to all clients watching this incident
 * Call this function whenever ambulance location/status updates
 */
export const broadcastToIncident = (incident_id, data) =>{
  const incidentClients = clients.get(incident_id);
  
  if (incidentClients && incidentClients.size > 0) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    // Track failed clients to remove them
    const failedClients = new Set();
    
    incidentClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('❌ Error broadcasting to client:', error.message);
        failedClients.add(client);
      }
    });
    
    // Remove failed clients
    failedClients.forEach(client => {
      incidentClients.delete(client);
    });
    
    console.log(`📡 Broadcasted ${data.type} to ${incidentClients.size} clients for incident ${incident_id}`);
  } else {
    console.log(`⚠️  No active clients for incident ${incident_id}`);
  }
}

/**
 * Get count of active connections (for debugging/monitoring)
 * GET /api/sse/connections
 */
const getActiveConnections = (req, res) => {
  const connectionStats = {};
  let totalClients = 0;
  
  clients.forEach((clientSet, incident_id) => {
    connectionStats[incident_id] = clientSet.size;
    totalClients += clientSet.size;
  });
  
  res.json({
    success: true,
    total_incidents: clients.size,
    total_clients: totalClients,
    connections: connectionStats
  });
};

export default {
  streamTracking,
  broadcastToIncident,
  getActiveConnections
};