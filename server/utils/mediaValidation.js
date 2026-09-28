const MAX_IMAGE_CHARS = 700000;
const MAX_AUDIO_CHARS = 1500000;
const IMAGE_PREFIXES = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
const AUDIO_PREFIXES = ['data:audio/webm', 'data:audio/ogg', 'data:audio/mp4', 'data:audio/mpeg', 'data:audio/wav', 'data:audio/x-wav'];

function isValidChatImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  if (dataUrl.length > MAX_IMAGE_CHARS) return false;
  return IMAGE_PREFIXES.some((p) => dataUrl.startsWith(p));
}

function isValidChatAudio(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  if (dataUrl.length > MAX_AUDIO_CHARS) return false;
  return AUDIO_PREFIXES.some((p) => dataUrl.startsWith(p));
}

module.exports = { isValidChatImage, isValidChatAudio, MAX_IMAGE_CHARS, MAX_AUDIO_CHARS };
