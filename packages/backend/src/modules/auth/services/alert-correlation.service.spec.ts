import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertCorrelationService } from './alert-correlation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AlertType, SecurityAlert } from '@prisma/generated/prisma';
import * as crypto from 'crypto';

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

// Mock crypto for predictable UUIDs in tests
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

describe('AlertCorrelationService', () => {
  let service: AlertCorrelationService;
  let prismaService: PrismaService;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ALERT_CORRELATION_WINDOW: 3600000, // 1 hour
        ALERT_CORRELATION_MIN_ALERTS: 3,
        ALERT_CORRELATION_AUTO_ESCALATE: true,
        ALERT_ESCALATION_CRITICAL_COUNT: 2,
        ALERT_ESCALATION_HIGH_COUNT: 3,
        ALERT_ESCALATION_TOTAL_COUNT: 5,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockPrismaService = {
    securityAlert: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const createMockAlert = (overrides: Partial<SecurityAlert> = {}) =>
    ({
      id: 'alert-1',
      type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
      severity: 'MEDIUM' as const,
      status: 'PENDING' as const,
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

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    (crypto.randomUUID as jest.Mock).mockReturnValue('test-correlation-id');

    // Reset the mock implementation to default
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ALERT_CORRELATION_WINDOW: 3600000, // 1 hour
        ALERT_CORRELATION_MIN_ALERTS: 3,
        ALERT_CORRELATION_AUTO_ESCALATE: true,
        ALERT_ESCALATION_CRITICAL_COUNT: 2,
        ALERT_ESCALATION_HIGH_COUNT: 3,
        ALERT_ESCALATION_TOTAL_COUNT: 5,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertCorrelationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AlertCorrelationService>(AlertCorrelationService);
    prismaService = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('correlateAlert', () => {
    it('should return empty correlation when no related alerts found', async () => {
      const alert = createMockAlert();
      mockPrismaService.securityAlert.findMany.mockResolvedValue([]);

      const result = await service.correlateAlert(alert);

      expect(result).toEqual({
        correlationId: 'test-correlation-id',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });

      expect(mockPrismaService.securityAlert.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: expect.arrayContaining([
                { userId: 'user-123' },
                { ipAddress: '192.168.1.1' },
                { sessionId: 'session-123' },
                { userEmail: 'test@example.com' },
                { ruleId: 'rule-1' },
              ]),
            },
          ]),
        }),
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should correlate alerts by user ID', async () => {
      const alert = createMockAlert({ userId: 'user-123' });
      const relatedAlert = createMockAlert({
        id: 'alert-2',
        userId: 'user-123',
        ipAddress: '192.168.1.2',
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([relatedAlert]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.relatedAlerts).toHaveLength(1);
      expect(result.correlationScore).toBeGreaterThan(0);
      expect(result.correlationId).toBe('test-correlation-id');
    });

    it('should use existing correlation ID from related alerts', async () => {
      const alert = createMockAlert();
      const relatedAlert = createMockAlert({
        id: 'alert-2',
        correlationId: 'existing-correlation-id',
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([relatedAlert]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.correlationId).toBe('existing-correlation-id');
    });

    it('should detect brute force attack pattern', async () => {
      const alert = createMockAlert({ type: 'BRUTE_FORCE_ATTEMPT' as const });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', type: AlertType.MULTIPLE_FAILED_ATTEMPTS }),
        createMockAlert({ id: 'alert-3', type: AlertType.MULTIPLE_FAILED_ATTEMPTS }),
        createMockAlert({ id: 'alert-4', type: 'BRUTE_FORCE_ATTEMPT' as const }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.patterns).toContain('brute_force_attack');
    });

    it('should detect distributed attack pattern', async () => {
      const alert = createMockAlert({ userId: 'user-123', ipAddress: '192.168.1.1' });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', userId: 'user-123', ipAddress: '192.168.1.2' }),
        createMockAlert({ id: 'alert-3', userId: 'user-123', ipAddress: '192.168.1.3' }),
        createMockAlert({ id: 'alert-4', userId: 'user-123', ipAddress: '192.168.1.4' }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.patterns).toContain('distributed_attack');
    });

    it('should detect rapid fire attack pattern', async () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const alert = createMockAlert({ createdAt: baseTime });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', createdAt: new Date(baseTime.getTime() + 1000) }),
        createMockAlert({ id: 'alert-3', createdAt: new Date(baseTime.getTime() + 2000) }),
        createMockAlert({ id: 'alert-4', createdAt: new Date(baseTime.getTime() + 3000) }),
        createMockAlert({ id: 'alert-5', createdAt: new Date(baseTime.getTime() + 4000) }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 6 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.patterns).toContain('rapid_fire_attack');
    });

    it('should detect account takeover attempt pattern', async () => {
      const alert = createMockAlert({ type: 'SUSPICIOUS_LOGIN' as const });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', type: 'ANOMALY_DETECTED' as const }),
        createMockAlert({ id: 'alert-3', type: AlertType.MULTIPLE_FAILED_ATTEMPTS }),
        createMockAlert({ id: 'alert-4', type: 'BRUTE_FORCE_ATTEMPT' as const }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.patterns).toContain('account_takeover_attempt');
    });

    it('should detect credential stuffing pattern', async () => {
      const alert = createMockAlert({ ipAddress: '192.168.1.1', userId: 'user-1' });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', ipAddress: '192.168.1.1', userId: 'user-2' }),
        createMockAlert({ id: 'alert-3', ipAddress: '192.168.1.1', userId: 'user-3' }),
        createMockAlert({ id: 'alert-4', ipAddress: '192.168.1.1', userId: 'user-4' }),
        createMockAlert({ id: 'alert-5', ipAddress: '192.168.1.1', userId: 'user-5' }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 6 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.patterns).toContain('credential_stuffing');
    });

    it('should escalate based on critical alert count', async () => {
      const alert = createMockAlert({ severity: 'CRITICAL' as const });
      const relatedAlerts = [createMockAlert({ id: 'alert-2', severity: 'CRITICAL' as const })];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('2 critical alerts');
    });

    it('should escalate based on high alert count', async () => {
      const alert = createMockAlert({ severity: 'HIGH' as const });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', severity: 'HIGH' as const }),
        createMockAlert({ id: 'alert-3', severity: 'HIGH' as const }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 3 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('3 high severity alerts');
    });

    it('should escalate based on dangerous patterns', async () => {
      const alert = createMockAlert({ type: 'SUSPICIOUS_LOGIN' as const });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', type: 'ANOMALY_DETECTED' as const }),
        createMockAlert({ id: 'alert-3', type: AlertType.MULTIPLE_FAILED_ATTEMPTS }),
        createMockAlert({ id: 'alert-4', type: 'BRUTE_FORCE_ATTEMPT' as const }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('Dangerous pattern detected');
      expect(result.escalationReason).toContain('account_takeover_attempt');
    });

    it('should calculate correlation score correctly', async () => {
      const alert = createMockAlert({
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        sessionId: 'session-123',
        ruleId: 'rule-1',
        severity: 'HIGH' as const,
        type: 'BRUTE_FORCE_ATTEMPT' as const,
      });

      const relatedAlert = createMockAlert({
        id: 'alert-2',
        userId: 'user-123', // Same user: +30
        ipAddress: '192.168.1.1', // Same IP: +25
        sessionId: 'session-123', // Same session: +40
        ruleId: 'rule-1', // Same rule: +20
        severity: 'HIGH' as const, // Same severity: +15
        type: 'BRUTE_FORCE_ATTEMPT' as const, // Same type: +15
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([relatedAlert]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      // Score should be high due to many matching attributes
      expect(result.correlationScore).toBeGreaterThan(90);
    });

    it('should handle correlation with no common fields', async () => {
      const alert = createMockAlert({
        userId: null,
        ipAddress: null,
        sessionId: null,
        userEmail: null,
        ruleId: null,
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([]);

      const result = await service.correlateAlert(alert);

      expect(result.relatedAlerts).toHaveLength(0);
      expect(mockPrismaService.securityAlert.findMany).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const alert = createMockAlert();
      mockPrismaService.securityAlert.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.correlateAlert(alert)).rejects.toThrow('Database error');
    });

    it('should not escalate when auto-escalate is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ALERT_CORRELATION_AUTO_ESCALATE') return false;
        const config: Record<string, any> = {
          ALERT_CORRELATION_WINDOW: 3600000,
          ALERT_CORRELATION_MIN_ALERTS: 3,
          ALERT_ESCALATION_CRITICAL_COUNT: 2,
          ALERT_ESCALATION_HIGH_COUNT: 3,
          ALERT_ESCALATION_TOTAL_COUNT: 5,
        };
        return config[key] ?? defaultValue;
      });

      const alertService = new AlertCorrelationService(
        prismaService as any,
        eventEmitter as any,
        configService as any,
      );

      const alert = createMockAlert({ severity: 'CRITICAL' as const });
      const relatedAlerts = [
        createMockAlert({ id: 'alert-2', severity: 'CRITICAL' as const }),
        createMockAlert({ id: 'alert-3', severity: 'CRITICAL' as const }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 3 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await alertService.correlateAlert(alert);

      expect(result.shouldEscalate).toBe(false);
    });
  });

  describe('getCorrelationGroup', () => {
    it('should retrieve all alerts in a correlation group', async () => {
      const correlationId = 'correlation-123';
      const alerts = [
        createMockAlert({ correlationId }),
        createMockAlert({ id: 'alert-2', correlationId }),
        createMockAlert({ id: 'alert-3', correlationId }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(alerts);

      const result = await service.getCorrelationGroup(correlationId);

      expect(result).toHaveLength(3);
      expect(mockPrismaService.securityAlert.findMany).toHaveBeenCalledWith({
        where: { correlationId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('analyzeCorrelationGroup', () => {
    it('should analyze correlation group and provide summary', async () => {
      const correlationId = 'correlation-123';
      const alerts = [
        createMockAlert({
          correlationId,
          severity: 'CRITICAL' as const,
          type: 'BRUTE_FORCE_ATTEMPT' as const,
          userId: 'user-1',
          ipAddress: '192.168.1.1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockAlert({
          id: 'alert-2',
          correlationId,
          severity: 'HIGH' as const,
          type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
          userId: 'user-1',
          ipAddress: '192.168.1.2',
          createdAt: new Date('2024-01-01T10:01:00Z'),
        }),
        createMockAlert({
          id: 'alert-3',
          correlationId,
          severity: 'HIGH' as const,
          type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
          userId: 'user-2',
          ipAddress: '192.168.1.3',
          createdAt: new Date('2024-01-01T10:02:00Z'),
        }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(alerts);

      const result = await service.analyzeCorrelationGroup(correlationId);

      expect(result.summary.totalAlerts).toBe(3);
      expect(result.summary.severityBreakdown['CRITICAL']).toBe(1);
      expect(result.summary.severityBreakdown['HIGH']).toBe(2);
      expect(result.summary.affectedUsers).toContain('user-1');
      expect(result.summary.affectedUsers).toContain('user-2');
      expect(result.summary.affectedIPs).toHaveLength(3);
      expect(result.patterns).toContain('brute_force_attack');
      expect(result.riskScore).toBeGreaterThan(50);
      expect(result.recommendations).toContain(
        'IMMEDIATE ACTION REQUIRED: Initiate incident response procedure',
      );
    });

    it('should throw error when correlation group not found', async () => {
      mockPrismaService.securityAlert.findMany.mockResolvedValue([]);

      await expect(service.analyzeCorrelationGroup('non-existent')).rejects.toThrow(
        'No alerts found for correlation ID: non-existent',
      );
    });

    it('should generate appropriate recommendations based on patterns', async () => {
      const correlationId = 'correlation-123';
      const alerts = [
        // Setup for credential stuffing pattern
        createMockAlert({
          correlationId,
          ipAddress: '192.168.1.1',
          userId: 'user-1',
        }),
        createMockAlert({
          id: 'alert-2',
          correlationId,
          ipAddress: '192.168.1.1',
          userId: 'user-2',
        }),
        createMockAlert({
          id: 'alert-3',
          correlationId,
          ipAddress: '192.168.1.1',
          userId: 'user-3',
        }),
        createMockAlert({
          id: 'alert-4',
          correlationId,
          ipAddress: '192.168.1.1',
          userId: 'user-4',
        }),
        createMockAlert({
          id: 'alert-5',
          correlationId,
          ipAddress: '192.168.1.1',
          userId: 'user-5',
        }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(alerts);

      const result = await service.analyzeCorrelationGroup(correlationId);

      expect(result.patterns).toContain('credential_stuffing');
      expect(result.recommendations).toContain('Implement rate limiting per IP address');
      expect(result.recommendations).toContain(
        'Check user credentials against known breach databases',
      );
    });

    it('should calculate risk score based on severity and patterns', async () => {
      const correlationId = 'correlation-123';
      const baseTime = new Date('2024-01-01T10:00:00Z');

      // Setup for high risk scenario
      const alerts = [
        createMockAlert({
          correlationId,
          severity: 'CRITICAL' as const,
          type: 'SUSPICIOUS_LOGIN' as const,
          createdAt: baseTime,
        }),
        createMockAlert({
          id: 'alert-2',
          correlationId,
          severity: 'CRITICAL' as const,
          type: 'ANOMALY_DETECTED' as const,
          createdAt: new Date(baseTime.getTime() + 1000),
        }),
        createMockAlert({
          id: 'alert-3',
          correlationId,
          severity: 'HIGH' as const,
          type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
          createdAt: new Date(baseTime.getTime() + 2000),
        }),
        createMockAlert({
          id: 'alert-4',
          correlationId,
          severity: 'HIGH' as const,
          type: 'BRUTE_FORCE_ATTEMPT' as const,
          createdAt: new Date(baseTime.getTime() + 3000),
        }),
      ];

      mockPrismaService.securityAlert.findMany.mockResolvedValue(alerts);

      const result = await service.analyzeCorrelationGroup(correlationId);

      expect(result.riskScore).toBeGreaterThan(80);
      expect(result.patterns).toContain('account_takeover_attempt');
    });
  });

  describe('mergeCorrelationGroups', () => {
    it('should merge multiple correlation groups', async () => {
      const correlationIds = ['correlation-1', 'correlation-2', 'correlation-3'];
      (crypto.randomUUID as jest.Mock).mockReturnValue('new-correlation-id');

      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 10 });

      const result = await service.mergeCorrelationGroups(correlationIds);

      expect(result.newCorrelationId).toBe('new-correlation-id');
      expect(result.affectedAlerts).toBe(10);

      expect(mockPrismaService.securityAlert.updateMany).toHaveBeenCalledWith({
        where: { correlationId: { in: correlationIds } },
        data: { correlationId: 'new-correlation-id' },
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('correlation.groups.merged', {
        oldCorrelationIds: correlationIds,
        newCorrelationId: 'new-correlation-id',
        affectedAlerts: 10,
        timestamp: expect.any(Date),
      });
    });

    it('should throw error when less than 2 correlation IDs provided', async () => {
      await expect(service.mergeCorrelationGroups(['single-id'])).rejects.toThrow(
        'At least 2 correlation IDs required for merge',
      );

      await expect(service.mergeCorrelationGroups([])).rejects.toThrow(
        'At least 2 correlation IDs required for merge',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle alerts with partial data', async () => {
      const alert = createMockAlert({
        userId: null,
        ipAddress: '192.168.1.1',
        sessionId: null,
        userEmail: null,
      });

      const relatedAlert = createMockAlert({
        id: 'alert-2',
        userId: null,
        ipAddress: '192.168.1.1',
        sessionId: null,
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([relatedAlert]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.relatedAlerts).toHaveLength(1);
      expect(result.correlationScore).toBeGreaterThan(0);
    });

    it('should handle very large correlation groups', async () => {
      const alert = createMockAlert();
      const relatedAlerts = Array(50)
        .fill(null)
        .map((_, i) => createMockAlert({ id: `alert-${i + 2}` }));

      mockPrismaService.securityAlert.findMany.mockResolvedValue(relatedAlerts);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 51 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.relatedAlerts).toHaveLength(50);
      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('51 total alerts in correlation group');
    });

    it('should handle time-based correlation correctly', async () => {
      const now = new Date();
      const alert = createMockAlert({ createdAt: now });

      // Alert outside time window
      const _oldAlert = createMockAlert({
        id: 'alert-old',
        createdAt: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      });

      // Alert within time window
      const recentAlert = createMockAlert({
        id: 'alert-recent',
        createdAt: new Date(now.getTime() - 30 * 60000), // 30 minutes ago
      });

      mockPrismaService.securityAlert.findMany.mockResolvedValue([recentAlert]);
      mockPrismaService.securityAlert.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.securityAlert.update.mockResolvedValue({});

      const result = await service.correlateAlert(alert);

      expect(result.relatedAlerts).toHaveLength(1);
      expect(result.relatedAlerts[0].id).toBe('alert-recent');
    });
  });
});
