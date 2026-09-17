const { parseQuantity, parseDate, normalizeBatchRow, importKey } = require('../src/services/batchImportService');

test.each([
  [10, 10], ['10', 10], ['10 units', 10], ['10 pcs', 10],
])('parses quantity %p as %p', (input, expected) => expect(parseQuantity(input)).toBe(expected));

test('rejects null or malformed quantities', () => {
  expect(parseQuantity(null)).toBeNull();
  expect(parseQuantity('ten units')).toBeNull();
  expect(normalizeBatchRow({ batchNumber: 'A', quantity: null, expiryDate: '2027-01-01' }).error).toMatch(/quantity/);
});

test('accepts dd/mm/yyyy and ISO dates and rejects invalid dates', () => {
  expect(parseDate('31/12/2027').toISOString()).toBe('2027-12-31T00:00:00.000Z');
  expect(parseDate('2027-12-31').toISOString()).toBe('2027-12-31T00:00:00.000Z');
  expect(parseDate('31/02/2027')).toBeNull();
});

test('rejects missing required fields with a reason', () => {
  expect(normalizeBatchRow({ quantity: 2, expiryDate: '2027-01-01' }).error).toMatch(/batchNumber/);
  expect(normalizeBatchRow({ batchNumber: 'A', quantity: 2 }).error).toMatch(/expiryDate/);
});

test('uses stable duplicate keys', () => {
  const first = normalizeBatchRow({ batchNumber: ' A ', quantity: '10 pcs', expiryDate: '31/12/2027' }).value;
  expect(importKey(first)).toBe('batch:A');
  expect(importKey({ quantity: 10, expiryDate: new Date('2027-12-31') })).toBe('fallback:2027-12-31T00:00:00.000Z:10');
});
