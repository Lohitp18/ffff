const fs = require('fs');
const path = require('path');

function extFromMime(mimeType) {
  const mt = (mimeType || '').toLowerCase();
  if (mt === 'image/jpeg' || mt === 'image/jpg') return '.jpg';
  if (mt === 'image/png') return '.png';
  if (mt === 'image/webp') return '.webp';
  if (mt === 'image/gif') return '.gif';
  if (mt === 'video/mp4') return '.mp4';
  if (mt === 'video/webm') return '.webm';
  if (mt === 'video/quicktime') return '.mov';
  return '';
}

function safeBasename(name) {
  return String(name || 'file')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

/**
 * Save an in-memory uploaded buffer to local ./uploads (served by backend at /uploads).
 * Returns a URL path like "/uploads/<folder>/<filename>".
 */
async function saveBufferToUploads(buffer, originalname, folder = '', mimeType = '') {
  if (!buffer) throw new Error('No file buffer provided');

  const originalExt = path.extname(originalname || '');
  const ext = originalExt || extFromMime(mimeType) || '';

  const base = safeBasename(path.basename(originalname || 'file', originalExt || ext));
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${unique}-${base || 'file'}${ext}`;

  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const targetDir = folder ? path.join(uploadsRoot, folder) : uploadsRoot;
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, filename);
  await fs.promises.writeFile(filePath, buffer);

  const urlPath = folder ? `/uploads/${folder}/${filename}` : `/uploads/${filename}`;
  return urlPath;
}

module.exports = { saveBufferToUploads };


