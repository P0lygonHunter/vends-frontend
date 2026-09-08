const Student = require('../models/Student');
const School = require('../models/School');
const ClassSection = require('../models/ClassSection');

// Get Students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({ schoolId: req.params.schoolId });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Student
exports.createStudent = async (req, res) => {
  try {
    const school = await School.findById(req.body.schoolId);
    if (!school) {
      return res.status(404).json({ error: "School not found!" });
    }

    const studentCount = await Student.countDocuments({ schoolId: req.body.schoolId });
    if (studentCount >= school.studentLimit) {
      return res.status(403).json({
        error: `Student limit reached! Your ${school.plan === 'free_trial' ? 'Free Trial' : 'current'} plan allows maximum ${school.studentLimit} students. Please upgrade your plan.`
      });
    }

    if (req.body.classSectionId) {
      const classSection = await ClassSection.findOne({ _id: req.body.classSectionId, schoolId: req.body.schoolId });
      if (!classSection) return res.status(400).json({ error: 'Selected class does not belong to this school.' });
      if (req.body.academicYearId && String(classSection.academicYearId) !== String(req.body.academicYearId)) {
        return res.status(400).json({ error: 'Selected class does not belong to the selected academic year.' });
      }
    }

    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Student
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
