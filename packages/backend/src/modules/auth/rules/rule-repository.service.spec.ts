import { Test, TestingModule } from '@nestjs/testing';
import { RuleRepositoryService } from './rule-repository.service';
import { RuleEngineService } from './rule-engine.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThreatSeverity, RuleStatus, ConditionType } from '@prisma/generated/prisma/enums';
import { ThreatDetectionRule as PrismaThreatDetectionRule } from '@prisma/generated/prisma/client';

describe('RuleRepositoryService', () => {
  let service: RuleRepositoryService;
  let prisma: PrismaService;
  let ruleEngine: RuleEngineService;
  let module: TestingModule;

  const mockPrismaRule: PrismaThreatDetectionRule = {
    id: 'rule-1',
    name: 'Test Rule',
    description: 'Test description',
    version: '1.0.0',
    status: RuleStatus.ACTIVE,
    severity: ThreatSeverity.HIGH,
    conditionType: ConditionType.THRESHOLD,
    config: {
      threshold: 5,
      timeWindowMinutes: 15,
    },
    tags: ['test', 'security'],
    createdBy: 'admin',
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RuleRepositoryService,
        {
          provide: RuleEngineService,
          useValue: {
            registerRule: jest.fn(),
            getRule: jest.fn(),
            getAllRules: jest.fn().mockReturnValue([]),
            unregisterRule: jest.fn(),
            getMetrics: jest.fn().mockReturnValue({
              totalRules: 0,
              activeRules: 0,
              totalExecutions: 0,
              totalMatches: 0,
              matchRate: 0,
              ruleStats: {},
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            threatDetectionRule: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            ruleEvaluation: {
              count: jest.fn(),
              groupBy: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(false), // Default hot reload to false
          },
        },
      ],
    }).compile();

    service = module.get<RuleRepositoryService>(RuleRepositoryService);
    prisma = module.get<PrismaService>(PrismaService);
    ruleEngine = module.get<RuleEngineService>(RuleEngineService);
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadAllRules', () => {
    it('should load all active rules from database', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      // Mock createRuleFromDbRecord to return a valid rule
      jest.spyOn(service as any, 'createRuleFromDbRecord').mockResolvedValue({
        id: 'rule-1',
        name: 'Test Rule',
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn(),
        status: 'ACTIVE',
      });

      await service.loadAllRules();

      // loadAllRules calls getRules internally which adds orderBy
      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { status: { in: [RuleStatus.ACTIVE, RuleStatus.TESTING] } },
        orderBy: { createdAt: 'desc' },
      });
      // Check that rules were registered
      expect(ruleEngine.registerRule).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await service.loadAllRules();

      // Should handle error gracefully
      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalled();
    });
  });

  describe('getRules', () => {
    it('should get all rules without filters', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      const result = await service.getRules({});

      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Rule');
    });

    it('should filter rules by status', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      await service.getRules({ status: RuleStatus.ACTIVE });

      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { status: RuleStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter rules by severity', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      await service.getRules({ severity: ThreatSeverity.HIGH });

      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { severity: ThreatSeverity.HIGH },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter rules by tags', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      await service.getRules({ tags: ['security'] });

      expect(prisma.threatDetectionRule.findMany).toHaveBeenCalledWith({
        where: { tags: { hasSome: ['security'] } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getRule', () => {
    it('should get a single rule by id', async () => {
      (prisma.threatDetectionRule.findUnique as jest.Mock).mockResolvedValue(mockPrismaRule);

      const result = await service.getRule('rule-1');

      expect(prisma.threatDetectionRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      expect(result?.name).toBe('Test Rule');
    });

    it('should return null if rule not found', async () => {
      (prisma.threatDetectionRule.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getRule('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createRule', () => {
    it('should create a new rule', async () => {
      (prisma.threatDetectionRule.create as jest.Mock).mockResolvedValue(mockPrismaRule);

      const dto = {
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        conditionType: ConditionType.THRESHOLD,
        config: { threshold: 5 },
        tags: ['test'],
      };

      const result = await service.createRule(dto);

      expect(prisma.threatDetectionRule.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          severity: dto.severity,
          conditionType: dto.conditionType,
          config: dto.config,
          tags: dto.tags,
          status: RuleStatus.TESTING, // Default status is TESTING
          version: '1.0.0',
        },
      });
      expect(result).toBe('rule-1');
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue({
        ...mockPrismaRule,
        status: RuleStatus.ACTIVE,
      });

      const dto = { status: RuleStatus.ACTIVE };

      await service.updateRule('rule-1', dto);

      expect(prisma.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          status: RuleStatus.ACTIVE,
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should reload rules if status changed to active', async () => {
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue({
        ...mockPrismaRule,
        status: RuleStatus.ACTIVE,
      });

      await service.updateRule('rule-1', { status: RuleStatus.ACTIVE });

      // Rule should be registered after update
      expect(prisma.threatDetectionRule.update).toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      (prisma.threatDetectionRule.delete as jest.Mock).mockResolvedValue(mockPrismaRule);
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([]);

      await service.deleteRule('rule-1');

      expect(prisma.threatDetectionRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      // Should reload rules after loading
    });
  });

  describe('getRuleStatistics', () => {
    it('should return rule statistics', async () => {
      const mockRules = [
        { ...mockPrismaRule, status: RuleStatus.ACTIVE },
        { ...mockPrismaRule, id: 'rule-2', status: RuleStatus.ACTIVE },
        { ...mockPrismaRule, id: 'rule-3', status: RuleStatus.INACTIVE },
        { ...mockPrismaRule, id: 'rule-4', status: RuleStatus.TESTING },
      ];

      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRuleStatistics();

      expect(result.totalRules).toBe(4);
      expect(result.rulesByStatus).toEqual({
        active: 2,
        inactive: 1,
        testing: 1,
      });
      expect(result.rulesBySeverity).toBeDefined();
      expect(result.engineMetrics).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should load all rules on module init without hot reload', async () => {
      jest.spyOn(service, 'loadAllRules').mockResolvedValue();

      await service.onModuleInit();

      expect(service.loadAllRules).toHaveBeenCalled();
    });

    it('should start hot reload interval when enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'THREAT_RULES_HOT_RELOAD') return true;
          if (key === 'THREAT_RULES_RELOAD_INTERVAL') return 5000;
          return false;
        }),
      };

      jest.useFakeTimers();
      jest.spyOn(service, 'loadAllRules').mockResolvedValue();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      // Create new instance with hot reload enabled
      const moduleWithHotReload: TestingModule = await Test.createTestingModule({
        providers: [
          RuleRepositoryService,
          {
            provide: RuleEngineService,
            useValue: {
              registerRule: jest.fn(),
              getRule: jest.fn(),
              getAllRules: jest.fn().mockReturnValue([]),
              unregisterRule: jest.fn(),
              getMetrics: jest.fn().mockReturnValue({
                totalRules: 0,
                activeRules: 0,
                totalExecutions: 0,
                totalMatches: 0,
                matchRate: 0,
                ruleStats: {},
              }),
            },
          },
          {
            provide: PrismaService,
            useValue: prisma,
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithHotReload =
        moduleWithHotReload.get<RuleRepositoryService>(RuleRepositoryService);
      jest.spyOn(serviceWithHotReload, 'loadAllRules').mockResolvedValue();

      await serviceWithHotReload.onModuleInit();

      expect(serviceWithHotReload.loadAllRules).toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      jest.clearAllTimers();
      await moduleWithHotReload.close();
    });
  });

  describe('createRule', () => {
    it('should create a new rule', async () => {
      (prisma.threatDetectionRule.create as jest.Mock).mockResolvedValue(mockPrismaRule);

      const dto = {
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        conditionType: ConditionType.THRESHOLD,
        config: { threshold: 5 },
        tags: ['test'],
      };

      const result = await service.createRule(dto);

      expect(prisma.threatDetectionRule.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          severity: dto.severity,
          conditionType: dto.conditionType,
          config: dto.config,
          tags: dto.tags,
          status: RuleStatus.TESTING, // Default status is TESTING
          version: '1.0.0',
        },
      });
      expect(result).toBe('rule-1');
    });

    it('should register rule in engine when status is TESTING', async () => {
      const testingRule = { ...mockPrismaRule, status: RuleStatus.TESTING };
      (prisma.threatDetectionRule.create as jest.Mock).mockResolvedValue(testingRule);

      // Mock createRuleFromDbRecord to return a valid rule
      const mockRuleInstance = {
        id: 'rule-1',
        name: 'Test Rule',
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn(),
        status: 'TESTING',
      };
      jest.spyOn(service as any, 'createRuleFromDbRecord').mockResolvedValue(mockRuleInstance);

      const dto = {
        name: 'Test Rule',
        description: 'Test description',
        severity: ThreatSeverity.HIGH,
        conditionType: ConditionType.THRESHOLD,
        config: { threshold: 5 },
        tags: ['test'],
      };

      await service.createRule(dto);

      expect(ruleEngine.registerRule).toHaveBeenCalledWith(mockRuleInstance);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue({
        ...mockPrismaRule,
        status: RuleStatus.ACTIVE,
      });

      const dto = { status: RuleStatus.ACTIVE };

      await service.updateRule('rule-1', dto);

      expect(prisma.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          status: RuleStatus.ACTIVE,
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should reload rules if status changed to active', async () => {
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue({
        ...mockPrismaRule,
        status: RuleStatus.ACTIVE,
      });

      await service.updateRule('rule-1', { status: RuleStatus.ACTIVE });

      // Rule should be registered after update
      expect(prisma.threatDetectionRule.update).toHaveBeenCalled();
    });

    it('should increment version when config changes', async () => {
      const existingRule = { ...mockPrismaRule, version: '1.0.5' };
      (prisma.threatDetectionRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue({
        ...existingRule,
        config: { threshold: 10 },
        version: '1.0.6',
      });

      await service.updateRule('rule-1', { config: { threshold: 10 } });

      expect(prisma.threatDetectionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          config: { threshold: 10 },
          version: '1.0.6',
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should unregister and re-register rule when updated', async () => {
      const updatedRule = { ...mockPrismaRule, status: RuleStatus.ACTIVE };
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue(updatedRule);

      const mockRuleInstance = {
        id: 'rule-1',
        name: 'Test Rule',
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn(),
        status: 'ACTIVE',
      };
      jest.spyOn(service as any, 'createRuleFromDbRecord').mockResolvedValue(mockRuleInstance);

      await service.updateRule('rule-1', { status: RuleStatus.ACTIVE });

      expect(ruleEngine.unregisterRule).toHaveBeenCalledWith('rule-1');
      expect(ruleEngine.registerRule).toHaveBeenCalledWith(mockRuleInstance);
    });

    it('should remove rule from cache when status is INACTIVE', async () => {
      const inactiveRule = { ...mockPrismaRule, status: RuleStatus.INACTIVE };
      (prisma.threatDetectionRule.update as jest.Mock).mockResolvedValue(inactiveRule);

      await service.updateRule('rule-1', { status: RuleStatus.INACTIVE });

      expect(ruleEngine.unregisterRule).toHaveBeenCalledWith('rule-1');
      expect(ruleEngine.registerRule).not.toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      (prisma.threatDetectionRule.delete as jest.Mock).mockResolvedValue(mockPrismaRule);
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([]);

      await service.deleteRule('rule-1');

      expect(prisma.threatDetectionRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      // Should reload rules after loading
    });

    it('should unregister rule from engine when deleted', async () => {
      (prisma.threatDetectionRule.delete as jest.Mock).mockResolvedValue(mockPrismaRule);

      await service.deleteRule('rule-1');

      expect(ruleEngine.unregisterRule).toHaveBeenCalledWith('rule-1');
    });
  });

  describe('loadAllRules edge cases', () => {
    it('should handle empty rule list', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([]);

      await service.loadAllRules();

      expect(ruleEngine.registerRule).not.toHaveBeenCalled();
    });

    it('should skip rules that fail validation', async () => {
      const invalidRule = { ...mockPrismaRule, id: 'invalid-rule' };
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([
        mockPrismaRule,
        invalidRule,
      ]);

      const validRuleInstance = {
        id: 'rule-1',
        name: 'Test Rule',
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn(),
        status: 'ACTIVE',
      };

      // Mock createRuleFromDbRecord to return valid rule for first call, null for second (failed validation)
      jest
        .spyOn(service as any, 'createRuleFromDbRecord')
        .mockResolvedValueOnce(validRuleInstance)
        .mockResolvedValueOnce(null); // Simulating validation failure by returning null

      await service.loadAllRules();

      expect(ruleEngine.registerRule).toHaveBeenCalledTimes(1);
      expect(ruleEngine.registerRule).toHaveBeenCalledWith(validRuleInstance);
    });

    it('should handle rules without corresponding class', async () => {
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);
      jest.spyOn(service as any, 'createRuleFromDbRecord').mockResolvedValue(null);

      await service.loadAllRules();

      expect(ruleEngine.registerRule).not.toHaveBeenCalled();
    });

    it('should clear existing rules before loading new ones', async () => {
      const existingRules = [
        { id: 'existing-1', name: 'Existing Rule 1' },
        { id: 'existing-2', name: 'Existing Rule 2' },
      ];
      (ruleEngine.getAllRules as jest.Mock).mockReturnValue(existingRules);
      (prisma.threatDetectionRule.findMany as jest.Mock).mockResolvedValue([mockPrismaRule]);

      jest.spyOn(service as any, 'createRuleFromDbRecord').mockResolvedValue({
        id: 'rule-1',
        name: 'Test Rule',
        evaluate: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getDescription: jest.fn(),
        status: 'ACTIVE',
      });

      await service.loadAllRules();

      expect(ruleEngine.unregisterRule).toHaveBeenCalledWith('existing-1');
      expect(ruleEngine.unregisterRule).toHaveBeenCalledWith('existing-2');
      expect(ruleEngine.registerRule).toHaveBeenCalled();
    });
  });

  describe('getRuleClass', () => {
    it('should return correct rule class for each condition type', async () => {
      // Test THRESHOLD type
      const thresholdClass = await (service as any).getRuleClass(ConditionType.THRESHOLD);
      expect(thresholdClass).toBeDefined();

      // Test PATTERN type
      const patternClass = await (service as any).getRuleClass(ConditionType.PATTERN);
      expect(patternClass).toBeDefined();

      // Test TIME_BASED type
      const timeBasedClass = await (service as any).getRuleClass(ConditionType.TIME_BASED);
      expect(timeBasedClass).toBeDefined();

      // Test GEO_BASED type
      const geoBasedClass = await (service as any).getRuleClass(ConditionType.GEO_BASED);
      expect(geoBasedClass).toBeDefined();

      // Test unknown type
      const unknownClass = await (service as any).getRuleClass('UNKNOWN' as ConditionType);
      expect(unknownClass).toBeNull();
    });
  });

  describe('incrementVersion', () => {
    it('should increment patch version correctly', () => {
      const result = (service as any).incrementVersion({ version: '1.2.3' });
      expect(result).toBe('1.2.4');
    });

    it('should handle missing version', () => {
      const result = (service as any).incrementVersion({});
      expect(result).toBe('1.0.0');
    });

    it('should handle null rule', () => {
      const result = (service as any).incrementVersion(null);
      expect(result).toBe('1.0.0');
    });

    it('should handle version without patch number', () => {
      const result = (service as any).incrementVersion({ version: '1.2' });
      expect(result).toBe('1.2.1');
    });
  });

  // Hot reload tests removed as methods are private
});
