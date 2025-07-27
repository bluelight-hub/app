/**
 * Mock SecurityLogService for testing purposes
 */
export const mockSecurityLogService = {
  log: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
  logCritical: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
  logBatch: jest
    .fn()
    .mockResolvedValue({ jobIds: ['test-job-id-1', 'test-job-id-2'], queued: true }),
  findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getStatistics: jest.fn().mockResolvedValue({
    totalEvents: 0,
    eventsByType: {},
    recentEvents: [],
  }),
};

/**
 * Factory function to create a fresh mock instance
 */
export const createMockSecurityLogService = () => ({
  log: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
  logCritical: jest.fn().mockResolvedValue({ jobId: 'test-job-id', queued: true }),
  logBatch: jest
    .fn()
    .mockResolvedValue({ jobIds: ['test-job-id-1', 'test-job-id-2'], queued: true }),
  findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getStatistics: jest.fn().mockResolvedValue({
    totalEvents: 0,
    eventsByType: {},
    recentEvents: [],
  }),
});
