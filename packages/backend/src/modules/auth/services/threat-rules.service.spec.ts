import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ThreatRulesService } from './threat-rules.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ThreatRuleFactory } from '../rules/rule.factory';
import { RuleEngineService } from '../rules/rule-engine.service';
import { ConditionType, RuleStatus, ThreatSeverity } from '@prisma/generated/prisma/enums';

describe('ThreatRulesService', () => {
  let service: ThreatRulesService;

  const mockPrismaService = {
    threatDetectionRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ruleEvaluation: {
      findMany: jest.fn(),
    },
  };

  const mockRuleFactory = {
    createFromDatabase: jest.fn(),
    validateConfig: jest.fn(),
  };

  const mockRuleEngine = {
    registerRule: jest.fn(),
    unregisterRule: jest.fn(),
    getAllRules: jest.fn(),
  };

  const mockDbRule = {
    id: 'brute-force-rule',
    name: 'Brute Force Detection',
    description: 'Detects brute force attacks',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.HIGH,
    conditionType: ConditionType.THRESHOLD,
    config: {
      threshold: 5,
      timeWindowMinutes: 15,
    },
    tags: ['security', 'auth'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: null,
  };

  const mockRule = {
    id: 'brute-force-rule',
    name: 'Brute Force Detection',
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatRulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ThreatRuleFactory,
          useValue: mockRuleFactory,
        },
        {
          provide: RuleEngineService,
          useValue: mockRuleEngine,
        },
      ],
    }).compile();

    service = module.get<ThreatRulesService>(ThreatRulesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should load and register rules on module init', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([mockDbRule]);
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.onModuleInit();

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [RuleStatus.ACTIVE, RuleStatus.TESTING],
          },
        },
        orderBy: {
          severity: 'desc',
        },
      });
      expect(mockRuleFactory.createFromDatabase).toHaveBeenCalledWith(mockDbRule);
      expect(mockRuleEngine.registerRule).toHaveBeenCalledWith(mockRule);
    });
  });

  describe('loadAndRegisterRules', () => {
    it('should load and register all active and testing rules', async () => {
      const rules = [
        { ...mockDbRule, id: 'rule-1', status: RuleStatus.ACTIVE },
        { ...mockDbRule, id: 'rule-2', status: RuleStatus.TESTING },
        { ...mockDbRule, id: 'rule-3', status: RuleStatus.ACTIVE },
      ];

      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue(rules);
      mockRuleFactory.createFromDatabase.mockImplementation((dbRule) => ({
        ...mockRule,
        id: dbRule.id,
      }));

      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await service.loadAndRegisterRules();

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledTimes(1);
      expect(mockRuleFactory.createFromDatabase).toHaveBeenCalledTimes(3);
      expect(mockRuleEngine.registerRule).toHaveBeenCalledTimes(3);
      expect(loggerSpy).toHaveBeenCalledWith('Found 3 rules to load');
      expect(loggerSpy).toHaveBeenCalledWith('Rule loading complete. Success: 3, Errors: 0');
    });

    it('should handle errors when loading individual rules', async () => {
      const rules = [
        { ...mockDbRule, id: 'rule-1' },
        { ...mockDbRule, id: 'rule-2' },
      ];

      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue(rules);
      mockRuleFactory.createFromDatabase
        .mockReturnValueOnce(mockRule)
        .mockImplementationOnce(() => {
          throw new Error('Invalid rule configuration');
        });

      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
      const loggerLogSpy = jest.spyOn(Logger.prototype, 'log');

      await service.loadAndRegisterRules();

      expect(mockRuleEngine.registerRule).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load rule'),
        expect.any(String),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('Rule loading complete. Success: 1, Errors: 1');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockRejectedValue(new Error('Database error'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.loadAndRegisterRules();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to load threat detection rules',
        expect.any(String),
      );
      expect(mockRuleEngine.registerRule).not.toHaveBeenCalled();
    });

    it('should load rules in severity order', async () => {
      const rules = [
        { ...mockDbRule, id: 'low', severity: ThreatSeverity.LOW },
        { ...mockDbRule, id: 'critical', severity: ThreatSeverity.CRITICAL },
        { ...mockDbRule, id: 'medium', severity: ThreatSeverity.MEDIUM },
      ];

      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue(rules);
      mockRuleFactory.createFromDatabase.mockImplementation((dbRule) => ({
        ...mockRule,
        id: dbRule.id,
      }));

      await service.loadAndRegisterRules();

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [RuleStatus.ACTIVE, RuleStatus.TESTING],
          },
        },
        orderBy: {
          severity: 'desc',
        },
      });
    });
  });

  describe('createRule', () => {
    const createRuleData = {
      id: 'new-rule',
      name: 'New Rule',
      description: 'A new rule',
      severity: ThreatSeverity.MEDIUM,
      conditionType: 'THRESHOLD',
      config: { threshold: 10 },
      tags: ['test'],
      createdBy: 'user-123',
    };

    it('should create a new rule successfully', async () => {
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.create.mockResolvedValue({
        ...createRuleData,
        status: RuleStatus.INACTIVE,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createRule(createRuleData);

      expect(mockRuleFactory.validateConfig).toHaveBeenCalledWith('new-rule', createRuleData);
      expect(mockPrismaService.threatDetectionRule.create).toHaveBeenCalledWith({
        data: {
          ...createRuleData,
          version: '1.0.0',
          status: RuleStatus.INACTIVE,
        },
      });
      expect(result.id).toBe('new-rule');
      expect(mockRuleEngine.registerRule).not.toHaveBeenCalled(); // Not active
    });

    it('should register rule immediately if created as active', async () => {
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      const activeRuleData = { ...createRuleData, status: RuleStatus.ACTIVE };
      mockPrismaService.threatDetectionRule.create.mockResolvedValue({
        ...activeRuleData,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.createRule(activeRuleData);

      expect(mockRuleEngine.registerRule).toHaveBeenCalledWith(mockRule);
    });

    it('should throw error for invalid rule configuration', async () => {
      mockRuleFactory.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid threshold', 'Missing required field'],
      });

      await expect(service.createRule(createRuleData)).rejects.toThrow(
        'Invalid rule configuration: Invalid threshold, Missing required field',
      );

      expect(mockPrismaService.threatDetectionRule.create).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      const minimalData = {
        id: 'minimal-rule',
        name: 'Minimal Rule',
        description: 'Minimal',
        severity: ThreatSeverity.LOW,
        conditionType: 'PATTERN',
        config: {},
      };

      mockPrismaService.threatDetectionRule.create.mockResolvedValue({
        ...minimalData,
        status: RuleStatus.INACTIVE,
        version: '1.0.0',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createRule(minimalData);

      expect(mockPrismaService.threatDetectionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: '1.0.0',
          status: RuleStatus.INACTIVE,
          tags: [],
        }),
      });
    });
  });

  describe('updateRule', () => {
    const updateData = {
      name: 'Updated Rule',
      severity: ThreatSeverity.CRITICAL,
      config: { threshold: 20 },
    };

    it('should update an existing rule successfully', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        ...updateData,
      });
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      const result = await service.updateRule('brute-force-rule', updateData);

      expect(mockPrismaService.threatDetectionRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'brute-force-rule' },
      });
      expect(mockRuleFactory.validateConfig).toHaveBeenCalledWith('brute-force-rule', {
        ...mockDbRule,
        ...updateData,
      });
      expect(mockRuleEngine.unregisterRule).toHaveBeenCalledWith('brute-force-rule');
      expect(mockRuleEngine.registerRule).toHaveBeenCalledWith(mockRule);
      expect(result.name).toBe('Updated Rule');
    });

    it('should throw error if rule not found', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(null);

      await expect(service.updateRule('non-existent', updateData)).rejects.toThrow(
        'Rule not found: non-existent',
      );

      expect(mockPrismaService.threatDetectionRule.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid configuration', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid config'],
      });

      await expect(service.updateRule('brute-force-rule', updateData)).rejects.toThrow(
        'Invalid rule configuration: Invalid config',
      );
    });

    it('should not re-register inactive rules', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        status: RuleStatus.INACTIVE,
      });

      await service.updateRule('brute-force-rule', { status: RuleStatus.INACTIVE });

      expect(mockRuleEngine.unregisterRule).toHaveBeenCalledWith('brute-force-rule');
      expect(mockRuleEngine.registerRule).not.toHaveBeenCalled();
    });

    it('should skip validation if config not changed', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        name: 'New Name',
      });
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.updateRule('brute-force-rule', { name: 'New Name' });

      expect(mockRuleFactory.validateConfig).not.toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule successfully', async () => {
      await service.deleteRule('rule-to-delete');

      expect(mockRuleEngine.unregisterRule).toHaveBeenCalledWith('rule-to-delete');
      expect(mockPrismaService.threatDetectionRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-to-delete' },
      });
    });

    it('should unregister from engine before deleting from database', async () => {
      const callOrder: string[] = [];
      mockRuleEngine.unregisterRule.mockImplementation(() => callOrder.push('unregister'));
      mockPrismaService.threatDetectionRule.delete.mockImplementation(() =>
        callOrder.push('delete'),
      );

      await service.deleteRule('rule-id');

      expect(callOrder).toEqual(['unregister', 'delete']);
    });
  });

  describe('getRule', () => {
    it('should return a rule by id', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);

      const result = await service.getRule('brute-force-rule');

      expect(mockPrismaService.threatDetectionRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'brute-force-rule' },
      });
      expect(result).toEqual(mockDbRule);
    });

    it('should return null if rule not found', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(null);

      const result = await service.getRule('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllRules', () => {
    it('should return all rules without filter', async () => {
      const rules = [mockDbRule, { ...mockDbRule, id: 'rule-2' }];
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue(rules);

      const result = await service.getAllRules();

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ status: 'asc' }, { severity: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual(rules);
    });

    it('should filter by status', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([mockDbRule]);

      await service.getAllRules({ status: RuleStatus.ACTIVE });

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { status: RuleStatus.ACTIVE },
        orderBy: expect.any(Array),
      });
    });

    it('should filter by severity', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([mockDbRule]);

      await service.getAllRules({ severity: ThreatSeverity.HIGH });

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { severity: ThreatSeverity.HIGH },
        orderBy: expect.any(Array),
      });
    });

    it('should filter by tags', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([mockDbRule]);

      await service.getAllRules({ tags: ['security', 'auth'] });

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {
          tags: {
            hasSome: ['security', 'auth'],
          },
        },
        orderBy: expect.any(Array),
      });
    });

    it('should handle empty tag filter', async () => {
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([]);

      await service.getAllRules({ tags: [] });

      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: expect.any(Array),
      });
    });
  });

  describe('status management methods', () => {
    it('should activate a rule', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        status: RuleStatus.ACTIVE,
      });
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.activateRule('rule-id');

      expect(mockPrismaService.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-id' },
        data: {
          status: RuleStatus.ACTIVE,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should deactivate a rule', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        status: RuleStatus.INACTIVE,
      });

      await service.deactivateRule('rule-id');

      expect(mockPrismaService.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-id' },
        data: {
          status: RuleStatus.INACTIVE,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should set rule to testing', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({
        ...mockDbRule,
        status: RuleStatus.TESTING,
      });
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.setRuleToTesting('rule-id');

      expect(mockPrismaService.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-id' },
        data: {
          status: RuleStatus.TESTING,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getRuleEvaluationHistory', () => {
    const evaluations = [
      {
        id: 'eval-1',
        ruleId: 'rule-1',
        matched: true,
        evaluatedAt: new Date('2024-01-10T10:00:00Z'),
        rule: { name: 'Rule 1', severity: ThreatSeverity.HIGH },
      },
      {
        id: 'eval-2',
        ruleId: 'rule-1',
        matched: false,
        evaluatedAt: new Date('2024-01-10T09:00:00Z'),
        rule: { name: 'Rule 1', severity: ThreatSeverity.HIGH },
      },
    ];

    it('should get evaluation history for a rule', async () => {
      mockPrismaService.ruleEvaluation.findMany.mockResolvedValue(evaluations);

      const result = await service.getRuleEvaluationHistory('rule-1');

      expect(mockPrismaService.ruleEvaluation.findMany).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
        orderBy: { evaluatedAt: 'desc' },
        take: 100,
        include: {
          rule: {
            select: {
              name: true,
              severity: true,
            },
          },
        },
      });
      expect(result).toEqual(evaluations);
    });

    it('should filter by matched status', async () => {
      mockPrismaService.ruleEvaluation.findMany.mockResolvedValue([evaluations[0]]);

      await service.getRuleEvaluationHistory('rule-1', { matched: true });

      expect(mockPrismaService.ruleEvaluation.findMany).toHaveBeenCalledWith({
        where: {
          ruleId: 'rule-1',
          matched: true,
        },
        orderBy: { evaluatedAt: 'desc' },
        take: 100,
        include: expect.any(Object),
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-10T23:59:59Z');

      mockPrismaService.ruleEvaluation.findMany.mockResolvedValue(evaluations);

      await service.getRuleEvaluationHistory('rule-1', { startDate, endDate });

      expect(mockPrismaService.ruleEvaluation.findMany).toHaveBeenCalledWith({
        where: {
          ruleId: 'rule-1',
          evaluatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { evaluatedAt: 'desc' },
        take: 100,
        include: expect.any(Object),
      });
    });

    it('should respect custom limit', async () => {
      mockPrismaService.ruleEvaluation.findMany.mockResolvedValue(evaluations);

      await service.getRuleEvaluationHistory('rule-1', { limit: 50 });

      expect(mockPrismaService.ruleEvaluation.findMany).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
        orderBy: { evaluatedAt: 'desc' },
        take: 50,
        include: expect.any(Object),
      });
    });
  });

  describe('batchImportRules', () => {
    const importRules = [
      {
        id: 'import-1',
        name: 'Import Rule 1',
        description: 'First import',
        severity: ThreatSeverity.LOW,
        conditionType: 'PATTERN',
        config: {},
      },
      {
        id: 'import-2',
        name: 'Import Rule 2',
        description: 'Second import',
        severity: ThreatSeverity.MEDIUM,
        conditionType: 'THRESHOLD',
        config: { threshold: 10 },
      },
    ];

    it('should import new rules successfully', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.create.mockResolvedValue({});

      const result = await service.batchImportRules(importRules);

      expect(result).toEqual({
        imported: 2,
        skipped: 0,
        updated: 0,
        errors: 0,
      });
      expect(mockPrismaService.threatDetectionRule.create).toHaveBeenCalledTimes(2);
    });

    it('should skip existing rules by default', async () => {
      mockPrismaService.threatDetectionRule.findUnique
        .mockResolvedValueOnce(mockDbRule) // First rule exists
        .mockResolvedValueOnce(null); // Second rule doesn't exist
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.create.mockResolvedValue({});

      const result = await service.batchImportRules(importRules);

      expect(result).toEqual({
        imported: 1,
        skipped: 1,
        updated: 0,
        errors: 0,
      });
      expect(mockPrismaService.threatDetectionRule.create).toHaveBeenCalledTimes(1);
    });

    it('should skip existing rules when skipExisting is true', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);

      const result = await service.batchImportRules(importRules, { skipExisting: true });

      expect(result).toEqual({
        imported: 0,
        skipped: 2,
        updated: 0,
        errors: 0,
      });
      expect(mockPrismaService.threatDetectionRule.create).not.toHaveBeenCalled();
      expect(mockPrismaService.threatDetectionRule.update).not.toHaveBeenCalled();
    });

    it('should update existing rules when updateExisting is true', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(mockDbRule);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.update.mockResolvedValue({});
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      const result = await service.batchImportRules(importRules, { updateExisting: true });

      expect(result).toEqual({
        imported: 0,
        skipped: 0,
        updated: 2,
        errors: 0,
      });
      expect(mockPrismaService.threatDetectionRule.update).toHaveBeenCalledTimes(2);
    });

    it('should handle import errors gracefully', async () => {
      mockPrismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      mockRuleFactory.validateConfig.mockReturnValue({ valid: true });
      mockPrismaService.threatDetectionRule.create
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({});

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      const result = await service.batchImportRules(importRules);

      expect(result).toEqual({
        imported: 1,
        skipped: 0,
        updated: 0,
        errors: 1,
      });
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to import rule'));
    });
  });

  describe('reloadRules', () => {
    it('should reload all rules', async () => {
      const currentRules = [
        { id: 'rule-1', name: 'Rule 1' },
        { id: 'rule-2', name: 'Rule 2' },
      ];
      mockRuleEngine.getAllRules.mockReturnValue(currentRules);
      mockPrismaService.threatDetectionRule.findMany.mockResolvedValue([mockDbRule]);
      mockRuleFactory.createFromDatabase.mockReturnValue(mockRule);

      await service.reloadRules();

      expect(mockRuleEngine.unregisterRule).toHaveBeenCalledWith('rule-1');
      expect(mockRuleEngine.unregisterRule).toHaveBeenCalledWith('rule-2');
      expect(mockPrismaService.threatDetectionRule.findMany).toHaveBeenCalled();
      expect(mockRuleEngine.registerRule).toHaveBeenCalled();
    });

    it('should unregister all rules before reloading', async () => {
      const callOrder: string[] = [];
      mockRuleEngine.getAllRules.mockReturnValue([{ id: 'rule-1' }]);
      mockRuleEngine.unregisterRule.mockImplementation(() => callOrder.push('unregister'));
      mockPrismaService.threatDetectionRule.findMany.mockImplementation(() => {
        callOrder.push('load');
        return Promise.resolve([]);
      });

      await service.reloadRules();

      expect(callOrder).toEqual(['unregister', 'load']);
    });
  });
});
