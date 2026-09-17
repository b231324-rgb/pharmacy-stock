const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  batchNumber: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'quarantined'], default: 'active', index: true },
  expiryDate: { type: Date, required: true, index: true },
  costPrice: { type: Number, min: 0 },
  sellingPrice: { type: Number, min: 0 },
  receivedDate: { type: Date, default: Date.now },
}, { timestamps: true });

batchSchema.index({ medicineId: 1, expiryDate: 1 });
module.exports = mongoose.model('Batch', batchSchema);
