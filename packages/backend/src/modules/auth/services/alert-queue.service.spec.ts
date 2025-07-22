import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Job } from 'bull';
import { AlertQueueService, AlertQueueJob } from './alert-queue.service';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityAlert, ThreatSeverity, AlertStatus } from '@prisma/generated/prisma';

// Mock logger
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

describe('AlertQueueService', () => {
  let service: AlertQueueService;

  const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayedCount: jest.fn(),
    getFailed: jest.fn(),
    getCompleted: jest.fn(),
    getJobs: jest.fn(),
  };

  const mockAlertDispatcher = {
    dispatchAlert: jest.fn(),
  };

  const mockPrismaService = {
    securityAlert: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const createMockAlert = (overrides: Partial<SecurityAlert> = {}) =>
    ({
      id: 'alert-1',
      type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
      severity: ThreatSeverity.MEDIUM,
      status: AlertStatus.PENDING,
      title: 'Test Alert',
      description: 'Test alert description',
      fingerprint: 'test-fingerprint',
      userId: 'user-123',
      userEmail: 'test@example.com',
      ipAddress: '192.168.1.1',
      sessionId: 'session-123',
      location: null,
      evidence: {},
      score: 50,
      isCorrelated: false,
      correlationId: null,
      correlatedAlerts: [],
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      eventType: 'LOGIN_FAILED',
      userAgent: 'Mozilla/5.0',
      context: {},
      firstSeen: new Date('2024-01-01T10:00:00Z'),
      lastSeen: new Date('2024-01-01T10:00:00Z'),
      occurrenceCount: 1,
      dispatchedChannels: [],
      dispatchAttempts: 0,
      lastDispatchAt: null,
      dispatchErrors: null,
      suppressedUntil: null,
      tags: [],
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    }) as SecurityAlert;

  const createMockJob = (
    data: AlertQueueJob,
    overrides: any = {},
  ): Partial<Job<AlertQueueJob>> => ({
    id: 'job-1',
    data,
    opts: {},
    progress: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    retry: jest.fn(),
    discard: jest.fn(),
    finished: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertQueueService,
        {
          provide: getQueueToken('alerts'),
          useValue: mockQueue,
        },
        {
          provide: AlertDispatcherService,
          useValue: mockAlertDispatcher,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AlertQueueService>(AlertQueueService);
  });

  describe('onModuleInit', () => {
    it('should setup queue processors and cleanup stale jobs', async () => {
      mockQueue.getCompleted.mockResolvedValue([]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 0 });

      await service.onModuleInit();

      expect(mockQueue.process).toHaveBeenCalledWith('process-alert', 5, expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
    });

    it('should cleanup stale completed jobs', async () => {
      const oldJob = createMockJob(
        { alertId: 'old-alert', priority: 1 },
        { finishedOn: Date.now() - 25 * 60 * 60 * 1000 }, // 25 hours ago
      );
      const recentJob = createMockJob(
        { alertId: 'recent-alert', priority: 1 },
        { finishedOn: Date.now() - 1 * 60 * 60 * 1000 }, // 1 hour ago
      );

      mockQueue.getCompleted.mockResolvedValue([oldJob, recentJob] as Job<AlertQueueJob>[]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 0 });

      await service.onModuleInit();

      expect(oldJob.remove).toHaveBeenCalled();
      expect(recentJob.remove).not.toHaveBeenCalled();
    });

    it('should reset stuck processing alerts', async () => {
      mockQueue.getCompleted.mockResolvedValue([]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 3 });

      await service.onModuleInit();

      expect(mockPrismaService.securityAlert.updateMany).toHaveBeenCalledWith({
        where: {
          status: AlertStatus.PROCESSING,
          updatedAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: AlertStatus.PENDING,
        },
      });
    });
  });

  describe('queueAlert', () => {
    it('should queue alert with correct priority', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      await service.queueAlert(alert);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-alert',
        {
          alertId: alert.id,
          priority: 2, // HIGH severity = priority 2
          retryCount: 0,
        },
        {
          priority: 2,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    });

    it('should assign correct priorities based on severity', async () => {
      const severityTests = [
        { severity: ThreatSeverity.CRITICAL, expectedPriority: 1 },
        { severity: ThreatSeverity.HIGH, expectedPriority: 2 },
        { severity: ThreatSeverity.MEDIUM, expectedPriority: 3 },
        { severity: ThreatSeverity.LOW, expectedPriority: 4 },
      ];

      for (const test of severityTests) {
        jest.clearAllMocks();
        const alert = createMockAlert({ severity: test.severity });

        await service.queueAlert(alert);

        expect(mockQueue.add).toHaveBeenCalledWith(
          'process-alert',
          expect.objectContaining({
            priority: test.expectedPriority,
          }),
          expect.objectContaining({
            priority: test.expectedPriority,
          }),
        );
      }
    });
  });

  describe('queueBatchAlerts', () => {
    it('should queue multiple alerts in batch', async () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', severity: ThreatSeverity.CRITICAL }),
        createMockAlert({ id: 'alert-2', severity: ThreatSeverity.MEDIUM }),
        createMockAlert({ id: 'alert-3', severity: ThreatSeverity.LOW }),
      ];

      await service.queueBatchAlerts(alerts);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'process-alert',
          data: { alertId: 'alert-1', priority: 1, retryCount: 0 },
          opts: expect.objectContaining({ priority: 1 }),
        },
        {
          name: 'process-alert',
          data: { alertId: 'alert-2', priority: 3, retryCount: 0 },
          opts: expect.objectContaining({ priority: 3 }),
        },
        {
          name: 'process-alert',
          data: { alertId: 'alert-3', priority: 4, retryCount: 0 },
          opts: expect.objectContaining({ priority: 4 }),
        },
      ]);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });

  describe('pauseProcessing', () => {
    it('should pause the queue', async () => {
      await service.pauseProcessing();

      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeProcessing', () => {
    it('should resume the queue', async () => {
      await service.resumeProcessing();

      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('clearFailedJobs', () => {
    it('should clear all failed jobs', async () => {
      const failedJobs = [
        createMockJob({ alertId: 'failed-1', priority: 1 }),
        createMockJob({ alertId: 'failed-2', priority: 1 }),
      ];

      mockQueue.getFailed.mockResolvedValue(failedJobs as Job<AlertQueueJob>[]);

      await service.clearFailedJobs();

      expect(failedJobs[0].remove).toHaveBeenCalled();
      expect(failedJobs[1].remove).toHaveBeenCalled();
    });

    it('should handle empty failed jobs list', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      await service.clearFailedJobs();

      // Should not throw
      expect(mockQueue.getFailed).toHaveBeenCalled();
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry all failed jobs', async () => {
      const failedJobs = [
        createMockJob({ alertId: 'failed-1', priority: 1 }),
        createMockJob({ alertId: 'failed-2', priority: 1 }),
      ];

      mockQueue.getFailed.mockResolvedValue(failedJobs as Job<AlertQueueJob>[]);

      await service.retryFailedJobs();

      expect(failedJobs[0].retry).toHaveBeenCalled();
      expect(failedJobs[1].retry).toHaveBeenCalled();
    });
  });

  describe('getJobByAlertId', () => {
    it('should find job by alert ID', async () => {
      const jobs = [
        createMockJob({ alertId: 'alert-1', priority: 1 }),
        createMockJob({ alertId: 'alert-2', priority: 2 }),
        createMockJob({ alertId: 'alert-3', priority: 3 }),
      ];

      mockQueue.getJobs.mockResolvedValue(jobs as Job<AlertQueueJob>[]);

      const job = await service.getJobByAlertId('alert-2');

      expect(job).toBe(jobs[1]);
      expect(mockQueue.getJobs).toHaveBeenCalledWith([
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      ]);
    });

    it('should return undefined if job not found', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      const job = await service.getJobByAlertId('non-existent');

      expect(job).toBeUndefined();
    });
  });

  describe('removeJobByAlertId', () => {
    it('should remove job by alert ID', async () => {
      const job = createMockJob({ alertId: 'alert-1', priority: 1 });
      mockQueue.getJobs.mockResolvedValue([job as Job<AlertQueueJob>]);

      const result = await service.removeJobByAlertId('alert-1');

      expect(result).toBe(true);
      expect(job.remove).toHaveBeenCalled();
    });

    it('should return false if job not found', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      const result = await service.removeJobByAlertId('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Queue processor', () => {
    let processor: (...args: any[]) => any;

    beforeEach(async () => {
      await service.onModuleInit();
      // Capture the processor function
      processor = mockQueue.process.mock.calls[0][2];
    });

    it('should process alert successfully', async () => {
      const alert = createMockAlert({ status: AlertStatus.PENDING });
      const job = createMockJob({ alertId: alert.id, priority: 1, retryCount: 0 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(alert);
      mockAlertDispatcher.dispatchAlert.mockResolvedValue({
        success: true,
        dispatchedChannels: ['email', 'webhook'],
        failedChannels: [],
        errors: {},
      });

      await processor(job);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: { status: AlertStatus.PROCESSING },
      });

      expect(mockAlertDispatcher.dispatchAlert).toHaveBeenCalledWith(alert);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          status: AlertStatus.DISPATCHED,
          dispatchedChannels: ['email', 'webhook'],
          lastDispatchAt: expect.any(Date),
          dispatchAttempts: { increment: 1 },
        },
      });
    });

    it('should skip already processed alerts', async () => {
      const alert = createMockAlert({ status: AlertStatus.DISPATCHED });
      const job = createMockJob({ alertId: alert.id, priority: 1, retryCount: 0 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(alert);

      await processor(job);

      expect(mockAlertDispatcher.dispatchAlert).not.toHaveBeenCalled();
      expect(mockPrismaService.securityAlert.update).not.toHaveBeenCalled();
    });

    it('should handle partial dispatch success', async () => {
      const alert = createMockAlert({ status: AlertStatus.PENDING });
      const job = createMockJob({ alertId: alert.id, priority: 1, retryCount: 0 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(alert);
      mockAlertDispatcher.dispatchAlert.mockResolvedValue({
        success: false,
        dispatchedChannels: ['email'],
        failedChannels: ['webhook'],
        errors: { webhook: 'Connection failed' },
      });

      await processor(job);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          status: AlertStatus.DISPATCHED, // Partial success still counts as dispatched
          dispatchedChannels: ['email'],
          dispatchErrors: { webhook: 'Connection failed' },
          lastDispatchAt: expect.any(Date),
          dispatchAttempts: { increment: 1 },
        },
      });
    });

    it('should throw error on complete dispatch failure', async () => {
      const alert = createMockAlert({ status: AlertStatus.PENDING });
      const job = createMockJob({ alertId: alert.id, priority: 1, retryCount: 0 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(alert);
      mockAlertDispatcher.dispatchAlert.mockResolvedValue({
        success: false,
        dispatchedChannels: [],
        failedChannels: ['email', 'webhook'],
        errors: { email: 'SMTP error', webhook: 'Connection failed' },
      });

      await expect(processor(job)).rejects.toThrow('All dispatch attempts failed');

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          status: AlertStatus.FAILED,
          dispatchedChannels: [],
          dispatchErrors: { email: 'SMTP error', webhook: 'Connection failed' },
          lastDispatchAt: expect.any(Date),
          dispatchAttempts: { increment: 1 },
        },
      });
    });

    it('should handle alert not found error', async () => {
      const job = createMockJob({ alertId: 'non-existent', priority: 1, retryCount: 0 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(null);

      await expect(processor(job)).rejects.toThrow('Alert non-existent not found');

      expect(mockAlertDispatcher.dispatchAlert).not.toHaveBeenCalled();
    });

    it('should update alert with error on processing failure', async () => {
      const alert = createMockAlert({ status: AlertStatus.PENDING });
      const job = createMockJob({ alertId: alert.id, priority: 1, retryCount: 1 });

      mockPrismaService.securityAlert.findUnique.mockResolvedValue(alert);
      mockAlertDispatcher.dispatchAlert.mockRejectedValue(new Error('Network error'));

      await expect(processor(job)).rejects.toThrow('Network error');

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          dispatchErrors: {
            message: 'Network error',
            retryCount: 2,
            timestamp: expect.any(String),
          },
        },
      });
    });
  });

  describe('Queue event handlers', () => {
    const handlers: { [key: string]: (...args: any[]) => any } = {};

    beforeEach(async () => {
      await service.onModuleInit();

      // Capture event handlers
      mockQueue.on.mock.calls.forEach(([event, handler]) => {
        handlers[event] = handler;
      });
    });

    it('should handle completed event', () => {
      const job = createMockJob({ alertId: 'alert-1', priority: 1 });

      // Should not throw
      handlers.completed(job);

      expect(handlers.completed).toBeDefined();
    });

    it('should handle failed event', () => {
      const job = createMockJob({ alertId: 'alert-1', priority: 1 });
      const error = new Error('Test error');

      // Should not throw
      handlers.failed(job, error);

      expect(handlers.failed).toBeDefined();
    });

    it('should handle stalled event', () => {
      const job = createMockJob({ alertId: 'alert-1', priority: 1 });

      // Should not throw
      handlers.stalled(job);

      expect(handlers.stalled).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined severity in priority calculation', async () => {
      const alert = createMockAlert({ severity: undefined as any });

      await service.queueAlert(alert);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-alert',
        expect.objectContaining({
          priority: 5, // Default priority
        }),
        expect.any(Object),
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockQueue.getCompleted.mockRejectedValue(new Error('Redis error'));

      // Should not throw during init
      await service.onModuleInit();

      // Service should still be initialized
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it('should handle empty batch queue', async () => {
      await service.queueBatchAlerts([]);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([]);
    });

    it('should handle concurrent job operations', async () => {
      const alerts = Array(10)
        .fill(null)
        .map((_, i) => createMockAlert({ id: `alert-${i}`, severity: ThreatSeverity.HIGH }));

      const promises = alerts.map((alert) => service.queueAlert(alert));

      await Promise.all(promises);

      expect(mockQueue.add).toHaveBeenCalledTimes(10);
    });
  });
});
