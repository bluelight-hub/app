import { Test, TestingModule } from '@nestjs/testing';
import { SeedThreatRulesCommand } from '../seed-threat-rules.command';
import { ThreatRulesSeedService } from '@/modules/seed/threat-rules-seed.service';
import { Logger } from '@nestjs/common';

describe('SeedThreatRulesCommand', () => {
  let command: SeedThreatRulesCommand;
  let threatRulesSeedService: jest.Mocked<ThreatRulesSeedService>;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedThreatRulesCommand,
        {
          provide: ThreatRulesSeedService,
          useValue: {
            seedThreatDetectionRules: jest.fn(),
          },
        },
      ],
    }).compile();

    command = module.get<SeedThreatRulesCommand>(SeedThreatRulesCommand);
    threatRulesSeedService = module.get(ThreatRulesSeedService);

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('run', () => {
    it('should seed threat rules with default options', async () => {
      const mockResult = {
        imported: 5,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: [
          {
            id: 'rule-1',
            name: 'Rule 1',
            description: 'Test rule 1',
            version: '1.0.0',
            severity: 'HIGH' as any,
            status: 'ACTIVE' as any,
            conditionType: 'THRESHOLD' as any,
            config: {},
            tags: [],
          },
          {
            id: 'rule-2',
            name: 'Rule 2',
            description: 'Test rule 2',
            version: '1.0.0',
            severity: 'MEDIUM' as any,
            status: 'ACTIVE' as any,
            conditionType: 'THRESHOLD' as any,
            config: {},
            tags: [],
          },
        ],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([]);

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'standard',
        reset: false,
        dryRun: false,
        activate: true,
        skipExisting: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith('🔐 Starte Threat Detection Rules Seeding...');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Threat Detection Rules erfolgreich geseeded!');
      expect(loggerSpy).toHaveBeenCalledWith(`   Importiert: ${mockResult.imported}`);
    });

    it('should handle invalid preset', async () => {
      await command.run([], { preset: 'invalid' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Ungültiges Preset: invalid. Verfügbar: minimal, standard, maximum, development',
      );
      expect(threatRulesSeedService.seedThreatDetectionRules).not.toHaveBeenCalled();
    });

    it('should handle reset mode with warning', async () => {
      const mockResult = {
        imported: 0,
        updated: 10,
        skipped: 0,
        errors: 0,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([], { reset: true });

      expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️  WARNUNG: Reset-Modus aktiviert!');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '   Alle benutzerdefinierten Regelanpassungen werden überschrieben.',
      );

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'standard',
        reset: true,
        dryRun: false,
        activate: true,
        skipExisting: true,
      });
    });

    it('should handle dry run mode', async () => {
      const mockResult = {
        wouldImport: 5,
        wouldUpdate: 2,
        wouldSkip: 1,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([], { dryRun: true });

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'standard',
        reset: false,
        dryRun: true,
        activate: true,
        skipExisting: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith('🔍 Dry-Run Ergebnisse:');
      expect(loggerSpy).toHaveBeenCalledWith(`   Würden importiert: ${mockResult.wouldImport}`);
      expect(loggerSpy).toHaveBeenCalledWith(
        'ℹ️  Keine Änderungen wurden vorgenommen (Dry-Run Modus)',
      );
    });

    it('should handle different presets', async () => {
      const mockResult = {
        imported: 3,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([], { preset: 'maximum' });

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'maximum',
        reset: false,
        dryRun: false,
        activate: true,
        skipExisting: true,
      });
    });

    it('should handle no-activate option', async () => {
      const mockResult = {
        imported: 5,
        updated: 0,
        skipped: 0,
        errors: 0,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([], { activate: false });

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'standard',
        reset: false,
        dryRun: false,
        activate: false,
        skipExisting: true,
      });
    });

    it('should handle update-existing option', async () => {
      const mockResult = {
        imported: 2,
        updated: 3,
        skipped: 0,
        errors: 0,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([], { skipExisting: false });

      expect(threatRulesSeedService.seedThreatDetectionRules).toHaveBeenCalledWith({
        preset: 'standard',
        reset: false,
        dryRun: false,
        activate: true,
        skipExisting: false,
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      threatRulesSeedService.seedThreatDetectionRules.mockRejectedValue(error);

      await command.run([]);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Seeding: Database connection failed',
        expect.any(String),
      );
    });

    it('should display rules when imported or updated', async () => {
      const mockResult = {
        imported: 2,
        updated: 1,
        skipped: 0,
        errors: 0,
        rules: [
          {
            id: 'brute-force',
            name: 'Brute Force Detection',
            description: 'Test',
            version: '1.0.0',
            severity: 'HIGH' as any,
            status: 'ACTIVE' as any,
            conditionType: 'THRESHOLD' as any,
            config: {},
            tags: [],
          },
          {
            id: 'ip-velocity',
            name: 'IP Velocity Check',
            description: 'Test',
            version: '1.0.0',
            severity: 'MEDIUM' as any,
            status: 'ACTIVE' as any,
            conditionType: 'THRESHOLD' as any,
            config: {},
            tags: [],
          },
          {
            id: 'user-agent',
            name: 'Suspicious User Agent',
            description: 'Test',
            version: '1.0.0',
            severity: 'LOW' as any,
            status: 'TESTING' as any,
            conditionType: 'PATTERN' as any,
            config: {},
            tags: [],
          },
        ],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([]);

      expect(loggerSpy).toHaveBeenCalledWith('🎯 Geseedete Regeln:');
      mockResult.rules.forEach((rule) => {
        expect(loggerSpy).toHaveBeenCalledWith(
          `   - ${rule.name} (${rule.severity}) [${rule.status}]`,
        );
      });
    });

    it('should handle result with errors', async () => {
      const mockResult = {
        imported: 3,
        updated: 0,
        skipped: 1,
        errors: 2,
        rules: [],
      };

      threatRulesSeedService.seedThreatDetectionRules.mockResolvedValue(mockResult);

      await command.run([]);

      expect(loggerSpy).toHaveBeenCalledWith(`   Fehler: ${mockResult.errors}`);
    });
  });

  describe('option parsers', () => {
    it('parseReset should return true', () => {
      expect(command.parseReset()).toBe(true);
    });

    it('parseDryRun should return true', () => {
      expect(command.parseDryRun()).toBe(true);
    });

    it('parsePreset should return the passed value', () => {
      expect(command.parsePreset('minimal')).toBe('minimal');
      expect(command.parsePreset('maximum')).toBe('maximum');
    });

    it('parseNoActivate should return false', () => {
      expect(command.parseNoActivate()).toBe(false);
    });

    it('parseUpdateExisting should return false', () => {
      expect(command.parseUpdateExisting()).toBe(false);
    });
  });
});
