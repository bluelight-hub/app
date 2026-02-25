import { ExportBefehleQueryHandler } from '../export-befehle.handler';
import { ExportBefehleQuery } from '../export-befehle.query';
import { Result } from '@/domain/common/result';
import { Befehl } from '@/domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@/domain/entities/befehl-empfaenger.entity';
import { BefehlId } from '@/domain/value-objects/befehl-id';
import { BefehlStatus } from '@/domain/value-objects/befehl-status';
import { EinsatzId } from '@/domain/value-objects/einsatz-id';
import { UserId } from '@/domain/value-objects/user-id';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import type { IBefehlCsvService } from '@/application/befehl/ports/i-befehl-csv.service';

/**
 * Unit Tests fuer ExportBefehleQueryHandler (Story 4.4).
 *
 * **Test Strategy:**
 * - Direct Instantiation Pattern (kein TestingModule)
 * - Mock: befehlRepository, csvService
 */
describe('ExportBefehleQueryHandler', () => {
  let handler: ExportBefehleQueryHandler;
  let mockBefehlRepository: jest.Mocked<IBefehlRepository>;
  let mockCsvService: jest.Mocked<IBefehlCsvService>;

  const createMockBefehl = (): Befehl => {
    return Befehl.reconstitute({
      id: BefehlId.create().value as BefehlId,
      nummer: 'B-001',
      einsatzId: EinsatzId.create('cm5einsatzid123').value as EinsatzId,
      auftrag: 'Patientenablage einrichten',
      befehlsgeberName: 'EL Mueller',
      befehlsgeberId: undefined,
      erstellerId: UserId.create('ersteller1').value as UserId,
      status: BefehlStatus.create('ERTEILT').value!,
      erteiltAm: new Date('2026-02-20T10:00:00.000Z'),
      empfaenger: [BefehlEmpfaenger.reconstitute('emp1', 'ZF Meier', undefined, new Date('2026-02-20T10:05:00.000Z'), new Date('2026-02-20T10:10:00.000Z'), 'VERSTANDEN')],
      kommentare: [],
      createdAt: new Date('2026-02-20T10:00:00.000Z'),
      updatedAt: new Date('2026-02-20T10:00:00.000Z'),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockBefehlRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      findByEmpfaengerId: jest.fn(),
      findWithOpenRueckfragen: jest.fn(),
      findFiltered: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockCsvService = {
      generateCsv: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    handler = new ExportBefehleQueryHandler(mockBefehlRepository, mockCsvService);
  });

  describe('CSV-Export', () => {
    it('sollte CSV-Export mit korrektem Dateinamen und Content-Type zurueckgeben (Happy Path)', async () => {
      const befehle = [createMockBefehl()];
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.ok(befehle));
      mockCsvService.generateCsv.mockReturnValue('\uFEFFNummer;Zeitstempel\r\nB-001;20.02.2026 11:00\r\n');

      const query = new ExportBefehleQuery('cm5einsatzid123', 'csv');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.contentType).toBe('text/csv; charset=utf-8');
      expect(result.value?.filename).toMatch(/^befehle_atzid123_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(result.value?.content).toContain('\uFEFF');
      expect(mockCsvService.generateCsv).toHaveBeenCalledWith(befehle);
    });

    it('sollte leere CSV zurueckgeben wenn keine Befehle existieren (Leerzustand)', async () => {
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      mockCsvService.generateCsv.mockReturnValue('\uFEFFNummer;Zeitstempel\r\n');

      const query = new ExportBefehleQuery('cm5einsatzid123', 'csv');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.content).toContain('\uFEFF');
      expect(mockCsvService.generateCsv).toHaveBeenCalledWith([]);
    });
  });

  describe('JSON-Export', () => {
    it('sollte JSON-Export mit korrektem Dateinamen und Content-Type zurueckgeben (Happy Path)', async () => {
      const befehle = [createMockBefehl()];
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.ok(befehle));

      const query = new ExportBefehleQuery('cm5einsatzid123', 'json');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.contentType).toBe('application/json; charset=utf-8');
      expect(result.value?.filename).toMatch(/^befehle_[a-z0-9]{8}_\d{4}-\d{2}-\d{2}\.json$/);

      const parsed = JSON.parse(result.value!.content);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].nummer).toBe('B-001');
      expect(parsed[0].auftrag).toBe('Patientenablage einrichten');
      expect(parsed[0].befehlsgeberName).toBe('EL Mueller');
      expect(parsed[0].erstellerId).toBeDefined();
      expect(parsed[0].status).toBe('ERTEILT');
      expect(parsed[0].empfaenger).toHaveLength(1);
      expect(parsed[0].empfaenger[0].name).toBe('ZF Meier');
      expect(parsed[0].empfaenger[0].id).toBeDefined();
      expect(parsed[0].empfaenger[0].istQuittierbar).toBeDefined();
      expect(parsed[0].kommentare).toEqual([]);
      expect(parsed[0].createdAt).toBeDefined();
      expect(parsed[0].updatedAt).toBeDefined();
    });

    it('sollte leeres JSON-Array zurueckgeben wenn keine Befehle existieren (Leerzustand)', async () => {
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));

      const query = new ExportBefehleQuery('cm5einsatzid123', 'json');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const parsed = JSON.parse(result.value!.content);
      expect(parsed).toEqual([]);
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Result.fail zurueckgeben bei ungueltiger einsatzId', async () => {
      const query = new ExportBefehleQuery('x', 'csv');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(mockBefehlRepository.findByEinsatzId).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurueckgeben wenn Repository fehlschlaegt', async () => {
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.fail('DB Error'));

      const query = new ExportBefehleQuery('cm5einsatzid123', 'csv');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB Error');
    });
  });

  describe('Dateiname', () => {
    it('sollte die letzten 8 Zeichen der einsatzId im Dateinamen verwenden', async () => {
      mockBefehlRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      mockCsvService.generateCsv.mockReturnValue('\uFEFF');

      const query = new ExportBefehleQuery('cm5einsatzid123', 'csv');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      // "cm5einsatzid123" → letzte 8 Zeichen = "atzid123"
      expect(result.value?.filename).toContain('atzid123');
    });
  });
});
