const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP';

let dbPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!dbPromise) {
    dbPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
  }

  await dbPromise;
  console.log("✓ Database Connected Successfully");
};

module.exports = connectDB;
