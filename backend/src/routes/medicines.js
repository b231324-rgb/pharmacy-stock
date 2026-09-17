const express = require('express');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const DispenseLog = require('../models/DispenseLog');
const Outbox = require('../models/Outbox');
const { requireAuth } = require('../middleware/auth');
const { getDispensePlan, getSellableStock } = require('../services/stockService');
const { getNow } = require('../services/clockService');
const { normalizeBatchRow, importKey } = require('../services/batchImportService');
const { pagination, pagedResult } = require('../utils');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const now = getNow();
    const { page, limit, skip } = pagination(req.query);
    const filter = req.query.q ? { $or: [
      { name: new RegExp(req.query.q, 'i') },
      { genericName: new RegExp(req.query.q, 'i') },
    ] } : {};
    const sortMap = { name: 'name', genericName: 'genericName', manufacturer: 'manufacturer', createdAt: 'createdAt' };
    const sortField = sortMap[req.query.sort] || 'name';
    const direction = req.query.order === 'desc' ? -1 : 1;
    if (req.query.sort === 'stock' || req.query.sort === 'expiry') {
      const sortKey = req.query.sort === 'stock' ? 'inDateStock' : 'soonestExpiry';
      const pipeline = [
        { $match: filter },
        { $lookup: { from: 'batches', localField: '_id', foreignField: 'medicineId', as: 'batches' } },
        { $addFields: {
          inDateStock: { $sum: { $map: { input: { $filter: { input: '$batches', as: 'batch', cond: { $and: [{ $eq: ['$$batch.status', 'active'] }, { $gt: ['$$batch.expiryDate', now] }, { $gt: ['$$batch.quantity', 0] }] } } }, as: 'batch', in: '$$batch.quantity' } } },
          soonestExpiry: { $min: { $map: { input: { $filter: { input: '$batches', as: 'batch', cond: { $and: [{ $eq: ['$$batch.status', 'active'] }, { $gt: ['$$batch.expiryDate', now] }, { $gt: ['$$batch.quantity', 0] }] } } }, as: 'batch', in: '$$batch.expiryDate' } } },
        } },
        { $sort: { [sortKey]: direction } }, { $skip: skip }, { $limit: limit },
        { $project: { batches: 0 } },
      ];
      const [items, total] = await Promise.all([Medicine.aggregate(pipeline), Medicine.countDocuments(filter)]);
      return res.json(pagedResult(items, total, page, limit));
    }
    const [items, total] = await Promise.all([
      Medicine.find(filter).sort({ [sortField]: direction }).skip(skip).limit(limit).lean(),
      Medicine.countDocuments(filter),
    ]);
    const withStock = await Promise.all(items.map(async (medicine) => ({
      ...medicine,
      inDateStock: getSellableStock(await Batch.find({ medicineId: medicine._id }).lean()),
      soonestExpiry: (await Batch.findOne({ medicineId: medicine._id, status: 'active', expiryDate: { $gt: now }, quantity: { $gt: 0 } }).sort({ expiryDate: 1 }).lean())?.expiryDate || null,
    })));
    return res.json(pagedResult(withStock, total, page, limit));
  } catch (error) { return next(error); }
});

router.post('/', async (req, res, next) => {
  try { return res.status(201).json(await Medicine.create(req.body)); } catch (error) { return next(error); }
});

router.get('/:id', async (req, res, next) => {
  try { const medicine = await Medicine.findById(req.params.id); if (!medicine) return res.status(404).json({ error: 'medicine not found' }); return res.json(medicine); } catch (error) { return next(error); }
});

router.put('/:id', async (req, res, next) => {
  try { const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!medicine) return res.status(404).json({ error: 'medicine not found' }); return res.json(medicine); } catch (error) { return next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try { const medicine = await Medicine.findByIdAndDelete(req.params.id); if (!medicine) return res.status(404).json({ error: 'medicine not found' }); await Batch.deleteMany({ medicineId: req.params.id }); return res.status(204).end(); } catch (error) { return next(error); }
});

router.get('/:id/batches', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const direction = req.query.order === 'desc' ? -1 : 1;
    const sortField = ['expiryDate', 'quantity', 'receivedDate', 'batchNumber'].includes(req.query.sort) ? req.query.sort : 'expiryDate';
    const [items, total] = await Promise.all([
      Batch.find({ medicineId: req.params.id }).sort({ [sortField]: direction }).skip(skip).limit(limit),
      Batch.countDocuments({ medicineId: req.params.id }),
    ]);
    return res.json(pagedResult(items, total, page, limit));
  } catch (error) { return next(error); }
});

router.post('/:id/batches', async (req, res, next) => {
  try { return res.status(201).json(await Batch.create({ ...req.body, medicineId: req.params.id })); } catch (error) { return next(error); }
});

router.post('/:id/batches/import', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be an array of batch rows' });
    const existing = await Batch.find({ medicineId: req.params.id }).lean();
    const seen = new Set(existing.map((row) => importKey({ batchNumber: row.batchNumber, expiryDate: row.expiryDate, quantity: row.quantity })));
    const rejected = [];
    const documents = [];
    let deduped = 0;
    for (const row of req.body) {
      const normalized = normalizeBatchRow(row);
      if (normalized.error) { rejected.push({ row, reason: normalized.error }); continue; }
      const key = importKey(normalized.value);
      if (seen.has(key)) { deduped += 1; continue; }
      seen.add(key);
      documents.push({ ...normalized.value, medicineId: req.params.id });
    }
    if (documents.length) await Batch.insertMany(documents);
    return res.json({ imported: documents.length, deduped, rejected });
  } catch (error) { return next(error); }
});

router.get('/:id/stock', async (req, res, next) => {
  try { const batches = await Batch.find({ medicineId: req.params.id }).lean(); const quantity = getSellableStock(batches); return res.json({ medicineId: req.params.id, quantity, inDate: quantity > 0 }); } catch (error) { return next(error); }
});

router.post('/:id/dispense', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let response;
    await session.withTransaction(async () => {
      const now = getNow();
      const medicine = await Medicine.findById(req.params.id).session(session).lean();
      if (!medicine) throw Object.assign(new Error('medicine not found'), { statusCode: 404 });
      const batches = await Batch.find({ medicineId: req.params.id }).session(session).lean();
      const beforeStock = getSellableStock(batches, now);
      const plan = getDispensePlan(batches, req.body.quantity, now);
      for (const line of plan) {
        const updated = await Batch.findOneAndUpdate(
          { _id: line.batchId, status: 'active', quantity: { $gte: line.quantity } },
          { $inc: { quantity: -line.quantity } },
          { new: true, session },
        );
        if (!updated) throw Object.assign(new Error('stock changed during dispense; please retry'), { statusCode: 409 });
      }
      const afterBatches = await Batch.find({ medicineId: req.params.id }).session(session).lean();
      const afterStock = getSellableStock(afterBatches, now);
      if (medicine.reorderLevel > 0 && beforeStock >= medicine.reorderLevel && afterStock < medicine.reorderLevel) {
        await Outbox.create([{
          type: 'REORDER_ALERT',
          medicineId: medicine._id,
          payload: { medicineName: medicine.name, currentStock: afterStock, reorderLevel: medicine.reorderLevel },
          status: 'sent',
        }], { session });
      }
      const log = await DispenseLog.create([{ medicineId: req.params.id, quantity: req.body.quantity, lines: plan, dispensedBy: req.user.id }], { session });
      response = { quantity: req.body.quantity, lines: plan, dispenseLogId: log[0]._id };
    });
    return res.json(response);
  } catch (error) { return next(error); } finally { await session.endSession(); }
});

module.exports = router;
