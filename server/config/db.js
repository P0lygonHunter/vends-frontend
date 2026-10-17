const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP';

let dbPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
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
