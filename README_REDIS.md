# Redis caching (overview)

This project now includes optional Redis-based caching for faster reads of frequently accessed JSON resources (hospitals, incidents, users).

How to enable

- Set environment variables in `.env` or use `REDIS_URL`:
  - `REDIS_URL=redis://:password@hostname:port` OR
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`
- Start the server: `npm start`

Behavior

- The app will attempt to connect to Redis on startup; if Redis is not configured it will continue to run normally.
- Cache keys used (examples):
  - `hospitals_all` (TTL 300s)
  - `incidents_all` (TTL 60s)
  - `incidents_user_{user_id}` (TTL 60s)
  - `users_all` (TTL 300s)

Notes

- Cache invalidation is triggered when data is written (files are updated).
- If you prefer longer/shorter TTLs, adjust the `setJSON(..., ttl)` calls in `utils/redisClient.js` or in the controller code.
