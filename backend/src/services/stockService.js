class StockError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'StockError';
    this.statusCode = statusCode;
  }
}

function isInDate(batch, now) {
  return new Date(batch.expiryDate).getTime() > now.getTime();
}

function getSellableStock(batches, now = new Date()) {
  return batches
    .filter((batch) => isInDate(batch, now))
    .reduce((total, batch) => total + Math.max(0, Number(batch.quantity) || 0), 0);
}

function getDispensePlan(batches, quantityRequested, now = new Date()) {
  const requested = Number(quantityRequested);
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new StockError('quantity must be a positive whole number');
  }

  const eligible = batches
    .filter((batch) => isInDate(batch, now) && batch.quantity > 0)
    .sort((first, second) => new Date(first.expiryDate) - new Date(second.expiryDate));
  const available = getSellableStock(batches, now);

  if (available < requested) {
    throw new StockError(`insufficient in-date stock: only ${available} available`, 409);
  }

  let remaining = requested;
  const plan = [];
  for (const batch of eligible) {
    if (remaining === 0) break;
    const taken = Math.min(Number(batch.quantity), remaining);
    plan.push({ batchId: batch._id || batch.id, batchNumber: batch.batchNumber, quantity: taken });
    remaining -= taken;
  }
  return plan;
}

function applyDispensePlan(batches, plan) {
  const deductions = new Map(plan.map((item) => [String(item.batchId), item.quantity]));
  return batches.map((batch) => ({
    ...batch,
    quantity: Number(batch.quantity) - (deductions.get(String(batch._id || batch.id)) || 0),
  }));
}

function getExpiringSoon(batches, days = 30, now = new Date()) {
  const cutoff = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  return batches
    .filter((batch) => batch.quantity > 0 && isInDate(batch, now) && new Date(batch.expiryDate) <= cutoff)
    .sort((first, second) => new Date(first.expiryDate) - new Date(second.expiryDate));
}

function getExpiredWithStock(batches, now = new Date()) {
  return batches
    .filter((batch) => batch.quantity > 0 && !isInDate(batch, now))
    .sort((first, second) => new Date(first.expiryDate) - new Date(second.expiryDate));
}

module.exports = {
  StockError,
  isInDate,
  getSellableStock,
  getDispensePlan,
  applyDispensePlan,
  getExpiringSoon,
  getExpiredWithStock,
};
