import { AnonymisiereAbgelaufeneHandler } from '../anonymisiere-abgelaufene.handler';
import { AnonymisiereAbgelaufeneCommand } from '../anonymisiere-abgelaufene.command';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { Result } from '@domain/common/result';

describe('AnonymisiereAbgelaufeneHandler', () => {
  let handler: AnonymisiereAbgelaufeneHandler;
  let mockPrisma: { $transaction: jest.Mock };
  let mockOutboxRepository: { save: jest.Mock };
  let mockBefehlRepository: { findAbgelaufene: jest.Mock; bulkAnonymisiere: jest.Mock };
  let mockKonfigurationRepository: { find: jest.Mock };
  let mockComplianceReportService: { erstelleAnonymisierungsReport: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockBefehlRepository = {
      findAbgelaufene: jest.fn(),
      bulkAnonymisiere: jest.fn(),
    };

    mockKonfigurationRepository = {
      find: jest.fn(),
    };

    mockComplianceReportService = {
      erstelleAnonymisierungsReport: jest.fn().mockResolvedValue(undefined),
    };

    handler = new AnonymisiereAbgelaufeneHandler(mockPrisma as any, mockOutboxRepository as any, mockBefehlRepository as any, mockKonfigurationRepository as any, mockComplianceReportService as any);
  });

  function createTestBefehl(): { befehl: Befehl; einsatzId: EinsatzId } {
    const einsatzId = EinsatzId.create().value!;
    const erstellerId = UserId.create().value!;
    const befehlResult = Befehl.create({
      einsatzId,
      auftrag: 'Test Auftrag',
      befehlsgeber: 'EL Mueller',
      erstellerId,
      empfaenger: [{ name: 'ZF Alpha' }],
      nummer: 'B-001',
    });
    return { befehl: befehlResult.value!, einsatzId };
  }

  describe('execute', () => {
    it('sollte erfolgreich sein wenn keine abgelaufenen Befehle existieren', async () => {
      const command = new AnonymisiereAbgelaufeneCommand('SYSTEM');

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockBefehlRepository.findAbgelaufene.mockResolvedValue(Result.ok([]));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockComplianceReportService.erstelleAnonymisierungsReport).not.toHaveBeenCalled();
    });

    it('sollte Befehle anonymisieren und Compliance-Report erstellen', async () => {
      const command = new AnonymisiereAbgelaufeneCommand('SYSTEM');
      const { befehl, einsatzId } = createTestBefehl();

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockBefehlRepository.findAbgelaufene.mockResolvedValue(Result.ok([befehl]));
      mockBefehlRepository.bulkAnonymisiere.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].einsatzId).toBe(einsatzId.value);
      expect(result.value![0].befehlCount).toBe(1);
      expect(mockBefehlRepository.bulkAnonymisiere).toHaveBeenCalledTimes(1);
      expect(mockComplianceReportService.erstelleAnonymisierungsReport).toHaveBeenCalledTimes(1);
    });

    it('sollte bei Konfiguration-Ladefehler fehlschlagen', async () => {
      const command = new AnonymisiereAbgelaufeneCommand('SYSTEM');

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('sollte bei bulkAnonymisiere-Fehler fehlschlagen', async () => {
      const command = new AnonymisiereAbgelaufeneCommand('SYSTEM');
      const { befehl } = createTestBefehl();

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockBefehlRepository.findAbgelaufene.mockResolvedValue(Result.ok([befehl]));
      mockBefehlRepository.bulkAnonymisiere.mockResolvedValue(Result.fail('Anonymisierung fehlgeschlagen'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('sollte Default-Konfiguration verwenden wenn keine gespeichert', async () => {
      const command = new AnonymisiereAbgelaufeneCommand('SYSTEM');

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(null));
      mockBefehlRepository.findAbgelaufene.mockResolvedValue(Result.ok([]));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockBefehlRepository.findAbgelaufene).toHaveBeenCalledTimes(1);
    });
  });
});
