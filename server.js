import app from './app.js';
import dotenv from 'dotenv';
import { connectRedis } from './utils/redisClient.js';

dotenv.config();

// Try to connect to Redis (optional)
connectRedis().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.warn('Starting server without Redis:', err?.message || err);
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
