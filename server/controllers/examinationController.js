const Examination = require('../models/Examination');
const StudentMark = require('../models/StudentMark');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');

// Get Examinations
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

// Create Examination
exports.createExamination = async (req, res) => {
  try {
    const { schoolId, academicYearId, classSectionId, name, type, startDate, endDate, maximumMarks, passMarks, status = 'Draft' } = req.body;

    const classSection = await ClassSection.findOne({ _id: classSectionId, schoolId, academicYearId });
    if (!classSection) {
      return res.status(400).json({ error: 'Selected class and academic year do not match this school.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be on or after start date.' });
    }

    if (Number(passMarks) > Number(maximumMarks)) {
      return res.status(400).json({ error: 'Pass marks cannot exceed maximum marks.' });
    }

    const examination = await Examination.create({
      schoolId,
      academicYearId,
      classSectionId,
      name,
      type,
      startDate,
      endDate,
      maximumMarks,
      passMarks,
      status
    });

    res.status(201).json(await examination.populate([{ path: 'academicYearId', select: 'name' }, { path: 'classSectionId', select: 'name' }]));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message });
  }
};

// Update Examination
exports.updateExamination = async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });

    if (req.body.classSectionId || req.body.academicYearId) {
      const classSection = await ClassSection.findOne({
        _id: req.body.classSectionId || examination.classSectionId,
        schoolId: examination.schoolId,
        academicYearId: req.body.academicYearId || examination.academicYearId
      });
      if (!classSection) return res.status(400).json({ error: 'Selected class and academic year do not match.' });
    }

    const updated = await Examination.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate([{ path: 'academicYearId', select: 'name' }, { path: 'classSectionId', select: 'name' }]);

    res.json(updated);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message });
  }
};

// Delete Examination
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

// Get Marks for Examination
exports.getExaminationMarks = async (req, res) => {
  try {
    res.json(await StudentMark.find({ examinationId: req.params.id })
      .populate('studentId', 'name')
      .populate('subjectId', 'name code'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save Marks for Examination
exports.saveExaminationMarks = async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });

    const { subjectId, marks } = req.body;

    const saved = [];
    for (const mark of marks || []) {
      const student = await Student.findOne({
        _id: mark.studentId,
        schoolId: examination.schoolId,
        classSectionId: examination.classSectionId
      });

      if (!student) {
        return res.status(400).json({ error: 'One or more students do not belong to this examination class.' });
      }

      const obtainedMarks = Number(mark.obtainedMarks);
      if (obtainedMarks < 0 || obtainedMarks > examination.maximumMarks) {
        return res.status(400).json({ error: 'Obtained marks must be within the maximum marks.' });
      }

      const percentage = Number(((obtainedMarks / examination.maximumMarks) * 100).toFixed(2));
      const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 33 ? 'D' : 'F';

      saved.push(await StudentMark.findOneAndUpdate(
        { examinationId: examination._id, studentId: student._id, subjectId },
        { schoolId: examination.schoolId, obtainedMarks, percentage, grade },
        { upsert: true, new: true, runValidators: true }
      ));
    }

    await Examination.findByIdAndUpdate(examination._id, { status: saved.length ? 'Marks Pending' : examination.status });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
