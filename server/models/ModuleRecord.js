const mongoose = require('mongoose');

const ModuleRecordSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  module: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

ModuleRecordSchema.index({ schoolId: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model('ModuleRecord', ModuleRecordSchema);
