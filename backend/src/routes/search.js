const express = require('express');
const Medicine = require('../models/Medicine');
const { requireAuth } = require('../middleware/auth');
const { pagination, pagedResult } = require('../utils');

const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const q = req.query.q || '';
    const filter = { $or: [{ name: new RegExp(q, 'i') }, { genericName: new RegExp(q, 'i') }, { manufacturer: new RegExp(q, 'i') }] };
    const [items, total] = await Promise.all([Medicine.find(filter).sort({ name: 1 }).skip(skip).limit(limit), Medicine.countDocuments(filter)]);
    return res.json(pagedResult(items, total, page, limit));
  } catch (error) { return next(error); }
});
module.exports = router;
