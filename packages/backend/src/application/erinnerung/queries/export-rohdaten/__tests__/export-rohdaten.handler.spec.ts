import { ExportRohdatenHandler } from '../export-rohdaten.handler';
import { ExportRohdatenQuery } from '../export-rohdaten.query';
import { Result } from '@domain/common/result';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockRepository = {
  getErinnerungenForRawExport: jest.fn(),
};

const mockCsvService = {
  generateRawExport: jest.fn(),
};

const mockJsonService = {
  generateRawExport: jest.fn(),
};

describe('ExportRohdatenHandler', () => {
  let handler: ExportRohdatenHandler;

  const validEinsatzId = 'abc123def456ghi789jkl012';
  const validEinsatzNummer = 'E2026-001';
  const sampleItem: RohdatenExportItem = {
    id: 'item1id1234567890abcdefgh',
    titel: 'Test Erinnerung',
    beschreibung: 'Beschreibung',
    status: 'ERLEDIGT',
    kategorieName: 'Allgemein',
    erstelltVonName: 'Max Mustermann',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    faelligAm: new Date('2026-01-15T11:00:00Z'),
    ausgeloestAm: new Date('2026-01-15T11:00:00Z'),
    acknowledgedAm: new Date('2026-01-15T11:02:00Z'),
    acknowledgedByName: 'Max Mustermann',
    snoozedAt: null,
    snoozedByName: null,
    snoozedUntil: null,
    snoozeCount: 0,
    erledigtAm: new Date('2026-01-15T11:10:00Z'),
    erledigtByName: 'Max Mustermann',
    erledigungsNotiz: 'Erledigt',
    assignedToName: 'Max Mustermann',
    assignedByName: null,
    assignedAt: null,
    wurdeEskaliert: false,
    eskaliertAm: null,
    eskalationsPersonName: null,
    previousAssigneeName: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ExportRohdatenHandler(mockRepository as any, mockLogger as any, mockCsvService as any, mockJsonService as any);
  });

  it('should generate CSV export successfully', async () => {
    mockRepository.getErinnerungenForRawExport.mockResolvedValue(Result.ok([sampleItem]));
    mockCsvService.generateRawExport.mockReturnValue(Buffer.from('csv-data'));

    const query = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'csv' }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.contentType).toBe('text/csv');
    expect(result.value!.filename).toMatch(/^Rohdaten_Export_E2026-001_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/);
    expect(mockCsvService.generateRawExport).toHaveBeenCalledWith([sampleItem]);
  });

  it('should generate JSON export successfully', async () => {
    mockRepository.getErinnerungenForRawExport.mockResolvedValue(Result.ok([sampleItem]));
    mockJsonService.generateRawExport.mockReturnValue(Buffer.from('json-data'));

    const query = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'json' }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.contentType).toBe('application/json');
    expect(result.value!.filename).toMatch(/^Rohdaten_Export_E2026-001_\d{4}-\d{2}-\d{2}_\d{6}\.json$/);
    expect(mockJsonService.generateRawExport).toHaveBeenCalledWith([sampleItem]);
  });

  it('should handle empty erinnerungen list', async () => {
    mockRepository.getErinnerungenForRawExport.mockResolvedValue(Result.ok([]));
    mockCsvService.generateRawExport.mockReturnValue(Buffer.from('empty-csv'));

    const query = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'csv' }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(mockCsvService.generateRawExport).toHaveBeenCalledWith([]);
  });

  it('should fail when repository returns error', async () => {
    mockRepository.getErinnerungenForRawExport.mockResolvedValue(Result.fail('DB connection failed'));

    const query = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'csv' }).value!;
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('DB connection failed');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should fail when service throws', async () => {
    mockRepository.getErinnerungenForRawExport.mockResolvedValue(Result.ok([sampleItem]));
    mockCsvService.generateRawExport.mockImplementation(() => {
      throw new Error('CSV generation failed');
    });

    const query = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'csv' }).value!;
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('CSV generation failed');
  });
});
