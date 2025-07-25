import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SecurityLogQueueService } from '../services/security-log-queue.service';
import { SecurityLogProcessor } from '../processors/security-log.processor';
import { SecurityLogService } from '../../modules/auth/services/security-log.service';
import { SecurityLogHashService } from '../../modules/auth/services/security-log-hash.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityEventType } from '../../modules/auth/constants/auth.constants';
import {
  SECURITY_LOG_QUEUE_CONFIG,
  SECURITY_LOG_JOB_NAMES,
  SecurityEventTypeExtended,
} from '../constants/event-types';

describe('Security Log Queue System', () => {
  let module: TestingModule;
  let queueService: SecurityLogQueueService;
  let processor: SecurityLogProcessor;

  const mockQueue = {
    add: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayedCount: jest.fn(),
    obliterate: jest.fn(),
  };

  const mockSecurityLogService = {
    logSecurityEvent: jest.fn(),
    cleanupOldLogs: jest.fn(),
    verifyLogChainIntegrity: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SecurityLogQueueService,
        SecurityLogProcessor,
        {
          provide: getQueueToken(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME),
          useValue: mockQueue,
        },
        {
          provide: SecurityLogService,
          useValue: mockSecurityLogService,
        },
        {
          provide: SecurityLogHashService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    queueService = module.get<SecurityLogQueueService>(SecurityLogQueueService);
    processor = module.get<SecurityLogProcessor>(SecurityLogProcessor);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('SecurityLogQueueService', () => {
    describe('addSecurityEvent', () => {
      it('should add a security event to the queue', async () => {
        const eventData = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { browser: 'Chrome' },
        };

        const mockJobId = 'job-123';
        mockQueue.add.mockResolvedValue({ id: mockJobId });

        const jobId = await queueService.addSecurityEvent(eventData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          SECURITY_LOG_JOB_NAMES.LOG_EVENT,
          expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          expect.objectContaining({
            removeOnComplete: true,
          }),
        );
        expect(jobId).toBe(mockJobId);
      });

      it('should handle queue errors', async () => {
        const error = new Error('Queue connection failed');
        mockQueue.add.mockRejectedValue(error);

        await expect(
          queueService.addSecurityEvent({
            eventType: SecurityEventType.LOGIN_FAILED,
          }),
        ).rejects.toThrow('Queue connection failed');
      });
    });

    describe('addBatchSecurityEvents', () => {
      it('should add batch events to the queue', async () => {
        const events = [
          { eventType: SecurityEventType.LOGIN_SUCCESS, userId: 'user1' },
          { eventType: SecurityEventTypeExtended.PERMISSION_DENIED, userId: 'user2' },
        ];

        const mockJobId = 'batch-job-123';
        mockQueue.add.mockResolvedValue({ id: mockJobId });

        const jobId = await queueService.addBatchSecurityEvents(events);

        expect(mockQueue.add).toHaveBeenCalledWith(
          SECURITY_LOG_JOB_NAMES.BATCH_LOG,
          { events },
          expect.any(Object),
        );
        expect(jobId).toBe(mockJobId);
      });
    });

    describe('specialized logging methods', () => {
      it('should log login attempts correctly', async () => {
        mockQueue.add.mockResolvedValue({ id: 'login-job-123' });

        await queueService.logLoginAttempt(true, 'user123', '192.168.1.1', 'Mozilla/5.0', {
          sessionId: 'session123',
        });

        expect(mockQueue.add).toHaveBeenCalledWith(
          SECURITY_LOG_JOB_NAMES.LOG_EVENT,
          expect.objectContaining({
            eventType: SecurityEventType.LOGIN_SUCCESS,
            severity: 'INFO',
            message: 'User logged in successfully',
          }),
          expect.any(Object),
        );
      });

      it('should log permission denied events', async () => {
        mockQueue.add.mockResolvedValue({ id: 'perm-job-123' });

        await queueService.logPermissionDenied('user123', 'admin-panel', 'access', '192.168.1.1');

        expect(mockQueue.add).toHaveBeenCalledWith(
          SECURITY_LOG_JOB_NAMES.LOG_EVENT,
          expect.objectContaining({
            eventType: SecurityEventTypeExtended.PERMISSION_DENIED,
            severity: 'WARN',
            metadata: expect.objectContaining({
              resource: 'admin-panel',
              action: 'access',
            }),
          }),
          expect.any(Object),
        );
      });

      it('should log role changes', async () => {
        mockQueue.add.mockResolvedValue({ id: 'role-job-123' });

        await queueService.logRoleChange('user123', 'USER', 'ADMIN', 'admin456', '192.168.1.1');

        expect(mockQueue.add).toHaveBeenCalledWith(
          SECURITY_LOG_JOB_NAMES.LOG_EVENT,
          expect.objectContaining({
            eventType: SecurityEventTypeExtended.ROLE_CHANGED,
            severity: 'HIGH',
            metadata: expect.objectContaining({
              oldRole: 'USER',
              newRole: 'ADMIN',
              changedBy: 'admin456',
            }),
          }),
          expect.any(Object),
        );
      });
    });

    describe('queue management', () => {
      it('should return queue statistics', async () => {
        mockQueue.getWaitingCount.mockResolvedValue(5);
        mockQueue.getActiveCount.mockResolvedValue(2);
        mockQueue.getCompletedCount.mockResolvedValue(100);
        mockQueue.getFailedCount.mockResolvedValue(3);
        mockQueue.getDelayedCount.mockResolvedValue(1);

        const stats = await queueService.getQueueStats();

        expect(stats).toEqual({
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        });
      });

      it('should not allow queue clearing in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        await expect(queueService.clearQueue()).rejects.toThrow(
          'Queue clearing is not allowed in production',
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should allow queue clearing in development', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        await queueService.clearQueue();

        expect(mockQueue.obliterate).toHaveBeenCalledWith({ force: true });

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('SecurityLogProcessor', () => {
    const createMockJob = (name: string, data: any) => ({
      id: 'test-job-id',
      name,
      data,
      attemptsMade: 0,
      timestamp: Date.now(),
    });

    describe('process', () => {
      it('should process LOG_EVENT jobs successfully', async () => {
        const jobData = {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user123',
          ipAddress: '192.168.1.1',
        };

        const mockJob = createMockJob(SECURITY_LOG_JOB_NAMES.LOG_EVENT, jobData);
        mockSecurityLogService.logSecurityEvent.mockResolvedValue(undefined);

        const result = await processor.process(mockJob as any);

        expect(mockSecurityLogService.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            ...jobData,
            metadata: expect.objectContaining({
              jobId: mockJob.id,
              attemptNumber: 1,
            }),
          }),
        );
        expect(result).toEqual({ success: true });
      });

      it('should process BATCH_LOG jobs', async () => {
        const events = [
          { eventType: SecurityEventType.LOGIN_SUCCESS },
          { eventType: SecurityEventType.LOGIN_FAILED },
        ];

        const mockJob = createMockJob(SECURITY_LOG_JOB_NAMES.BATCH_LOG, { events });
        mockSecurityLogService.logSecurityEvent.mockResolvedValue(undefined);

        const result = await processor.process(mockJob as any);

        expect(mockSecurityLogService.logSecurityEvent).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ processed: 2, failed: 0 });
      });

      it('should handle partial batch failures', async () => {
        const events = [
          { eventType: SecurityEventType.LOGIN_SUCCESS },
          { eventType: SecurityEventType.LOGIN_FAILED },
        ];

        const mockJob = createMockJob(SECURITY_LOG_JOB_NAMES.BATCH_LOG, { events });
        mockSecurityLogService.logSecurityEvent
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Database error'));

        const result = await processor.process(mockJob as any);

        expect(result).toEqual({ processed: 1, failed: 1 });
      });

      it('should process CLEANUP jobs', async () => {
        const mockJob = createMockJob(SECURITY_LOG_JOB_NAMES.CLEANUP, {
          daysToKeep: 30,
        });
        mockSecurityLogService.cleanupOldLogs.mockResolvedValue(150);

        const result = await processor.process(mockJob as any);

        expect(mockSecurityLogService.cleanupOldLogs).toHaveBeenCalledWith(30);
        expect(result).toEqual({ deletedCount: 150 });
      });

      it('should process VERIFY_INTEGRITY jobs', async () => {
        const mockJob = createMockJob(SECURITY_LOG_JOB_NAMES.VERIFY_INTEGRITY, {
          startSequence: 1n,
          endSequence: 100n,
        });

        mockSecurityLogService.verifyLogChainIntegrity.mockResolvedValue({
          isValid: true,
          totalChecked: 100,
          brokenAtSequence: undefined,
          error: undefined,
        });

        const result = await processor.process(mockJob as any);

        expect(mockSecurityLogService.verifyLogChainIntegrity).toHaveBeenCalledWith(1n, 100n);
        expect(result).toEqual({
          isValid: true,
          totalChecked: 100,
          brokenAtSequence: undefined,
          error: undefined,
        });
      });

      it('should throw error for unknown job types', async () => {
        const mockJob = createMockJob('UNKNOWN_JOB', {});

        await expect(processor.process(mockJob as any)).rejects.toThrow(
          'Unknown job type: UNKNOWN_JOB',
        );
      });
    });
  });

  describe('Job Options Configuration', () => {
    it('should have correct default job options', async () => {
      const eventData = {
        eventType: SecurityEventTypeExtended.API_RATE_LIMIT,
        ipAddress: '192.168.1.1',
      };

      mockQueue.add.mockResolvedValue({ id: 'test-job' });

      await queueService.addSecurityEvent(eventData);

      const addCall = mockQueue.add.mock.calls[0];
      const jobOptions = addCall[2];

      expect(jobOptions).toMatchObject({
        removeOnComplete: true,
      });
    });

    it('should allow custom job options', async () => {
      const eventData = {
        eventType: SecurityEventTypeExtended.DATA_ACCESS,
        userId: 'user123',
      };

      mockQueue.add.mockResolvedValue({ id: 'test-job' });

      await queueService.addSecurityEvent(eventData, {
        priority: 5,
        delay: 1000,
        removeOnComplete: 10,
      });

      const addCall = mockQueue.add.mock.calls[0];
      const jobOptions = addCall[2];

      expect(jobOptions).toMatchObject({
        priority: 5,
        delay: 1000,
        removeOnComplete: 10,
      });
    });
  });
});
