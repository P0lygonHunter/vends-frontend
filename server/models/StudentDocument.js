const mongoose = require('mongoose');

const StudentDocumentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Admission', 'Certificate', 'Identity', 'Other'], default: 'Other' },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: '' }
  ,fileData: { type: String, default: '', select: false }
}, { timestamps: true });
module.exports = mongoose.model('StudentDocument', StudentDocumentSchema);
