const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');

// Get Attendance Stats
exports.getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [students, records] = await Promise.all([
      Student.find({ schoolId: req.params.schoolId }),
      Attendance.find({ schoolId: req.params.schoolId, date: today })
    ]);

    const onLeaveStudentIds = new Set(
      students.filter(student => student.status === 'On Leave').map(student => student._id.toString())
    );

    const eligibleRecords = records.filter(record => !onLeaveStudentIds.has(record.studentId.toString()));

    const present = eligibleRecords.filter(r => r.status === 'P').length;
    const absent = eligibleRecords.filter(r => r.status === 'A').length;
    const onLeave = students.filter(student => student.status === 'On Leave').length;
    const total = students.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({ present, absent, onLeave, total, rate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Attendance
exports.createAttendance = async (req, res) => {
  try {
    const { schoolId, date, records } = req.body;

    const classSection = req.body.classSectionId
      ? await ClassSection.findOne({ _id: req.body.classSectionId, schoolId })
      : null;
    
    if (req.body.classSectionId && !classSection) {
      return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    }

    const studentIds = records.map(record => record.studentId);
    const students = await Student.find({ _id: { $in: studentIds }, schoolId }).select('_id');
    if (students.length !== studentIds.length) {
      return res.status(400).json({ error: 'Attendance contains a student outside this school.' });
    }

    await Attendance.deleteMany({
      schoolId,
      date,
      ...(req.body.classSectionId ? { classSectionId: req.body.classSectionId } : {})
    });

    const attendance = await Attendance.insertMany(
      records.map(r => ({
        schoolId,
        date,
        studentId: r.studentId,
        academicYearId: r.academicYearId || classSection?.academicYearId || null,
        classSectionId: r.classSectionId || req.body.classSectionId || null,
        studentName: r.studentName,
        grade: r.grade,
        status: r.status
      }))
    );

    res.status(201).json({ message: "Attendance saved!", attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Attendance by Date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      schoolId: req.params.schoolId,
      date: req.params.date,
      ...(req.query.classSectionId ? { classSectionId: req.query.classSectionId } : {})
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
