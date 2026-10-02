const mongoose = require('mongoose');

/**
 * One-way CEO → school notices (V-Service).
 * Schools can list/read; they cannot reply on this channel.
 */
const VServiceMessageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    /** null = all active schools */
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null, index: true },
    createdBy: { type: String, default: 'ceo' },
    /** schoolIds that have read (for single-target or tracked reads) */
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }],
  },
  { timestamps: true }
);

VServiceMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VServiceMessage', VServiceMessageSchema);
