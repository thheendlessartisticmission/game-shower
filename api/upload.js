// Gives the browser a short-lived presigned URL so it can upload audio straight to Vercel Blob.
// Works with Vercel's OIDC sign-in (BLOB_STORE_ID), so no BLOB_READ_WRITE_TOKEN is needed.
import crypto from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';

const MAX = 25 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const type = typeof b.type === 'string' && b.type.startsWith('audio/') ? b.type : 'audio/mpeg';
    const size = Number(b.size);
    if (!(size > 0 && size <= MAX)) return res.status(413).json({ error: 'File must be 25 MB or smaller' });
    const safe = String(b.name || 'clip').replace(/[^\w.-]+/g, '_').slice(-60) || 'clip';
    const pathname = `clips/${crypto.randomBytes(8).toString('hex')}-${safe}`;
    const validUntil = Date.now() + 15 * 60 * 1000;

    const token = await issueSignedToken({
      pathname,
      operations: ['put'],
      validUntil,
      allowedContentTypes: [type],
      maximumSizeInBytes: MAX,
    });
    const { presignedUrl } = await presignUrl(token, { pathname, operation: 'put', validUntil });
    const u = new URL(presignedUrl);
    res.json({ presignedUrl, url: u.origin + u.pathname, contentType: type });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String((e && e.message) || e).slice(0, 300) });
  }
}
