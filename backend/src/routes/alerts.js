const express = require('express');
const Batch = require('../models/Batch');
const { requireAuth } = require('../middleware/auth');
const { pagination, pagedResult } = require('../utils');
const { getNow } = require('../services/clockService');

const router = express.Router();
router.use(requireAuth);

async function listAlerts(req, res, mode) {
  const { page, limit, skip } = pagination(req.query);
  const now = getNow();
  const filter = mode === 'expired'
    ? { expiryDate: { $lte: now }, quantity: { $gt: 0 } }
    : { status: 'active', expiryDate: { $gt: now, $lte: new Date(now.getTime() + (Number(req.query.days) || 30) * 86400000) }, quantity: { $gt: 0 } };
  const [items, total] = await Promise.all([
    Batch.find(filter).populate('medicineId', 'name genericName unit').sort({ expiryDate: 1 }).skip(skip).limit(limit),
    Batch.countDocuments(filter),
  ]);
  return res.json(pagedResult(items, total, page, limit));
}

router.get('/expiring', async (req, res, next) => { try { return await listAlerts(req, res, 'expiring'); } catch (error) { return next(error); } });
router.get('/expired', async (req, res, next) => { try { return await listAlerts(req, res, 'expired'); } catch (error) { return next(error); } });
module.exports = router;
