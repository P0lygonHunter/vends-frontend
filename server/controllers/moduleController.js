const ModuleRecord = require('../models/ModuleRecord');

// Get Module Records
exports.getModuleRecords = async (req, res) => {
  try {
    const records = await ModuleRecord.find({ schoolId: req.params.schoolId, module: req.params.module })
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Module Record
exports.createModuleRecord = async (req, res) => {
  try {
    const { schoolId, module, data } = req.body;
    if (!schoolId || !module || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'schoolId, module and data are required.' });
    }
    const record = await ModuleRecord.create({ schoolId, module, data });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update Module Record
exports.updateModuleRecord = async (req, res) => {
  try {
    const record = await ModuleRecord.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.body.schoolId },
      { data: req.body.data },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Module Record
exports.deleteModuleRecord = async (req, res) => {
  try {
    const record = await ModuleRecord.findOneAndDelete({ _id: req.params.id, schoolId: req.query.schoolId });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
