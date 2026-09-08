const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ['Pending', 'Submitted', 'Late'], default: 'Pending' },
  remarks: { type: String, default: '' }
}, { timestamps: true });
AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
