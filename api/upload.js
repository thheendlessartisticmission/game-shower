// Hands the browser a short-lived token so it can upload audio straight to Vercel Blob.
import { handleUpload } from '@vercel/blob/client';
import { blobToken } from '../lib/blob.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const json = await handleUpload({
      token: blobToken,
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('clips/')) throw new Error('Bad path');
        return {
          allowedContentTypes: ['audio/*'],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    res.status(200).json(json);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
