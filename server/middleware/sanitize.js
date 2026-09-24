/** Light input hygiene — strip control chars, limit length, normalize email. */
function stripControls(value) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function sanitizeString(value, max = 200) {
  return stripControls(value).slice(0, max);
}

function sanitizeEmail(value) {
  return stripControls(value).toLowerCase().slice(0, 254);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function sanitizeSchoolBody(body = {}) {
  return {
    schoolName: sanitizeString(body.schoolName, 120),
    principalName: sanitizeString(body.principalName, 80),
    phone: sanitizeString(body.phone, 20),
    email: sanitizeEmail(body.email),
    password: String(body.password || ''),
    address: sanitizeString(body.address, 200),
    city: sanitizeString(body.city, 80),
    totalStudents: body.totalStudents
  };
}

module.exports = {
  stripControls,
  sanitizeString,
  sanitizeEmail,
  isValidEmail,
  sanitizeSchoolBody
};
