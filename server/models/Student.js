const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  grade: { type: String, default: '' },
  age: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }, // Active, On Leave, Suspended
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);