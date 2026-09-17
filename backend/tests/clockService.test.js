const { getNow, setClock, advanceClock, resetClock } = require('../src/services/clockService');

afterEach(() => resetClock());

test('supports setting and advancing simulated time', () => {
  expect(setClock('2027-01-01T00:00:00.000Z').toISOString()).toBe('2027-01-01T00:00:00.000Z');
  expect(advanceClock(2).toISOString()).toBe('2027-01-03T00:00:00.000Z');
  expect(getNow().toISOString()).toBe('2027-01-03T00:00:00.000Z');
});
