const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  schoolName: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, default: 'Success' }, // Success, Blocked, Failed
}, { timestamps: true });

module.exports = mongoose.model('LoginLog', LoginLogSchema);