// Visit /api/health to see what's configured (no secrets are shown).
import { redis, redisConfigured } from '../lib/redis.js';
import { blobToken } from '../lib/blob.js';

export default async function handler(req, res) {
  const out = { redisConfigured, blobTokenPresent: !!blobToken };
  try {
    await redis.set('health', 1, { ex: 60 });
    out.redisWorks = (await redis.get('health')) === 1;
  } catch (e) {
    out.redisWorks = false;
    out.redisError = String(e.message || e).slice(0, 200);
  }
  res.json(out);
}
