/**
 * One-time: node scripts/ensureIndexes.js
 * Ensures schema indexes exist on Atlas (safe to re-run).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Register models so indexes are defined
require('../models/School');
require('../models/Student');
require('../models/Teacher');
require('../models/Parent');
require('../models/Attendance');
require('../models/FeeRecord');
require('../models/FeePayment');
require('../models/Conversation');
require('../models/Message');
require('../models/ClassSection');

(async () => {
  await connectDB();
  const names = mongoose.modelNames();
  for (const name of names) {
    try {
      const r = await mongoose.model(name).syncIndexes();
      console.log('indexes', name, r);
    } catch (e) {
      console.warn('skip', name, e.message);
    }
  }
  await mongoose.disconnect();
  console.log('done');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
