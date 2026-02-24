import { LoescheAnonymisierteHandler } from '../loesche-anonymisierte.handler';
import { LoescheAnonymisierteCommand } from '../loesche-anonymisierte.command';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';

describe('LoescheAnonymisierteHandler', () => {
  let handler: LoescheAnonymisierteHandler;
  let mockPrisma: { $transaction: jest.Mock };
  let mockOutboxRepository: { save: jest.Mock };
  let mockBefehlRepository: { bulkSoftDelete: jest.Mock };
  let mockKonfigurationRepository: { find: jest.Mock };
  let mockComplianceReportService: { erstelleLoeschungsReport: jest.Mock };
  let mockPrismaTx: { befehl: { findMany: jest.Mock } };

  beforeEach(() => {
    mockPrismaTx = {
      befehl: {
        findMany: jest.fn(),
      },
    };

    mockPrisma = {
      $transaction: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockBefehlRepository = {
      bulkSoftDelete: jest.fn(),
    };

    mockKonfigurationRepository = {
      find: jest.fn(),
    };

    mockComplianceReportService = {
      erstelleLoeschungsReport: jest.fn().mockResolvedValue(undefined),
    };

    handler = new LoescheAnonymisierteHandler(mockPrisma as any, mockOutboxRepository as any, mockBefehlRepository as any, mockKonfigurationRepository as any, mockComplianceReportService as any);
  });

  describe('execute', () => {
    it('sollte erfolgreich sein wenn keine anonymisierten Befehle existieren', async () => {
      const command = new LoescheAnonymisierteCommand('SYSTEM');

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrismaTx);
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrismaTx.befehl.findMany.mockResolvedValue([]);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('sollte anonymisierte Befehle soft-deleten', async () => {
      const command = new LoescheAnonymisierteCommand('SYSTEM');
      const einsatzId = EinsatzId.create().value!;

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrismaTx);
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrismaTx.befehl.findMany.mockResolvedValue([
        { id: 'befehl-1', einsatzId: einsatzId.value },
        { id: 'befehl-2', einsatzId: einsatzId.value },
      ]);
      mockBefehlRepository.bulkSoftDelete.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].einsatzId).toBe(einsatzId.value);
      expect(result.value![0].befehlCount).toBe(2);
      expect(mockBefehlRepository.bulkSoftDelete).toHaveBeenCalledTimes(1);
      expect(mockComplianceReportService.erstelleLoeschungsReport).toHaveBeenCalledTimes(1);
    });

    it('sollte mehrere Einsaetze gruppiert verarbeiten', async () => {
      const command = new LoescheAnonymisierteCommand('SYSTEM');
      const einsatzIdA = EinsatzId.create().value!;
      const einsatzIdB = EinsatzId.create().value!;

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrismaTx);
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrismaTx.befehl.findMany.mockResolvedValue([
        { id: 'befehl-1', einsatzId: einsatzIdA.value },
        { id: 'befehl-2', einsatzId: einsatzIdA.value },
        { id: 'befehl-3', einsatzId: einsatzIdB.value },
      ]);
      mockBefehlRepository.bulkSoftDelete.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(mockBefehlRepository.bulkSoftDelete).toHaveBeenCalledTimes(2);
    });

    it('sollte bei Konfiguration-Ladefehler fehlschlagen', async () => {
      const command = new LoescheAnonymisierteCommand('SYSTEM');

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrismaTx);
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('sollte bei bulkSoftDelete-Fehler fehlschlagen', async () => {
      const command = new LoescheAnonymisierteCommand('SYSTEM');
      const einsatzId = EinsatzId.create().value!;

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrismaTx);
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrismaTx.befehl.findMany.mockResolvedValue([{ id: 'befehl-1', einsatzId: einsatzId.value }]);
      mockBefehlRepository.bulkSoftDelete.mockResolvedValue(Result.fail('Delete fehlgeschlagen'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });
  });
});
