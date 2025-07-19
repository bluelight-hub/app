import { Test, TestingModule } from '@nestjs/testing';
import { SeedImportService } from '../seed-import.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { promises as fs } from 'fs';
import * as schemaValidator from '../schema-validator';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('../schema-validator');

describe('SeedImportService', () => {
  let service: SeedImportService;
  let _prismaService: PrismaService;
  let _errorHandlingService: ErrorHandlingService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    einsatz: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    etbEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    etbAttachment: {
      create: jest.fn(),
    },
  };

  const mockErrorHandlingService = {
    executeWithErrorHandling: jest.fn((fn) => fn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedImportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ErrorHandlingService,
          useValue: mockErrorHandlingService,
        },
      ],
    }).compile();

    service = module.get<SeedImportService>(SeedImportService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _errorHandlingService = module.get<ErrorHandlingService>(ErrorHandlingService);

    jest.clearAllMocks();
  });

  describe('importFromFile', () => {
    it('should handle file read errors', async () => {
      const filePath = '/test/file.json';
      const readError = new Error('File not found');

      (fs.readFile as jest.Mock).mockRejectedValue(readError);

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Datei-Fehler: File not found');
    });

    it('should handle validation errors', async () => {
      const filePath = '/test/file.json';
      const jsonContent = '{"test": "data"}';

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);
      (schemaValidator.validateSeedDataString as jest.Mock).mockReturnValue({
        valid: false,
        errors: [{ message: 'Invalid format' }],
        warnings: [{ message: 'Warning message' }],
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid format');
      expect(result.warnings).toContain('Warning message');
    });

    it('should successfully import valid data', async () => {
      const filePath = '/test/file.json';
      const jsonContent = '{"test": "data"}';
      const validatedData = {
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
          },
        ],
      };

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);
      (schemaValidator.validateSeedDataString as jest.Mock).mockReturnValue({
        valid: true,
        data: validatedData,
        detectedFormat: 'full',
      });

      mockPrismaService.$transaction.mockImplementation(async (fn) => {
        return fn(mockPrismaService);
      });
      mockPrismaService.einsatz.findFirst.mockResolvedValue(null);
      mockPrismaService.einsatz.create.mockResolvedValue({
        id: '1',
        name: 'Test Einsatz',
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);
    });
  });

  describe('validateFile', () => {
    it('should handle file read errors during validation', async () => {
      const filePath = '/test/file.json';
      const readError = new Error('Cannot read file');

      (fs.readFile as jest.Mock).mockRejectedValue(readError);

      const result = await service.validateFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FILE_READ_ERROR');
      expect(result.errors[0].message).toContain('Cannot read file');
    });

    it('should validate file successfully', async () => {
      const filePath = '/test/file.json';
      const jsonContent = '{"test": "data"}';

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);
      (schemaValidator.validateSeedDataString as jest.Mock).mockReturnValue({
        valid: true,
        data: { test: 'data' },
      });

      const result = await service.validateFile(filePath);

      expect(result).toEqual({
        valid: true,
        data: { test: 'data' },
      });
    });
  });

  describe('importValidatedData', () => {
    it('should handle data without preImportSetup', async () => {
      const data = {
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
          },
        ],
      };
      const config = {};

      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService));
      mockPrismaService.einsatz.findFirst.mockResolvedValue(null);
      mockPrismaService.einsatz.create.mockResolvedValue({
        id: '1',
        name: 'Test Einsatz',
      });

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);

      // Should not have executed any pre-import SQL
      expect(mockPrismaService.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should handle pre-import setup with only warnings and no SQL commands', async () => {
      const data = {
        preImportSetup: {
          warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
        },
        einsaetze: [],
      };
      const config = { strictWarnings: true };

      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService));

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Warning 1');
      expect(result.warnings).toContain('Warning 2');
      expect(result.warnings).toContain('Warning 3');

      // Should not have executed any SQL commands
      expect(mockPrismaService.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should handle pre-import setup in dry run mode', async () => {
      const data = {
        preImportSetup: {
          sqlCommands: ['DROP TABLE test'],
          warnings: ['This will drop the table'],
        },
        einsaetze: [],
      };
      const config = { dryRun: true };

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('This will drop the table');
      expect(result.warnings).toContain('Dry-Run durchgeführt - keine Datenbank-Änderungen');

      // Should not execute SQL in dry run mode
      expect(mockPrismaService.$executeRawUnsafe).not.toHaveBeenCalled();
    });
    it('should handle pre-import setup with strictWarnings enabled and SQL error', async () => {
      const data = {
        preImportSetup: {
          sqlCommands: ['DROP TABLE test', 'CREATE TABLE test'],
          warnings: ['Warning 1', 'Warning 2'],
        },
        einsaetze: [],
      };
      const config = { strictWarnings: true, dryRun: false };

      // First SQL command succeeds, second fails
      mockPrismaService.$executeRawUnsafe
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Table already exists'));

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Import-Fehler: Pre-Import Setup fehlgeschlagen: Table already exists',
      );
      expect(result.warnings).toContain('Warning 1');
      expect(result.warnings).toContain('Warning 2');

      // Should have executed the first SQL command
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith('DROP TABLE test');
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith('CREATE TABLE test');
    });

    it('should handle pre-import setup without strictWarnings and convert SQL errors to warnings', async () => {
      const data = {
        preImportSetup: {
          sqlCommands: ['INVALID SQL 1', 'INVALID SQL 2'],
          warnings: ['Initial warning 1', 'Initial warning 2'],
        },
        einsaetze: [],
      };
      const config = { strictWarnings: false, dryRun: false };

      // Both SQL commands fail
      mockPrismaService.$executeRawUnsafe
        .mockRejectedValueOnce(new Error('Syntax error near INVALID'))
        .mockRejectedValueOnce(new Error('Unknown command SQL'));

      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService));

      const result = await (service as any).importValidatedData(data, config, Date.now());

      // Should not fail the import
      expect(result.success).toBe(true);

      // Should contain all warnings
      expect(result.warnings).toContain('Initial warning 1');
      expect(result.warnings).toContain('Initial warning 2');
      expect(result.warnings).toContain('Pre-Import SQL-Warnung: Syntax error near INVALID');
      expect(result.warnings).toContain('Pre-Import SQL-Warnung: Unknown command SQL');

      // Should have attempted both SQL commands
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it('should handle dry run mode', async () => {
      const data = {
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
            etbEntries: [
              {
                laufendeNummer: 1,
                kategorie: 'MELDUNG',
                inhalt: 'Test',
                anlagen: [{ dateiname: 'test.pdf', dateityp: 'pdf' }],
              },
            ],
          },
        ],
      };
      const config = { dryRun: true };

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);
      expect(result.etbEntriesCreated).toBe(1);
      expect(result.attachmentsCreated).toBe(1);
      expect(result.warnings).toContain('Dry-Run durchgeführt - keine Datenbank-Änderungen');
    });

    it('should handle post-import cleanup', async () => {
      const data = {
        einsaetze: [],
        postImportCleanup: {
          sqlCommands: ['UPDATE test SET done = true'],
          validationSteps: ['Check data integrity'],
        },
      };
      const config = {};

      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService));
      mockPrismaService.$executeRawUnsafe.mockResolvedValue({});

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE test SET done = true',
      );
      expect(result.success).toBe(true);
    });

    it('should handle post-import cleanup SQL errors', async () => {
      const data = {
        einsaetze: [],
        postImportCleanup: {
          sqlCommands: ['INVALID SQL'],
        },
      };
      const config = {};

      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService));
      mockPrismaService.$executeRawUnsafe.mockRejectedValue(new Error('SQL Syntax Error'));

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.warnings).toContain('Post-Import SQL-Warnung: SQL Syntax Error');
      expect(result.success).toBe(true);
    });
  });

  describe('importSingleEinsatz', () => {
    it('should handle progress callback', async () => {
      const einsatzData = {
        name: 'Test Einsatz',
        beschreibung: 'Test',
      };
      const config = {
        progressCallback: jest.fn(),
      };
      const result = {
        einsaetzeCreated: 0,
        createdEntities: { einsaetze: [], etbEntries: [] },
      };

      mockPrismaService.einsatz.findFirst.mockResolvedValue(null);
      mockPrismaService.einsatz.create.mockResolvedValue({
        id: '1',
        name: 'Test Einsatz',
      });

      await (service as any).importSingleEinsatz(einsatzData, config, result, mockPrismaService);

      expect(config.progressCallback).toHaveBeenCalledWith('Einsatz "Test Einsatz" erstellt', 100);
    });

    it('should import ETB entries with attachments', async () => {
      const einsatzData = {
        name: 'Test Einsatz',
        beschreibung: 'Test',
        etbEntries: [
          {
            laufendeNummer: 1,
            kategorie: 'MELDUNG',
            inhalt: 'Test Entry',
            autorId: 'author-1',
            anlagen: [
              {
                dateiname: 'test.pdf',
                dateityp: 'application/pdf',
                speicherOrt: '/files/test.pdf',
                beschreibung: 'Test file',
              },
            ],
          },
        ],
      };
      const config = {};
      const result = {
        einsaetzeCreated: 0,
        etbEntriesCreated: 0,
        attachmentsCreated: 0,
        createdEntities: { einsaetze: [], etbEntries: [] },
      };

      mockPrismaService.einsatz.findFirst.mockResolvedValue(null);
      mockPrismaService.einsatz.create.mockResolvedValue({
        id: '1',
        name: 'Test Einsatz',
      });
      mockPrismaService.etbEntry.findFirst.mockResolvedValue(null);
      mockPrismaService.etbEntry.create.mockResolvedValue({
        id: 'etb-1',
        laufendeNummer: 1,
      });
      mockPrismaService.etbAttachment.create.mockResolvedValue({});

      await (service as any).importSingleEinsatz(einsatzData, config, result, mockPrismaService);

      expect(result.einsaetzeCreated).toBe(1);
      expect(result.etbEntriesCreated).toBe(1);
      expect(result.attachmentsCreated).toBe(1);
      expect(mockPrismaService.etbAttachment.create).toHaveBeenCalledWith({
        data: {
          etbEntryId: 'etb-1',
          dateiname: 'test.pdf',
          dateityp: 'application/pdf',
          speicherOrt: '/files/test.pdf',
          beschreibung: 'Test file',
        },
      });
    });
  });

  describe('createOrUpdateEinsatz', () => {
    it('should use existing Einsatz without overwrite', async () => {
      const einsatzData = {
        name: 'Existing Einsatz',
        beschreibung: 'Test',
      };
      const config = { overwriteConflicts: false };
      const existingEinsatz = {
        id: '1',
        name: 'Existing Einsatz',
        beschreibung: 'Old description',
      };

      mockPrismaService.einsatz.findFirst.mockResolvedValue(existingEinsatz);

      const result = await (service as any).createOrUpdateEinsatz(
        einsatzData,
        config,
        mockPrismaService,
      );

      expect(result).toEqual(existingEinsatz);
      expect(mockPrismaService.einsatz.update).not.toHaveBeenCalled();
    });

    it('should update existing Einsatz with overwrite', async () => {
      const einsatzData = {
        name: 'Existing Einsatz',
        beschreibung: 'New description',
      };
      const config = { overwriteConflicts: true };
      const existingEinsatz = {
        id: '1',
        name: 'Existing Einsatz',
        beschreibung: 'Old description',
      };
      const updatedEinsatz = {
        ...existingEinsatz,
        beschreibung: 'New description',
      };

      mockPrismaService.einsatz.findFirst.mockResolvedValue(existingEinsatz);
      mockPrismaService.einsatz.update.mockResolvedValue(updatedEinsatz);

      const result = await (service as any).createOrUpdateEinsatz(
        einsatzData,
        config,
        mockPrismaService,
      );

      expect(result).toEqual(updatedEinsatz);
      expect(mockPrismaService.einsatz.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Existing Einsatz',
          beschreibung: 'New description',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('importSingleEtbEntry', () => {
    it('should handle entries with autoTimestamps', async () => {
      const entryData = {
        kategorie: 'MELDUNG',
        inhalt: 'Test',
        autorId: 'author-1',
        autorName: 'Test Author',
      };
      const config = { autoTimestamps: true };
      const result = {
        etbEntriesCreated: 0,
        createdEntities: { etbEntries: [] },
      };

      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockPrismaService.etbEntry.create.mockResolvedValue({
        id: 'etb-1',
        laufendeNummer: 1,
      });

      await (service as any).importSingleEtbEntry(
        'einsatz-1',
        entryData,
        1,
        config,
        result,
        mockPrismaService,
      );

      expect(mockPrismaService.etbEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestampErstellung: mockDate,
          timestampEreignis: mockDate,
        }),
      });

      jest.restoreAllMocks();
    });

    it('should handle entries without autoTimestamps', async () => {
      const entryData = {
        kategorie: 'MELDUNG',
        inhalt: 'Test',
        autorId: 'author-1',
        autorName: 'Test Author',
        timestampErstellung: '2024-01-01T10:00:00.000Z',
        timestampEreignis: '2024-01-01T11:00:00.000Z',
      };
      const config = { autoTimestamps: false };
      const result = {
        etbEntriesCreated: 0,
        createdEntities: { etbEntries: [] },
      };

      mockPrismaService.etbEntry.create.mockResolvedValue({
        id: 'etb-1',
        laufendeNummer: 1,
      });

      await (service as any).importSingleEtbEntry(
        'einsatz-1',
        entryData,
        1,
        config,
        result,
        mockPrismaService,
      );

      expect(mockPrismaService.etbEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestampErstellung: new Date('2024-01-01T10:00:00.000Z'),
          timestampEreignis: new Date('2024-01-01T11:00:00.000Z'),
        }),
      });
    });
  });

  describe('normalizeToEinsaetzeArray', () => {
    it('should handle simple format with initialEtbEntries', () => {
      const data = {
        einsatz: {
          name: 'Simple Einsatz',
          beschreibung: 'Test',
        },
        initialEtbEntries: [
          {
            autorId: 'author-1',
            autorName: 'Test Author',
            kategorie: 'MELDUNG',
            inhalt: 'Entry 1',
            timestampEreignis: '2024-01-01T10:00:00.000Z',
          },
          {
            autorId: 'author-2',
            autorName: 'Another Author',
            kategorie: 'FUNKALARM',
            inhalt: 'Entry 2',
            timestampEreignis: '2024-01-01T10:05:00.000Z',
          },
        ],
      };

      const result = (service as any).normalizeToEinsaetzeArray(data);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Simple Einsatz');
      expect(result[0].etbEntries).toHaveLength(2);
      expect(result[0].etbEntries[0].laufendeNummer).toBe(1);
      expect(result[0].etbEntries[1].laufendeNummer).toBe(2);
    });

    it('should handle simple format without initialEtbEntries', () => {
      const data = {
        einsatz: {
          name: 'Simple Einsatz',
          beschreibung: 'Test',
        },
      };

      const result = (service as any).normalizeToEinsaetzeArray(data);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Simple Einsatz');
      expect(result[0].etbEntries).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle import transaction errors', async () => {
      const data = {
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
          },
        ],
      };
      const config = {};

      mockErrorHandlingService.executeWithErrorHandling.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const result = await (service as any).importValidatedData(data, config, Date.now());

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Import-Fehler: Transaction failed');
    });
  });
});
