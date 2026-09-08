const TimetableEntry = require('../models/TimetableEntry');
const ClassSection = require('../models/ClassSection');

// Get Timetable
exports.getTimetable = async (req, res) => {
  try {
    res.json(await TimetableEntry.find({ schoolId: req.params.schoolId })
      .populate('classSectionId', 'name')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name')
      .sort({ day: 1, startTime: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Timetable Entry
exports.createTimetableEntry = async (req, res) => {
  try {
    const { schoolId, academicYearId, classSectionId, subjectId, teacherId, day, startTime, endTime, room = '' } = req.body;
    
    const classSection = await ClassSection.findOne({ _id: classSectionId, schoolId, academicYearId });
    if (!classSection) {
      return res.status(400).json({ error: 'Selected class and academic year do not match.' });
    }
    
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }
    
    const entry = await TimetableEntry.create({
      schoolId,
      academicYearId,
      classSectionId,
      subjectId,
      teacherId,
      day,
      startTime,
      endTime,
      room
    });

    res.status(201).json(await entry.populate([
      { path: 'classSectionId', select: 'name' },
      { path: 'subjectId', select: 'name code' },
      { path: 'teacherId', select: 'name' }
    ]));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ 
      error: err.code === 11000 ? 'This class already has a timetable entry at that time.' : err.message 
    });
  }
};

// Delete Timetable Entry
exports.deleteTimetableEntry = async (req, res) => {
  try {
    const entry = await TimetableEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Timetable entry not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
