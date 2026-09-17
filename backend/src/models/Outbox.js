const mongoose = require('mongoose');

const outboxSchema = new mongoose.Schema({
  type: { type: String, required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'sent'], default: 'pending' },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Outbox', outboxSchema);
