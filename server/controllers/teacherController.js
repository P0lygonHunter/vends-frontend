const Teacher = require('../models/Teacher');
const School = require('../models/School');

// Get Teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ schoolId: req.params.schoolId });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Teacher
exports.createTeacher = async (req, res) => {
  try {
    const { schoolId, name, email, phone, subject, grades, status } = req.body;

    if (!schoolId) return res.status(400).json({ error: "School ID is required." });

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: "School not found!" });

    if (!name || !email || !phone || !subject) {
      return res.status(400).json({ error: "Please fill all required teacher fields." });
    }

    const teacher = new Teacher({
      schoolId,
      name,
      email,
      phone,
      subject,
      grades,
      status: status || 'Active'
    });

    await teacher.save();
    res.status(201).json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Teacher
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found!" });

    const { name, email, phone, subject, grades, status } = req.body;

    if (!name || !email || !phone || !subject) {
      return res.status(400).json({ error: "Please fill all required teacher fields." });
    }

    teacher.name = name;
    teacher.email = email;
    teacher.phone = phone;
    teacher.subject = subject;
    teacher.grades = grades;
    teacher.status = status;

    await teacher.save();
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found!" });

    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
