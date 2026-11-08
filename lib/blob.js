// Finds the Blob token even if the integration added a custom prefix.
const k = Object.keys(process.env).find((n) => n === 'BLOB_READ_WRITE_TOKEN' || n.endsWith('_BLOB_READ_WRITE_TOKEN'));
export const blobToken = k ? process.env[k] : undefined;
