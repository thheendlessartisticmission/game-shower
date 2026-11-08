// Visit /api/health to see what's configured (no secrets are shown).
import { list } from '@vercel/blob';
import { redis, redisConfigured } from '../lib/redis.js';

export default async function handler(req, res) {
  const out = {
    redisConfigured,
    blobStoreIdPresent: !!process.env.BLOB_STORE_ID,
    blobTokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
  };
  try {
    await redis.set('health', 1, { ex: 60 });
    out.redisWorks = (await redis.get('health')) === 1;
  } catch (e) {
    out.redisWorks = false;
    out.redisError = String(e.message || e).slice(0, 200);
  }
  try {
    await list({ prefix: 'clips/', limit: 1 });
    out.blobWorks = true;
  } catch (e) {
    out.blobWorks = false;
    out.blobError = String(e.message || e).slice(0, 200);
  }
  res.json(out);
}
