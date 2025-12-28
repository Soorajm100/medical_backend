# Medical Backend 🚑

A small, file-based backend for managing hospitals, incidents, users and ambulances. Built with Node.js and Express — ideal for local demos and a simple admin panel to manage hospitals and ambulance drivers.

> Minimal, JSON file-backed API with admin-protected endpoints. Add hospitals, users (including ambulance-driver role), and manage them via REST endpoints.

---

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Admin (protected)](#admin-protected)
  - [Other](#other)
- [Data Schema & Files](#data-schema--files)
- [Frontend Integration Notes](#frontend-integration-notes)
- [Troubleshooting](#troubleshooting)
- [Screenshots / Assets](#screenshots--assets)
- [Contributing](#contributing)
- [License](#license)

---

## Features ✅
- JWT-based authentication and admin-only protection for sensitive endpoints
- Admin APIs to add/read/update/delete hospitals and users
- `ambulance-driver` role support (stores `ambulance_id`, `mobilenumber`)
- Simple JSON files under `data/` for persistence (no DB setup required)
- Helpful debug route: `GET /api/auth/verify-token`

---

## Project Structure 📁
```
medical_backend/
├─ app.js
├─ server.js
├─ package.json
├─ controllers/
│  ├─ adminController.js
│  ├─ authController.js
│  ├─ hospitalController.js
│  └─ ...
├─ routes/
│  └─ admin.js
├─ middleware/
│  └─ authMiddleware.js
├─ data/
│  ├─ hospitals.json
│  ├─ users.json
│  └─ incidents.json
└─ utils/
   └─ redisClient.js
```

---

## Quick Start 🚀
Prerequisites: Node.js (v14+ recommended)

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (copy `.env.example` or add the keys below) and set `JWT_SECRET`.

3. Start the server

```bash
npm run start
# or (dev)
npm run dev
```

Server should run on port from `server.js` (default 5000). Check your script in `package.json`.

---

## Environment Variables 🔐
At minimum set:
- JWT_SECRET — secret used to sign tokens
- EMAIL_USER, EMAIL_PASS — if email features are used
- REDIS_* — used for caching (optional)

Example `.env` snippet:

```
JWT_SECRET=your_secret_here
EMAIL_USER="you@example.com"
EMAIL_PASS="..."
```

---

## API Reference 📡
All admin endpoints require `Authorization: Bearer <token>`. Obtain token via `POST /api/auth/login`.

### Auth
- POST `/api/auth/register` — register user
  - body: { name, email, password, role }
- POST `/api/auth/login` — login and get token
  - body: { email, password }
  - response: { token, name, user_role, user_id, ... }
- GET `/api/auth/verify-token` — debug endpoint to check token validity and mapped user

### Admin (protected)
- POST `/api/admin/add-hospital` — add hospital/ambulance
  - body JSON: { name (required), email, latitude, longitude, address, ambulance_id, ambulance_engaged }
  - 201 => { success: true, hospital }

- POST `/api/admin/add-user` — add user
  - body JSON: { name, email, password, role (user|admin|ambulance-driver), ambulance_id, mobilenumber }
  - 201 => { success: true, user }

- GET `/api/admin/hospitals` — get all hospitals (admin)
  - 200 => { success: true, count, hospitals }

- GET `/api/admin/users` — get all users (password field is omitted)
  - 200 => { success: true, count, users }

- PUT `/api/admin/update-hospital` — update hospital
  - body JSON: { hospital_id (required), ...fields }

- DELETE `/api/admin/hospital/:id` — delete hospital by `hospital_id`

- PUT `/api/admin/update-user` — update user
  - body JSON: { user_id (required), ...fields }

- DELETE `/api/admin/user/:id` — delete user by `user_id`

All admin endpoints return structured JSON with `success` boolean and `message`.

### Other endpoints
- Hospitals listing, incidents, ambulances have dedicated routes under `/api/hospitals`, `/api/incidents`, `/api/ambulances` respectively.

---

## Data Schema & Files 🗂️
Files live in `data/` and are read/written by the server.

`data/users.json` (example entry):

```json
{
  "user_id": 1762153373169,
  "name": "Ramesh",
  "email": "ramesh123@sample.com",
  "password": "<bcrypt-hash>",
  "role": "ambulance-driver",
  "ambulance_id": "AMB004-B",
  "mobilenumber": "9876543210"
}
```

`data/hospitals.json` entries include fields like `hospital_id`, `name`, `email`, `latitude`, `longitude`, `address`, `ambulance_id`, `ambulance_engaged`.

> Note: The server resolves these paths relative to each module file using `import.meta.url` (robust to how the process is started).

---

## Frontend Integration Notes 💻
- Always include `Authorization: Bearer <token>` when calling admin endpoints
- For convenience there are both `POST /api/admin/add-hospital` and `POST /api/admin/hospitals` (alias). Use the JSON endpoints only.
- Use the GET endpoints to populate admin CRUD tables. Example flow for editing a hospital:
  - Fetch hospitals -> fill edit form -> send `PUT /api/admin/update-hospital` with `hospital_id` and changed fields.

Example `curl` sequence (login + add hospital):

```bash
# login
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ravi@example.com","password":"<password>"}'

# then add hospital with the returned token
curl -X POST http://localhost:5000/api/admin/add-hospital \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"New Hospital","email":"h@x.com"}'
```

---

## Troubleshooting 🛠️
- "users file not found" — ensure `data/users.json` exists at `./data/users.json` under the project root. The server resolves it relative to the controllers and middleware (`..` from those files) so the correct path should be `medical_backend/data/users.json`.
- Token issues — use `GET /api/auth/verify-token` to inspect a token and confirm it maps to an admin user.
- If you see path-related ENOENT errors, ensure you start the server from the project root and that the `data/` folder is present.

---


## Contributing 🤝
Contributions are welcome. Please open issues for bugs or feature requests and submit PRs with tests where possible.

---

## License
Sooraj M
