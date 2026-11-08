// Tiny document store for games. Replaces the WebSocket server.
//   POST {t:'set',  path, data}                 write a document
//   POST {t:'get',  path}                       read one document
//   POST {t:'poll', code, since, need:[...]}    "anything new?" (one cheap read when nothing changed)
// Redis layout per game CODE:
//   g:CODE  game document     p:CODE  hash of players     m:CODE  hash of moves     v:CODE  version counter
import { redis, TTL } from '../lib/redis.js';

const MAX_BYTES = 64 * 1024;
const RE = /^games\/([A-Z]{4})(?:\/(players|moves)(?:\/([\w-]{1,32}))?)?$/;
const parse = (p) => {
  const m = RE.exec(typeof p === 'string' ? p : '');
  return m ? { code: m[1], part: m[2] || 'game', id: m[3] || null } : null;
};
const key = (code, part) => (part === 'game' ? `g:${code}` : `${part === 'players' ? 'p' : 'm'}:${code}`);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    if (b.t === 'poll') {
      const code = String(b.code || '');
      if (!/^[A-Z]{4}$/.test(code)) return res.status(400).end();
      // Read the version first, data second: data can only be newer than the version we report.
      const ver = Number((await redis.get(`v:${code}`)) || 0);
      if (ver === Number(b.since)) return res.json({ ver });
      const need = (Array.isArray(b.need) ? b.need : []).filter((x) => ['game', 'players', 'moves'].includes(x));
      const out = {};
      if (need.length) {
        const p = redis.pipeline();
        need.forEach((k) => (k === 'game' ? p.get(`g:${code}`) : p.hgetall(key(code, k))));
        const r = await p.exec();
        need.forEach((k, i) => {
          out[k] = k === 'game' ? (r[i] ?? null) : Object.values(r[i] || {});
        });
      }
      return res.json({ ver, ...out });
    }

    const m = parse(b.path);
    if (!m) return res.status(400).end();

    if (b.t === 'get') {
      let data = null;
      if (m.part === 'game') data = await redis.get(key(m.code, 'game'));
      else if (m.id) data = await redis.hget(key(m.code, m.part), m.id);
      return res.json({ data: data ?? null });
    }

    if (b.t === 'set') {
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return res.status(400).end();
      if (JSON.stringify(b.data).length > MAX_BYTES) return res.status(413).end();
      if (m.part !== 'game' && !m.id) return res.status(400).end();
      const k = key(m.code, m.part);
      const p = redis.pipeline();
      if (m.part === 'game') p.set(k, b.data, { ex: TTL });
      else {
        p.hset(k, { [m.id]: b.data });
        p.expire(k, TTL);
      }
      p.incr(`v:${m.code}`);
      p.expire(`v:${m.code}`, TTL);
      await p.exec();
      return res.json({ ok: true });
    }
    return res.status(400).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server' });
  }
}
