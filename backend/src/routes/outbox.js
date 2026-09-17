const express = require('express');
const Outbox = require('../models/Outbox');
const { requireAuth } = require('../middleware/auth');
const { pagination, pagedResult } = require('../utils');

const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const [items, total] = await Promise.all([
      Outbox.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('medicineId', 'name'),
      Outbox.countDocuments(),
    ]);
    return res.json(pagedResult(items, total, page, limit));
  } catch (error) { return next(error); }
});
module.exports = router;
