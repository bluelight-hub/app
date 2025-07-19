import { Test, TestingModule } from '@nestjs/testing';
import { SeedImportCommand } from './seed-import.command';
import { SeedImportService } from '@/modules/seed/seed-import.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('SeedImportCommand', () => {
  let command: SeedImportCommand;
  let seedImportService: jest.Mocked<SeedImportService>;
  let loggerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedImportCommand,
        {
          provide: SeedImportService,
          useValue: {
            importFromFile: jest.fn(),
            validateFile: jest.fn(),
          },
        },
      ],
    }).compile();

    command = module.get<SeedImportCommand>(SeedImportCommand);
    seedImportService = module.get(SeedImportService);

    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should import data from JSON file successfully', async () => {
      const mockResult = {
        success: true,
        einsaetzeCreated: 5,
        etbEntriesCreated: 10,
        attachmentsCreated: 3,
        durationMs: 1000,
        warnings: [],
        errors: [],
        createdEntities: {
          einsaetze: [{ id: '1', name: 'Test Einsatz' }],
          etbEntries: [],
        },
      };

      seedImportService.importFromFile.mockResolvedValue(mockResult);

      await command.run([], { file: 'test.json' });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith('test.json', {
        dryRun: false,
        overwriteConflicts: false,
        validationLevel: 'moderate',
        strictWarnings: false,
        autoTimestamps: true,
        progressCallback: undefined,
      });
      expect(loggerSpy).toHaveBeenCalledWith('✅ Import erfolgreich abgeschlossen!');
    });

    it('should handle missing file parameter', async () => {
      await command.run([]);

      expect(errorSpy).toHaveBeenCalledWith('❌ Datei-Parameter ist erforderlich.');
      expect(loggerSpy).toHaveBeenCalledWith('\n💡 Verwendung:');
    });

    it.skip('should show example files when listExamples is set', async () => {
      const mockFiles = ['example1.json', 'example2.json', 'other.txt'];
      const mockStats = { size: 1024 };
      const mockData = {
        metadata: {
          name: 'Test Example',
          description: 'Test Description',
          category: 'Test',
          priority: 'High',
        },
      };

      // Ensure fs.promises is properly mocked
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      // Mock process.cwd to return a consistent path
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/test/dir');

      await command.run([], { listExamples: true });

      // Restore process.cwd
      process.cwd = originalCwd;

      expect(loggerSpy).toHaveBeenCalledWith('\n📋 Verfügbare Beispiel-JSON-Dateien:');
      expect(loggerSpy).toHaveBeenCalledWith('=====================================');
      expect(loggerSpy).toHaveBeenCalledWith('📄 example1.json');
      expect(loggerSpy).toHaveBeenCalledWith('   Größe: 1 KB');
      expect(loggerSpy).toHaveBeenCalledWith('   Name: Test Example');
      expect(loggerSpy).toHaveBeenCalledWith('   Beschreibung: Test Description');
      expect(loggerSpy).toHaveBeenCalledWith('   Kategorie: Test');
      expect(loggerSpy).toHaveBeenCalledWith('   Priorität: High');
      expect(loggerSpy).toHaveBeenCalledWith(
        '   💡 Import: npm run cli -- seed:import --file=seed-data/examples/example1.json',
      );
      expect(loggerSpy).toHaveBeenCalledWith('');
    });

    it('should validate data when validate option is set', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full' as const,
        metadata: {
          schemaVersion: '1.0',
          einsaetzeCount: 2,
          etbEntriesCount: 5,
          estimatedSizeBytes: 2048,
        },
      };

      seedImportService.validateFile.mockResolvedValue(mockValidation);

      await command.run([], { file: 'test.json', validate: true });

      expect(seedImportService.validateFile).toHaveBeenCalledWith('test.json', {
        validationLevel: 'moderate',
        strictWarnings: false,
      });
      expect(loggerSpy).toHaveBeenCalledWith('✅ JSON-Datei ist gültig!');
    });

    it('should show validation errors', async () => {
      const mockValidation = {
        valid: false,
        errors: [
          {
            code: 'MISSING_FIELD',
            message: 'Name fehlt',
            severity: 'error' as const,
            instancePath: '/einsaetze/0',
          },
        ],
        warnings: [
          {
            code: 'OLD_VERSION',
            message: 'Version veraltet',
            severity: 'warning' as const,
            recommendation: 'Aktualisieren Sie auf Version 2.0',
          },
        ],
        detectedFormat: 'full' as const,
        metadata: {
          einsaetzeCount: 0,
          etbEntriesCount: 0,
          estimatedSizeBytes: 0,
        },
      };

      seedImportService.validateFile.mockResolvedValue(mockValidation);

      await command.run([], { file: 'test.json', validate: true });

      expect(errorSpy).toHaveBeenCalledWith('❌ JSON-Datei ist ungültig!');
      expect(errorSpy).toHaveBeenCalledWith('   - Name fehlt');
      expect(warnSpy).toHaveBeenCalledWith('   - Version veraltet');
    });

    it('should perform dry run', async () => {
      const mockResult = {
        success: true,
        einsaetzeCreated: 5,
        etbEntriesCreated: 10,
        attachmentsCreated: 3,
        durationMs: 1000,
        warnings: ['Dry-Run durchgeführt - keine Datenbank-Änderungen'],
        errors: [],
        createdEntities: {
          einsaetze: [],
          etbEntries: [],
        },
      };

      seedImportService.importFromFile.mockResolvedValue(mockResult);

      await command.run([], { file: 'test.json', dryRun: true });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith(
        'test.json',
        expect.objectContaining({
          dryRun: true,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '🔍 Dry-Run-Modus: Keine Datenbank-Änderungen werden vorgenommen',
      );
    });

    it('should handle import errors', async () => {
      const mockResult = {
        success: false,
        einsaetzeCreated: 3,
        etbEntriesCreated: 5,
        attachmentsCreated: 0,
        durationMs: 500,
        warnings: [],
        errors: ['Fehler bei Einsatz 1', 'Fehler bei Einsatz 2'],
        createdEntities: {
          einsaetze: [],
          etbEntries: [],
        },
      };

      seedImportService.importFromFile.mockResolvedValue(mockResult);

      await command.run([], { file: 'test.json' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Import fehlgeschlagen!');
      expect(errorSpy).toHaveBeenCalledWith('   - Fehler bei Einsatz 1');
      expect(errorSpy).toHaveBeenCalledWith('   - Fehler bei Einsatz 2');
    });

    it('should handle general import errors', async () => {
      seedImportService.importFromFile.mockRejectedValue(new Error('Database error'));

      await command.run([], { file: 'test.json' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Import-Fehler: Database error');
    });

    it('should use absolute path when provided', async () => {
      const absolutePath = '/absolute/path/test.json';
      const mockResult = {
        success: true,
        einsaetzeCreated: 1,
        etbEntriesCreated: 0,
        attachmentsCreated: 0,
        durationMs: 100,
        warnings: [],
        errors: [],
        createdEntities: {
          einsaetze: [],
          etbEntries: [],
        },
      };

      seedImportService.importFromFile.mockResolvedValue(mockResult);

      await command.run([], { file: absolutePath });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith(
        absolutePath,
        expect.any(Object),
      );
    });

    it('should handle strictWarnings option', async () => {
      const mockValidation = {
        valid: false,
        errors: [],
        warnings: [
          {
            code: 'WARNING',
            message: 'Test warning',
            severity: 'warning' as const,
          },
        ],
        detectedFormat: 'full' as const,
        metadata: {
          einsaetzeCount: 0,
          etbEntriesCount: 0,
          estimatedSizeBytes: 0,
        },
      };

      seedImportService.validateFile.mockResolvedValue(mockValidation);

      await command.run([], { file: 'test.json', validate: true, strictWarnings: true });

      expect(seedImportService.validateFile).toHaveBeenCalledWith('test.json', {
        validationLevel: 'moderate',
        strictWarnings: true,
      });
      expect(errorSpy).toHaveBeenCalledWith('❌ JSON-Datei ist ungültig!');
    });

    it('should handle verbose option', async () => {
      const mockResult = {
        success: true,
        einsaetzeCreated: 1,
        etbEntriesCreated: 0,
        attachmentsCreated: 0,
        durationMs: 100,
        warnings: [],
        errors: [],
        createdEntities: {
          einsaetze: [],
          etbEntries: [],
        },
      };

      seedImportService.importFromFile.mockResolvedValue(mockResult);

      await command.run([], { file: 'test.json', verbose: true });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith(
        'test.json',
        expect.objectContaining({
          progressCallback: expect.any(Function),
        }),
      );
    });

    it('should display warnings with recommendations', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
        warnings: [
          {
            code: 'WARNING',
            message: 'Test warning',
            severity: 'warning' as const,
            recommendation: 'Test recommendation',
          },
        ],
        detectedFormat: 'full' as const,
        metadata: {
          einsaetzeCount: 1,
          etbEntriesCount: 0,
          estimatedSizeBytes: 100,
        },
      };

      seedImportService.validateFile.mockResolvedValue(mockValidation);

      await command.run([], { file: 'test.json', validate: true });

      expect(warnSpy).toHaveBeenCalledWith('   - Test warning');
      expect(warnSpy).toHaveBeenCalledWith('     💡 Test recommendation');
    });
  });

  describe('option parsers', () => {
    it('should parse dryRun option', () => {
      const result = command.parseDryRun();
      expect(result).toBe(true);
    });

    it('should parse validate option', () => {
      const result = command.parseValidate();
      expect(result).toBe(true);
    });

    it('should parse strictWarnings option', () => {
      const result = command.parseStrictWarnings();
      expect(result).toBe(true);
    });

    it('should parse verbose option', () => {
      const result = command.parseVerbose();
      expect(result).toBe(true);
    });

    it('should parse listExamples option', () => {
      const result = command.parseListExamples();
      expect(result).toBe(true);
    });

    it('should parse file option', () => {
      const result = command.parseFile('test.json');
      expect(result).toBe('test.json');
    });

    it('should parse overwrite option', () => {
      const result = command.parseOverwrite();
      expect(result).toBe(true);
    });

    it('should parse autoTimestamps option', () => {
      const result = command.parseAutoTimestamps();
      expect(result).toBe(true);
    });

    it('should parse validationLevel option', () => {
      const result = command.parseValidationLevel('strict');
      expect(result).toBe('strict');
    });

    it('should throw error for invalid validationLevel', () => {
      expect(() => command.parseValidationLevel('invalid')).toThrow(
        'Validation level muss strict, moderate oder lenient sein',
      );
    });
  });
});
