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

    const subjects = String(subject || '')
      .split(/[,،|/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!subjects.length) {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    if (subjects.length === 1) {
      const examination = await Examination.create({
        schoolId,
        academicYearId: academicYearId || classSection.academicYearId || null,
        classSectionId,
        name,
        type,
        subject: subjects[0],
        startDate,
        endDate: endDate || startDate,
        maximumMarks,
        passMarks,
        status
      });
      return res.status(201).json(await examination.populate([
        { path: 'academicYearId', select: 'name' },
        { path: 'classSectionId', select: 'name' }
      ]));
    }

    const created = [];
    const skipped = [];
    const failed = [];
    for (const sub of subjects) {
      try {
        const examination = await Examination.create({
          schoolId,
          academicYearId: academicYearId || classSection.academicYearId || null,
          classSectionId,
          name,
          type,
          subject: sub,
          startDate,
          endDate: endDate || startDate,
          maximumMarks,
          passMarks,
          status
        });
        created.push(await examination.populate([
          { path: 'academicYearId', select: 'name' },
          { path: 'classSectionId', select: 'name' }
        ]));
      } catch (e) {
        if (e.code === 11000) skipped.push(sub);
        else failed.push(`${sub}: ${e.message}`);
      }
    }
    return res.status(201).json({
      multi: true,
      created,
      skipped,
      failed,
      message: `Created ${created.length}, skipped ${skipped.length}${failed.length ? ', failed ' + failed.length : ''}.`
    });
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({
      error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message
    });
  }
};


function matchClassSection(classes, className) {
  const n = String(className || '').trim().toLowerCase();
  if (!n) return null;
  let hit = classes.find((c) => String(c.name || '').trim().toLowerCase() === n);
  if (hit) return hit;
  hit = classes.find((c) => {
    const cn = String(c.name || '').trim().toLowerCase();
    return cn.includes(n) || n.includes(cn);
  });
  return hit || null;
}

/** Bulk create exam subject rows from Date Sheet (one row per subject). */
exports.createFromDateSheet = async (req, res) => {
  try {
    const schoolId = req.body.schoolId || req.schoolId;
    const examSeries = String(req.body.examSeries || req.body.name || 'Exam').trim() || 'Exam';
    const type = String(req.body.type || 'Term').trim() || 'Term';
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!schoolId) return res.status(400).json({ error: 'schoolId required.' });
    if (!rows.length) return res.status(400).json({ error: 'No date sheet rows.' });

    const classes = await ClassSection.find({ schoolId, status: { $ne: 'Inactive' } });
    const created = [];
    const skipped = [];
    const failed = [];
    const unmatchedClasses = new Set();

    for (const row of rows) {
      const subject = String(row.subject || '').trim();
      const className = String(row.className || row.class || '').trim();
      const date = row.date || row.startDate;
      if (!subject || !date) {
        failed.push({ subject: subject || '?', error: 'subject and date required' });
        continue;
      }
      // Never store multi-subject in one field
      if (/[,،|/]/.test(subject)) {
        failed.push({ subject, error: 'One subject per row (no commas)' });
        continue;
      }
      const cls = matchClassSection(classes, className);
      if (!cls) {
        unmatchedClasses.add(className || '(empty)');
        failed.push({ subject, error: `Class not found: ${className || '—'}. Create this class in Classes module first.` });
        continue;
      }
      const maximumMarks = Math.max(1, Number(row.marks || row.maximumMarks || 100) || 100);
      const passMarks = Math.min(maximumMarks, Math.max(0, Number(row.passMarks != null ? row.passMarks : Math.round(maximumMarks * 0.33))));
      const startDate = new Date(date);
      const endDate = row.endDate || row.resultDate ? new Date(row.endDate || row.resultDate) : startDate;
      try {
        const examination = await Examination.create({
          schoolId,
          academicYearId: cls.academicYearId,
          classSectionId: cls._id,
          name: examSeries,
          type,
          subject,
          startDate,
          endDate,
          maximumMarks,
          passMarks,
          status: 'Marks Pending'
        });
        const populated = await examination.populate([
          { path: 'academicYearId', select: 'name' },
          { path: 'classSectionId', select: 'name' }
        ]);
        created.push(populated);
      } catch (err) {
        if (err.code === 11000) {
          skipped.push({ subject, className: cls.name });
        } else {
          failed.push({ subject, error: err.message });
        }
      }
    }

    res.status(201).json({
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
      createdRows: created,
      skippedRows: skipped,
      failedRows: failed,
      unmatchedClasses: [...unmatchedClasses],
      message:
        created.length || skipped.length
          ? `Exams synced: ${created.length} new, ${skipped.length} already listed.`
          : failed[0]?.error || 'No exams created.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
