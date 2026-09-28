const Student = require('../models/Student');
const School = require('../models/School');
const ClassSection = require('../models/ClassSection');
const FeeRecord = require('../models/FeeRecord');
const Parent = require('../models/Parent');

function normalizePhone(phone) {
  return String(phone || '').trim();
}

async function linkStudentToParentByPhone(schoolId, studentId, phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const parent = await Parent.findOne({ schoolId, phone: normalized });
  if (!parent) return null;
  if (!parent.studentIds.some((id) => String(id) === String(studentId))) {
    parent.studentIds.push(studentId);
    await parent.save();
  }
  return parent;
}

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({ schoolId: req.params.schoolId }).populate('classSectionId');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findByPhone = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });
    const students = await Student.find({ schoolId, phone }).populate('classSectionId', 'name');
    const parent = await Parent.findOne({ schoolId, phone }).select('name phone studentIds');
    res.json({ students, parent: parent || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changeFamilyPhone = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const oldPhone = normalizePhone(req.body.oldPhone);
    const newPhone = normalizePhone(req.body.newPhone);
    if (!oldPhone || !newPhone) return res.status(400).json({ error: 'Both old and new phone numbers are required.' });
    if (oldPhone === newPhone) return res.status(400).json({ error: 'New phone must be different from the old one.' });

    const conflictParent = await Parent.findOne({ schoolId, phone: newPhone });
    const existingParent = await Parent.findOne({ schoolId, phone: oldPhone });
    if (conflictParent && (!existingParent || String(conflictParent._id) !== String(existingParent._id))) {
      return res.status(409).json({ error: 'Another parent account already uses the new phone number at this school.' });
    }

    const studentResult = await Student.updateMany({ schoolId, phone: oldPhone }, { $set: { phone: newPhone } });
    let parentUpdated = false;
    if (existingParent) {
      existingParent.phone = newPhone;
      await existingParent.save();
      parentUpdated = true;
    }
    const students = await Student.find({ schoolId, phone: newPhone }).populate('classSectionId', 'name');
    res.json({ message: 'Family phone updated.', studentsUpdated: studentResult.modifiedCount, parentUpdated, students });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Phone number conflict with an existing parent account.' });
    res.status(500).json({ error: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { schoolId, rollNumber, name, email, phone, age, status, classSectionId, academicYearId, schoolFee, academyFee, feeMonth, dueDate } = req.body;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found!' });

    const studentCount = await Student.countDocuments({ schoolId });
    if (studentCount >= school.studentLimit) {
      return res.status(403).json({
        error: `Student limit reached (${school.studentLimit}). Upgrade your plan on the Subscription page to add more students.`,
        code: 'STUDENT_LIMIT', limit: school.studentLimit, current: studentCount,
      });
    }

    let classSection = null;
    if (classSectionId) {
      classSection = await ClassSection.findOne({ _id: classSectionId, schoolId });
      if (!classSection) return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    }

    const student = new Student({
      schoolId, rollNumber, name, email, phone: normalizePhone(phone),
      grade: classSection ? classSection.name : '', age, status,
      classSectionId: classSectionId || null, academicYearId: academicYearId || null,
    });
    await student.save();
    await linkStudentToParentByPhone(schoolId, student._id, student.phone);

    const monthStr = feeMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const feeRecordsToInsert = [];
    if (Number(schoolFee) > 0) {
      feeRecordsToInsert.push({
        schoolId, studentId: student._id, classSectionId: classSectionId || null, academicYearId: academicYearId || null,
        feeType: 'School Fee', month: monthStr, amount: Number(schoolFee), paid: 0, balance: Number(schoolFee),
        dueDate: parsedDueDate, status: parsedDueDate && parsedDueDate < new Date() ? 'Overdue' : 'Pending',
      });
    }
    if (Number(academyFee) > 0) {
      feeRecordsToInsert.push({
        schoolId, studentId: student._id, classSectionId: classSectionId || null, academicYearId: academicYearId || null,
        feeType: 'Academy Fee', month: monthStr, amount: Number(academyFee), paid: 0, balance: Number(academyFee),
        dueDate: parsedDueDate, status: parsedDueDate && parsedDueDate < new Date() ? 'Overdue' : 'Pending',
      });
    }
    if (feeRecordsToInsert.length > 0) await FeeRecord.insertMany(feeRecordsToInsert);
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const updates = { ...req.body };
    if ('classSectionId' in updates && !updates.classSectionId) updates.classSectionId = null;
    if ('academicYearId' in updates && !updates.academicYearId) updates.academicYearId = null;
    if ('phone' in updates) updates.phone = normalizePhone(updates.phone);
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    if (student.phone) await linkStudentToParentByPhone(student.schoolId, student._id, student.phone);
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
