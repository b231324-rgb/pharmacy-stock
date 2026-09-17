const mongoose = require('mongoose');

const dispenseLogSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, required: true },
  lines: [{ batchId: mongoose.Schema.Types.ObjectId, batchNumber: String, quantity: Number }],
  dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('DispenseLog', dispenseLogSchema);
