import { Redis } from '@upstash/redis';

// Works with the Upstash integration from the Vercel Marketplace (either naming scheme).
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = new Redis({ url, token });
export const TTL = 12 * 3600; // games vanish after 12 hours without a write
