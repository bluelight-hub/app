// @ts-nocheck
import { UpdateAufbewahrungsKonfigurationHandler } from '../update-aufbewahrungs-konfiguration.handler';
import { UpdateAufbewahrungsKonfigurationCommand } from '../update-aufbewahrungs-konfiguration.command';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { Result } from '@domain/common/result';

describe('UpdateAufbewahrungsKonfigurationHandler', () => {
  type TransactionCallback = (tx: object) => Promise<unknown>;

  let handler: UpdateAufbewahrungsKonfigurationHandler;
  let mockPrisma: { $transaction: jest.Mock };
  let mockOutboxRepository: { save: jest.Mock };
  let mockKonfigurationRepository: { find: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockKonfigurationRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    handler = new UpdateAufbewahrungsKonfigurationHandler(mockPrisma as never, mockOutboxRepository as never, mockKonfigurationRepository as never);
  });

  describe('execute', () => {
    it('sollte Konfiguration erfolgreich aktualisieren', async () => {
      const command = new UpdateAufbewahrungsKonfigurationCommand(10, 30, true, 'admin-user');

      // Mock: Transaction fuehrt Callback direkt aus
      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockKonfigurationRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockKonfigurationRepository.find).toHaveBeenCalledTimes(1);
      expect(mockKonfigurationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Default-Konfiguration verwenden wenn keine existiert', async () => {
      const command = new UpdateAufbewahrungsKonfigurationCommand(5, 60, false, 'admin-user');

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(null));
      mockKonfigurationRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockKonfigurationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte bei ungueltiger Frist fehlschlagen', async () => {
      const command = new UpdateAufbewahrungsKonfigurationCommand(0, 30, true, 'admin-user');

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('sollte bei ungueltiger Freigabeperiode fehlschlagen', async () => {
      const command = new UpdateAufbewahrungsKonfigurationCommand(10, 0, true, 'admin-user');

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('sollte bei Repository-Fehler fehlschlagen', async () => {
      const command = new UpdateAufbewahrungsKonfigurationCommand(10, 30, true, 'admin-user');

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback({});
      });

      mockKonfigurationRepository.find.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB-Fehler');
    });
  });
});
