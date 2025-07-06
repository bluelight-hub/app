import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { AuditLogProcessor } from '../audit-log.processor';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLogBatchService } from '../../services/audit-log-batch.service';
import { AuditLogJobData, AuditLogJobType } from '../audit-log.queue';
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

describe('AuditLogProcessor', () => {
  let processor: AuditLogProcessor;
  let auditLogService: jest.Mocked<AuditLogService>;
  let auditLogBatchService: jest.Mocked<AuditLogBatchService>;

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

  const mockJob = (data: AuditLogJobData): Job<AuditLogJobData> =>
    ({
      id: 'job-123',
      attemptsMade: 0,
      data,
      opts: {},
      // Add other required Job properties as needed
    }) as Job<AuditLogJobData>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogProcessor,
        {
          provide: AuditLogService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditLogBatchService,
          useValue: {
            createBatch: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<AuditLogProcessor>(AuditLogProcessor);
    auditLogService = module.get(AuditLogService);
    auditLogBatchService = module.get(AuditLogBatchService);
  });

  describe('handleCreateAuditLog', () => {
    it('should process a single audit log successfully', async () => {
      const job = mockJob({
        type: AuditLogJobType.CREATE,
        payload: mockCreateAuditLogDto,
      });

      auditLogService.create.mockResolvedValue({} as any);

      await processor.handleCreateAuditLog(job);

      expect(auditLogService.create).toHaveBeenCalledWith(mockCreateAuditLogDto);
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringContaining('Audit log processed'),
        expect.objectContaining({
          jobId: 'job-123',
          actionType: AuditActionType.CREATE,
          resource: 'user',
        }),
      );
    });

    it('should handle errors and re-throw them', async () => {
      const job = mockJob({
        type: AuditLogJobType.CREATE,
        payload: mockCreateAuditLogDto,
      });

      const error = new Error('Database connection failed');
      auditLogService.create.mockRejectedValue(error);

      await expect(processor.handleCreateAuditLog(job)).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to process audit log job',
        expect.objectContaining({
          jobId: 'job-123',
          attempt: 0,
          error: 'Database connection failed',
        }),
      );
    });

    it('should log performance metrics', async () => {
      const job = mockJob({
        type: AuditLogJobType.CREATE,
        payload: mockCreateAuditLogDto,
      });

      auditLogService.create.mockResolvedValue({} as any);

      await processor.handleCreateAuditLog(job);

      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Audit log processed in \d+ms/),
        expect.any(Object),
      );
    });
  });

  describe('handleBatchCreateAuditLogs', () => {
    it('should process a batch of audit logs successfully', async () => {
      const batchData = [
        mockCreateAuditLogDto,
        { ...mockCreateAuditLogDto, resourceId: 'user-456' },
      ];
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: batchData,
      });

      const batchResult = {
        successful: [{} as any, {} as any],
        failed: [],
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
      };

      auditLogBatchService.createBatch.mockResolvedValue(batchResult);

      await processor.handleBatchCreateAuditLogs(job);

      expect(auditLogBatchService.createBatch).toHaveBeenCalledWith(batchData);
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringContaining('Batch audit logs processed'),
        expect.objectContaining({
          jobId: 'job-123',
          total: 2,
          success: 2,
          failed: 0,
        }),
      );
    });

    it('should log warnings for partial failures', async () => {
      const batchData = [
        mockCreateAuditLogDto,
        { ...mockCreateAuditLogDto, resourceId: 'user-456' },
      ];
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: batchData,
      });

      const batchResult = {
        successful: [{} as any],
        failed: [
          {
            index: 1,
            data: batchData[1],
            error: 'Validation failed',
          },
        ],
        totalProcessed: 2,
        successCount: 1,
        failureCount: 1,
      };

      auditLogBatchService.createBatch.mockResolvedValue(batchResult);

      await processor.handleBatchCreateAuditLogs(job);

      expect(logger.warn).toHaveBeenCalledWith(
        'Some audit logs in batch failed',
        expect.objectContaining({
          jobId: 'job-123',
          failures: batchResult.failed,
        }),
      );
    });

    it('should handle batch processing errors', async () => {
      const batchData = [mockCreateAuditLogDto];
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: batchData,
      });

      const error = new Error('Batch processing failed');
      auditLogBatchService.createBatch.mockRejectedValue(error);

      await expect(processor.handleBatchCreateAuditLogs(job)).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to process batch audit log job',
        expect.objectContaining({
          jobId: 'job-123',
          attempt: 0,
          error: 'Batch processing failed',
        }),
      );
    });
  });

  describe('onFailed', () => {
    it('should log permanently failed jobs', async () => {
      const job = mockJob({
        type: AuditLogJobType.CREATE,
        payload: mockCreateAuditLogDto,
      });
      job.attemptsMade = 3;

      const error = new Error('Permanent failure');
      error.stack = 'Error stack trace';

      await processor.onFailed(job, error);

      expect(logger.error).toHaveBeenCalledWith(
        'Audit log job failed permanently',
        expect.objectContaining({
          jobId: 'job-123',
          jobType: AuditLogJobType.CREATE,
          attempts: 3,
          error: 'Permanent failure',
          stack: 'Error stack trace',
        }),
      );
    });

    it('should handle onFailed without stack trace', async () => {
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: [mockCreateAuditLogDto],
      });

      const error = new Error('No stack trace error');
      delete error.stack;

      await processor.onFailed(job, error);

      expect(logger.error).toHaveBeenCalledWith(
        'Audit log job failed permanently',
        expect.objectContaining({
          jobId: 'job-123',
          error: 'No stack trace error',
          stack: undefined,
        }),
      );
    });
  });

  describe('onCompleted', () => {
    it('should log completed jobs at trace level', async () => {
      const job = mockJob({
        type: AuditLogJobType.CREATE,
        payload: mockCreateAuditLogDto,
      });

      await processor.onCompleted(job);

      expect(logger.trace).toHaveBeenCalledWith(
        'Audit log job completed',
        expect.objectContaining({
          jobId: 'job-123',
          jobType: AuditLogJobType.CREATE,
        }),
      );
    });

    it('should handle batch job completion', async () => {
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: [mockCreateAuditLogDto],
      });

      await processor.onCompleted(job);

      expect(logger.trace).toHaveBeenCalledWith(
        'Audit log job completed',
        expect.objectContaining({
          jobId: 'job-123',
          jobType: AuditLogJobType.BATCH_CREATE,
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty batch', async () => {
      const job = mockJob({
        type: AuditLogJobType.BATCH_CREATE,
        payload: [],
      });

      const batchResult = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };

      auditLogBatchService.createBatch.mockResolvedValue(batchResult);

      await processor.handleBatchCreateAuditLogs(job);

      expect(auditLogBatchService.createBatch).toHaveBeenCalledWith([]);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should handle job with missing data', async () => {
      const job = { id: 'job-123', attemptsMade: 0 } as Job<AuditLogJobData>;
      job.data = { type: AuditLogJobType.CREATE } as any;

      await expect(processor.handleCreateAuditLog(job)).rejects.toThrow();
    });
  });
});
