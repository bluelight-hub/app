import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMetricsService } from './security-metrics.service';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrityService } from '../services/integrity.service';
import { getQueueToken } from '@nestjs/bullmq';
import { SECURITY_LOG_QUEUE_CONFIG } from '../constants/event-types';

jest.mock('prom-client', () => {
  const mockGauge = {
    set: jest.fn(),
  };
  const mockCounter = {
    inc: jest.fn(),
  };
  const mockHistogram = {
    observe: jest.fn(),
  };
  const mockRegistry = {
    metrics: jest.fn().mockResolvedValue('prometheus metrics string'),
  };

  return {
    Registry: jest.fn().mockImplementation(() => mockRegistry),
    Gauge: jest.fn().mockImplementation(() => mockGauge),
    Counter: jest.fn().mockImplementation(() => mockCounter),
    Histogram: jest.fn().mockImplementation(() => mockHistogram),
  };
});

describe('SecurityMetricsService', () => {
  let service: SecurityMetricsService;
  let mockQueue: Partial<Queue>;
  let mockPrismaService: Partial<PrismaService>;
  let mockIntegrityService: Partial<IntegrityService>;

  // Store references to timers
  let intervalIds: NodeJS.Timeout[] = [];
  const originalSetInterval = global.setInterval;

  beforeEach(async () => {
    // Track all created intervals
    global.setInterval = jest.fn((callback: any, delay: number) => {
      const id = originalSetInterval(callback, delay);
      intervalIds.push(id);
      return id;
    }) as any;

    // Mock Queue
    mockQueue = {
      getWaitingCount: jest.fn().mockResolvedValue(10),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getDelayedCount: jest.fn().mockResolvedValue(1),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 10,
        active: 2,
        completed: 100,
        failed: 0,
        delayed: 1,
      }),
      getWorkers: jest.fn().mockResolvedValue([{ id: 'worker1' }, { id: 'worker2' }]),
      isPaused: jest.fn().mockResolvedValue(false),
    };

    // Mock PrismaService
    mockPrismaService = {
      securityLog: {
        count: jest.fn().mockResolvedValue(1000),
        groupBy: jest.fn().mockResolvedValue([
          { eventType: 'LOGIN_SUCCESS', _count: 500 },
          { eventType: 'LOGIN_FAILED', _count: 200 },
          { eventType: 'ACCESS_DENIED', _count: 100 },
        ]),
      } as any,
    };

    // Mock IntegrityService
    mockIntegrityService = {
      verifyChainIntegrity: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMetricsService,
        {
          provide: getQueueToken(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME),
          useValue: mockQueue,
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: IntegrityService, useValue: mockIntegrityService },
      ],
    }).compile();

    service = module.get<SecurityMetricsService>(SecurityMetricsService);
  });

  afterEach(() => {
    // Clear all intervals
    intervalIds.forEach((id) => clearInterval(id));
    intervalIds = [];

    // Restore original setInterval
    global.setInterval = originalSetInterval;

    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start metrics collection on module init', async () => {
      await service.onModuleInit();

      expect(global.setInterval).toHaveBeenCalledTimes(2);
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000); // Queue metrics
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 60000); // Chain integrity
    });
  });

  describe('recordProcessingTime', () => {
    it('should record processing time for an event', () => {
      const eventType = 'LOGIN_SUCCESS';
      const duration = 150;

      service.recordProcessingTime(eventType, duration);

      const histogram = (service as any).queueProcessingTimeHistogram;
      expect(histogram.observe).toHaveBeenCalledWith({ event_type: eventType }, duration);
    });
  });

  describe('recordFailedJob', () => {
    it('should record a failed job', () => {
      const eventType = 'LOGIN_FAILED';
      const reason = 'Database connection error';

      service.recordFailedJob(eventType, reason);

      const counter = (service as any).failedJobsCounter;
      expect(counter.inc).toHaveBeenCalledWith({ event_type: eventType, reason });
    });
  });

  describe('recordApiRequest', () => {
    it('should record API request metrics', () => {
      const method = 'GET';
      const route = '/api/security-logs';
      const statusCode = 200;
      const duration = 45;

      service.recordApiRequest(method, route, statusCode, duration);

      const expectedLabels = {
        method,
        route,
        status_code: '200',
      };

      const counter = (service as any).apiRequestCounter;
      const histogram = (service as any).apiRequestDurationHistogram;

      expect(counter.inc).toHaveBeenCalledWith(expectedLabels);
      expect(histogram.observe).toHaveBeenCalledWith(expectedLabels, duration);
    });
  });

  describe('recordSecurityEvent', () => {
    it('should record a security event', () => {
      const eventType = 'USER_CREATED';
      const severity = 'INFO';

      service.recordSecurityEvent(eventType, severity);

      const counter = (service as any).securityEventCounter;
      expect(counter.inc).toHaveBeenCalledWith({ event_type: eventType, severity });
    });

    it('should record critical events separately', () => {
      const eventType = 'UNAUTHORIZED_ACCESS';
      const severity = 'CRITICAL';

      service.recordSecurityEvent(eventType, severity);

      const securityCounter = (service as any).securityEventCounter;
      const criticalCounter = (service as any).criticalEventCounter;

      expect(securityCounter.inc).toHaveBeenCalledWith({ event_type: eventType, severity });
      expect(criticalCounter.inc).toHaveBeenCalledWith({ event_type: eventType });
    });

    it('should use default severity when not provided', () => {
      const eventType = 'USER_LOGIN';

      service.recordSecurityEvent(eventType);

      const counter = (service as any).securityEventCounter;
      expect(counter.inc).toHaveBeenCalledWith({ event_type: eventType, severity: 'INFO' });
    });
  });

  describe('getMetrics', () => {
    it('should return prometheus metrics', async () => {
      const result = await service.getMetrics();

      expect(result).toBe('prometheus metrics string');
      expect((service as any).registry.metrics).toHaveBeenCalled();
    });
  });

  describe('getExtendedMetrics', () => {
    it('should return extended metrics with database and queue stats', async () => {
      const result = await service.getExtendedMetrics();

      expect(result).toEqual({
        prometheus: 'prometheus metrics string',
        database: {
          totalLogs: 1000,
          last24h: 1000,
          last7d: 1000,
          topEventTypes: [
            { eventType: 'LOGIN_SUCCESS', count: 500 },
            { eventType: 'LOGIN_FAILED', count: 200 },
            { eventType: 'ACCESS_DENIED', count: 100 },
          ],
        },
        queue: {
          jobs: {
            waiting: 10,
            active: 2,
            completed: 100,
            failed: 0,
            delayed: 1,
          },
          workerCount: 2,
          isPaused: false,
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle database stats errors gracefully', async () => {
      (mockPrismaService.securityLog.count as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getExtendedMetrics();

      expect(result.database).toBeNull();
      expect(result.prometheus).toBe('prometheus metrics string');
      expect(result.queue).toBeDefined();
    });

    it('should handle queue stats errors gracefully', async () => {
      (mockQueue.getJobCounts as jest.Mock).mockRejectedValue(new Error('Queue error'));

      const result = await service.getExtendedMetrics();

      expect(result.queue).toBeNull();
      expect(result.prometheus).toBe('prometheus metrics string');
      expect(result.database).toBeDefined();
    });
  });

  describe('private methods', () => {
    it('should update queue metrics periodically', async () => {
      jest.useFakeTimers();

      await service.onModuleInit();

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Wait for all pending timers
      await jest.runOnlyPendingTimersAsync();

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();

      const gauge = (service as any).queueSizeGauge;
      expect(gauge.set).toHaveBeenCalledWith({ status: 'waiting' }, 10);
      expect(gauge.set).toHaveBeenCalledWith({ status: 'active' }, 2);
      expect(gauge.set).toHaveBeenCalledWith({ status: 'delayed' }, 1);
      expect(gauge.set).toHaveBeenCalledWith({ status: 'failed' }, 0);

      jest.useRealTimers();
    });

    it('should update chain integrity metrics periodically', async () => {
      jest.useFakeTimers();

      await service.onModuleInit();

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      // Wait for promises to resolve
      await Promise.resolve();

      expect(mockIntegrityService.verifyChainIntegrity).toHaveBeenCalledWith(100);

      const gauge = (service as any).chainIntegrityGauge;
      const histogram = (service as any).chainVerificationTimeHistogram;

      expect(gauge.set).toHaveBeenCalledWith(1); // Valid chain
      expect(histogram.observe).toHaveBeenCalledWith(expect.any(Number));

      jest.useRealTimers();
    });

    it('should handle queue metrics update errors', async () => {
      (mockQueue.getWaitingCount as jest.Mock).mockRejectedValue(new Error('Queue error'));

      jest.useFakeTimers();

      await service.onModuleInit();

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Wait for promises to resolve
      await Promise.resolve();

      // Should not throw, just log error
      expect(mockQueue.getWaitingCount).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle chain integrity check errors', async () => {
      (mockIntegrityService.verifyChainIntegrity as jest.Mock).mockRejectedValue(
        new Error('Integrity check error'),
      );

      jest.useFakeTimers();

      await service.onModuleInit();

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      // Wait for promises to resolve
      await Promise.resolve();

      const gauge = (service as any).chainIntegrityGauge;
      expect(gauge.set).toHaveBeenCalledWith(0); // Invalid on error

      jest.useRealTimers();
    });

    it('should set chain integrity to 0 when invalid', async () => {
      (mockIntegrityService.verifyChainIntegrity as jest.Mock).mockResolvedValue(false);

      jest.useFakeTimers();

      await service.onModuleInit();

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      // Wait for promises to resolve
      await Promise.resolve();

      const gauge = (service as any).chainIntegrityGauge;
      expect(gauge.set).toHaveBeenCalledWith(0);

      jest.useRealTimers();
    });
  });

  describe('getRegistry', () => {
    it('should return the metrics registry', () => {
      const registry = service.getRegistry();

      expect(registry).toBeDefined();
      expect(registry.metrics).toBeDefined();
    });
  });

  describe('database stats', () => {
    it('should collect database stats with date filters', async () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      await service.getExtendedMetrics();

      expect(mockPrismaService.securityLog.count).toHaveBeenCalledWith();
      expect(mockPrismaService.securityLog.count).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: expect.any(Date) },
        },
      });

      // Check that the date is approximately 24 hours ago
      const call24h = (mockPrismaService.securityLog.count as jest.Mock).mock.calls[1];
      const date24h = call24h[0].where.createdAt.gte;
      expect(now - date24h.getTime()).toBeCloseTo(day, -10000); // Within 10 seconds

      // Check that the date is approximately 7 days ago
      const call7d = (mockPrismaService.securityLog.count as jest.Mock).mock.calls[2];
      const date7d = call7d[0].where.createdAt.gte;
      expect(now - date7d.getTime()).toBeCloseTo(7 * day, -10000); // Within 10 seconds
    });

    it('should group events by type', async () => {
      await service.getExtendedMetrics();

      expect(mockPrismaService.securityLog.groupBy).toHaveBeenCalledWith({
        by: ['eventType'],
        _count: true,
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      });
    });
  });
});
