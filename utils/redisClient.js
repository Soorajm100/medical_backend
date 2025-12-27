import { createClient } from 'redis';

// Wrapper around redis client with safe no-op if not configured
let client = null;
let isConnected = false;

const create = () => {
  if (isConnected || client) return client;

  // Prefer a single REDIS_URL; otherwise use host/port/username/password
  const url = process.env.REDIS_URL;

  const opts = {};

  if (url) {
    opts.url = url;
  } else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
    opts.socket = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    };
    if (process.env.REDIS_USERNAME) opts.username = process.env.REDIS_USERNAME;
    if (process.env.REDIS_PASSWORD) opts.password = process.env.REDIS_PASSWORD;
  } else {
    // Redis not configured — return null and make functions no-op
    return null;
  }

  client = createClient(opts);

  client.on('error', (err) => console.error('Redis Client Error', err));
  client.on('connect', () => console.log('Redis connecting...'));
  client.on('ready', () => {
    isConnected = true;
    console.log('Redis client ready');
  });

  return client;
};

export const connectRedis = async () => {
  try {
    const c = create();
    if (!c) return null;
    if (!isConnected) await c.connect();
    return c;
  } catch (err) {
    console.error('Failed to connect to Redis:', err.message || err);
    return null;
  }
};

export const getJSON = async (key) => {
  try {
    const c = create();
    if (!c || !isConnected) return null;
    const val = await c.get(key);

    console.log("the get functin in  redis", val , key)
    if (!val) return null;
    return JSON.parse(val);
  } catch (err) {
    console.error('Redis getJSON error:', err.message || err);
    return null;
  }
};

export const setJSON = async (key, value, ttlSeconds = 300) => {
  try {
    const c = create();
    if (!c || !isConnected) return false;
    const str = JSON.stringify(value);
    //  console.log("the set  function  in  redis", str)
    if (ttlSeconds > 0) {
      await c.setEx(key, ttlSeconds, str);
    } else {
      await c.set(key, str);
    }
    return true;
  } catch (err) {
    console.error('Redis setJSON error:', err.message || err);
    return false;
  }
};

export const delKey = async (key) => {
  try {
    const c = create();
    if (!c || !isConnected) return false;
    await c.del(key);
    return true;
  } catch (err) {
    console.error('Redis del error:', err.message || err);
    return false;
  }
};

export default {
  connectRedis,
  getJSON,
  setJSON,
  delKey,
};
