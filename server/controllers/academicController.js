const AcademicYear = require('../models/AcademicYear');
const ClassSection = require('../models/ClassSection');
const Subject = require('../models/Subject');
const School = require('../models/School');

// ===== ACADEMIC YEARS =====
exports.getAcademicYears = async (req, res) => {
  try {
    let years = await AcademicYear.find({ schoolId: req.params.schoolId }).sort({ startDate: -1 });
    if (!years.some(year => year.isCurrent)) {
      const activeYears = years.filter(year => year.status === 'Active');
      if (activeYears.length === 1) {
        activeYears[0].isCurrent = true;
        await activeYears[0].save();
        years = await AcademicYear.find({ schoolId: req.params.schoolId }).sort({ startDate: -1 });
      }
    }
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAcademicYear = async (req, res) => {
  try {
    const { schoolId, name, startDate, endDate, status = 'Active', isCurrent = false } = req.body;
    if (!schoolId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'schoolId, name, startDate and endDate are required.' });
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    if (isCurrent) await AcademicYear.updateMany({ schoolId }, { isCurrent: false });
    const year = await AcademicYear.create({ schoolId, name, startDate, endDate, status, isCurrent });
    res.status(201).json(year);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This academic year already exists.' : err.message });
  }
};

exports.updateAcademicYear = async (req, res) => {
  try {
    const current = await AcademicYear.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Academic year not found.' });
    if (req.body.startDate && req.body.endDate && new Date(req.body.startDate) >= new Date(req.body.endDate)) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }
    if (req.body.isCurrent) {
      await AcademicYear.updateMany({ schoolId: current.schoolId, _id: { $ne: current._id } }, { isCurrent: false });
    }
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(year);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This academic year already exists.' : err.message });
  }
};

exports.deleteAcademicYear = async (req, res) => {
  try {
    const classCount = await ClassSection.countDocuments({ academicYearId: req.params.id });
    if (classCount) {
      return res.status(409).json({ error: 'This academic year has classes. Deactivate it instead of deleting it.' });
    }
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) return res.status(404).json({ error: 'Academic year not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ===== CLASSES =====
exports.getClasses = async (req, res) => {
  try {
    const classes = await ClassSection.find({ schoolId: req.params.schoolId })
      .populate('academicYearId', 'name')
      .sort({ name: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { schoolId, academicYearId, name, room = '', capacity = 40, status = 'Active' } = req.body;
    const year = await AcademicYear.findOne({ _id: academicYearId, schoolId });
    if (!year) return res.status(400).json({ error: 'Select a valid academic year for this school.' });
    const classSection = await ClassSection.create({ schoolId, academicYearId, name, room, capacity, status });
    res.status(201).json(await classSection.populate('academicYearId', 'name'));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This class already exists in the academic year.' : err.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const current = await ClassSection.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Class section not found.' });
    if (req.body.academicYearId) {
      const year = await AcademicYear.findOne({ _id: req.body.academicYearId, schoolId: current.schoolId });
      if (!year) return res.status(400).json({ error: 'Select a valid academic year for this school.' });
    }
    const classSection = await ClassSection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('academicYearId', 'name');
    res.json(classSection);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This class already exists in the academic year.' : err.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const classSection = await ClassSection.findByIdAndDelete(req.params.id);
    if (!classSection) return res.status(404).json({ error: 'Class section not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ===== SUBJECTS =====
exports.getSubjects = async (req, res) => {
  try {
    res.json(await Subject.find({ schoolId: req.params.schoolId }).sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { schoolId, name, code, description = '', status = 'Active' } = req.body;
    if (!schoolId || !name || !code) {
      return res.status(400).json({ error: 'schoolId, name and code are required.' });
    }
    const subject = await Subject.create({ schoolId, name, code, description, status });
    res.status(201).json(subject);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This subject code already exists.' : err.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    res.json(subject);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This subject code already exists.' : err.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
