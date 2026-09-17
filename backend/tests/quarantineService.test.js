jest.mock('../src/models/Batch', () => ({
  find: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
}));

const Batch = require('../src/models/Batch');
const { runExpiryJob } = require('../src/services/quarantineService');

test('quarantines expired active batches and reports active seven-day alerts', async () => {
  Batch.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: { toString: () => 'expired-id' } }]) }) });
  Batch.updateMany.mockResolvedValue({ modifiedCount: 1 });
  Batch.countDocuments.mockResolvedValue(2);
  const report = await runExpiryJob(new Date('2027-01-01T00:00:00.000Z'));
  expect(Batch.updateMany).toHaveBeenCalled();
  expect(report).toEqual({ expiringSoonCount: 2, quarantinedCount: 1, quarantinedBatchIds: ['expired-id'] });
});
