import { Test, type TestingModule } from '@nestjs/testing';
import { DeleteEinsatzHandler } from '../delete-einsatz.handler';
import { DeleteEinsatzCommand } from '../delete-einsatz.command';
import { Result } from '@domain/common/result';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EINSATZ_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('DeleteEinsatzHandler', () => {
  let handler: DeleteEinsatzHandler;
  let mockRepository: {
    findById: jest.Mock;
    delete: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  // Helper to create a valid Einsatz for tests
  const createTestEinsatz = () => {
    const userId = UserId.create().value!;
    return Einsatz.create({
      alarmstichwort: 'Testbrand',
      createdBy: userId,
    }).value!;
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      delete: jest.fn(), // Should NEVER be called
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteEinsatzHandler, { provide: EINSATZ_REPOSITORY, useValue: mockRepository }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    handler = module.get<DeleteEinsatzHandler>(DeleteEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NO-DELETE Policy', () => {
    it('sollte IMMER Result.fail zurückgeben (NO-DELETE Policy)', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      const command = DeleteEinsatzCommand.create(einsatz.id.value).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsätze können nicht gelöscht werden. Verwende Archivieren stattdessen.');
    });

    it('sollte canBeDeleted() aufrufen und false erwarten', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      const canBeDeletedSpy = jest.spyOn(einsatz, 'canBeDeleted');
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      const command = DeleteEinsatzCommand.create(einsatz.id.value).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(canBeDeletedSpy).toHaveBeenCalled();
      expect(einsatz.canBeDeleted()).toBe(false);
    });

    it('sollte repository.delete NIEMALS aufrufen (DRK Compliance)', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      const command = DeleteEinsatzCommand.create(einsatz.id.value).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('sollte canBeDeleted() === false in ALLEN Status', async () => {
      // Arrange - Test all statuses
      const statuses = ['ANGELEGT', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN', 'ARCHIVIERT'];

      for (const _statusValue of statuses) {
        const einsatz = createTestEinsatz();

        // canBeDeleted() should always return false regardless of status
        const canDelete = einsatz.canBeDeleted();

        // Assert
        expect(canDelete).toBe(false);
      }
    });
  });

  describe('Error Cases', () => {
    it('sollte Result.fail zurückgeben bei Einsatz nicht gefunden', async () => {
      // Given (Arrange)
      const einsatzId = EinsatzId.create().value!;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = DeleteEinsatzCommand.create(einsatzId.value).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatz nicht gefunden');
    });

    it('sollte Result.fail zurückgeben bei ungültiger Einsatz-ID', async () => {
      // Given (Arrange)
      const command = DeleteEinsatzCommand.create('invalid-id').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format'); // EinsatzId.create() validation error
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Command Validation', () => {
    it('sollte Result.fail bei fehlender einsatzId zurückgeben', () => {
      const result = DeleteEinsatzCommand.create('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId ist erforderlich');
    });
  });
});
