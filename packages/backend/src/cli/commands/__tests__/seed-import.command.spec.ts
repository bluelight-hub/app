import { SeedImportService } from '@/modules/seed/seed-import.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { SeedImportCommand } from '../seed-import.command';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

/**
 * Tests für den SeedImportCommand.
 * Testet alle CLI-Funktionen und Edge Cases.
 */
describe('SeedImportCommand', () => {
  let command: SeedImportCommand;
  let seedImportService: jest.Mocked<SeedImportService>;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const mockSuccessResult = {
    success: true,
    einsaetzeCreated: 2,
    etbEntriesCreated: 5,
    attachmentsCreated: 1,
    durationMs: 1500,
    warnings: ['Test Warnung'],
    errors: [],
    createdEntities: {
      einsaetze: [
        { id: 'einsatz-1', name: 'Test Einsatz 1' },
        { id: 'einsatz-2', name: 'Test Einsatz 2' },
      ],
      etbEntries: [],
    },
  };

  const mockValidationResult = {
    valid: true,
    errors: [],
    warnings: [
      {
        code: 'TEST_WARNING',
        message: 'Test Validierungs-Warnung',
        recommendation: 'Test Empfehlung',
      },
    ],
    detectedFormat: 'full' as const,
    metadata: {
      schemaVersion: '1.0.0',
      einsaetzeCount: 2,
      etbEntriesCount: 5,
      estimatedSizeBytes: 2048,
    },
  };

  beforeEach(async () => {
    const mockSeedImportService = {
      importFromFile: jest.fn(),
      validateFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedImportCommand,
        {
          provide: SeedImportService,
          useValue: mockSeedImportService,
        },
      ],
    }).compile();

    command = module.get<SeedImportCommand>(SeedImportCommand);
    seedImportService = module.get(SeedImportService);

    // Logger spies
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('sollte Beispiel-Dateien auflisten', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['example1.json', 'example2.json', 'readme.txt']);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          metadata: {
            name: 'Test Example',
            description: 'Test Beschreibung',
            category: 'test',
            priority: 'medium',
          },
        }),
      );

      await command.run([], { listExamples: true });

      expect(fs.readdir).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('\n📋 Verfügbare Beispiel-JSON-Dateien:');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('example1.json'));
    });

    it('sollte Fehler bei fehlendem Datei-Parameter anzeigen', async () => {
      await command.run([], {});

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Datei-Parameter ist erforderlich.');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('💡 Verwendung:'));
    });

    it('sollte Validierung ohne Import durchführen', async () => {
      seedImportService.validateFile.mockResolvedValue(mockValidationResult);

      await command.run([], { file: 'test.json', validate: true });

      expect(seedImportService.validateFile).toHaveBeenCalledWith(
        'test.json',
        expect.objectContaining({
          validationLevel: 'moderate',
          strictWarnings: false,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith('✅ JSON-Datei ist gültig!');
    });

    it('sollte Import erfolgreich durchführen', async () => {
      seedImportService.importFromFile.mockResolvedValue(mockSuccessResult);

      await command.run([], { file: 'test.json' });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith(
        'test.json',
        expect.objectContaining({
          dryRun: false,
          overwriteConflicts: false,
          validationLevel: 'moderate',
          strictWarnings: false,
          autoTimestamps: true,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith('✅ Import erfolgreich abgeschlossen!');
    });

    it('sollte Dry-Run-Modus verwenden', async () => {
      seedImportService.importFromFile.mockResolvedValue({
        ...mockSuccessResult,
        warnings: ['Dry-Run durchgeführt - keine Datenbank-Änderungen'],
      });

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

    it('sollte Fehler abfangen und loggen', async () => {
      const error = new Error('Test command error');
      seedImportService.importFromFile.mockRejectedValue(error);

      await command.run([], { file: 'test.json' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(`❌ Import-Fehler: ${error.message}`);
    });
  });

  describe('performImport', () => {
    it('sollte Import mit allen Optionen durchführen', async () => {
      seedImportService.importFromFile.mockResolvedValue(mockSuccessResult);

      await command.run([], {
        file: 'test.json',
        overwrite: true,
        validationLevel: 'strict',
        strictWarnings: true,
        autoTimestamps: true,
        verbose: true,
      });

      expect(seedImportService.importFromFile).toHaveBeenCalledWith(
        'test.json',
        expect.objectContaining({
          dryRun: false,
          overwriteConflicts: true,
          validationLevel: 'strict',
          strictWarnings: true,
          autoTimestamps: true,
          progressCallback: expect.any(Function),
        }),
      );
    });

    it('sollte fehlgeschlagenen Import behandeln', async () => {
      const failedResult = {
        success: false,
        einsaetzeCreated: 0,
        etbEntriesCreated: 0,
        attachmentsCreated: 0,
        durationMs: 500,
        warnings: ['Test Warnung'],
        errors: ['Test Fehler 1', 'Test Fehler 2'],
        createdEntities: { einsaetze: [], etbEntries: [] },
      };

      seedImportService.importFromFile.mockResolvedValue(failedResult);

      await command.run([], { file: 'test.json' });

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Import fehlgeschlagen!');
      expect(loggerErrorSpy).toHaveBeenCalledWith('   - Test Fehler 1');
      expect(loggerErrorSpy).toHaveBeenCalledWith('   - Test Fehler 2');
      expect(loggerWarnSpy).toHaveBeenCalledWith('   - Test Warnung');
    });

    it('sollte Import-Exception behandeln', async () => {
      const error = new Error('Import service error');
      seedImportService.importFromFile.mockRejectedValue(error);

      await command.run([], { file: 'test.json' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(`❌ Import-Fehler: ${error.message}`);
    });
  });

  describe('validateFile', () => {
    it('sollte erfolgreiche Validierung mit Details anzeigen', async () => {
      seedImportService.validateFile.mockResolvedValue(mockValidationResult);

      await command.run([], { file: 'test.json', validate: true });

      expect(loggerSpy).toHaveBeenCalledWith('✅ JSON-Datei ist gültig!');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Format: full'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Schema-Version: 1.0.0'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Einsätze: 2'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('ETB-Einträge: 5'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Geschätzte Größe: 2 KB'));
      expect(loggerWarnSpy).toHaveBeenCalledWith('   - Test Validierungs-Warnung');
      expect(loggerWarnSpy).toHaveBeenCalledWith('     💡 Test Empfehlung');
    });

    it('sollte fehlgeschlagene Validierung behandeln', async () => {
      const invalidResult = {
        valid: false,
        errors: [
          {
            code: 'TEST_ERROR',
            message: 'Test Validierungs-Fehler',
            instancePath: '/einsaetze/0/name',
            severity: 'error' as const,
          },
        ],
        warnings: [
          {
            code: 'TEST_WARNING',
            message: 'Test Warnung',
          },
        ],
        detectedFormat: 'unknown' as const,
        metadata: {
          einsaetzeCount: 0,
          etbEntriesCount: 0,
          estimatedSizeBytes: 0,
        },
      };

      seedImportService.validateFile.mockResolvedValue(invalidResult);

      await command.run([], { file: 'test.json', validate: true });

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ JSON-Datei ist ungültig!');
      expect(loggerErrorSpy).toHaveBeenCalledWith('   - Test Validierungs-Fehler');
      expect(loggerErrorSpy).toHaveBeenCalledWith('     📍 Pfad: /einsaetze/0/name');
      expect(loggerWarnSpy).toHaveBeenCalledWith('   - Test Warnung');
    });

    it('sollte Validierungs-Exception behandeln', async () => {
      const error = new Error('Validation service error');
      seedImportService.validateFile.mockRejectedValue(error);

      await command.run([], { file: 'test.json', validate: true });

      expect(loggerErrorSpy).toHaveBeenCalledWith(`❌ Validierungs-Fehler: ${error.message}`);
    });
  });

  describe('showExampleFiles', () => {
    it('sollte Beispiel-Dateien mit Metadaten anzeigen', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['example1.json', 'example2.json', 'readme.txt']);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          metadata: {
            name: 'Test Example',
            description: 'Test Beschreibung',
            category: 'test',
            priority: 'medium',
          },
        }),
      );

      await command.run([], { listExamples: true });

      expect(fs.readdir).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('📄 example1.json');
      expect(loggerSpy).toHaveBeenCalledWith('   Größe: 1 KB');
      expect(loggerSpy).toHaveBeenCalledWith('   Name: Test Example');
      expect(loggerSpy).toHaveBeenCalledWith('   Beschreibung: Test Beschreibung');
    });

    it('sollte einfaches Format ohne Metadaten behandeln', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['simple.json']);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 512 });
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          einsatz: {
            name: 'Einfacher Test Einsatz',
          },
        }),
      );

      await command.run([], { listExamples: true });

      expect(loggerSpy).toHaveBeenCalledWith('   Einsatz: Einfacher Test Einsatz');
    });

    it('sollte Warnung bei fehlenden Beispiel-Dateien anzeigen', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await command.run([], { listExamples: true });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '⚠️  Keine Beispiel-Dateien im Verzeichnis seed-data/examples gefunden.',
      );
    });

    it('sollte Fehler beim Lesen des Verzeichnisses behandeln', async () => {
      const error = new Error('Directory not found');
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      await command.run([], { listExamples: true });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `❌ Fehler beim Lesen des Beispiel-Verzeichnisses: ${error.message}`,
      );
    });

    it('sollte Parse-Fehler bei ungültigen JSON-Dateien behandeln', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['invalid.json']);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 256 });
      (fs.readFile as jest.Mock).mockResolvedValue('{ invalid json }');

      await command.run([], { listExamples: true });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Fehler beim Lesen der Datei:'),
      );
    });
  });

  describe('createProgressCallback', () => {
    it('sollte Progress-Callback mit Verbose-Option aufrufen', async () => {
      seedImportService.importFromFile.mockImplementation(async (_filePath, config) => {
        // Simuliere Progress-Callback-Aufruf
        if (config?.progressCallback) {
          config.progressCallback('Test Fortschritt', 50);
        }
        return mockSuccessResult;
      });

      await command.run([], { file: 'test.json', verbose: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('📈 [██████████░░░░░░░░░░] 50.0% - Test Fortschritt'),
      );
    });
  });

  describe('formatBytes', () => {
    it('sollte Bytes korrekt formatieren', async () => {
      const testCases = [
        { bytes: 0, expected: '0 Bytes' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1536, expected: '1.5 KB' },
      ];

      // Teste formatBytes indirekt über Validierung
      for (const testCase of testCases) {
        const validationResult = {
          ...mockValidationResult,
          metadata: {
            ...mockValidationResult.metadata,
            estimatedSizeBytes: testCase.bytes,
          },
        };

        seedImportService.validateFile.mockResolvedValue(validationResult);

        await command.run([], { file: 'test.json', validate: true });

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Geschätzte Größe: ${testCase.expected}`),
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Option Parser', () => {
    it('sollte parseFile korrekt funktionieren', () => {
      const result = command.parseFile('test.json');
      expect(result).toBe('test.json');
    });

    it('sollte parseValidate korrekt funktionieren', () => {
      const result = command.parseValidate();
      expect(result).toBe(true);
    });

    it('sollte parseDryRun korrekt funktionieren', () => {
      const result = command.parseDryRun();
      expect(result).toBe(true);
    });

    it('sollte parseOverwrite korrekt funktionieren', () => {
      const result = command.parseOverwrite();
      expect(result).toBe(true);
    });

    it('sollte parseValidationLevel korrekt funktionieren', () => {
      expect(command.parseValidationLevel('strict')).toBe('strict');
      expect(command.parseValidationLevel('moderate')).toBe('moderate');
      expect(command.parseValidationLevel('lenient')).toBe('lenient');
    });

    it('sollte Fehler bei ungültigem ValidationLevel werfen', () => {
      expect(() => command.parseValidationLevel('invalid')).toThrow(
        'Validation level muss strict, moderate oder lenient sein',
      );
    });

    it('sollte parseStrictWarnings korrekt funktionieren', () => {
      const result = command.parseStrictWarnings();
      expect(result).toBe(true);
    });

    it('sollte parseAutoTimestamps korrekt funktionieren', () => {
      const result = command.parseAutoTimestamps();
      expect(result).toBe(true);
    });

    it('sollte parseVerbose korrekt funktionieren', () => {
      const result = command.parseVerbose();
      expect(result).toBe(true);
    });

    it('sollte parseListExamples korrekt funktionieren', () => {
      const result = command.parseListExamples();
      expect(result).toBe(true);
    });
  });
});
