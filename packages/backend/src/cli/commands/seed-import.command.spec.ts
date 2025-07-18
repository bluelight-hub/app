import { Test, TestingModule } from '@nestjs/testing';
import { SeedImportCommand } from './seed-import.command';
import { SeedImportService } from '@/modules/seed/seed-import.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('SeedImportCommand', () => {
  let command: SeedImportCommand;
  let seedImportService: jest.Mocked<SeedImportService>;
  let loggerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedImportCommand,
        {
          provide: SeedImportService,
          useValue: {
            importData: jest.fn(),
            validateData: jest.fn(),
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
      const mockData = { einsaetze: [] };
      const mockResult = { totalImported: 5, errors: [] };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.importData.mockResolvedValue(mockResult);

      await command.run(['test.json']);

      expect(seedImportService.importData).toHaveBeenCalledWith(mockData, {
        dryRun: false,
        skipExisting: false,
        strictWarnings: false,
        verbose: false,
      });
      expect(loggerSpy).toHaveBeenCalledWith('✅ Import erfolgreich abgeschlossen!');
    });

    it('should handle missing file parameter', async () => {
      await command.run([]);

      expect(errorSpy).toHaveBeenCalledWith('❌ Fehler: Dateiname muss angegeben werden.');
      expect(loggerSpy).toHaveBeenCalledWith('Verwendung: npm run cli -- seed:import <datei.json>');
    });

    it('should handle non-existent file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      await command.run(['nonexistent.json']);

      expect(errorSpy).toHaveBeenCalledWith('❌ Fehler: Datei "nonexistent.json" existiert nicht.');
    });

    it('should handle invalid JSON', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      await command.run(['invalid.json']);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Fehler: Ungültiges JSON-Format'),
      );
    });

    it('should validate data when validate option is set', async () => {
      const mockData = { einsaetze: [] };
      const mockValidation = { isValid: true, errors: [], warnings: [] };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.validateData.mockReturnValue(mockValidation);

      await command.run(['test.json'], { validate: true });

      expect(seedImportService.validateData).toHaveBeenCalledWith(mockData, {
        strictWarnings: false,
      });
      expect(loggerSpy).toHaveBeenCalledWith('✅ Datei ist valide!');
    });

    it('should show validation errors', async () => {
      const mockData = { einsaetze: [] };
      const mockValidation = {
        isValid: false,
        errors: [{ path: 'einsaetze[0]', message: 'Name fehlt', code: 'MISSING_FIELD' }],
        warnings: [{ path: 'version', message: 'Version veraltet', code: 'OLD_VERSION' }],
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.validateData.mockReturnValue(mockValidation);

      await command.run(['test.json'], { validate: true });

      expect(errorSpy).toHaveBeenCalledWith('❌ Datei enthält Fehler:');
      expect(errorSpy).toHaveBeenCalledWith('   - einsaetze[0]: Name fehlt');
      expect(warnSpy).toHaveBeenCalledWith('⚠️  Warnungen:');
      expect(warnSpy).toHaveBeenCalledWith('   - version: Version veraltet');
    });

    it('should perform dry run', async () => {
      const mockData = { einsaetze: [] };
      const mockResult = { totalImported: 5, errors: [] };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.importData.mockResolvedValue(mockResult);

      await command.run(['test.json'], { dryRun: true });

      expect(seedImportService.importData).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          dryRun: true,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '🔍 Dry-Run Modus aktiviert - es werden keine Daten gespeichert.',
      );
    });

    it('should handle import errors', async () => {
      const mockData = { einsaetze: [] };
      const mockResult = {
        totalImported: 3,
        errors: ['Fehler bei Einsatz 1', 'Fehler bei Einsatz 2'],
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.importData.mockResolvedValue(mockResult);

      await command.run(['test.json']);

      expect(warnSpy).toHaveBeenCalledWith('⚠️  Import mit Fehlern abgeschlossen.');
      expect(errorSpy).toHaveBeenCalledWith('❌ Fehler beim Import:');
      expect(errorSpy).toHaveBeenCalledWith('   - Fehler bei Einsatz 1');
      expect(errorSpy).toHaveBeenCalledWith('   - Fehler bei Einsatz 2');
    });

    it('should handle general import errors', async () => {
      const mockData = { einsaetze: [] };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.importData.mockRejectedValue(new Error('Database error'));

      await command.run(['test.json']);

      expect(errorSpy).toHaveBeenCalledWith('❌ Fehler beim Import: Database error');
    });

    it('should use absolute path when provided', async () => {
      const absolutePath = '/absolute/path/test.json';
      const mockData = { einsaetze: [] };

      (path.isAbsolute as jest.Mock) = jest.fn().mockReturnValue(true);
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      await command.run([absolutePath]);

      expect(fs.access).toHaveBeenCalledWith(absolutePath);
    });

    it('should handle strictWarnings option', async () => {
      const mockData = { einsaetze: [] };
      const mockValidation = {
        isValid: false,
        errors: [],
        warnings: [{ path: 'test', message: 'warning', code: 'WARNING' }],
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      seedImportService.validateData.mockReturnValue(mockValidation);

      await command.run(['test.json'], { validate: true, strictWarnings: true });

      expect(seedImportService.validateData).toHaveBeenCalledWith(mockData, {
        strictWarnings: true,
      });
      expect(errorSpy).toHaveBeenCalledWith('❌ Datei enthält Fehler:');
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

    it('should parse skipExisting option', () => {
      const result = command.parseSkipExisting();
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
  });
});
