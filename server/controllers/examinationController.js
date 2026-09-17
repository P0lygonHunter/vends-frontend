const Examination = require('../models/Examination');
const StudentMark = require('../models/StudentMark');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');
const Attendance = require('../models/Attendance');
const School = require('../models/School');

function calcGrade(percentage) {
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

exports.getExaminations = async (req, res) => {
  try {
    const examinations = await Examination.find({ schoolId: req.params.schoolId })
      .populate('academicYearId', 'name')
      .populate('classSectionId', 'name')
      .sort({ startDate: -1 });
    res.json(examinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExamination = async (req, res) => {
  try {
    const { schoolId, academicYearId, classSectionId, name, type, subject, startDate, endDate, maximumMarks, passMarks, status = 'Draft' } = req.body;

    const classSection = await ClassSection.findOne({ _id: classSectionId, schoolId });
    if (!classSection) {
      return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    }

    if (academicYearId && String(classSection.academicYearId) !== String(academicYearId)) {
      // allow if academicYearId not strict on class
    }

    if (new Date(startDate) > new Date(endDate || startDate)) {
      return res.status(400).json({ error: 'End date must be on or after start date.' });
    }

    if (Number(passMarks) > Number(maximumMarks)) {
      return res.status(400).json({ error: 'Pass marks cannot exceed maximum marks.' });
    }

    const examination = await Examination.create({
      schoolId,
      academicYearId: academicYearId || classSection.academicYearId || null,
      classSectionId,
      name,
      type,
      subject,
      startDate,
      endDate: endDate || startDate,
      maximumMarks,
      passMarks,
      status
    });

    res.status(201).json(await examination.populate([
      { path: 'academicYearId', select: 'name' },
      { path: 'classSectionId', select: 'name' }
    ]));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({
      error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message
    });
  }
};

exports.updateExamination = async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });

    const updates = { ...req.body };
    if (updates.name) examination.name = updates.name;
    if (updates.type) examination.type = updates.type;
    if (updates.subject) examination.subject = updates.subject;
    if (updates.startDate) examination.startDate = updates.startDate;
    if (updates.endDate) examination.endDate = updates.endDate;
    if (updates.maximumMarks !== undefined) examination.maximumMarks = updates.maximumMarks;
    if (updates.passMarks !== undefined) examination.passMarks = updates.passMarks;
    if (updates.status) examination.status = updates.status;
    if (updates.classSectionId) examination.classSectionId = updates.classSectionId;
    if (updates.academicYearId) examination.academicYearId = updates.academicYearId;

    if (Number(examination.passMarks) > Number(examination.maximumMarks)) {
      return res.status(400).json({ error: 'Pass marks cannot exceed maximum marks.' });
    }

    await examination.save();
    res.json(await examination.populate([
      { path: 'academicYearId', select: 'name' },
      { path: 'classSectionId', select: 'name' }
    ]));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteExamination = async (req, res) => {
  try {
    const examination = await Examination.findByIdAndDelete(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });
    await StudentMark.deleteMany({ examinationId: examination._id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Marks for one exam: returns students of class + existing marks
exports.getExaminationMarks = async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });

    const students = await Student.find({
      schoolId: examination.schoolId,
      classSectionId: examination.classSectionId,
      status: { $ne: 'Inactive' }
    }).select('name rollNumber').sort({ rollNumber: 1 });

    const marks = await StudentMark.find({ examinationId: examination._id });
    const markMap = {};
    marks.forEach((m) => { markMap[String(m.studentId)] = m; });

    const rows = students.map((s) => {
      const m = markMap[String(s._id)];
      return {
        studentId: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        obtainedMarks: m ? m.obtainedMarks : '',
        percentage: m ? m.percentage : null,
        grade: m ? m.grade : '',
        markId: m ? m._id : null
      };
    });

    res.json({
      examination: {
        _id: examination._id,
        name: examination.name,
        subject: examination.subject,
        maximumMarks: examination.maximumMarks,
        passMarks: examination.passMarks
      },
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Body: { marks: [{ studentId, obtainedMarks }] }
exports.saveExaminationMarks = async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });

    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'Marks array is required.' });
    }

    const saved = [];
    for (const row of marks) {
      const obtainedMarks = Number(row.obtainedMarks);
      if (!row.studentId || !Number.isFinite(obtainedMarks) || obtainedMarks < 0) continue;
      if (obtainedMarks > examination.maximumMarks) {
        return res.status(400).json({
          error: `Obtained marks cannot exceed maximum marks (${examination.maximumMarks}).`
        });
      }

      const student = await Student.findOne({
        _id: row.studentId,
        schoolId: examination.schoolId,
        classSectionId: examination.classSectionId
      });
      if (!student) continue;

      const percentage = Number(((obtainedMarks / examination.maximumMarks) * 100).toFixed(2));
      const grade = calcGrade(percentage);

      const doc = await StudentMark.findOneAndUpdate(
        { examinationId: examination._id, studentId: student._id },
        {
          schoolId: examination.schoolId,
          subjectName: examination.subject || '',
          obtainedMarks,
          maximumMarks: examination.maximumMarks,
          percentage,
          grade
        },
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(doc);
    }

    await Examination.findByIdAndUpdate(examination._id, {
      status: saved.length ? 'Marks Pending' : examination.status
    });

    res.status(201).json({ success: true, count: saved.length, marks: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Full student academic snapshot for Result Card + Reports
 * Query: rollNumber (required)
 */
exports.getStudentAcademicReport = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const rollNumber = String(req.query.rollNumber || '').trim();
    if (!rollNumber) {
      return res.status(400).json({ error: 'rollNumber is required.' });
    }

    const student = await Student.findOne({ schoolId, rollNumber })
      .populate('classSectionId', 'name')
      .populate('academicYearId', 'name');
    if (!student) {
      return res.status(404).json({ error: 'Student not found for this roll number.' });
    }

    const school = await School.findById(schoolId).select('schoolName');

    const markDocs = await StudentMark.find({ schoolId, studentId: student._id })
      .populate('examinationId', 'name type subject maximumMarks passMarks startDate classSectionId');

    const subjects = markDocs.map((m) => {
      const exam = m.examinationId || {};
      return {
        examinationId: exam._id || m.examinationId,
        examName: exam.name || '',
        examType: exam.type || '',
        subject: m.subjectName || exam.subject || '',
        maximumMarks: m.maximumMarks || exam.maximumMarks || 0,
        obtainedMarks: m.obtainedMarks,
        percentage: m.percentage,
        grade: m.grade
      };
    });

    const totalMax = subjects.reduce((s, x) => s + Number(x.maximumMarks || 0), 0);
    const totalObtained = subjects.reduce((s, x) => s + Number(x.obtainedMarks || 0), 0);
    const overallPercentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const overallGrade = calcGrade(overallPercentage);

    // Attendance ratio for this student
    const attendanceRecords = await Attendance.find({ schoolId, studentId: student._id });
    const present = attendanceRecords.filter((r) => r.status === 'P' || r.status === 'Present').length;
    const absent = attendanceRecords.filter((r) => r.status === 'A' || r.status === 'Absent').length;
    const totalDays = attendanceRecords.length;
    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : null;

    res.json({
      schoolName: school?.schoolName || '',
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        phone: student.phone,
        className: student.classSectionId?.name || student.grade || '',
        academicYear: student.academicYearId?.name || ''
      },
      subjects,
      totals: {
        totalObtained,
        totalMax,
        overallPercentage,
        overallGrade
      },
      attendance: {
        present,
        absent,
        totalDays,
        rate: attendanceRate
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
