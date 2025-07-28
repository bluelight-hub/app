import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SecurityLogService } from '@/security';
import { PrismaService } from '@/prisma/prisma.service';
import { SECURITY_LOG_QUEUE_CONFIG, SecurityEventTypeExtended } from '../constants/event-types';
import { SecurityEventType } from '@/modules/auth/constants';

describe('SecurityLogService', () => {
  let service: SecurityLogService;
  let mockQueue: any;
  let mockPrismaService: any;

  beforeEach(async () => {
    // Mock Queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({
        id: 'test-job-id-123',
      }),
    };

    // Mock PrismaService
    mockPrismaService = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLogService,
        {
          provide: getQueueToken(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME),
          useValue: mockQueue,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecurityLogService>(SecurityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should add a security event to the queue', async () => {
      const eventType = SecurityEventType.LOGIN_SUCCESS;
      const payload = {
        action: eventType,
        userId: 'user-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { browser: 'Chrome' },
      };

      const result = await service.log(eventType, payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        {
          eventType,
          ...payload,
          timestamp: expect.any(Date),
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      expect(result).toEqual({
        jobId: 'test-job-id-123',
        queued: true,
      });
    });

    it('should handle undefined values correctly', async () => {
      const eventType = SecurityEventType.LOGIN_FAILED;
      const payload = {
        action: eventType,
        userId: undefined,
        ip: undefined,
        userAgent: undefined,
        metadata: undefined,
      };

      const result = await service.log(eventType, payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        {
          eventType,
          ...payload,
          timestamp: expect.any(Date),
        },
        expect.any(Object),
      );

      expect(result).toEqual({
        jobId: 'test-job-id-123',
        queued: true,
      });
    });

    it('should handle extended event types', async () => {
      const eventType = SecurityEventTypeExtended.PERMISSION_DENIED;
      const payload = {
        action: eventType,
        userId: 'user-456',
        ip: '127.0.0.1',
        metadata: { resource: 'admin-panel', action: 'access' },
      };

      const result = await service.log(eventType, payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        expect.objectContaining({
          eventType,
          userId: 'user-456',
          metadata: { resource: 'admin-panel', action: 'access' },
        }),
        expect.any(Object),
      );

      expect(result.queued).toBe(true);
    });

    it('should throw error when queue add fails', async () => {
      const error = new Error('Queue error');
      mockQueue.add.mockRejectedValueOnce(error);

      const eventType = SecurityEventType.LOGIN_SUCCESS;
      const payload = { action: eventType, userId: 'user-789', ip: '127.0.0.1' };

      await expect(service.log(eventType, payload)).rejects.toThrow('Queue error');
    });
  });

  describe('logCritical', () => {
    it('should add a critical event with priority 0 and lifo true', async () => {
      const eventType = SecurityEventType.SUSPICIOUS_ACTIVITY;
      const payload = {
        action: eventType,
        userId: 'user-999',
        ip: '10.0.0.1',
        metadata: { reason: 'Multiple failed attempts' },
      };

      const result = await service.logCritical(eventType, payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        {
          eventType,
          ...payload,
          timestamp: expect.any(Date),
          severity: 'CRITICAL',
        },
        {
          priority: 0,
          lifo: true,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      expect(result).toEqual({
        jobId: 'test-job-id-123',
        queued: true,
      });
    });

    it('should handle queue errors for critical events', async () => {
      const error = new Error('Critical queue error');
      mockQueue.add.mockRejectedValueOnce(error);

      const eventType = SecurityEventType.ACCOUNT_LOCKED;
      const payload = { action: eventType, userId: 'user-critical', ip: '127.0.0.1' };

      await expect(service.logCritical(eventType, payload)).rejects.toThrow('Critical queue error');
    });

    it('should add severity CRITICAL to the payload', async () => {
      const eventType = SecurityEventTypeExtended.QUEUE_JOB_FAILED;
      const payload = {
        action: eventType,
        userId: 'system',
        ip: '127.0.0.1',
        metadata: { jobId: 'failed-job-123', error: 'Processing failed' },
      };

      await service.logCritical(eventType, payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        expect.objectContaining({
          severity: 'CRITICAL',
        }),
        expect.any(Object),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty payload', async () => {
      const eventType = SecurityEventType.SYSTEM_CHECKPOINT;
      const payload = { action: eventType, userId: 'system', ip: '127.0.0.1' };

      const result = await service.log(eventType, payload);

      expect(result.queued).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-security-event',
        expect.objectContaining({
          eventType,
          timestamp: expect.any(Date),
        }),
        expect.any(Object),
      );
    });

    it('should handle very large metadata objects', async () => {
      const eventType = SecurityEventType.API_CALL;
      const largeMetadata = {};
      for (let i = 0; i < 100; i++) {
        largeMetadata[`key_${i}`] = `value_${i}`.repeat(10);
      }

      const payload = {
        action: eventType,
        userId: 'user-large',
        ip: '127.0.0.1',
        metadata: largeMetadata,
      };

      const result = await service.log(eventType, payload);

      expect(result.queued).toBe(true);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should convert numeric job ID to string', async () => {
      mockQueue.add.mockResolvedValueOnce({
        id: 12345, // Numeric ID
      });

      const result = await service.log(SecurityEventType.LOGIN_SUCCESS, {
        action: SecurityEventType.LOGIN_SUCCESS,
        userId: 'system',
        ip: '127.0.0.1',
      });

      expect(result.jobId).toBe('12345');
      expect(typeof result.jobId).toBe('string');
    });
  });
});
