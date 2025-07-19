import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RuleEngineService } from './rule-engine.service';
import { RuleContext, RuleEvaluationResult, ThreatDetectionRule } from './rule.interface';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma';
import { SecurityEventType } from '@/modules/auth/constants';
import { SecurityAlertService, SecurityAlertType } from '../services/security-alert.service';
import { SecurityLogService } from '../services/security-log.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: SecurityAlertService,
          useValue: {
            sendAlert: jest.fn(),
          },
        },
        {
          provide: SecurityLogService,
          useValue: {
            logSecurityEvent: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            loginAttempt: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerRule', () => {
    it('should register a new rule', () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);
      expect(service.getRule('test-rule-1')).toBe(mockRule);
    });

    it('should throw error if rule validation fails', () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-2',
        name: 'Invalid Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(false),
        getDescription: jest.fn().mockReturnValue('Invalid Rule Description'),
      };

      expect(() => service.registerRule(mockRule)).toThrow(
        'Invalid rule configuration for rule: Invalid Rule',
      );
    });
  });

  describe('evaluateRules', () => {
    it('should evaluate all active rules', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const mockResult: RuleEvaluationResult = {
        matched: true,
        severity: ThreatSeverity.HIGH,
        score: 85,
        reason: 'Suspicious activity detected',
        evidence: { attempts: 5 },
        suggestedActions: ['BLOCK_IP'],
      };

      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue(mockResult),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);

      const results = await service.evaluateRules(mockContext);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockResult);
      expect(mockRule.evaluate).toHaveBeenCalledWith(mockContext);
    });

    it('should only evaluate active rules', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const activeRule: ThreatDetectionRule = {
        id: 'active-rule',
        name: 'Active Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({ matched: true }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Active Rule Description'),
      };

      const inactiveRule: ThreatDetectionRule = {
        id: 'inactive-rule',
        name: 'Inactive Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.INACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Inactive Rule Description'),
      };

      service.registerRule(activeRule);
      service.registerRule(inactiveRule);

      await service.evaluateRules(mockContext);

      expect(activeRule.evaluate).toHaveBeenCalled();
      expect(inactiveRule.evaluate).not.toHaveBeenCalled();
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const errorRule: ThreatDetectionRule = {
        id: 'error-rule',
        name: 'Error Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed')),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Error Rule Description'),
      };

      const successRule: ThreatDetectionRule = {
        id: 'success-rule',
        name: 'Success Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({ matched: true }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Success Rule Description'),
      };

      service.registerRule(errorRule);
      service.registerRule(successRule);

      const results = await service.evaluateRules(mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
    });

    it('should emit threat detected event when rule matches', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const mockResult: RuleEvaluationResult = {
        matched: true,
        severity: ThreatSeverity.CRITICAL,
        score: 95,
        reason: 'Critical threat detected',
        evidence: { attempts: 10 },
        suggestedActions: ['BLOCK_IP', 'LOCK_ACCOUNT'],
      };

      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue(mockResult),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);

      await service.evaluateRules(mockContext);

      // The service emits multiple events, check that threat.detected was called
      const threatDetectedCall = (eventEmitter.emit as jest.Mock).mock.calls.find(
        (call) => call[0] === 'threat.detected',
      );
      expect(threatDetectedCall).toBeDefined();
      expect(threatDetectedCall[1].context).toEqual(mockContext);
      expect(threatDetectedCall[1].results).toContainEqual(mockResult);
    });
  });

  describe('getRuleStats', () => {
    it('should return rule statistics', async () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest
          .fn()
          .mockResolvedValueOnce({ matched: true })
          .mockResolvedValueOnce({ matched: false })
          .mockResolvedValueOnce({ matched: true }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);

      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      // Evaluate multiple times
      await service.evaluateRules(mockContext);
      await service.evaluateRules(mockContext);
      await service.evaluateRules(mockContext);

      const stats = service.getRuleStats('test-rule-1');

      expect(stats).toBeDefined();
      expect(stats?.executions).toBe(3);
      expect(stats?.matches).toBe(2);
      expect(stats?.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('should return engine metrics', () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);

      const metrics = service.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalRules).toBe(1);
      expect(metrics.activeRules).toBe(1);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalMatches).toBe(0);
    });
  });

  describe('clear rules', () => {
    it('should clear all rules and stats', () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);
      expect(service.getRule('test-rule-1')).toBeDefined();

      // Clear rules by accessing private properties (since clear() method doesn't exist)
      service['rules'].clear();
      service['ruleExecutionStats'].clear();

      expect(service.getRule('test-rule-1')).toBeUndefined();
      expect(service.getMetrics().totalRules).toBe(0);
    });
  });

  describe('unregisterRule', () => {
    it('should unregister an existing rule', () => {
      const mockRule: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);
      expect(service.getRule('test-rule-1')).toBeDefined();

      service.unregisterRule('test-rule-1');
      expect(service.getRule('test-rule-1')).toBeUndefined();
    });

    it('should handle unregistering non-existent rule', () => {
      expect(() => service.unregisterRule('non-existent')).not.toThrow();
    });
  });

  describe('getAllRules', () => {
    it('should return all registered rules', () => {
      const mockRule1: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule 1',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule 1 Description'),
      };

      const mockRule2: ThreatDetectionRule = {
        id: 'test-rule-2',
        name: 'Test Rule 2',
        description: 'Test description',
        severity: ThreatSeverity.MEDIUM,
        status: RuleStatus.INACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule 2 Description'),
      };

      service.registerRule(mockRule1);
      service.registerRule(mockRule2);

      const allRules = service.getAllRules();
      expect(allRules).toHaveLength(2);
      expect(allRules).toContainEqual(mockRule1);
      expect(allRules).toContainEqual(mockRule2);
    });
  });

  describe('getAllRuleStats', () => {
    it('should return all rule statistics', async () => {
      const mockRule1: ThreatDetectionRule = {
        id: 'test-rule-1',
        name: 'Test Rule 1',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({ matched: true }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule 1 Description'),
      };

      const mockRule2: ThreatDetectionRule = {
        id: 'test-rule-2',
        name: 'Test Rule 2',
        description: 'Test description',
        severity: ThreatSeverity.MEDIUM,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({ matched: false }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule 2 Description'),
      };

      service.registerRule(mockRule1);
      service.registerRule(mockRule2);

      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      await service.evaluateRules(mockContext);

      const allStats = service.getAllRuleStats();
      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['test-rule-1']).toBeDefined();
      expect(allStats['test-rule-2']).toBeDefined();
    });
  });

  describe('loadRules', () => {
    it('should load rules from configuration', async () => {
      await expect(service.loadRules()).resolves.not.toThrow();
    });
  });

  describe('evaluateRules with different severities', () => {
    it('should send security alert only for high and critical severity', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const lowSeverityRule: ThreatDetectionRule = {
        id: 'low-rule',
        name: 'Low Severity Rule',
        description: 'Test description',
        severity: ThreatSeverity.LOW,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.LOW,
          score: 30,
          reason: 'Low severity threat',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Low Severity Rule Description'),
      };

      const mediumSeverityRule: ThreatDetectionRule = {
        id: 'medium-rule',
        name: 'Medium Severity Rule',
        description: 'Test description',
        severity: ThreatSeverity.MEDIUM,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.MEDIUM,
          score: 50,
          reason: 'Medium severity threat',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Medium Severity Rule Description'),
      };

      const highSeverityRule: ThreatDetectionRule = {
        id: 'high-rule',
        name: 'High Severity Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: ['brute-force'],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 80,
          reason: 'High severity threat',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('High Severity Rule Description'),
      };

      const securityAlertService = service['securityAlertService'];
      const sendAlertSpy = jest.spyOn(securityAlertService, 'sendAlert');

      service.registerRule(lowSeverityRule);
      service.registerRule(mediumSeverityRule);
      service.registerRule(highSeverityRule);

      await service.evaluateRules(mockContext);

      // Should only send alert for high severity rule
      expect(sendAlertSpy).toHaveBeenCalledTimes(1);
      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'high',
        }),
      );
    });
  });

  describe('suggested actions execution', () => {
    it('should execute all suggested actions', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const mockRule: ThreatDetectionRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 85,
          reason: 'Multiple actions required',
          suggestedActions: [
            'BLOCK_IP',
            'REQUIRE_2FA',
            'INVALIDATE_SESSIONS',
            'INCREASE_MONITORING',
            'UNKNOWN_ACTION',
          ],
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Test Rule Description'),
      };

      service.registerRule(mockRule);

      await service.evaluateRules(mockContext);

      // Check that all actions were emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith('security.block.ip', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('security.require.2fa', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.invalidate.sessions',
        expect.any(Object),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.increase.monitoring',
        expect.any(Object),
      );
    });
  });

  describe('rule tags mapping', () => {
    it('should map rule with account-lockout tag to correct alert type', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const accountLockoutRule: ThreatDetectionRule = {
        id: 'lockout-rule',
        name: 'Account Lockout Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: ['account-lockout'],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 90,
          reason: 'Account should be locked',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Account Lockout Rule Description'),
      };

      const securityAlertService = service['securityAlertService'];
      const sendAlertSpy = jest.spyOn(securityAlertService, 'sendAlert');

      service.registerRule(accountLockoutRule);

      await service.evaluateRules(mockContext);

      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityAlertType.ACCOUNT_LOCKED,
        }),
      );
    });

    it('should map rule without specific tags to suspicious login alert type', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const genericRule: ThreatDetectionRule = {
        id: 'generic-rule',
        name: 'Generic Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 85,
          reason: 'Suspicious activity',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('Generic Rule Description'),
      };

      const securityAlertService = service['securityAlertService'];
      const sendAlertSpy = jest.spyOn(securityAlertService, 'sendAlert');

      service.registerRule(genericRule);

      await service.evaluateRules(mockContext);

      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityAlertType.SUSPICIOUS_LOGIN,
        }),
      );
    });
  });

  describe('severity mapping', () => {
    it('should map all threat severities correctly', async () => {
      const testCases = [
        { threat: ThreatSeverity.LOW, expected: 'low' },
        { threat: ThreatSeverity.MEDIUM, expected: 'medium' },
        { threat: ThreatSeverity.HIGH, expected: 'high' },
        { threat: ThreatSeverity.CRITICAL, expected: 'critical' },
      ];

      for (const testCase of testCases) {
        const mockContext: RuleContext = {
          userId: 'user-123',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          eventType: SecurityEventType.LOGIN_FAILED,
          metadata: {},
        };

        const mockRule: ThreatDetectionRule = {
          id: `${testCase.threat}-rule`,
          name: `${testCase.threat} Rule`,
          description: 'Test description',
          severity: ThreatSeverity.CRITICAL, // Rule severity
          status: RuleStatus.ACTIVE,
          conditionType: ConditionType.THRESHOLD,
          version: '1.0.0',
          config: {},
          tags: [],
          evaluate: jest.fn().mockResolvedValue({
            matched: true,
            severity: testCase.threat, // Result severity
            score: 90,
            reason: 'Test threat',
          }),
          validate: jest.fn().mockReturnValue(true),
          getDescription: jest.fn().mockReturnValue(`${testCase.threat} Rule Description`),
        };

        const securityAlertService = service['securityAlertService'];
        const sendAlertSpy = jest.spyOn(securityAlertService, 'sendAlert').mockClear();

        service.registerRule(mockRule);
        await service.evaluateRules(mockContext);

        if (
          testCase.threat === ThreatSeverity.CRITICAL ||
          testCase.threat === ThreatSeverity.HIGH
        ) {
          expect(sendAlertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              severity: testCase.expected,
            }),
          );
        }

        service.unregisterRule(mockRule.id);
      }
    });
  });

  describe('getMetrics with empty stats', () => {
    it('should return zero match rate when no executions', () => {
      const metrics = service.getMetrics();

      expect(metrics.totalRules).toBe(0);
      expect(metrics.activeRules).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalMatches).toBe(0);
      expect(metrics.matchRate).toBe(0);
    });
  });

  describe('rule evaluation without matches', () => {
    it('should not emit threat.detected event when no rules match', async () => {
      const mockContext: RuleContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        eventType: SecurityEventType.LOGIN_FAILED,
        metadata: {},
      };

      const mockRule: ThreatDetectionRule = {
        id: 'no-match-rule',
        name: 'No Match Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        status: RuleStatus.ACTIVE,
        conditionType: ConditionType.THRESHOLD,
        version: '1.0.0',
        config: {},
        tags: [],
        evaluate: jest.fn().mockResolvedValue({
          matched: false,
          severity: ThreatSeverity.HIGH,
          score: 20,
          reason: 'No threat detected',
        }),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn().mockReturnValue('No Match Rule Description'),
      };

      service.registerRule(mockRule);

      const emitSpy = jest.spyOn(eventEmitter, 'emit');
      emitSpy.mockClear();

      await service.evaluateRules(mockContext);

      // Should not emit threat.detected event
      expect(emitSpy).not.toHaveBeenCalledWith('threat.detected', expect.any(Object));
    });
  });
});
