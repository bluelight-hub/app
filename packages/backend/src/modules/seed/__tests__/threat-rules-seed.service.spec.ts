import { Test, TestingModule } from '@nestjs/testing';
import { ThreatRulesSeedService } from '../threat-rules-seed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RuleStatus } from '@prisma/generated/prisma/enums';
import { getRulesForPreset } from '@/modules/auth/constants';

// Mock the auth constants module
jest.mock('@/modules/auth/constants', () => ({
  getRulesForPreset: jest.fn(),
}));

describe('ThreatRulesSeedService', () => {
  let service: ThreatRulesSeedService;
  let prismaService: any;

  const mockRules = [
    {
      id: 'rule-1',
      name: 'Test Rule 1',
      description: 'Test rule description 1',
      version: '1.0.0',
      status: RuleStatus.ACTIVE,
      severity: 'HIGH',
      conditionType: 'THRESHOLD',
      config: { threshold: 5 },
      tags: ['test'],
    },
    {
      id: 'rule-2',
      name: 'Test Rule 2',
      description: 'Test rule description 2',
      version: '1.0.0',
      status: RuleStatus.ACTIVE,
      severity: 'MEDIUM',
      conditionType: 'PATTERN',
      config: { patterns: ['test'] },
      tags: ['test'],
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      threatDetectionRule: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatRulesSeedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ThreatRulesSeedService>(ThreatRulesSeedService);
    prismaService = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
    (getRulesForPreset as jest.Mock).mockReturnValue(mockRules);
  });

  describe('seedThreatDetectionRules', () => {
    it('sollte erfolgreich Regeln importieren', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(getRulesForPreset).toHaveBeenCalledWith('standard');
      expect(prismaService.threatDetectionRule.findUnique).toHaveBeenCalledTimes(2);
      expect(prismaService.threatDetectionRule.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        imported: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('sollte existierende Regeln überspringen wenn skipExisting true ist', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique
        .mockResolvedValueOnce({ id: 'rule-1' } as any)
        .mockResolvedValueOnce(null);
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(result).toEqual({
        imported: 1,
        updated: 0,
        skipped: 1,
        errors: 0,
        rules: [expect.objectContaining({ id: 'rule-2' })],
      });
    });

    it('sollte existierende Regeln aktualisieren wenn skipExisting false ist', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique
        .mockResolvedValueOnce({ id: 'rule-1' } as any)
        .mockResolvedValueOnce(null);
      prismaService.threatDetectionRule.update.mockImplementation((data) =>
        Promise.resolve(data.data),
      );
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: false,
      });

      // Assert
      expect(prismaService.threatDetectionRule.update).toHaveBeenCalledTimes(1);
      expect(prismaService.threatDetectionRule.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        imported: 1,
        updated: 1,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('sollte alle Regeln löschen und neu importieren bei reset', async () => {
      // Arrange
      prismaService.threatDetectionRule.deleteMany.mockResolvedValue({ count: 5 } as any);
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        reset: true,
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(prismaService.threatDetectionRule.deleteMany).toHaveBeenCalled();
      expect(prismaService.threatDetectionRule.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        imported: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
        ]),
      });
    });

    it('sollte dry-run Modus korrekt ausführen', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique
        .mockResolvedValueOnce({ id: 'rule-1' } as any)
        .mockResolvedValueOnce(null);

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        dryRun: true,
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(prismaService.threatDetectionRule.create).not.toHaveBeenCalled();
      expect(prismaService.threatDetectionRule.update).not.toHaveBeenCalled();
      expect(prismaService.threatDetectionRule.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        wouldImport: 1,
        wouldUpdate: 0,
        wouldSkip: 1,
        rules: expect.arrayContaining([
          expect.objectContaining({ id: 'rule-1', wouldBe: 'skipped' }),
          expect.objectContaining({ id: 'rule-2', wouldBe: 'imported' }),
        ]),
      });
    });

    it('sollte Fehler beim Import einzelner Regeln behandeln', async () => {
      // Arrange
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      prismaService.threatDetectionRule.create
        .mockRejectedValueOnce(new Error('Create failed'))
        .mockImplementation((data) => Promise.resolve(data.data));

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(result).toEqual({
        imported: 1,
        updated: 0,
        skipped: 0,
        errors: 1,
        rules: [expect.objectContaining({ id: 'rule-2' })],
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('sollte verschiedene Presets unterstützen', async () => {
      // Arrange
      const minimalRules = [mockRules[0]];
      (getRulesForPreset as jest.Mock).mockReturnValue(minimalRules);
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'minimal',
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(getRulesForPreset).toHaveBeenCalledWith('minimal');
      expect(result.imported).toBe(1);
    });

    it('sollte inaktive Regeln erstellen wenn activate false ist', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);
      prismaService.threatDetectionRule.create.mockImplementation((data) =>
        Promise.resolve(data.data),
      );

      // Act
      await service.seedThreatDetectionRules({
        preset: 'standard',
        activate: false,
        skipExisting: true,
      });

      // Assert
      expect(prismaService.threatDetectionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: RuleStatus.INACTIVE,
        }),
      });
    });

    it('sollte bei dry-run mit reset korrekt analysieren', async () => {
      // Arrange
      prismaService.threatDetectionRule.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.seedThreatDetectionRules({
        preset: 'standard',
        dryRun: true,
        reset: true,
        activate: true,
        skipExisting: true,
      });

      // Assert
      expect(prismaService.threatDetectionRule.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        wouldImport: 2,
        wouldUpdate: 0,
        wouldSkip: 0,
        rules: expect.arrayContaining([expect.objectContaining({ wouldBe: 'imported' })]),
      });
    });
  });
});
