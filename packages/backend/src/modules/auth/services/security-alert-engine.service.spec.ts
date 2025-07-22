import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecurityAlertEngineService } from './security-alert-engine.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import { SecurityAlertServiceV2 } from './security-alert-v2.service';
import { AlertDeduplicationService } from './alert-deduplication.service';
import { AlertCorrelationService } from './alert-correlation.service';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { AlertQueueService } from './alert-queue.service';
import { SecurityAlert, ThreatSeverity, AlertStatus, AlertType } from '@prisma/generated/prisma';
import { SecurityEventType } from '../constants/auth.constants';
import { RuleEvaluationResult } from '../rules/rule.interface';

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

describe('SecurityAlertEngineService', () => {
  let service: SecurityAlertEngineService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DISPATCH_LOW_SEVERITY_ALERTS: false,
        MAX_ALERT_DISPATCHES_PER_HOUR: 10,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockPrismaService = {
    securityAlert: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockRuleEngineService = {
    evaluateRules: jest.fn(),
  };

  const mockAlertServiceV2 = {
    createAlert: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockDeduplicationService = {
    generateFingerprint: jest.fn(),
    checkDuplicate: jest.fn(),
    getAlertInfo: jest.fn(),
    registerAlert: jest.fn(),
    updateOccurrence: jest.fn(),
  };

  const mockCorrelationService = {
    correlateAlert: jest.fn(),
  };

  const mockDispatcherService = {
    dispatchAlert: jest.fn(),
  };

  const mockQueueService = {
    queueAlert: jest.fn(),
  };

  const createMockSecurityEvent = (overrides: any = {}) => ({
    type: SecurityEventType.LOGIN_FAILED,
    userId: 'user-123',
    email: 'test@example.com',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    sessionId: 'session-123',
    metadata: {},
    timestamp: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  });

  const createMockRuleResult = (
    overrides: Partial<RuleEvaluationResult> = {},
  ): RuleEvaluationResult => ({
    matched: true,
    ruleId: 'rule-1',
    ruleName: 'Test Rule',
    score: 50,
    reason: 'Test reason',
    severity: ThreatSeverity.MEDIUM,
    evidence: { test: true },
    suggestedActions: ['action1'],
    tags: ['test-tag'],
    ...overrides,
  });

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
      eventType: SecurityEventType.LOGIN_FAILED,
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAlertEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RuleEngineService, useValue: mockRuleEngineService },
        { provide: SecurityAlertServiceV2, useValue: mockAlertServiceV2 },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AlertDeduplicationService, useValue: mockDeduplicationService },
        { provide: AlertCorrelationService, useValue: mockCorrelationService },
        { provide: AlertDispatcherService, useValue: mockDispatcherService },
        { provide: AlertQueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<SecurityAlertEngineService>(SecurityAlertEngineService);

    await service.onModuleInit();
  });

  describe('handleSecurityEvent', () => {
    it('should process security event and create alert', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult();
      const alert = createMockAlert();

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);

      await service.handleSecurityEvent(event);

      expect(mockRuleEngineService.evaluateRules).toHaveBeenCalledWith({
        userId: event.userId,
        email: event.email,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        eventType: event.type,
        metadata: event.metadata,
      });

      expect(mockPrismaService.securityAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MULTIPLE_FAILED_ATTEMPTS' as const,
          severity: ThreatSeverity.MEDIUM,
          title: expect.stringContaining('Test Rule triggered'),
          description: 'Test reason',
          fingerprint: 'test-fingerprint',
          status: AlertStatus.PENDING,
          userId: event.userId,
          userEmail: event.email,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
        }),
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alert.created', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        correlationId: 'correlation-123',
        timestamp: expect.any(Date),
      });
    });

    it('should skip processing when no rules match', async () => {
      const event = createMockSecurityEvent();

      mockRuleEngineService.evaluateRules.mockResolvedValue([]);

      await service.handleSecurityEvent(event);

      expect(mockPrismaService.securityAlert.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('alert.created', expect.any(Object));
    });

    it('should handle deduplication of alerts', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult();
      const existingAlert = createMockAlert();

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(true);
      mockDeduplicationService.getAlertInfo.mockResolvedValue({
        alertId: existingAlert.id,
        type: existingAlert.type,
        severity: existingAlert.severity,
        userId: existingAlert.userId,
        ipAddress: existingAlert.ipAddress,
      });
      mockPrismaService.securityAlert.findUnique.mockResolvedValue(existingAlert);
      mockPrismaService.securityAlert.update.mockResolvedValue({
        ...existingAlert,
        occurrenceCount: 2,
      });

      await service.handleSecurityEvent(event);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: existingAlert.id },
        data: expect.objectContaining({
          occurrenceCount: { increment: 1 },
          lastSeen: expect.any(Date),
          score: 50,
          evidence: expect.objectContaining({
            occurrences: expect.arrayContaining([
              {
                timestamp: expect.any(Date),
                context: expect.any(Object),
              },
            ]),
          }),
        }),
      });

      expect(mockDeduplicationService.updateOccurrence).toHaveBeenCalledWith('test-fingerprint');
    });

    it('should escalate alert when correlation triggers it', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.HIGH });
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [createMockAlert({ id: 'alert-2' })],
        correlationScore: 85,
        shouldEscalate: true,
        escalationReason: 'Multiple critical alerts detected',
        patterns: ['brute_force_attack'],
      });
      mockPrismaService.securityAlert.update.mockResolvedValue({
        ...alert,
        severity: ThreatSeverity.CRITICAL,
      });

      await service.handleSecurityEvent(event);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalledWith({
        where: { id: alert.id },
        data: {
          severity: ThreatSeverity.CRITICAL,
          description: expect.stringContaining('ESCALATED: Multiple critical alerts detected'),
          tags: { push: 'escalated' },
        },
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alert.escalated', {
        alertId: alert.id,
        oldSeverity: ThreatSeverity.HIGH,
        newSeverity: ThreatSeverity.CRITICAL,
        reason: 'Multiple critical alerts detected',
        timestamp: expect.any(Date),
      });
    });

    it('should queue alert for dispatch when appropriate', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.HIGH });
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(5); // Under rate limit

      await service.handleSecurityEvent(event);

      expect(mockQueueService.queueAlert).toHaveBeenCalledWith(alert);
    });

    it('should skip dispatch for low severity alerts by default', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.LOW });
      const alert = createMockAlert({ severity: ThreatSeverity.LOW });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });

      await service.handleSecurityEvent(event);

      expect(mockQueueService.queueAlert).not.toHaveBeenCalled();
    });

    it('should skip dispatch for suppressed alerts', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.HIGH });
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // Set to next year
      const alert = createMockAlert({
        severity: ThreatSeverity.HIGH,
        suppressedUntil: futureDate,
      });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });

      await service.handleSecurityEvent(event);

      expect(mockQueueService.queueAlert).not.toHaveBeenCalled();
    });

    it('should respect rate limiting for dispatch', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.HIGH });
      const alert = createMockAlert({ severity: ThreatSeverity.HIGH });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(10); // At rate limit

      await service.handleSecurityEvent(event);

      expect(mockQueueService.queueAlert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const event = createMockSecurityEvent();

      mockRuleEngineService.evaluateRules.mockRejectedValue(new Error('Rule evaluation failed'));

      await service.handleSecurityEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('alert.processing.failed', {
        event,
        error: 'Rule evaluation failed',
        timestamp: expect.any(Date),
      });
    });

    it('should process multiple rule matches', async () => {
      const event = createMockSecurityEvent();
      const ruleResults = [
        createMockRuleResult({ ruleId: 'rule-1', severity: ThreatSeverity.MEDIUM }),
        createMockRuleResult({ ruleId: 'rule-2', severity: ThreatSeverity.HIGH }),
      ];

      mockRuleEngineService.evaluateRules.mockResolvedValue(ruleResults);
      mockDeduplicationService.generateFingerprint
        .mockReturnValueOnce('fingerprint-1')
        .mockReturnValueOnce('fingerprint-2');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create
        .mockResolvedValueOnce(createMockAlert({ id: 'alert-1' }))
        .mockResolvedValueOnce(createMockAlert({ id: 'alert-2' }));
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);

      await service.handleSecurityEvent(event);

      expect(mockPrismaService.securityAlert.create).toHaveBeenCalledTimes(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it('should map event types to alert types correctly', async () => {
      const testCases = [
        {
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          expectedAlertType: AlertType.ACCOUNT_LOCKED,
        },
        {
          eventType: SecurityEventType.LOGIN_FAILED,
          ruleScore: 85,
          expectedAlertType: AlertType.SUSPICIOUS_LOGIN,
        },
        {
          eventType: SecurityEventType.LOGIN_FAILED,
          ruleScore: 50,
          expectedAlertType: AlertType.MULTIPLE_FAILED_ATTEMPTS,
        },
        {
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          expectedAlertType: AlertType.SUSPICIOUS_LOGIN,
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const event = createMockSecurityEvent({ type: testCase.eventType });
        const ruleResult = createMockRuleResult({ score: testCase.ruleScore });

        mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
        mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
        mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
        mockPrismaService.securityAlert.create.mockResolvedValue(createMockAlert());
        mockCorrelationService.correlateAlert.mockResolvedValue({
          correlationId: 'correlation-123',
          relatedAlerts: [],
          correlationScore: 0,
          shouldEscalate: false,
          patterns: [],
        });

        await service.handleSecurityEvent(event);

        expect(mockPrismaService.securityAlert.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: testCase.expectedAlertType,
          }),
        });
      }
    });

    it('should use rule tags to determine alert type', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ tags: ['brute-force'] });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockPrismaService.securityAlert.create.mockResolvedValue(createMockAlert());
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);
      mockQueueService.queueAlert.mockResolvedValue(undefined);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);

      await service.handleSecurityEvent(event);

      expect(mockRuleEngineService.evaluateRules).toHaveBeenCalled();
      expect(mockPrismaService.securityAlert.create).toHaveBeenCalled();
    });
  });

  describe('createManualAlert', () => {
    it('should create manual alert with provided context', async () => {
      const context = {
        type: 'SUSPICIOUS_LOGIN' as const,
        severity: ThreatSeverity.HIGH,
        title: 'Manual Alert',
        description: 'Manually created alert',
        userId: 'user-123',
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        sessionId: 'session-123',
        evidence: { manual: true },
        metadata: { source: 'manual' },
        tags: ['manual', 'test'],
      };

      const alert = createMockAlert({
        type: context.type,
        severity: context.severity,
        title: context.title,
        description: context.description,
      });

      mockDeduplicationService.generateFingerprint.mockReturnValue('manual-fingerprint');
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);

      const result = await service.createManualAlert(context);

      expect(result).toEqual(alert);
      expect(mockPrismaService.securityAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: context.type,
          severity: context.severity,
          title: context.title,
          description: context.description,
          fingerprint: 'manual-fingerprint',
          userId: context.userId,
          userEmail: context.userEmail,
          tags: ['manual', 'test'],
        }),
      });
    });

    it('should use defaults for manual alert when not provided', async () => {
      const context = {
        severity: ThreatSeverity.MEDIUM,
        title: 'Minimal Alert',
        description: 'Minimal manual alert',
      };

      const alert = createMockAlert();

      mockDeduplicationService.generateFingerprint.mockReturnValue('manual-fingerprint');
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });

      await service.createManualAlert(context);

      expect(mockPrismaService.securityAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'THREAT_RULE_MATCH' as const, // Default type
          tags: ['manual'], // Default tag
        }),
      });
    });
  });

  describe('getMetrics', () => {
    it('should return processing metrics', () => {
      // Simulate some processing
      service['processingMetrics'] = {
        eventsProcessed: 100,
        alertsGenerated: 80,
        alertsSuppressed: 10,
        alertsDispatched: 70,
        processingErrors: 5,
        averageProcessingTime: 150,
      };

      const metrics = service.getMetrics();

      expect(metrics).toEqual({
        eventsProcessed: 100,
        alertsGenerated: 80,
        alertsSuppressed: 10,
        alertsDispatched: 70,
        processingErrors: 5,
        averageProcessingTime: 150,
        alertRate: 0.8,
        suppressionRate: 0.1,
        errorRate: 0.05,
      });
    });

    it('should handle zero events processed', () => {
      service['processingMetrics'] = {
        eventsProcessed: 0,
        alertsGenerated: 0,
        alertsSuppressed: 0,
        alertsDispatched: 0,
        processingErrors: 0,
        averageProcessingTime: 0,
      };

      const metrics = service.getMetrics();

      expect(metrics).toEqual({
        eventsProcessed: 0,
        alertsGenerated: 0,
        alertsSuppressed: 0,
        alertsDispatched: 0,
        processingErrors: 0,
        averageProcessingTime: 0,
        alertRate: 0,
        suppressionRate: 0,
        errorRate: 0,
      });
    });
  });

  describe('getAlertStatistics', () => {
    it('should return alert statistics', async () => {
      mockPrismaService.securityAlert.count.mockResolvedValue(100);
      mockPrismaService.securityAlert.groupBy
        .mockResolvedValueOnce([
          { severity: ThreatSeverity.LOW, _count: 20 },
          { severity: ThreatSeverity.MEDIUM, _count: 40 },
          { severity: ThreatSeverity.HIGH, _count: 30 },
          { severity: ThreatSeverity.CRITICAL, _count: 10 },
        ])
        .mockResolvedValueOnce([
          { type: 'SUSPICIOUS_LOGIN' as const, _count: 50 },
          { type: 'BRUTE_FORCE_ATTEMPT' as const, _count: 30 },
          { type: 'MULTIPLE_FAILED_ATTEMPTS' as const, _count: 20 },
        ])
        .mockResolvedValueOnce([
          { status: AlertStatus.PENDING, _count: 10 },
          { status: AlertStatus.DISPATCHED, _count: 70 },
          { status: AlertStatus.RESOLVED, _count: 20 },
        ]);

      const result = await service.getAlertStatistics();

      expect(result).toEqual({
        total: 100,
        bySeverity: {
          [ThreatSeverity.LOW]: 20,
          [ThreatSeverity.MEDIUM]: 40,
          [ThreatSeverity.HIGH]: 30,
          [ThreatSeverity.CRITICAL]: 10,
        },
        byType: {
          [AlertType.SUSPICIOUS_LOGIN]: 50,
          [AlertType.BRUTE_FORCE_ATTEMPT]: 30,
          [AlertType.MULTIPLE_FAILED_ATTEMPTS]: 20,
        },
        byStatus: {
          [AlertStatus.PENDING]: 10,
          [AlertStatus.DISPATCHED]: 70,
          [AlertStatus.RESOLVED]: 20,
        },
        timeRange: undefined,
      });
    });

    it('should filter statistics by options', async () => {
      const options = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        userId: 'user-123',
        severity: ThreatSeverity.HIGH,
      };

      mockPrismaService.securityAlert.count.mockResolvedValue(50);
      mockPrismaService.securityAlert.groupBy
        .mockResolvedValueOnce([{ severity: ThreatSeverity.HIGH, _count: 50 }])
        .mockResolvedValueOnce([{ type: 'SUSPICIOUS_LOGIN' as const, _count: 50 }])
        .mockResolvedValueOnce([{ status: AlertStatus.DISPATCHED, _count: 50 }]);

      await service.getAlertStatistics(options);

      expect(mockPrismaService.securityAlert.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: options.timeRange.start,
            lte: options.timeRange.end,
          },
          userId: options.userId,
          severity: options.severity,
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle event with minimal data', async () => {
      const event = {
        type: SecurityEventType.LOGIN_FAILED,
        timestamp: new Date(),
      };

      const ruleResult = createMockRuleResult();

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      // Mock generateFingerprint to be called multiple times (in processRuleMatches and processAlert)
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);
      mockPrismaService.securityAlert.create.mockResolvedValue(createMockAlert());
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);
      mockQueueService.queueAlert.mockResolvedValue(undefined);

      await service.handleSecurityEvent(event as any);

      expect(mockRuleEngineService.evaluateRules).toHaveBeenCalled();
      expect(mockDeduplicationService.generateFingerprint).toHaveBeenCalled();
      expect(mockPrismaService.securityAlert.create).toHaveBeenCalled();
    });

    it('should handle missing rule name in alert title generation', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ ruleName: null });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);
      mockPrismaService.securityAlert.create.mockResolvedValue(createMockAlert());
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);
      mockQueueService.queueAlert.mockResolvedValue(undefined);

      await service.handleSecurityEvent(event);

      expect(mockRuleEngineService.evaluateRules).toHaveBeenCalled();
      expect(mockPrismaService.securityAlert.create).toHaveBeenCalled();
    });

    it('should handle severity escalation for already critical alerts', async () => {
      const event = createMockSecurityEvent();
      const ruleResult = createMockRuleResult({ severity: ThreatSeverity.CRITICAL });
      const alert = createMockAlert({ severity: ThreatSeverity.CRITICAL });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);
      mockPrismaService.securityAlert.create.mockResolvedValue(alert);
      mockPrismaService.securityAlert.update.mockResolvedValue(alert);
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: true,
        escalationReason: 'Multiple critical alerts',
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);

      await service.handleSecurityEvent(event);

      expect(mockPrismaService.securityAlert.update).toHaveBeenCalled();
    });

    it('should generate contextual tags', async () => {
      const event = createMockSecurityEvent({
        metadata: {
          deviceType: 'mobile',
          location: 'USA',
        },
      });
      const ruleResult = createMockRuleResult({
        tags: ['suspicious', 'auth'],
        severity: ThreatSeverity.HIGH,
      });

      mockRuleEngineService.evaluateRules.mockResolvedValue([ruleResult]);
      mockDeduplicationService.generateFingerprint.mockReturnValue('test-fingerprint');
      mockDeduplicationService.checkDuplicate.mockResolvedValue(false);
      mockDeduplicationService.registerAlert.mockResolvedValue(undefined);
      mockPrismaService.securityAlert.create.mockResolvedValue(createMockAlert());
      mockCorrelationService.correlateAlert.mockResolvedValue({
        correlationId: 'correlation-123',
        relatedAlerts: [],
        correlationScore: 0,
        shouldEscalate: false,
        patterns: [],
      });
      mockPrismaService.securityAlert.count.mockResolvedValue(0);
      mockQueueService.queueAlert.mockResolvedValue(undefined);

      await service.handleSecurityEvent(event);

      expect(mockRuleEngineService.evaluateRules).toHaveBeenCalled();
      expect(mockPrismaService.securityAlert.create).toHaveBeenCalled();
    });
  });
});
