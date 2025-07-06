import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { CURRENT_SCHEMA_VERSION, EtbEntryStatus, EtbKategorie } from '../schema';
import { validateSeedData, validateSeedDataString } from '../schema-validator';
import { SeedImportService } from '../seed-import.service';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

// Mock der schema-validator Funktionen
jest.mock('../schema-validator', () => ({
  validateSeedDataString: jest.fn(),
  validateSeedData: jest.fn(),
}));

// Cast für TypeScript
const mockValidateSeedDataString = validateSeedDataString as jest.MockedFunction<
  typeof validateSeedDataString
>;
const mockValidateSeedData = validateSeedData as jest.MockedFunction<typeof validateSeedData>;

/**
 * Tests für den SeedImportService.
 * Testet alle Import-Szenarien und Edge Cases.
 */
describe('SeedImportService', () => {
  let service: SeedImportService;
  let prismaService: jest.Mocked<PrismaService>;
  let errorHandlingService: jest.Mocked<ErrorHandlingService>;
  let mockTransaction: jest.Mock;

  const validFullSeedData = {
    version: CURRENT_SCHEMA_VERSION,
    metadata: {
      name: 'Test Seed',
      description: 'Test Beschreibung',
      exportDate: '2023-01-01T00:00:00.000Z',
      source: 'test',
    },
    einsaetze: [
      {
        name: 'Test Einsatz',
        beschreibung: 'Test Beschreibung',
        etbEntries: [
          {
            laufendeNummer: 1,
            kategorie: EtbKategorie.MELDUNG,
            inhalt: 'Test Ereignis',
            timestampEreignis: '2023-01-01T10:00:00.000Z',
            autorId: 'test-autor-id',
            autorName: 'Test Autor',
          },
        ],
      },
    ],
  };

  const validSimpleSeedData = {
    einsatz: {
      name: 'Einfacher Einsatz',
      beschreibung: 'Einfache Beschreibung',
    },
    initialEtbEntries: [
      {
        kategorie: EtbKategorie.MELDUNG,
        inhalt: 'Einfacher Eintrag',
        autorId: 'test-autor-id',
        autorName: 'Test Autor',
      },
    ],
  };

  const mockEinsatz = {
    id: 'einsatz-id-1',
    name: 'Test Einsatz',
    beschreibung: 'Test Beschreibung',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEtbEntry = {
    id: 'etb-id-1',
    laufendeNummer: 1,
    kategorie: 'ereignis',
    inhalt: 'Test Ereignis',
    timestampErstellung: new Date(),
    timestampEreignis: new Date(),
    autorName: 'Test Autor',
    referenzEinsatzId: 'einsatz-id-1',
    version: 1,
    status: EtbEntryStatus.AKTIV,
  };

  beforeEach(async () => {
    // Mock transaction
    mockTransaction = jest.fn();

    const mockPrismaService = {
      $transaction: mockTransaction,
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
      executeWithErrorHandling: jest.fn(),
    };

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
    prismaService = module.get(PrismaService);
    errorHandlingService = module.get(ErrorHandlingService);

    // Setup default successful validation
    mockValidateSeedDataString.mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
      detectedFormat: 'full',
      data: validFullSeedData,
      metadata: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        einsaetzeCount: 1,
        etbEntriesCount: 1,
        estimatedSizeBytes: 1024,
      },
    });

    mockValidateSeedData.mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
      detectedFormat: 'full',
      data: validFullSeedData,
      metadata: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        einsaetzeCount: 1,
        etbEntriesCount: 1,
        estimatedSizeBytes: 1024,
      },
    });

    // Logger mocks
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromFile', () => {
    it('sollte JSON-Datei erfolgreich importieren', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Setup transaction mock
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: {
            create: jest.fn(),
          },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);
      expect(result.etbEntriesCreated).toBe(1);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('sollte Dateifehler behandeln', async () => {
      const filePath = '/nonexistent/path.json';
      const error = new Error('File not found');

      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Datei-Fehler: File not found');
    });

    it('sollte Validierungsfehler behandeln', async () => {
      const filePath = '/test/invalid.json';
      const invalidJson = '{ invalid json }';

      (fs.readFile as jest.Mock).mockResolvedValue(invalidJson);

      // Mock validation failure
      mockValidateSeedDataString.mockReturnValue({
        valid: false,
        errors: [{ code: 'JSON_PARSE_ERROR', message: 'Invalid JSON', severity: 'error' }],
        warnings: [],
        detectedFormat: 'unknown',
        metadata: { einsaetzeCount: 0, etbEntriesCount: 0, estimatedSizeBytes: 0 },
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('sollte Validierungsfehler mit Warnungen behandeln', async () => {
      const filePath = '/test/invalid.json';
      const invalidJson = '{ warnings present }';

      (fs.readFile as jest.Mock).mockResolvedValue(invalidJson);

      // Mock validation failure mit warnings
      mockValidateSeedDataString.mockReturnValue({
        valid: false,
        errors: [{ code: 'STRUCTURE_ERROR', message: 'Invalid structure', severity: 'error' }],
        warnings: [{ code: 'MINOR_ISSUE', message: 'Minor warning' }],
        detectedFormat: 'unknown',
        metadata: { einsaetzeCount: 0, etbEntriesCount: 0, estimatedSizeBytes: 0 },
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid structure');
      expect(result.warnings).toContain('Minor warning');
    });

    it('sollte Dry-Run-Modus unterstützen', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      const result = await service.importFromFile(filePath, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);
      expect(result.etbEntriesCreated).toBe(1);
      expect(result.warnings).toContain('Dry-Run durchgeführt - keine Datenbank-Änderungen');
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Pre-Import Setup', () => {
    it('sollte Pre-Import-Warnungen verarbeiten', async () => {
      const dataWithSetup = {
        ...validFullSeedData,
        preImportSetup: {
          warnings: ['Test Warnung 1', 'Test Warnung 2'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithSetup);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit den Daten inkl. setup
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithSetup,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await service.importFromFile(filePath);

      expect(result.warnings).toContain('Test Warnung 1');
      expect(result.warnings).toContain('Test Warnung 2');
    });

    it('sollte Pre-Import SQL-Befehle ausführen', async () => {
      const dataWithSql = {
        ...validFullSeedData,
        preImportSetup: {
          sqlCommands: ['DELETE FROM test_table WHERE test = true'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithSql);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit den SQL-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithSql,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await service.importFromFile(filePath);

      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE test = true',
      );
    });

    it('sollte SQL-Fehler im Pre-Import behandeln', async () => {
      const dataWithSql = {
        ...validFullSeedData,
        preImportSetup: {
          sqlCommands: ['INVALID SQL COMMAND'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithSql);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);
      prismaService.$executeRawUnsafe.mockRejectedValue(new Error('SQL error'));

      // Mock validation mit den SQL-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithSql,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await service.importFromFile(filePath);

      expect(result.warnings.some((w) => w.includes('Pre-Import SQL-Warnung'))).toBe(true);
    });

    it('sollte bei strictWarnings und SQL-Fehler den Import abbrechen', async () => {
      const dataWithSql = {
        ...validFullSeedData,
        preImportSetup: {
          sqlCommands: ['INVALID SQL COMMAND'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithSql);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);
      prismaService.$executeRawUnsafe.mockRejectedValue(new Error('SQL error'));

      // Mock validation mit den SQL-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithSql,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      const result = await service.importFromFile(filePath, { strictWarnings: true });

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('Pre-Import Setup fehlgeschlagen'))).toBe(true);
    });
  });

  describe('Einsatz-Import', () => {
    beforeEach(() => {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn(),
            create: jest.fn().mockResolvedValue(mockEinsatz),
            update: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });
    });

    it('sollte existierende Einsätze bei Konflikt beibehalten', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock existing einsatz
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(mockEinsatz),
            create: jest.fn(),
            update: jest.fn(),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      const result = await service.importFromFile(filePath, { overwriteConflicts: false });

      expect(result.success).toBe(true);
      // Should not call create, but use existing
    });

    it('sollte existierende Einsätze bei overwriteConflicts aktualisieren', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock transaction with update call
      const mockUpdate = jest.fn().mockResolvedValue(mockEinsatz);
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(mockEinsatz),
            create: jest.fn(),
            update: mockUpdate,
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      const result = await service.importFromFile(filePath, { overwriteConflicts: true });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('ETB-Import', () => {
    it('sollte ETB-Einträge nach laufender Nummer sortiert importieren', async () => {
      const dataWithUnsortedEntries = {
        ...validFullSeedData,
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
            etbEntries: [
              {
                laufendeNummer: 3,
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Dritter Eintrag',
                autorId: 'test-autor-id',
                autorName: 'Test Autor',
              },
              {
                laufendeNummer: 1,
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Erster Eintrag',
                autorId: 'test-autor-id',
                autorName: 'Test Autor',
              },
              {
                laufendeNummer: 2,
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Zweiter Eintrag',
                autorId: 'test-autor-id',
                autorName: 'Test Autor',
              },
            ],
          },
        ],
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithUnsortedEntries);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit unsortierten Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithUnsortedEntries,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 3,
          estimatedSizeBytes: 1024,
        },
      });

      const createCalls: any[] = [];
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => {
              createCalls.push(data);
              return mockEtbEntry;
            }),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await service.importFromFile(filePath);

      // Prüfe dass Einträge in sortierter Reihenfolge erstellt wurden
      expect(createCalls).toHaveLength(3);
      expect(createCalls[0].data.inhalt).toBe('Erster Eintrag');
      expect(createCalls[1].data.inhalt).toBe('Zweiter Eintrag');
      expect(createCalls[2].data.inhalt).toBe('Dritter Eintrag');
    });

    it('sollte ETB-Einträge mit Auto-Timestamps erstellen', async () => {
      const dataWithoutTimestamps = {
        ...validFullSeedData,
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
            etbEntries: [
              {
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Eintrag ohne Timestamps',
                autorId: 'test-autor-id',
                autorName: 'Test Autor',
              },
            ],
          },
        ],
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithoutTimestamps);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit den Daten ohne Timestamps
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithoutTimestamps,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      const mockCreate = jest.fn().mockResolvedValue(mockEtbEntry);
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: mockCreate,
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await service.importFromFile(filePath, { autoTimestamps: true });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kategorie: EtbKategorie.MELDUNG,
            inhalt: 'Eintrag ohne Timestamps',
            timestampErstellung: expect.any(Date),
            timestampEreignis: expect.any(Date),
          }),
        }),
      );
    });

    it('sollte ETB-Einträge mit Anhängen importieren', async () => {
      const dataWithAttachments = {
        ...validFullSeedData,
        einsaetze: [
          {
            name: 'Test Einsatz',
            beschreibung: 'Test',
            etbEntries: [
              {
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Eintrag mit Anhang',
                autorId: 'test-autor-id',
                autorName: 'Test Autor',
                anlagen: [
                  {
                    dateiname: 'test.pdf',
                    dateityp: 'application/pdf',
                    speicherOrt: '/path/to/test.pdf',
                    beschreibung: 'Test Anhang',
                  },
                ],
              },
            ],
          },
        ],
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithAttachments);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit den Attachment-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithAttachments,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      const mockAttachmentCreate = jest.fn();
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: {
            create: mockAttachmentCreate,
          },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await service.importFromFile(filePath);

      expect(result.attachmentsCreated).toBe(1);
      expect(mockAttachmentCreate).toHaveBeenCalledWith({
        data: {
          etbEntryId: mockEtbEntry.id,
          dateiname: 'test.pdf',
          dateityp: 'application/pdf',
          speicherOrt: '/path/to/test.pdf',
          beschreibung: 'Test Anhang',
        },
      });
    });
  });

  describe('Vereinfachtes Format', () => {
    it('sollte vereinfachtes Format importieren', async () => {
      const filePath = '/test/simple.json';
      const jsonContent = JSON.stringify(validSimpleSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation für vereinfachtes Format
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'simple',
        data: validSimpleSeedData,
        metadata: {
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 512,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(true);
      expect(result.einsaetzeCreated).toBe(1);
      expect(result.etbEntriesCreated).toBe(1);
    });
  });

  describe('Post-Import Cleanup', () => {
    it('sollte Post-Import-Cleanup durchführen', async () => {
      const dataWithCleanup = {
        ...validFullSeedData,
        postImportCleanup: {
          sqlCommands: ['UPDATE test_table SET imported = true'],
          validationSteps: ['Check data integrity'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithCleanup);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit cleanup-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithCleanup,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await service.importFromFile(filePath);

      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE test_table SET imported = true',
      );
    });

    it('sollte Post-Import SQL-Fehler als Warnung behandeln', async () => {
      const dataWithCleanup = {
        ...validFullSeedData,
        postImportCleanup: {
          sqlCommands: ['INVALID SQL CLEANUP COMMAND'],
        },
      };

      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(dataWithCleanup);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      // Mock validation mit cleanup-Daten
      mockValidateSeedDataString.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedFormat: 'full',
        data: dataWithCleanup,
        metadata: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          einsaetzeCount: 1,
          etbEntriesCount: 1,
          estimatedSizeBytes: 1024,
        },
      });

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      // Mock SQL error for cleanup
      prismaService.$executeRawUnsafe.mockRejectedValue(new Error('SQL cleanup error'));

      const result = await service.importFromFile(filePath);

      // Import sollte erfolgreich sein, aber mit Warnung
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.includes('Post-Import SQL-Warnung'))).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('sollte Datei erfolgreich validieren', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      const result = await service.validateFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sollte Fehler beim Lesen der Datei behandeln', async () => {
      const filePath = '/nonexistent/path.json';
      const error = new Error('ENOENT: no such file or directory');

      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const result = await service.validateFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_READ_ERROR');
      expect(result.errors[0].message).toContain('Datei konnte nicht gelesen werden');
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Import-Fehler abfangen', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      errorHandlingService.executeWithErrorHandling.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const result = await service.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('Import-Fehler'))).toBe(true);
    });

    it('sollte Progress-Callback aufrufen', async () => {
      const filePath = '/test/path.json';
      const jsonContent = JSON.stringify(validFullSeedData);
      const progressCallback = jest.fn();

      (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          einsatz: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEinsatz),
          },
          etbEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockEtbEntry),
          },
          etbAttachment: { create: jest.fn() },
        };
        return await callback(mockTx);
      });

      errorHandlingService.executeWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await service.importFromFile(filePath, { progressCallback });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.stringContaining('Test Einsatz'),
        expect.any(Number),
      );
    });
  });
});
