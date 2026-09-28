const mongoose = require('mongoose');

const ParentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  photo: { type: String, default: '' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }],
  lastSeenAt: { type: Date, default: null },
}, { timestamps: true });

ParentSchema.index({ schoolId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Parent', ParentSchema);
