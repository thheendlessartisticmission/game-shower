import { Redis } from '@upstash/redis';

// Finds the Upstash credentials even if the integration added a custom prefix (e.g. STORAGE_KV_REST_API_URL).
const find = (...suffixes) => {
  for (const s of suffixes) {
    const k = Object.keys(process.env).find((n) => n === s || n.endsWith('_' + s));
    if (k && process.env[k]) return process.env[k];
  }
  return undefined;
};
const url = find('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL');
const token = find('UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN');

export const redisConfigured = !!(url && token);
export const redis = new Redis({ url, token });
export const TTL = 12 * 3600; // games vanish after 12 hours without a write
