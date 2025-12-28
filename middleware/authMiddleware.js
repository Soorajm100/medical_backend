import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userFile = path.join(__dirname, '..', 'data', 'users.json');

// helpful debug if file is unexpectedly missing
if (!fs.existsSync(userFile)) {
  console.error(`users file not found at ${userFile} on startup`);
}

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header', success: false });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Invalid Authorization format. Expected "Bearer <token>"', success: false });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token verification failed', detail: err.message, success: false });
  }

  // read users and verify role
  if (!fs.existsSync(userFile)) {
    return res.status(500).json({ message: `users file not found at ${userFile}`, success: false });
  }

  let users;
  try {
    const data = fs.readFileSync(userFile, 'utf-8');
    users = JSON.parse(data);
  } catch (err) {
    console.error('Error reading users file', err);
    return res.status(500).json({ message: 'Failed to read users file', detail: String(err), success: false });
  }

  const user = users.find(u => u.user_id === decoded.id || u.email === decoded.email);
  if (!user) return res.status(401).json({ message: 'User not found', success: false });

  if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access only', success: false });

  req.user = user;
  next();
};
