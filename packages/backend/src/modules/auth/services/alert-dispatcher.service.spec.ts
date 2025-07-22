import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  AlertStatus,
  NotificationStatus,
  SecurityAlert,
  ThreatSeverity,
} from '@prisma/generated/prisma';
import { CircuitBreakerState } from '@/common/utils/circuit-breaker.util';

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

// Mock circuit breaker
const mockCircuitBreakerInstances = new Map();

jest.mock('@/common/utils/circuit-breaker.util', () => {
  return {
    CircuitBreaker: jest.fn((name) => {
      const mockCircuitBreaker = {
        execute: jest.fn((fn) => fn()),
        getStatus: jest.fn().mockReturnValue({
          state: 'CLOSED',
          failures: 0,
          successes: 0,
          recentCallCount: 0,
          recentFailureRate: 0,
        }),
      };
      mockCircuitBreakerInstances.set(name, mockCircuitBreaker);
      return mockCircuitBreaker;
    }),
    CircuitBreakerState: {
      CLOSED: 'CLOSED',
      OPEN: 'OPEN',
      HALF_OPEN: 'HALF_OPEN',
    },
  };
});

// Mock retry util
jest.mock('@/common/utils/retry.util', () => ({
  RetryUtil: jest.fn().mockImplementation(() => ({
    executeWithRetry: jest.fn((fn) => fn()),
  })),
}));

describe('AlertDispatcherService', () => {
  let service: AlertDispatcherService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ALERT_CHANNELS_LOW: ['email'],
        ALERT_CHANNELS_MEDIUM: ['email'],
        ALERT_CHANNELS_HIGH: ['email', 'webhook'],
        ALERT_CHANNELS_CRITICAL: ['email', 'webhook'],
        ALERT_RATE_LIMIT_USER: 10,
        ALERT_RATE_LIMIT_GLOBAL: 100,
        ALERT_RETRY_MAX_ATTEMPTS: 3,
        ALERT_RETRY_BACKOFF: 2,
        ALERT_RETRY_MAX_BACKOFF: 30000,
        ALERT_CB_EMAIL_THRESHOLD: 5,
        ALERT_CB_EMAIL_DURATION: 60000,
        ALERT_CB_EMAIL_SUCCESS: 3,
        ALERT_CB_WEBHOOK_THRESHOLD: 5,
        ALERT_CB_WEBHOOK_DURATION: 60000,
        ALERT_CB_WEBHOOK_SUCCESS: 3,
        SECURITY_ALERT_EMAIL: 'security@example.com',
        SECURITY_ALERT_WEBHOOK_URL: 'https://webhook.example.com/alerts',
        APP_URL: 'https://app.example.com',
        APP_NAME: 'Security System',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockPrismaService = {
    securityAlert: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    alertNotification: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockNotificationService = {
    getChannels: jest.fn().mockReturnValue(['email', 'webhook']),
    getEnabledChannels: jest.fn().mockReturnValue(['email', 'webhook']),
    send: jest.fn(),
  };

  const mockModuleRef = {
    get: jest.fn().mockResolvedValue(mockNotificationService),
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
      evidence: { attempts: 5 },
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const CircuitBreaker = require('@/common/utils/circuit-breaker.util').CircuitBreaker;
    CircuitBreaker.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertDispatcherService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<AlertDispatcherService>(AlertDispatcherService);

    // Trigger onModuleInit
    await service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should initialize notification service and circuit breakers', async () => {
      expect(mockModuleRef.get).toHaveBeenCalledWith(NotificationService, { strict: false });

      const CircuitBreaker = require('@/common/utils/circuit-breaker.util').CircuitBreaker;
      expect(CircuitBreaker).toHaveBeenCalledWith('AlertDispatch-email', expect.any(Object));
      expect(CircuitBreaker).toHaveBeenCalledWith('AlertDispatch-webhook', expect.any(Object));
    });

    it('should handle notification service initialization failure', async () => {
      const failingModuleRef = {
        get: jest.fn().mockRejectedValue(new Error('Service not found')),
      };

      const failingModule = await Test.createTestingModule({
        providers: [
          AlertDispatcherService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: EventEmitter2, useValue: mockEventEmitter },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ModuleRef, useValue: failingModuleRef },
        ],
      }).compile();

      const failingService = failingModule.get<AlertDispatcherService>(AlertDispatcherService);
      await failingService.onModuleInit();

      // Should not throw, just log error
      expect(failingModuleRef.get).toHaveBeenCalled();
    });
  });

  describe('dispatchAlert', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      mockNotificationService.getEnabledChannels.mockReturnValue(['email', 'webhook']);
      mockNotificationService.send.mockResolvedValue(undefined);

      // Reset all circuit breaker instances to closed state
      mockCircuitBreakerInstances.forEach((mockCB) => {
        mockCB.getStatus.mockReturnValue({ state: CircuitBreakerState.CLOSED });
        mockCB.execute.mockImplementation((fn) => fn());
      });
    });

    it('should successfully dispatch alert to configured channels', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockPrismaService.alertNotification.count.mockResolvedValue(0); // No rate limiting
      mockPrismaService.securityAlert.update.mockResolvedValue({});
      mockPrismaService.alertNotification.create.mockResolvedValue({
        id: 'notification-1',
        alertId: alert.id,
        channel: 'email',
        status: NotificationStatus.QUEUED,
      });
      mockPrismaService.alertNotification.update.mockResolvedValue({});

      const result = await service.dispatchAlert(alert);

      expect(result).toEqual({
        success: true,
        dispatchedChannels: ['email', 'webhook'],
        failedChannels: [],
        errors: {},
      });

      expect(mockNotificationService.send).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          status: AlertStatus.DISPATCHED,
          dispatchedChannels: ['email', 'webhook'],
          dispatchAttempts: { increment: 1 },
          lastDispatchAt: expect.any(Date),
          dispatchErrors: {},
        },
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alert.dispatch.completed', {
        alertId: alert.id,
        results: expect.any(Object),
        processingTime: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });

    it('should respect rate limits per user', async () => {
      const alert = createMockAlert({ userId: 'user-123' });

      mockPrismaService.alertNotification.count
        .mockResolvedValueOnce(10) // User limit reached
        .mockResolvedValueOnce(0); // Global limit ok

      const result = await service.dispatchAlert(alert);

      expect(result).toEqual({
        success: false,
        dispatchedChannels: [],
        failedChannels: [],
        errors: { rateLimit: 'Rate limit exceeded' },
      });

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });

    it('should respect global rate limits', async () => {
      const alert = createMockAlert();

      // Clear any previous mock setups
      mockPrismaService.alertNotification.count.mockReset();
      mockPrismaService.alertNotification.count
        .mockResolvedValueOnce(0) // User limit ok
        .mockResolvedValueOnce(100); // Global limit reached

      const result = await service.dispatchAlert(alert);

      expect(result).toEqual({
        success: false,
        dispatchedChannels: [],
        failedChannels: [],
        errors: { rateLimit: 'Rate limit exceeded' },
      });

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });

    it('should handle no configured channels for severity', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.LOW });
      mockNotificationService.getEnabledChannels.mockReturnValue([]); // No enabled channels
      mockPrismaService.alertNotification.count.mockResolvedValue(0); // No rate limiting

      const result = await service.dispatchAlert(alert);

      expect(result).toEqual({
        success: false,
        dispatchedChannels: [],
        failedChannels: [],
        errors: { config: 'No channels configured' },
      });
    });

    it('should handle circuit breaker open state', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      // Set all circuit breakers to open state
      mockCircuitBreakerInstances.forEach((mockCB) => {
        mockCB.getStatus.mockReturnValue({ state: CircuitBreakerState.OPEN });
      });

      const result = await service.dispatchAlert(alert);

      expect(result.dispatchedChannels).toHaveLength(0);
      expect(result.failedChannels).toContain('email');
      expect(result.failedChannels).toContain('webhook');
    });

    it('should handle notification send failures', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({
        id: 'notification-1',
      });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      // Mock circuit breaker to throw error for all instances
      mockCircuitBreakerInstances.forEach((mockCB) => {
        mockCB.execute.mockRejectedValue(new Error('Send failed'));
      });

      const result = await service.dispatchAlert(alert);

      expect(result.success).toBe(false);
      expect(result.failedChannels).toContain('email');
      expect(result.failedChannels).toContain('webhook');
      expect(result.errors.email).toBe('Dispatch failed');
      expect(result.errors.webhook).toBe('Dispatch failed');
    });

    it('should build correct notification for email channel', async () => {
      const alert = createMockAlert({
        severity: ThreatSeverity.CRITICAL,
        userEmail: 'user@example.com',
      });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          recipient: {
            email: 'security@example.com',
            name: 'Security Team',
          },
          subject: '🔴 Security Alert: Test Alert',
          priority: 'critical',
          data: expect.objectContaining({
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
          }),
          templates: {
            html: expect.stringContaining('Security Alert'),
            text: expect.stringContaining('SECURITY ALERT - CRITICAL SEVERITY'),
          },
        }),
      );
    });

    it('should build correct notification for webhook channel', async () => {
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'webhook',
          recipient: {
            url: 'https://webhook.example.com/alerts',
            headers: {
              'X-Alert-ID': alert.id,
              'X-Alert-Type': alert.type,
              'X-Alert-Severity': alert.severity,
            },
          },
        }),
      );
    });

    it('should handle database errors gracefully', async () => {
      const alert = createMockAlert();
      mockPrismaService.alertNotification.count.mockRejectedValue(new Error('Database error'));

      const result = await service.dispatchAlert(alert);

      expect(result).toEqual({
        success: false,
        dispatchedChannels: [],
        failedChannels: [],
        errors: { system: 'Database error' },
      });

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: { status: AlertStatus.FAILED },
      });
    });

    it('should handle missing notification service', async () => {
      // Create service without notification service
      const noNotificationModuleRef = {
        get: jest.fn().mockResolvedValue(null),
      };

      const mockPrismaServiceForNoNotification = {
        securityAlert: {
          findMany: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
          count: jest.fn(),
        },
        alertNotification: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
          update: jest.fn(),
          groupBy: jest.fn(),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          AlertDispatcherService,
          { provide: PrismaService, useValue: mockPrismaServiceForNoNotification },
          { provide: EventEmitter2, useValue: mockEventEmitter },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ModuleRef, useValue: noNotificationModuleRef },
        ],
      }).compile();

      const serviceWithoutNotification = module.get<AlertDispatcherService>(AlertDispatcherService);
      await serviceWithoutNotification.onModuleInit();

      const alert = createMockAlert();

      const result = await serviceWithoutNotification.dispatchAlert(alert);

      expect(result.success).toBe(false);
      // When notification service is missing, it might return early without attempting channels
      expect(result.dispatchedChannels).toEqual([]);
      expect(result.errors).toBeDefined();
    });
  });

  describe('retryFailedDispatches', () => {
    it('should retry failed dispatches successfully', async () => {
      const failedAlerts = [
        createMockAlert({ status: AlertStatus.FAILED, dispatchAttempts: 1 }),
        createMockAlert({ id: 'alert-2', status: AlertStatus.FAILED, dispatchAttempts: 2 }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(failedAlerts);
      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.retryFailedDispatches();

      expect(result).toEqual({
        processed: 2,
        succeeded: 2,
        failed: 0,
      });

      expect(mockPrismaService.securityAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: AlertStatus.FAILED,
          lastDispatchAt: { gte: expect.any(Date) },
          dispatchAttempts: { lt: 3 },
        },
        orderBy: { severity: 'desc' },
        take: 50,
      });
    });

    it('should handle partial success in retry', async () => {
      const failedAlerts = [
        createMockAlert({ status: AlertStatus.FAILED }),
        createMockAlert({ id: 'alert-2', status: AlertStatus.FAILED }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(failedAlerts);

      // First alert succeeds, second fails
      mockPrismaService.alertNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(100); // Rate limited

      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.retryFailedDispatches();

      expect(result).toEqual({
        processed: 2,
        succeeded: 1,
        failed: 1,
      });
    });

    it('should use custom cutoff date', async () => {
      const customCutoff = new Date('2024-01-01T00:00:00Z');
      mockPrismaService.securityAlert.findMany.mockResolvedValue([]);

      await service.retryFailedDispatches(customCutoff);

      expect(mockPrismaService.securityAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: AlertStatus.FAILED,
          lastDispatchAt: { gte: customCutoff },
          dispatchAttempts: { lt: 3 },
        },
        orderBy: { severity: 'desc' },
        take: 50,
      });
    });
  });

  describe('getDispatchStatistics', () => {
    it('should return comprehensive dispatch statistics', async () => {
      mockPrismaService.securityAlert.count
        .mockResolvedValueOnce(100) // Total
        .mockResolvedValueOnce(70) // Dispatched
        .mockResolvedValueOnce(20) // Pending
        .mockResolvedValueOnce(10); // Failed

      mockPrismaService.alertNotification.groupBy.mockResolvedValue([
        { channel: 'email', status: NotificationStatus.SENT, _count: 50 },
        { channel: 'email', status: NotificationStatus.FAILED, _count: 5 },
        { channel: 'webhook', status: NotificationStatus.SENT, _count: 20 },
        { channel: 'webhook', status: NotificationStatus.QUEUED, _count: 5 },
      ]);

      const result = await service.getDispatchStatistics();

      expect(result).toEqual({
        total: 100,
        byStatus: {
          dispatched: 70,
          pending: 20,
          failed: 10,
        },
        byChannel: {
          email: 55,
          webhook: 25,
        },
        avgDispatchTime: 0, // TODO placeholder
        successRate: 0.875, // 70 sent out of 80 total (50+20 sent, 5+5 failed/queued)
      });
    });

    it('should handle empty statistics', async () => {
      mockPrismaService.securityAlert.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.groupBy.mockResolvedValue([]);

      const result = await service.getDispatchStatistics();

      expect(result).toEqual({
        total: 0,
        byStatus: {
          dispatched: 0,
          pending: 0,
          failed: 0,
        },
        byChannel: {},
        avgDispatchTime: 0,
        successRate: 0,
      });
    });
  });

  describe('Notification templates', () => {
    it('should generate correct HTML template with evidence', async () => {
      const alert = createMockAlert({
        severity: ThreatSeverity.HIGH,
        evidence: { loginAttempts: 5, locations: ['USA', 'Russia'] },
      });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      const sendCall = mockNotificationService.send.mock.calls[0][0];
      const htmlTemplate = sendCall.templates.html;

      expect(htmlTemplate).toContain('Security Alert');
      expect(htmlTemplate).toContain('HIGH Severity');
      expect(htmlTemplate).toContain(alert.title);
      expect(htmlTemplate).toContain(alert.description);
      expect(htmlTemplate).toContain('Evidence');
      expect(htmlTemplate).toContain('loginAttempts');
    });

    it('should generate correct text template', async () => {
      const alert = createMockAlert({
        severity: ThreatSeverity.CRITICAL,
        evidence: { suspicious: true },
      });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      const sendCall = mockNotificationService.send.mock.calls[0][0];
      const textTemplate = sendCall.templates.text;

      expect(textTemplate).toContain('SECURITY ALERT - CRITICAL SEVERITY');
      expect(textTemplate).toContain(alert.title);
      expect(textTemplate).toContain(alert.description);
      expect(textTemplate).toContain('EVIDENCE:');
      expect(textTemplate).toContain('suspicious');
    });

    it('should use correct severity emojis in subject', async () => {
      const severityTests = [
        { severity: ThreatSeverity.LOW, emoji: '🔵' },
        { severity: ThreatSeverity.MEDIUM, emoji: '🟡' },
        { severity: ThreatSeverity.HIGH, emoji: '🟠' },
        { severity: ThreatSeverity.CRITICAL, emoji: '🔴' },
      ];

      for (const test of severityTests) {
        jest.clearAllMocks();

        const alert = createMockAlert({ severity: test.severity });
        mockPrismaService.alertNotification.count.mockResolvedValue(0);
        mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
        mockPrismaService.alertNotification.update.mockResolvedValue({});

        await service.dispatchAlert(alert);

        const sendCall = mockNotificationService.send.mock.calls[0][0];
        expect(sendCall.subject).toContain(test.emoji);
      }
    });
  });

  describe('Circuit breaker handling', () => {
    it('should handle circuit breaker open error', async () => {
      const alert = createMockAlert();

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      mockCircuitBreakerInstances.forEach((mockCB) => {
        mockCB.execute.mockRejectedValue({ name: 'CircuitBreakerOpenError' });
      });

      const result = await service.dispatchAlert(alert);

      expect(result.success).toBe(false);
      expect(result.failedChannels).toContain('email');
    });
  });

  describe('Edge cases', () => {
    it('should handle alert with no user information', async () => {
      const alert = createMockAlert({
        userId: null,
        userEmail: null,
      });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      expect(mockNotificationService.send).toHaveBeenCalled();
      const sendCall = mockNotificationService.send.mock.calls[0][0];
      expect(sendCall.data.userEmail).toBeNull();
      expect(sendCall.templates.html).toContain('Unknown');
    });

    it('should handle very large evidence objects', async () => {
      const largeEvidence = {};
      for (let i = 0; i < 100; i++) {
        largeEvidence[`field${i}`] = `value${i}`;
      }

      const alert = createMockAlert({
        evidence: largeEvidence,
      });

      mockPrismaService.alertNotification.count.mockResolvedValue(0);
      mockPrismaService.alertNotification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.alertNotification.update.mockResolvedValue({});
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      await service.dispatchAlert(alert);

      expect(mockNotificationService.send).toHaveBeenCalled();
      const sendCall = mockNotificationService.send.mock.calls[0][0];
      expect(sendCall.data.evidence).toEqual(largeEvidence);
    });
  });
});
