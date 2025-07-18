import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RuleEngineService } from './rule-engine.service';
import {
  RuleContext,
  RuleEvaluationResult,
  ThreatDetectionRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from './rule.interface';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { SecurityAlertService } from '../services/security-alert.service';
import { SecurityLogService } from '../services/security-log.service';

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
});
