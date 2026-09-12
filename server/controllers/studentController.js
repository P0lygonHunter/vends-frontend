const Student = require('../models/Student');
const School = require('../models/School');
const ClassSection = require('../models/ClassSection');
const FeeRecord = require('../models/FeeRecord');

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({ schoolId: req.params.schoolId }).populate('classSectionId');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { schoolId, rollNumber, name, email, phone, age, status, classSectionId, academicYearId, schoolFee, academyFee, feeMonth, dueDate } = req.body;

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: "School not found!" });

    const studentCount = await Student.countDocuments({ schoolId });
    if (studentCount >= school.studentLimit) {
      return res.status(403).json({
        error: `Student limit reached! Your ${school.plan === 'free_trial' ? 'Free Trial' : 'current'} plan allows maximum ${school.studentLimit} students.`
      });
    }

    let classSection = null;
    if (classSectionId) {
      classSection = await ClassSection.findOne({ _id: classSectionId, schoolId });
      if (!classSection) return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    }

    const student = new Student({
      schoolId,
      rollNumber,
      name,
      email,
      phone,
      grade: classSection ? classSection.name : '',
      age,
      status,
      classSectionId,
      academicYearId
    });

    await student.save();

    // Auto generate Fee Records in Fees Module
    const monthStr = feeMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const feeRecordsToInsert = [];

    if (Number(schoolFee) > 0) {
      feeRecordsToInsert.push({
        schoolId,
        studentId: student._id,
        classSectionId: classSectionId || null,
        academicYearId: academicYearId || null,
        feeType: 'School Fee',
        month: monthStr,
        amount: Number(schoolFee),
        paid: 0,
        balance: Number(schoolFee),
        dueDate: parsedDueDate,
        status: parsedDueDate && parsedDueDate < new Date() ? 'Overdue' : 'Pending'
      });
    }

    if (Number(academyFee) > 0) {
      feeRecordsToInsert.push({
        schoolId,
        studentId: student._id,
        classSectionId: classSectionId || null,
        academicYearId: academicYearId || null,
        feeType: 'Academy Fee',
        month: monthStr,
        amount: Number(academyFee),
        paid: 0,
        balance: Number(academyFee),
        dueDate: parsedDueDate,
        status: parsedDueDate && parsedDueDate < new Date() ? 'Overdue' : 'Pending'
      });
    }

    if (feeRecordsToInsert.length > 0) {
      await FeeRecord.insertMany(feeRecordsToInsert);
    }

    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};