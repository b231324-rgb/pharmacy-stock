const {
  StockError,
  getSellableStock,
  getDispensePlan,
  applyDispensePlan,
  getExpiringSoon,
} = require('../src/services/stockService');

const now = new Date('2026-01-01T00:00:00.000Z');
const batches = [
  { _id: 'late', batchNumber: 'LATE', quantity: 10, expiryDate: '2026-06-01T00:00:00.000Z' },
  { _id: 'soon', batchNumber: 'SOON', quantity: 3, expiryDate: '2026-02-01T00:00:00.000Z' },
  { _id: 'expired', batchNumber: 'EXPIRED', quantity: 99, expiryDate: '2025-12-31T00:00:00.000Z' },
];

test('orders dispense plan by soonest expiry first', () => {
  expect(getDispensePlan(batches, 4, now)).toEqual([
    { batchId: 'soon', batchNumber: 'SOON', quantity: 3 },
    { batchId: 'late', batchNumber: 'LATE', quantity: 1 },
  ]);
});

test('deducts across multiple batches without touching expired stock', () => {
  const plan = getDispensePlan(batches, 4, now);
  expect(applyDispensePlan(batches, plan)).toEqual([
    { ...batches[0], quantity: 9 },
    { ...batches[1], quantity: 0 },
    batches[2],
  ]);
});

test('rejects the entire request when in-date stock is insufficient', () => {
  expect(() => getDispensePlan(batches, 14, now)).toThrow(new StockError('insufficient in-date stock: only 13 available', 409));
});

test('excludes expired quantities from sellable stock', () => {
  expect(getSellableStock(batches, now)).toBe(13);
});

test('includes the exact expiring-soon boundary and excludes the next day', () => {
  const boundary = { _id: 'boundary', quantity: 1, expiryDate: '2026-01-31T00:00:00.000Z' };
  const outside = { _id: 'outside', quantity: 1, expiryDate: '2026-02-01T00:00:00.001Z' };
  expect(getExpiringSoon([boundary, outside], 30, now).map((batch) => batch._id)).toEqual(['boundary']);
});
