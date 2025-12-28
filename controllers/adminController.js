import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hospitalsFile = path.join(__dirname, '..', 'data', 'hospitals.json');
const usersFile = path.join(__dirname, '..', 'data', 'users.json');

const readJSON = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export const postAddHospital = (req, res) => {
  try {
    const data = req.body || {};

    if (!data.name) {
      return res.status(400).json({ success: false, message: 'Hospital `name` is required' });
    }

    const hospitals = readJSON(hospitalsFile);
    const hospital_id = data.hospital_id ? Number(data.hospital_id) : (hospitals.length ? (Math.max(...hospitals.map(h => h.hospital_id || 0)) + 1) : 1);

    const newEntry = {
      hospital_id,
      name: data.name,
      email: data.email || '',
      latitude: data.latitude !== undefined ? Number(data.latitude) : undefined,
      longitude: data.longitude !== undefined ? Number(data.longitude) : undefined,
      address: data.address || '',
      ambulance_id: data.ambulance_id || '',
      ambulance_engaged: data.ambulance_engaged === true || data.ambulance_engaged === 'true' || data.ambulance_engaged === '1' || false
    };

    hospitals.push(newEntry);
    writeJSON(hospitalsFile, hospitals);

    return res.status(201).json({ success: true, message: 'Hospital/ambulance added', hospital: newEntry });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add hospital', error: String(err) });
  }
};

export const postAddUser = (req, res) => {
  try {
    const data = req.body || {};

    const required = ['name', 'email', 'password', 'role'];
    for (const f of required) {
      if (!data[f]) return res.status(400).json({ success: false, message: `[31mField '${f}' is required[0m` });
    }

    const allowedRoles = ['user', 'admin', 'ambulance-driver'];
    if (!allowedRoles.includes(data.role)) return res.status(400).json({ success: false, message: 'Invalid role' });

    const users = readJSON(usersFile);
    const existing = users.find(u => (u.email || '').toLowerCase() === (data.email || '').toLowerCase());
    if (existing) return res.status(400).json({ success: false, message: 'User with this email already exists' });

    const hashedPassword = bcrypt.hashSync(data.password, 10);

    const newUser = {
      user_id: Date.now(),
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role
    };

    if (data.ambulance_id) newUser.ambulance_id = data.ambulance_id;
    if (data.mobilenumber) newUser.mobilenumber = data.mobilenumber;

    users.push(newUser);
    writeJSON(usersFile, users);

    // do not expose password in response
    const { password, ...out } = newUser;

    return res.status(201).json({ success: true, message: 'User created', user: out });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create user', error: String(err) });
  }
};

export const getHospitals = (req, res) => {
  try {
    const hospitals = readJSON(hospitalsFile);
    return res.status(200).json({ success: true, count: hospitals.length, hospitals });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read hospitals', error: String(err) });
  }
};

export const getUsers = (req, res) => {
  try {
    const users = readJSON(usersFile) || [];
    // sanitize: remove password field
    const safe = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    return res.status(200).json({ success: true, count: safe.length, users: safe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read users', error: String(err) });
  }
};

export const updateHospital = (req, res) => {
  try {
    const data = req.body || {};
    const id = data.hospital_id ? Number(data.hospital_id) : null;
    if (!id) return res.status(400).json({ success: false, message: 'hospital_id is required' });

    const hospitals = readJSON(hospitalsFile);
    const found = hospitals.findIndex(h => Number(h.hospital_id) === id);
    if (found === -1) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const updated = { ...hospitals[found] };
    if (data.name !== undefined) updated.name = data.name;
    if (data.email !== undefined) updated.email = data.email;
    if (data.latitude !== undefined) updated.latitude = data.latitude === '' ? undefined : Number(data.latitude);
    if (data.longitude !== undefined) updated.longitude = data.longitude === '' ? undefined : Number(data.longitude);
    if (data.address !== undefined) updated.address = data.address;
    if (data.ambulance_id !== undefined) updated.ambulance_id = data.ambulance_id;
    if (data.ambulance_engaged !== undefined) updated.ambulance_engaged = data.ambulance_engaged === true || data.ambulance_engaged === 'true' || data.ambulance_engaged === '1';

    hospitals[found] = updated;
    writeJSON(hospitalsFile, hospitals);

    return res.status(200).json({ success: true, message: 'Hospital updated', hospital: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update hospital', error: String(err) });
  }
};

export const deleteHospital = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid hospital id' });

    const hospitals = readJSON(hospitalsFile);
    const remaining = hospitals.filter(h => Number(h.hospital_id) !== id);
    const deletedCount = hospitals.length - remaining.length;
    if (deletedCount === 0) return res.status(404).json({ success: false, message: 'Hospital not found' });

    writeJSON(hospitalsFile, remaining);
    return res.status(200).json({ success: true, message: 'Hospital deleted', deletedCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete hospital', error: String(err) });
  }
};

export const updateUser = (req, res) => {
  try {
    const data = req.body || {};
    const id = data.user_id ? Number(data.user_id) : null;
    if (!id) return res.status(400).json({ success: false, message: 'user_id is required' });

    const users = readJSON(usersFile);
    const idx = users.findIndex(u => Number(u.user_id) === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });

    // If email is changing, ensure uniqueness
    if (data.email && users.some(u => u.email && u.email.toLowerCase() === data.email.toLowerCase() && Number(u.user_id) !== id)) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const updated = { ...users[idx] };
    if (data.name !== undefined) updated.name = data.name;
    if (data.email !== undefined) updated.email = data.email;
    if (data.role !== undefined) updated.role = data.role;
    if (data.ambulance_id !== undefined) updated.ambulance_id = data.ambulance_id;
    if (data.mobilenumber !== undefined) updated.mobilenumber = data.mobilenumber;

    if (data.password) {
      updated.password = bcrypt.hashSync(data.password, 10);
    }

    users[idx] = updated;
    writeJSON(usersFile, users);

    const { password, ...out } = updated;
    return res.status(200).json({ success: true, message: 'User updated', user: out });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user', error: String(err) });
  }
};

export const deleteUser = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid user id' });

    const users = readJSON(usersFile);
    const remaining = users.filter(u => Number(u.user_id) !== id);
    const deletedCount = users.length - remaining.length;
    if (deletedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });

    writeJSON(usersFile, remaining);
    return res.status(200).json({ success: true, message: 'User deleted', deletedCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: String(err) });
  }
};
