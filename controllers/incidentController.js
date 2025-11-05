import fs from "fs"; 
import path from "path";
import bcrypt from  "bcryptjs"
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv"; 

dotenv.config(); 

const __dirname = path.resolve(); 

console.log("the __dirname is", __dirname);


const incidentFile= path.join(__dirname , "data", "incidents.json"); 



const readIncidents = () => {
  if (!fs.existsSync(incidentFile)) return [];
  return JSON.parse(fs.readFileSync(incidentFile, "utf-8"));
};

const saveIncidents = (data) => {
  fs.writeFileSync(incidentFile, JSON.stringify(data, null, 2));
};


export const IncidentList = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send({ message: "Missing user_id", success: false });
  }

  const incidents = readIncidents();
  const userIncidents = incidents.filter((i) => i.user_id === user_id);

  if (userIncidents.length === 0) {
    return res.status(404).send({ message: "No incidents found for the user", success: true, incident_list: [] });
  }

  return res.status(200).send({
    message: "Incidents list returned successfully",
    success: true,
    incident_list: userIncidents,
  });
};
