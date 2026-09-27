const MAX_PHOTO_CHARS = 700000; // ~500KB base64 safety limit — this is an avatar, not a document
const ALLOWED_IMAGE_PREFIXES = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];

function isValidImage(dataUrl) {
  if (!dataUrl) return true; // empty/removing photo is allowed
  if (typeof dataUrl !== 'string') return false;
  if (dataUrl.length > MAX_PHOTO_CHARS) return false;
  return ALLOWED_IMAGE_PREFIXES.some(p => dataUrl.startsWith(p));
}

module.exports = { isValidImage };
