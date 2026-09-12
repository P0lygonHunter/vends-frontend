const { hashPassword } = require('../middleware/passwords');

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Provide a CEO password with at least 12 characters.');
  process.exit(1);
}

hashPassword(password).then((hash) => console.log(hash));
