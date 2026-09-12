const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

exports.hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
};

exports.isPasswordHash = (value) => typeof value === 'string' && value.startsWith('scrypt$');

exports.verifyPassword = async (password, storedValue) => {
  if (!exports.isPasswordHash(storedValue)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedValue || '');
    return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
  }

  const [, salt, expectedHex] = storedValue.split('$');
  const expected = Buffer.from(expectedHex, 'hex');
  const derived = Buffer.from(await scrypt(password, salt, KEY_LENGTH, OPTIONS));
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
};
