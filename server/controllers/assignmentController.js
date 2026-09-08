const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');

// Get Assignments
exports.getAssignments = async (req, res) => {
  try {
    res.json(await Assignment.find({ schoolId: req.params.schoolId })
      .populate('classSectionId', 'name')
      .populate('subjectId', 'name code')
      .sort({ dueDate: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Assignment
exports.createAssignment = async (req, res) => {
  try {
    const { schoolId, academicYearId, classSectionId, subjectId, teacherId, title, description = '', dueDate, status = 'Assigned' } = req.body;
    
    if (!(await ClassSection.findOne({ _id: classSectionId, schoolId, academicYearId }))) {
      return res.status(400).json({ error: 'Selected class and academic year do not match.' });
    }
    
    const assignment = await Assignment.create({
      schoolId,
      academicYearId,
      classSectionId,
      subjectId,
      teacherId,
      title,
      description,
      dueDate,
      status
    });

    const students = await Student.find({ schoolId, classSectionId }).select('_id');
    if (students.length) {
      await AssignmentSubmission.insertMany(
        students.map(student => ({
          schoolId,
          assignmentId: assignment._id,
          studentId: student._id
        })),
        { ordered: false }
      );
    }

    res.status(201).json(await assignment.populate([
      { path: 'classSectionId', select: 'name' },
      { path: 'subjectId', select: 'name code' }
    ]));
  } catch (err) {
    res.status(400).json({ error: err.code === 11000 ? 'Assignment already exists.' : err.message });
  }
};

// Get Submissions
exports.getSubmissions = async (req, res) => {
  try {
    res.json(await AssignmentSubmission.find({ assignmentId: req.params.id })
      .populate('studentId', 'name'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Submission
exports.updateSubmission = async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findByIdAndUpdate(req.params.id, {
      ...req.body,
      submittedAt: req.body.status === 'Submitted' ? new Date() : null
    }, { new: true, runValidators: true })
    .populate('studentId', 'name');

    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    res.json(submission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Assignment
exports.deleteAssignment = async (req, res) => {
  try {
    await Assignment.deleteOne({ _id: req.params.id });
    await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
