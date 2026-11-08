// /pin and /unpin (rewritten to /api/clips?op=pin|unpin in vercel.json). Same request/response shape as before.
// "Pinned" clips are listed in a Redis set; api/cleanup.js deletes old clips that aren't in it.
import { head } from '@vercel/blob';
import { redis } from '../lib/redis.js';

const ok = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && x.hostname.endsWith('.public.blob.vercel-storage.com') && x.pathname.startsWith('/clips/');
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const op = req.query.op;
  const ids = req.body && req.body.ids;
  if (!['pin', 'unpin'].includes(op) || !Array.isArray(ids) || ids.length > 200) return res.status(400).end();
  const urls = ids.filter(ok);
  try {
    const missing = [];
    if (op === 'pin') {
      await Promise.all(
        urls.map(async (u) => {
          try {
            await head(u);
          } catch (e) {
            if (e && e.name === 'BlobNotFoundError') missing.push(u);
            else throw e;
          }
        })
      );
      const found = urls.filter((u) => !missing.includes(u));
      if (found.length) await redis.sadd('pinned', ...found);
    } else if (urls.length) {
      await redis.srem('pinned', ...urls);
    }
    res.json({ missing });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
