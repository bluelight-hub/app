// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER, PDF_EXPORT_SERVICE, CSV_EXPORT_SERVICE, JSON_EXPORT_SERVICE } from '@infrastructure/di-tokens';
import { ExportErinnerungenHandler } from '../export-erinnerungen.handler';
import { ExportErinnerungenQuery } from '../export-erinnerungen.query';
import { GetErinnerungStatistikHandler } from '../../get-erinnerung-statistik/get-erinnerung-statistik.handler';
import { GetPersonStatistikHandler } from '../../get-person-statistik/get-person-statistik.handler';
import { GetEskalationsAnalyseHandler } from '../../get-eskalations-analyse/get-eskalations-analyse.handler';
import { GetReaktionszeitStatistikHandler } from '../../get-reaktionszeit-statistik/get-reaktionszeit-statistik.handler';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';

describe('ExportErinnerungenHandler', () => {
  let handler: ExportErinnerungenHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let logger: jest.Mocked<ILogger>;
  let pdfService: { generateExport: jest.Mock };
  let csvService: { generateExport: jest.Mock };
  let jsonService: { generateExport: jest.Mock };
  let statistikHandler: { execute: jest.Mock };
  let personStatistikHandler: { execute: jest.Mock };
  let eskalationsAnalyseHandler: { execute: jest.Mock };
  let reaktionszeitHandler: { execute: jest.Mock };

  const EINSATZ_ID = 'clw3h8x9y000108l6d8888888';

  /** Helper: Erstellt ein valides ErinnerungExportItem */
  function createMockExportItem(overrides: Partial<ErinnerungExportItem> = {}): ErinnerungExportItem {
    return {
      id: 'clw3h8x9y000108l6daaaaaaa',
      titel: 'Lagebesprechung',
      beschreibung: 'Taktische Lagebesprechung durchfuehren',
      status: 'AUSGELOEST',
      erstelltVonName: 'Max Mueller',
      assignedToName: 'Anna Schmidt',
      kategorieName: 'Fuehrung',
      faelligAm: new Date('2026-02-08T14:00:00Z'),
      ausgeloestAm: new Date('2026-02-08T14:00:00Z'),
      acknowledgedAm: new Date('2026-02-08T14:02:00Z'),
      erledigtAm: null,
      eskaliertAm: null,
      wurdeEskaliert: false,
      snoozeCount: 0,
      createdAt: new Date('2026-02-08T13:30:00Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    const repositoryMock = {
      getErinnerungenForExport: jest.fn(),
    };
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    };

    pdfService = { generateExport: jest.fn() };
    csvService = { generateExport: jest.fn() };
    jsonService = { generateExport: jest.fn() };
    statistikHandler = { execute: jest.fn() };
    personStatistikHandler = { execute: jest.fn() };
    eskalationsAnalyseHandler = { execute: jest.fn() };
    reaktionszeitHandler = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportErinnerungenHandler,
        { provide: ERINNERUNG_REPOSITORY, useValue: repositoryMock },
        { provide: LOGGER, useValue: loggerMock },
        { provide: PDF_EXPORT_SERVICE, useValue: pdfService },
        { provide: CSV_EXPORT_SERVICE, useValue: csvService },
        { provide: JSON_EXPORT_SERVICE, useValue: jsonService },
        { provide: GetErinnerungStatistikHandler, useValue: statistikHandler },
        { provide: GetPersonStatistikHandler, useValue: personStatistikHandler },
        { provide: GetEskalationsAnalyseHandler, useValue: eskalationsAnalyseHandler },
        { provide: GetReaktionszeitStatistikHandler, useValue: reaktionszeitHandler },
      ],
    }).compile();

    handler = module.get<ExportErinnerungenHandler>(ExportErinnerungenHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- Format Routing ---

  it('should route to CSV service for csv format', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'csv' }).value!;
    const mockItems = [createMockExportItem()];
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok(mockItems));
    csvService.generateExport.mockReturnValue(Buffer.from('csv-data'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(csvService.generateExport).toHaveBeenCalledWith(mockItems);
    expect(jsonService.generateExport).not.toHaveBeenCalled();
    expect(pdfService.generateExport).not.toHaveBeenCalled();
    expect(result.value?.contentType).toBe('text/csv');
  });

  it('should route to JSON service for json format', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'json' }).value!;
    const mockItems = [createMockExportItem()];
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok(mockItems));
    jsonService.generateExport.mockReturnValue(Buffer.from('json-data'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(jsonService.generateExport).toHaveBeenCalledWith(mockItems);
    expect(csvService.generateExport).not.toHaveBeenCalled();
    expect(pdfService.generateExport).not.toHaveBeenCalled();
    expect(result.value?.contentType).toBe('application/json');
  });

  it('should route to PDF service for pdf format', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'pdf' }).value!;
    const mockItems = [createMockExportItem()];
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok(mockItems));

    const mockStatistik = { statusCounts: { total: 5 } };
    const mockPersonStatistik = { items: [] };
    const mockEskalationsAnalyse = { totalEscalated: 0 };
    const mockReaktionszeit = { avgReaktionszeitSeconds: 60 };

    statistikHandler.execute.mockResolvedValue(Result.ok(mockStatistik));
    personStatistikHandler.execute.mockResolvedValue(Result.ok(mockPersonStatistik));
    eskalationsAnalyseHandler.execute.mockResolvedValue(Result.ok(mockEskalationsAnalyse));
    reaktionszeitHandler.execute.mockResolvedValue(Result.ok(mockReaktionszeit));
    pdfService.generateExport.mockResolvedValue(Buffer.from('pdf-data'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(pdfService.generateExport).toHaveBeenCalledWith(mockStatistik, mockPersonStatistik, mockEskalationsAnalyse, mockReaktionszeit, mockItems, EINSATZ_ID.substring(0, 8));
    expect(csvService.generateExport).not.toHaveBeenCalled();
    expect(jsonService.generateExport).not.toHaveBeenCalled();
    expect(result.value?.contentType).toBe('application/pdf');
  });

  // --- Empty List ---

  it('should handle empty erinnerungen list', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'csv' }).value!;
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok([]));
    csvService.generateExport.mockReturnValue(Buffer.from('header-only'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(csvService.generateExport).toHaveBeenCalledWith([]);
    expect(result.value?.buffer).toBeDefined();
  });

  // --- Error Handling ---

  it('should return failure on repository error', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'csv' }).value!;
    repository.getErinnerungenForExport.mockResolvedValue(Result.fail('Database Error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return failure if statistics handler fails for PDF', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'pdf' }).value!;
    const mockItems = [createMockExportItem()];
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok(mockItems));

    // Statistik-Handler schlaegt fehl, Rest ist OK
    statistikHandler.execute.mockResolvedValue(Result.fail('Statistik-Fehler'));
    personStatistikHandler.execute.mockResolvedValue(Result.ok({ items: [] }));
    eskalationsAnalyseHandler.execute.mockResolvedValue(Result.ok({ totalEscalated: 0 }));
    reaktionszeitHandler.execute.mockResolvedValue(Result.ok({ avgReaktionszeitSeconds: 60 }));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(pdfService.generateExport).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  // --- Filename ---

  it('should generate correct filename with timestamp and format extension', async () => {
    // Given
    const query = ExportErinnerungenQuery.create({ einsatzId: EINSATZ_ID, format: 'csv' }).value!;
    repository.getErinnerungenForExport.mockResolvedValue(Result.ok([createMockExportItem()]));
    csvService.generateExport.mockReturnValue(Buffer.from('csv'));

    const now = new Date();
    jest.useFakeTimers({ now });

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const filename = result.value?.filename;

    // Filename muss mit "Erinnerungen_Export_" beginnen
    expect(filename).toMatch(/^Erinnerungen_Export_/);

    // Einsatz-Nummer ist die ersten 8 Zeichen der einsatzId
    const expectedEinsatzNummer = EINSATZ_ID.substring(0, 8);
    expect(filename).toContain(expectedEinsatzNummer);

    // Timestamp-Format: YYYY-MM-DD_HHmmss
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const expectedTimestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    expect(filename).toContain(expectedTimestamp);

    // Extension muss .csv sein
    expect(filename).toMatch(/\.csv$/);

    jest.useRealTimers();
  });
});
