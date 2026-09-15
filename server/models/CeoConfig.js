const mongoose = require('mongoose');

const CeoConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'ceo' },
  email: { type: String, default: '' },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.CeoConfig || mongoose.model('CeoConfig', CeoConfigSchema);
