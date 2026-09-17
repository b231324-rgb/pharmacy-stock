const express = require('express');
const { getNow, setClock, advanceClock } = require('../services/clockService');
const { runExpiryJob } = require('../services/quarantineService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    if (req.body.setTo !== undefined) setClock(req.body.setTo);
    else if (req.body.advanceDays !== undefined) advanceClock(req.body.advanceDays);
    else throw Object.assign(new Error('body must include setTo or advanceDays'), { statusCode: 400 });
    const report = req.body.runJob ? await runExpiryJob() : null;
    return res.json(report ? { ...report } : { now: getNow().toISOString() });
  } catch (error) { return next(error); }
});

router.post('/tick', async (_req, res, next) => {
  try { return res.json(await runExpiryJob()); } catch (error) { return next(error); }
});

module.exports = router;
