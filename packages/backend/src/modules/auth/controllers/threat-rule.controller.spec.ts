import { Test, TestingModule } from '@nestjs/testing';
import { ThreatRuleController } from './threat-rule.controller';
import { RuleRepositoryService } from '../rules/rule-repository.service';
import { RuleEngineService } from '../rules/rule-engine.service';
import { SecurityEventType } from '@/modules/auth/constants';
import {
  CreateThreatRuleDto,
  TestRuleDto,
  ThreatRuleFilterDto,
  UpdateThreatRuleDto,
} from '../dto/threat-rule.dto';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma';

describe('ThreatRuleController', () => {
  let controller: ThreatRuleController;
  let ruleRepository: jest.Mocked<RuleRepositoryService>;
  let ruleEngine: jest.Mocked<RuleEngineService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThreatRuleController],
      providers: [
        {
          provide: RuleRepositoryService,
          useValue: {
            getRules: jest.fn(),
            getRule: jest.fn(),
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getRuleStatistics: jest.fn(),
            loadAllRules: jest.fn(),
          },
        },
        {
          provide: RuleEngineService,
          useValue: {
            getRule: jest.fn(),
            getMetrics: jest.fn(),
            getRuleStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ThreatRuleController>(ThreatRuleController);
    ruleRepository = module.get(RuleRepositoryService);
    ruleEngine = module.get(RuleEngineService);
  });

  describe('getRules', () => {
    it('should return rules from repository', async () => {
      const mockRules = [
        { id: 'rule1', name: 'Test Rule 1' },
        { id: 'rule2', name: 'Test Rule 2' },
      ];
      ruleRepository.getRules.mockResolvedValue(mockRules as any);

      const filters: ThreatRuleFilterDto = { status: RuleStatus.ACTIVE };
      const result = await controller.getRules(filters);

      expect(result).toEqual(mockRules);
      expect(ruleRepository.getRules).toHaveBeenCalledWith(filters);
    });

    it('should handle empty filters', async () => {
      const mockRules = [];
      ruleRepository.getRules.mockResolvedValue(mockRules);

      const result = await controller.getRules({});

      expect(result).toEqual(mockRules);
      expect(ruleRepository.getRules).toHaveBeenCalledWith({});
    });
  });

  describe('getRule', () => {
    it('should return a specific rule', async () => {
      const mockRule = { id: 'rule1', name: 'Test Rule' };
      ruleRepository.getRule.mockResolvedValue(mockRule as any);

      const result = await controller.getRule('rule1');

      expect(result).toEqual(mockRule);
      expect(ruleRepository.getRule).toHaveBeenCalledWith('rule1');
    });

    it('should throw error when rule not found', async () => {
      ruleRepository.getRule.mockResolvedValue(null);

      await expect(controller.getRule('nonexistent')).rejects.toThrow('Rule not found');
    });
  });

  describe('createRule', () => {
    it('should create a new rule', async () => {
      const createDto: CreateThreatRuleDto = {
        name: 'New Rule',
        description: 'Test rule',
        conditionType: ConditionType.PATTERN,
        severity: ThreatSeverity.HIGH,
        config: {},
        tags: [],
      };
      ruleRepository.createRule.mockResolvedValue('new-rule-id');

      const result = await controller.createRule(createDto);

      expect(result).toEqual({ id: 'new-rule-id' });
      expect(ruleRepository.createRule).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const updateDto: UpdateThreatRuleDto = {
        name: 'Updated Rule',
        severity: ThreatSeverity.CRITICAL,
      };
      ruleRepository.updateRule.mockResolvedValue();

      await controller.updateRule('rule1', updateDto);

      expect(ruleRepository.updateRule).toHaveBeenCalledWith('rule1', updateDto);
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      ruleRepository.deleteRule.mockResolvedValue();

      await controller.deleteRule('rule1');

      expect(ruleRepository.deleteRule).toHaveBeenCalledWith('rule1');
    });
  });

  describe('getStatistics', () => {
    it('should return rule statistics', async () => {
      const mockStats = {
        totalRules: 10,
        activeRules: 8,
        inactiveRules: 2,
        rulesByType: { pattern: 5, threshold: 3, composite: 2 },
        rulesBySeverity: {
          low: 2,
          medium: 3,
          high: 4,
          critical: 1,
        },
        recentMatches: [],
      };
      ruleRepository.getRuleStatistics.mockResolvedValue(mockStats as any);

      const result = await controller.getStatistics();

      expect(result).toEqual(mockStats);
      expect(ruleRepository.getRuleStatistics).toHaveBeenCalled();
    });
  });

  describe('testRule', () => {
    it('should test a rule and return evaluation result', async () => {
      const mockRule = {
        id: 'rule1',
        name: 'Test Rule',
        evaluate: jest.fn().mockResolvedValue({
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 85,
          reason: 'Test reason',
          evidence: { test: 'evidence' },
          suggestedActions: ['BLOCK_IP'],
        }),
      };

      const testDto: TestRuleDto = {
        ruleId: 'rule1',
        context: {
          userId: 'user123',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent',
          eventType: SecurityEventType.LOGIN_FAILED,
          metadata: {},
        },
        recentEvents: [
          {
            ipAddress: '192.168.1.1',
            timestamp: new Date(),
            eventType: SecurityEventType.LOGIN_FAILED,
            metadata: {},
          },
        ],
      };

      ruleEngine.getRule.mockReturnValue(mockRule as any);

      const result = await controller.testRule(testDto);

      expect(result).toMatchObject({
        ruleId: 'rule1',
        ruleName: 'Test Rule',
        matched: true,
        severity: ThreatSeverity.HIGH,
        score: 85,
        reason: 'Test reason',
        evidence: { test: 'evidence' },
        suggestedActions: ['BLOCK_IP'],
      });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when rule not found for testing', async () => {
      ruleEngine.getRule.mockReturnValue(null);

      const testDto: TestRuleDto = {
        ruleId: 'nonexistent',
        context: {
          eventType: SecurityEventType.LOGIN_FAILED,
        },
      };

      await expect(controller.testRule(testDto)).rejects.toThrow('Rule not found');
    });

    it('should handle empty recent events', async () => {
      const mockRule = {
        id: 'rule1',
        name: 'Test Rule',
        evaluate: jest.fn().mockResolvedValue({
          matched: false,
        }),
      };

      const testDto: TestRuleDto = {
        ruleId: 'rule1',
        context: {
          eventType: SecurityEventType.LOGIN_FAILED,
        },
      };

      ruleEngine.getRule.mockReturnValue(mockRule as any);

      await controller.testRule(testDto);

      expect(mockRule.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_FAILED,
          timestamp: expect.any(Date),
          recentEvents: undefined,
        }),
      );
    });
  });

  describe('reloadRules', () => {
    it('should reload all rules', async () => {
      ruleRepository.loadAllRules.mockResolvedValue();

      await controller.reloadRules();

      expect(ruleRepository.loadAllRules).toHaveBeenCalled();
    });
  });

  describe('getEngineMetrics', () => {
    it('should return engine metrics', async () => {
      const mockMetrics = {
        totalRules: 10,
        activeRules: 8,
        totalExecutions: 1000,
        totalMatches: 250,
        matchRate: 25,
        ruleStats: {},
      };
      ruleEngine.getMetrics.mockReturnValue(mockMetrics);

      const result = await controller.getEngineMetrics();

      expect(result).toEqual(mockMetrics);
      expect(ruleEngine.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getRuleStatistics', () => {
    it('should return statistics for a specific rule', async () => {
      const mockStats = {
        executions: 100,
        matches: 25,
        lastExecution: new Date(),
        averageExecutionTime: 5.2,
      };
      ruleEngine.getRuleStats.mockReturnValue(mockStats);

      const result = await controller.getRuleStatistics('rule1');

      expect(result).toEqual(mockStats);
      expect(ruleEngine.getRuleStats).toHaveBeenCalledWith('rule1');
    });

    it('should throw error when rule statistics not found', async () => {
      ruleEngine.getRuleStats.mockReturnValue(null);

      await expect(controller.getRuleStatistics('nonexistent')).rejects.toThrow(
        'Rule statistics not found',
      );
    });
  });
});
