// Daily cron: delete clips older than 12 hours that no saved preset has pinned.
import { list, del } from '@vercel/blob';
import { redis } from '../lib/redis.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
  try {
    const pinned = new Set(await redis.smembers('pinned'));
    const cutoff = Date.now() - 12 * 3600e3;
    let cursor, deleted = 0;
    do {
      const r = await list({ prefix: 'clips/', cursor, limit: 1000 });
      const old = r.blobs.filter((b) => !pinned.has(b.url) && new Date(b.uploadedAt).getTime() < cutoff).map((b) => b.url);
      if (old.length) { await del(old); deleted += old.length; }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    res.json({ deleted });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
