import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bull';
import { AuditLogQueue, AuditLogJobType, AUDIT_LOG_QUEUE } from '../audit-log.queue';
import { CreateAuditLogDto } from '../../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';
import { logger } from '../../../../logger/consola.logger';

// Mock the logger
jest.mock('../../../../logger/consola.logger', () => ({
  logger: {
    trace: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AuditLogQueue', () => {
  let service: AuditLogQueue;
  let mockQueue: jest.Mocked<Queue>;

  const mockCreateAuditLogDto: CreateAuditLogDto = {
    actionType: AuditActionType.CREATE,
    severity: AuditSeverity.MEDIUM,
    action: 'create-user',
    resource: 'user',
    resourceId: 'user-123',
    userId: 'admin-456',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN' as any,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/users',
    httpMethod: 'POST',
    success: true,
    statusCode: 201,
    duration: 150,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock queue
    mockQueue = {
      add: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      empty: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogQueue,
        {
          provide: `BullQueue_${AUDIT_LOG_QUEUE}`,
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AuditLogQueue>(AuditLogQueue);
  });

  describe('addAuditLog', () => {
    it('should add a single audit log to the queue', async () => {
      const mockJob = { id: 'job-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addAuditLog(mockCreateAuditLogDto);

      expect(result).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        AuditLogJobType.CREATE,
        {
          type: AuditLogJobType.CREATE,
          payload: mockCreateAuditLogDto,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
      expect(logger.trace).toHaveBeenCalledWith('Audit log queued', { jobId: 'job-123' });
    });

    it('should handle queue errors', async () => {
      const error = new Error('Queue unavailable');
      mockQueue.add.mockRejectedValue(error);

      await expect(service.addAuditLog(mockCreateAuditLogDto)).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to queue audit log',
        expect.objectContaining({
          error: 'Queue unavailable',
          data: mockCreateAuditLogDto,
        }),
      );
    });

    it('should handle numeric job IDs', async () => {
      const mockJob = { id: 12345 };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addAuditLog(mockCreateAuditLogDto);

      expect(result).toBe(12345);
    });
  });

  describe('addBatchAuditLogs', () => {
    it('should add multiple audit logs as a batch', async () => {
      const batchData = [
        mockCreateAuditLogDto,
        { ...mockCreateAuditLogDto, resourceId: 'user-456' },
        { ...mockCreateAuditLogDto, resourceId: 'user-789' },
      ];
      const mockJob = { id: 'batch-job-456' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addBatchAuditLogs(batchData);

      expect(result).toBe('batch-job-456');
      expect(mockQueue.add).toHaveBeenCalledWith(
        AuditLogJobType.BATCH_CREATE,
        {
          type: AuditLogJobType.BATCH_CREATE,
          payload: batchData,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      expect(logger.trace).toHaveBeenCalledWith(
        'Batch audit logs queued',
        expect.objectContaining({
          jobId: 'batch-job-456',
          count: 3,
        }),
      );
    });

    it('should handle empty batch', async () => {
      const mockJob = { id: 'empty-batch-789' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addBatchAuditLogs([]);

      expect(result).toBe('empty-batch-789');
      expect(logger.trace).toHaveBeenCalledWith(
        'Batch audit logs queued',
        expect.objectContaining({
          jobId: 'empty-batch-789',
          count: 0,
        }),
      );
    });

    it('should handle batch queue errors', async () => {
      const batchData = [mockCreateAuditLogDto];
      const error = new Error('Batch processing failed');
      mockQueue.add.mockRejectedValue(error);

      await expect(service.addBatchAuditLogs(batchData)).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to queue batch audit logs',
        expect.objectContaining({
          error: 'Batch processing failed',
          count: 1,
        }),
      );
    });

    it('should use different backoff settings for batch', async () => {
      const mockJob = { id: 'batch-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addBatchAuditLogs([mockCreateAuditLogDto]);

      const addCall = mockQueue.add.mock.calls[0];
      const backoffOptions = addCall[2].backoff as { type: string; delay: number };
      expect(backoffOptions.delay).toBe(5000); // Batch has longer delay
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(10);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(5);
      mockQueue.getDelayedCount.mockResolvedValue(3);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 10,
        active: 2,
        completed: 100,
        failed: 5,
        delayed: 3,
        total: 15, // waiting + active + delayed
      });

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
    });

    it('should handle zero counts', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
      });
    });

    it('should handle errors in getting stats', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Queue error'));

      await expect(service.getQueueStats()).rejects.toThrow('Queue error');
    });
  });

  describe('clearQueue', () => {
    it('should empty the queue and log warning', async () => {
      mockQueue.empty.mockResolvedValue(undefined);

      await service.clearQueue();

      expect(mockQueue.empty).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Audit log queue cleared');
    });

    it('should handle errors when clearing queue', async () => {
      const error = new Error('Cannot clear queue');
      mockQueue.empty.mockRejectedValue(error);

      await expect(service.clearQueue()).rejects.toThrow(error);
    });
  });

  describe('Queue Job Options', () => {
    it('should configure job options correctly for single audit log', async () => {
      const mockJob = { id: 'test-job' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addAuditLog(mockCreateAuditLogDto);

      const jobOptions = mockQueue.add.mock.calls[0][2];
      expect(jobOptions).toEqual({
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });

    it('should configure job options correctly for batch', async () => {
      const mockJob = { id: 'test-batch-job' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addBatchAuditLogs([mockCreateAuditLogDto]);

      const jobOptions = mockQueue.add.mock.calls[0][2];
      expect(jobOptions).toEqual({
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined job ID', async () => {
      const mockJob = { id: undefined };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addAuditLog(mockCreateAuditLogDto);

      expect(result).toBeUndefined();
    });

    it('should handle very large batch', async () => {
      const largeBatch = Array(1000).fill(mockCreateAuditLogDto);
      const mockJob = { id: 'large-batch' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.addBatchAuditLogs(largeBatch);

      expect(result).toBe('large-batch');
      expect(logger.trace).toHaveBeenCalledWith(
        'Batch audit logs queued',
        expect.objectContaining({
          count: 1000,
        }),
      );
    });
  });
});
