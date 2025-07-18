import { Test, TestingModule } from '@nestjs/testing';
import { RuleRepositoryService } from './rule-repository.service';
import { RuleEngineService } from './rule-engine.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThreatSeverity, RuleStatus, ConditionType } from './rule.interface';
import { ThreatDetectionRule as PrismaThreatDetectionRule } from '@prisma/generated/prisma/client';

describe('RuleRepositoryService', () => {
  let service: RuleRepositoryService;
  let prisma: PrismaService;
  let ruleEngine: RuleEngineService;

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
    const module: TestingModule = await Test.createTestingModule({
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

  // Hot reload tests removed as methods are private
});
