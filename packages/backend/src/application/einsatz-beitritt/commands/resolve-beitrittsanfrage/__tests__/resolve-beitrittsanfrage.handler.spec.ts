// @ts-nocheck
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzBeitrittsanfrageRepository, EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { Test, type TestingModule } from '@nestjs/testing';
import { ResolveBeitrittsanfrageCommand } from '../resolve-beitrittsanfrage.command';
import { ResolveBeitrittsanfrageHandler } from '../resolve-beitrittsanfrage.handler';

const TEST_ANFRAGE_ID = 'clw3h8x9y0000qwerty00001';
const TEST_EINSATZ_ID = 'clw3h8x9y0000qwerty00002';
const TEST_USER_ID = 'clw3h8x9y0000qwerty00003';
const TEST_FK_USER_ID = 'clw3h8x9y0000qwerty00004';

/**
 * Unit Tests für ResolveBeitrittsanfrageHandler.
 *
 * Testet Handler-Orchestration gemäß BDD Given-When-Then Pattern.
 */
describe('ResolveBeitrittsanfrageHandler', () => {
  let handler: ResolveBeitrittsanfrageHandler;
  let mockAnfrageRepository: jest.Mocked<IEinsatzBeitrittsanfrageRepository>;
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  const createOpenAnfrage = (): EinsatzBeitrittsanfrageData => ({
    id: TEST_ANFRAGE_ID,
    einsatzId: TEST_EINSATZ_ID,
    userId: TEST_USER_ID,
    status: 'OFFEN',
    createdAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
  });

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
        ResolveBeitrittsanfrageHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: EINSATZ_BEITRITTSANFRAGE_REPOSITORY, useValue: mockAnfrageRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ResolveBeitrittsanfrageHandler>(ResolveBeitrittsanfrageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Erfolgsfall', () => {
    it('sollte Beitrittsanfrage erfolgreich genehmigen', async () => {
      // Given
      const command = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'GENEHMIGT', TEST_FK_USER_ID).value!;
      const openAnfrage = createOpenAnfrage();
      const resolvedAnfrage: EinsatzBeitrittsanfrageData = {
        ...openAnfrage,
        status: 'GENEHMIGT',
        resolvedAt: new Date(),
        resolvedBy: TEST_FK_USER_ID,
      };

      mockAnfrageRepository.findById.mockResolvedValue(openAnfrage);
      mockAnfrageRepository.resolve.mockResolvedValue(resolvedAnfrage);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.status).toBe('GENEHMIGT');
      expect(mockAnfrageRepository.resolve).toHaveBeenCalledWith(TEST_ANFRAGE_ID, 'GENEHMIGT', TEST_FK_USER_ID, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Beitrittsanfrage erfolgreich ablehnen', async () => {
      // Given
      const command = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'ABGELEHNT', TEST_FK_USER_ID).value!;
      const openAnfrage = createOpenAnfrage();
      const resolvedAnfrage: EinsatzBeitrittsanfrageData = {
        ...openAnfrage,
        status: 'ABGELEHNT',
        resolvedAt: new Date(),
        resolvedBy: TEST_FK_USER_ID,
      };

      mockAnfrageRepository.findById.mockResolvedValue(openAnfrage);
      mockAnfrageRepository.resolve.mockResolvedValue(resolvedAnfrage);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.status).toBe('ABGELEHNT');
      expect(mockAnfrageRepository.resolve).toHaveBeenCalledWith(TEST_ANFRAGE_ID, 'ABGELEHNT', TEST_FK_USER_ID, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fehlerfälle', () => {
    it('sollte fehlschlagen wenn Anfrage nicht gefunden wird', async () => {
      // Given
      const command = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'GENEHMIGT', TEST_FK_USER_ID).value!;
      mockAnfrageRepository.findById.mockResolvedValue(null);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(mockAnfrageRepository.resolve).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Anfrage bereits entschieden wurde', async () => {
      // Given
      const command = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'GENEHMIGT', TEST_FK_USER_ID).value!;
      const alreadyResolvedAnfrage: EinsatzBeitrittsanfrageData = {
        ...createOpenAnfrage(),
        status: 'GENEHMIGT',
        resolvedAt: new Date(),
        resolvedBy: 'clw3h8x9y0000qwerty00099',
      };

      mockAnfrageRepository.findById.mockResolvedValue(alreadyResolvedAnfrage);

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits entschieden');
      expect(mockAnfrageRepository.resolve).not.toHaveBeenCalled();
    });
  });

  describe('Command-Validierung', () => {
    it('sollte fehlschlagen wenn anfrageId fehlt', () => {
      const result = ResolveBeitrittsanfrageCommand.create('', 'GENEHMIGT', TEST_FK_USER_ID);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('anfrageId');
    });

    it('sollte fehlschlagen wenn decision ungültig ist', () => {
      const result = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'UNGUELTIG', TEST_FK_USER_ID);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('GENEHMIGT oder ABGELEHNT');
    });

    it('sollte fehlschlagen wenn resolvedBy fehlt', () => {
      const result = ResolveBeitrittsanfrageCommand.create(TEST_ANFRAGE_ID, 'GENEHMIGT', '');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('resolvedBy');
    });
  });
});
