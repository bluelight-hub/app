import { Test, TestingModule } from '@nestjs/testing';
import { SecurityLogQueueService } from './security-log-queue.service';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import {
  SECURITY_LOG_QUEUE_CONFIG,
  SECURITY_LOG_JOB_NAMES,
  SecurityEventTypeExtended,
} from '../constants/event-types';
import { SecurityEventType } from '../../modules/auth/constants/auth.constants';

describe('SecurityLogQueueService', () => {
  let service: SecurityLogQueueService;
  let mockQueue: Partial<Queue>;

  beforeEach(async () => {
    // Mock Queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getWaitingCount: jest.fn().mockResolvedValue(10),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(1),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      obliterate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLogQueueService,
        {
          provide: getQueueToken(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SecurityLogQueueService>(SecurityLogQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSecurityEvent', () => {
    it('should add security event to queue', async () => {
      const eventData = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { foo: 'bar' },
        severity: 'INFO',
        message: 'User logged in',
      };

      const jobId = await service.addSecurityEvent(eventData);

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          ...eventData,
          timestamp: expect.any(Date),
        },
        {
          priority: undefined,
          delay: undefined,
          removeOnComplete: true,
        },
      );
    });

    it('should use provided timestamp if available', async () => {
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const eventData = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
        timestamp,
      };

      await service.addSecurityEvent(eventData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        expect.objectContaining({ timestamp }),
        expect.any(Object),
      );
    });

    it('should apply custom options', async () => {
      const eventData = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
      };
      const options = {
        priority: 5,
        delay: 1000,
        removeOnComplete: false,
      };

      await service.addSecurityEvent(eventData, options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        expect.any(Object),
        options,
      );
    });

    it('should throw error when queue operation fails', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Queue error'));

      await expect(
        service.addSecurityEvent({ eventType: SecurityEventType.LOGIN_SUCCESS }),
      ).rejects.toThrow('Queue error');
    });
  });

  describe('addBatchSecurityEvents', () => {
    it('should add batch of events to queue', async () => {
      const events = [
        {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user1',
        },
        {
          eventType: SecurityEventType.LOGIN_FAILED,
          userId: 'user2',
        },
      ];

      const jobId = await service.addBatchSecurityEvents(events);

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.BATCH_LOG,
        { events },
        {
          priority: undefined,
          delay: undefined,
        },
      );
    });

    it('should apply batch options', async () => {
      const events = [{ eventType: SecurityEventType.LOGIN_SUCCESS }];
      const options = { priority: 10, delay: 5000 };

      await service.addBatchSecurityEvents(events, options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.BATCH_LOG,
        { events },
        options,
      );
    });

    it('should handle batch errors', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Batch error'));

      await expect(service.addBatchSecurityEvents([])).rejects.toThrow('Batch error');
    });
  });

  describe('scheduleLogCleanup', () => {
    it('should schedule cleanup job with default retention', async () => {
      const jobId = await service.scheduleLogCleanup();

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.CLEANUP,
        { daysToKeep: undefined },
        {
          repeat: {
            pattern: '0 2 * * *',
          },
        },
      );
    });

    it('should schedule cleanup job with custom retention', async () => {
      const daysToKeep = 30;
      const jobId = await service.scheduleLogCleanup(daysToKeep);

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.CLEANUP,
        { daysToKeep },
        expect.any(Object),
      );
    });

    it('should handle scheduling errors', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Scheduling error'));

      await expect(service.scheduleLogCleanup()).rejects.toThrow('Scheduling error');
    });
  });

  describe('scheduleIntegrityCheck', () => {
    it('should schedule integrity check job', async () => {
      const startSequence = BigInt(1);
      const endSequence = BigInt(100);

      const jobId = await service.scheduleIntegrityCheck(startSequence, endSequence);

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.VERIFY_INTEGRITY,
        { startSequence, endSequence },
        { priority: 10 },
      );
    });

    it('should schedule integrity check without sequence range', async () => {
      const jobId = await service.scheduleIntegrityCheck();

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.VERIFY_INTEGRITY,
        { startSequence: undefined, endSequence: undefined },
        { priority: 10 },
      );
    });

    it('should handle integrity check errors', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Integrity check error'));

      await expect(service.scheduleIntegrityCheck()).rejects.toThrow('Integrity check error');
    });
  });

  describe('logLoginAttempt', () => {
    it('should log successful login', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const metadata = { source: 'web' };

      await service.logLoginAttempt(true, userId, ipAddress, userAgent, metadata);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId,
          ipAddress,
          userAgent,
          metadata,
          severity: 'INFO',
          message: 'User logged in successfully',
          timestamp: expect.any(Date),
        },
        expect.any(Object),
      );
    });

    it('should log failed login', async () => {
      const userId = 'user123';
      const ipAddress = '192.168.1.1';

      await service.logLoginAttempt(false, userId, ipAddress);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_FAILED,
          severity: 'WARN',
          message: 'Failed login attempt',
        }),
        expect.any(Object),
      );
    });
  });

  describe('logPermissionDenied', () => {
    it('should log permission denied event', async () => {
      const userId = 'user123';
      const resource = '/api/admin';
      const action = 'DELETE';
      const ipAddress = '192.168.1.1';
      const metadata = { requestId: 'req123' };

      await service.logPermissionDenied(userId, resource, action, ipAddress, metadata);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          eventType: SecurityEventTypeExtended.PERMISSION_DENIED,
          userId,
          ipAddress,
          metadata: {
            ...metadata,
            resource,
            action,
          },
          severity: 'WARN',
          message: `Permission denied: ${action} on ${resource}`,
          timestamp: expect.any(Date),
        },
        expect.any(Object),
      );
    });
  });

  describe('logRoleChange', () => {
    it('should log role change event', async () => {
      const userId = 'user123';
      const oldRole = 'USER';
      const newRole = 'ADMIN';
      const changedBy = 'admin123';
      const ipAddress = '192.168.1.1';

      await service.logRoleChange(userId, oldRole, newRole, changedBy, ipAddress);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          eventType: SecurityEventTypeExtended.ROLE_CHANGED,
          userId,
          ipAddress,
          metadata: {
            oldRole,
            newRole,
            changedBy,
          },
          severity: 'HIGH',
          message: `User role changed from ${oldRole} to ${newRole}`,
          timestamp: expect.any(Date),
        },
        expect.any(Object),
      );
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded event', async () => {
      const ipAddress = '192.168.1.1';
      const endpoint = '/api/users';
      const userId = 'user123';
      const metadata = { attempts: 100 };

      await service.logRateLimitExceeded(ipAddress, endpoint, userId, metadata);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        {
          eventType: SecurityEventTypeExtended.API_RATE_LIMIT,
          userId,
          ipAddress,
          metadata: {
            ...metadata,
            endpoint,
          },
          severity: 'WARN',
          message: `API rate limit exceeded for endpoint: ${endpoint}`,
          timestamp: expect.any(Date),
        },
        expect.any(Object),
      );
    });

    it('should log rate limit without userId', async () => {
      const ipAddress = '192.168.1.1';
      const endpoint = '/api/public';

      await service.logRateLimitExceeded(ipAddress, endpoint);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SECURITY_LOG_JOB_NAMES.LOG_EVENT,
        expect.objectContaining({
          eventType: SecurityEventTypeExtended.API_RATE_LIMIT,
          userId: undefined,
          ipAddress,
        }),
        expect.any(Object),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 10,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 0,
      });

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
    });

    it('should handle stats retrieval errors', async () => {
      (mockQueue.getWaitingCount as jest.Mock).mockRejectedValue(new Error('Stats error'));

      await expect(service.getQueueStats()).rejects.toThrow('Stats error');
    });
  });

  describe('clearQueue', () => {
    it('should clear queue in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await service.clearQueue();

      expect(mockQueue.obliterate).toHaveBeenCalledWith({ force: true });

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await expect(service.clearQueue()).rejects.toThrow(
        'Queue clearing is not allowed in production',
      );

      expect(mockQueue.obliterate).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle queue clearing errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      (mockQueue.obliterate as jest.Mock).mockRejectedValue(new Error('Clear error'));

      await expect(service.clearQueue()).rejects.toThrow('Clear error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('error handling', () => {
    it('should log and rethrow errors for all methods', async () => {
      const error = new Error('Test error');
      (mockQueue.add as jest.Mock).mockRejectedValue(error);

      // Test each method
      await expect(
        service.addSecurityEvent({ eventType: SecurityEventType.LOGIN_SUCCESS }),
      ).rejects.toThrow(error);

      await expect(service.addBatchSecurityEvents([])).rejects.toThrow(error);

      await expect(service.scheduleLogCleanup()).rejects.toThrow(error);

      await expect(service.scheduleIntegrityCheck()).rejects.toThrow(error);
    });
  });
});
