import fs from "fs"; 
import path from "path";
import bcrypt from  "bcryptjs"
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv"; 
import { getJSON, setJSON, delKey } from "../utils/redisClient.js";

dotenv.config(); 
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const incidentFile= path.join(__dirname , "..", "data", "incidents.json"); 



const readIncidents = async () => {
  try {
    const cached = await getJSON('incidents_all');
    if (cached && Array.isArray(cached)) return cached;
  } catch (err) {}

  if (!fs.existsSync(incidentFile)) return [];
  const data = JSON.parse(fs.readFileSync(incidentFile, "utf-8"));

  try { await setJSON('incidents_all', data, 60); } catch (err) {}

  return data;
};

const saveIncidents = async (data) => {
  fs.writeFileSync(incidentFile, JSON.stringify(data, null, 2));
  try { await delKey('incidents_all'); } catch (err) {}
};


export const IncidentList = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send({ message: "Missing user_id", success: false });
  }

  // Try per-user cache first
  try {
    const cached = await getJSON(`incidents_user_${user_id}`);
    if (cached && Array.isArray(cached)) {


      return res.status(200).send({ message: "Incidents list returned successfully", success: true, incident_list: cached });
    }
  } catch (err) {}

  const incidents = await readIncidents();
  const inciArr = [incidents] ;
  const userIncidents = incidents.filter((i) => i.user_id === user_id);

  if (userIncidents.length === 0) {
    return res.status(404).send({ message: "No incidents found for the user", success: true, incident_list: [] });
  }

  // Cache user's incidents briefly
  try { await setJSON(`incidents_user_${user_id}`, userIncidents, 60); } catch (err) {}

  return res.status(200).send({
    message: "Incidents list returned successfully",
    success: true,
    incident_list: userIncidents,
  });
};
