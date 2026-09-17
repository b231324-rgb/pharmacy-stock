const Batch = require('../models/Batch');
const { getNow } = require('./clockService');

async function runExpiryJob(now = getNow()) {
  const expired = await Batch.find({ status: 'active', expiryDate: { $lte: now } }).select('_id').lean();
  if (expired.length) {
    await Batch.updateMany(
      { _id: { $in: expired.map((batch) => batch._id) }, status: 'active' },
      { $set: { status: 'quarantined' } },
    );
  }
  const expiringSoonCount = await Batch.countDocuments({
    status: 'active',
    quantity: { $gt: 0 },
    expiryDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 86400000) },
  });
  return {
    expiringSoonCount,
    quarantinedCount: expired.length,
    quarantinedBatchIds: expired.map((batch) => batch._id.toString()),
  };
}

module.exports = { runExpiryJob };
