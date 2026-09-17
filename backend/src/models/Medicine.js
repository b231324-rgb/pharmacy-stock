const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, required: true, trim: true, index: true },
  manufacturer: { type: String, required: true, trim: true, index: true },
  unit: { type: String, required: true, trim: true },
  reorderLevel: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
