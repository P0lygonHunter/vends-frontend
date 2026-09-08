const StudentDocument = require('../models/StudentDocument');
const Student = require('../models/Student');

// Get Documents
exports.getDocumentList = async (req, res) => {
  try {
    res.json(await StudentDocument.find({ schoolId: req.params.schoolId })
      .populate('studentId', 'name')
      .sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Document File
exports.getDocumentFile = async (req, res) => {
  try {
    const document = await StudentDocument.findById(req.params.id).select('+fileData');
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    res.json({
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileData: document.fileData
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Upload Document
exports.uploadDocument = async (req, res) => {
  try {
    const { schoolId, studentId, name, category, fileUrl = '', fileName = '', size = 0, mimeType = '', fileData = '' } = req.body;
    
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!(await Student.findOne({ _id: studentId, schoolId }))) {
      return res.status(400).json({ error: 'Selected student does not belong to this school.' });
    }

    if (Number(size) > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Document must be 10MB or smaller.' });
    }

    if (mimeType && !allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'This file type is not supported.' });
    }

    const document = await StudentDocument.create({
      schoolId,
      studentId,
      name,
      category,
      fileUrl,
      fileName,
      size,
      mimeType,
      fileData
    });

    res.status(201).json(await document.populate('studentId', 'name'));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Document
exports.deleteDocument = async (req, res) => {
  try {
    const document = await StudentDocument.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
