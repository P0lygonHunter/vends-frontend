const mongoose = require('mongoose');

/** Strip accidental quotes/whitespace from Vercel env pastes */
function normalizeMongoUri(raw) {
  let s = String(raw || '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^[\u201C\u201D\u2018\u2019]+|[\u201C\u201D\u2018\u2019]+$/g, '').trim();
  return s;
}

const MONGO_URI = normalizeMongoUri(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP');

let dbPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!MONGO_URI || (!MONGO_URI.startsWith('mongodb://') && !MONGO_URI.startsWith('mongodb+srv://'))) {
    const err = new Error(
      'Invalid connection string: MONGO_URI missing or not mongodb:// / mongodb+srv:// (check Vercel env — no quotes around URI)'
    );
    err.code = 'INVALID_MONGO_URI';
    throw err;
  }

  if (!dbPromise) {
    dbPromise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        bufferCommands: false,
      })
      .then((m) => {
        console.log('✓ Database Connected Successfully');
        return m.connection;
      })
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }

  return dbPromise;
};

module.exports = connectDB;
