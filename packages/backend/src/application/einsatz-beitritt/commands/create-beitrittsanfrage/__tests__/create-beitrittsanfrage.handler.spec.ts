// @ts-nocheck
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzBeitrittsanfrageRepository, EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { Test, type TestingModule } from '@nestjs/testing';
import { CreateBeitrittsanfrageCommand } from '../create-beitrittsanfrage.command';
import { CreateBeitrittsanfrageHandler } from '../create-beitrittsanfrage.handler';

const TEST_EINSATZ_ID = 'clw3h8x9y0000qwerty00001';
const TEST_USER_ID = 'clw3h8x9y0000qwerty00002';
const TEST_ANFRAGE_ID = 'clw3h8x9y0000qwerty00003';

/**
 * Unit Tests für CreateBeitrittsanfrageHandler.
 *
 * Testet Handler-Orchestration gemäß BDD Given-When-Then Pattern.
 */
describe('CreateBeitrittsanfrageHandler', () => {
  let handler: CreateBeitrittsanfrageHandler;
  let mockAnfrageRepository: jest.Mocked<IEinsatzBeitrittsanfrageRepository>;
  let mockPrismaService: {
    $transaction: jest.Mock;
    einsatz: {
      findUnique: jest.Mock;
    };
  };
  let mockOutboxRepository: {
    save: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockAnfrageRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findOpenByEinsatzAndUser: jest.fn(),
      findByEinsatz: jest.fn(),
      resolve: jest.fn(),
    } as any;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
      einsatz: {
        findUnique: jest.fn(),
      },
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBeitrittsanfrageHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: EINSATZ_BEITRITTSANFRAGE_REPOSITORY, useValue: mockAnfrageRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CreateBeitrittsanfrageHandler>(CreateBeitrittsanfrageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Erfolgsfall', () => {
    it('sollte Beitrittsanfrage erfolgreich erstellen wenn Einsatz aktiv und keine Duplikate', async () => {
      // Given
      const command = CreateBeitrittsanfrageCommand.create(TEST_EINSATZ_ID, TEST_USER_ID).value!;
      const mockAnfrage: EinsatzBeitrittsanfrageData = {
        id: TEST_ANFRAGE_ID,
        einsatzId: TEST_EINSATZ_ID,
        userId: TEST_USER_ID,
        status: 'OFFEN',
        createdAt: new Date(),
        resolvedAt: null,
        resolvedBy: null,
      };

      mockAnfrageRepository.findOpenByEinsatzAndUser.mockResolvedValue(null);
      mockPrismaService.einsatz.findUnique.mockResolvedValue({
        id: TEST_EINSATZ_ID,
        status: 'IN_BEARBEITUNG',
      });
      mockAnfrageRepository.save.mockResolvedValue(mockAnfrage);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockAnfrage);
      expect(mockAnfrageRepository.save).toHaveBeenCalledWith({ einsatzId: TEST_EINSATZ_ID, userId: TEST_USER_ID }, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fehlerfälle', () => {
    it('sollte fehlschlagen wenn bereits eine offene Anfrage existiert', async () => {
      // Given
      const command = CreateBeitrittsanfrageCommand.create(TEST_EINSATZ_ID, TEST_USER_ID).value!;
      const existingAnfrage: EinsatzBeitrittsanfrageData = {
        id: 'clw3h8x9y0000qwerty00099',
        einsatzId: TEST_EINSATZ_ID,
        userId: TEST_USER_ID,
        status: 'OFFEN',
        createdAt: new Date(),
        resolvedAt: null,
        resolvedBy: null,
      };

      mockAnfrageRepository.findOpenByEinsatzAndUser.mockResolvedValue(existingAnfrage);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('offene Beitrittsanfrage');
      expect(mockAnfrageRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Einsatz nicht existiert', async () => {
      // Given
      const command = CreateBeitrittsanfrageCommand.create(TEST_EINSATZ_ID, TEST_USER_ID).value!;

      mockAnfrageRepository.findOpenByEinsatzAndUser.mockResolvedValue(null);
      mockPrismaService.einsatz.findUnique.mockResolvedValue(null);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
    });

    it('sollte fehlschlagen wenn Einsatz nicht IN_BEARBEITUNG ist', async () => {
      // Given
      const command = CreateBeitrittsanfrageCommand.create(TEST_EINSATZ_ID, TEST_USER_ID).value!;

      mockAnfrageRepository.findOpenByEinsatzAndUser.mockResolvedValue(null);
      mockPrismaService.einsatz.findUnique.mockResolvedValue({
        id: TEST_EINSATZ_ID,
        status: 'ABGESCHLOSSEN',
      });

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('aktive Einsätze');
    });
  });

  describe('Command-Validierung', () => {
    it('sollte fehlschlagen wenn einsatzId fehlt', () => {
      const result = CreateBeitrittsanfrageCommand.create('', TEST_USER_ID);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId');
    });

    it('sollte fehlschlagen wenn userId fehlt', () => {
      const result = CreateBeitrittsanfrageCommand.create(TEST_EINSATZ_ID, '');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('userId');
    });
  });
});
