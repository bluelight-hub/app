import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { GetZeitverlaufStatistikHandler } from '../get-zeitverlauf-statistik.handler';
import { GetZeitverlaufStatistikQuery } from '../get-zeitverlauf-statistik.query';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ZeitverlaufStatistik } from '@domain/repositories/zeitverlauf-statistik';

describe('GetZeitverlaufStatistikHandler', () => {
  let handler: GetZeitverlaufStatistikHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    const repositoryMock = {
      getZeitverlaufStatistik: jest.fn(),
    };
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetZeitverlaufStatistikHandler,
        {
          provide: ERINNERUNG_REPOSITORY,
          useValue: repositoryMock,
        },
        {
          provide: LOGGER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    handler = module.get<GetZeitverlaufStatistikHandler>(GetZeitverlaufStatistikHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return zeitverlauf dto with mapped buckets', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetZeitverlaufStatistikQuery.create({ einsatzId }).value!;

    const mockStats: ZeitverlaufStatistik = {
      intervalMinutes: 15,
      buckets: [
        { timestamp: new Date('2026-02-01T10:00:00Z'), erstellt: 3, ausgeloest: 1, eskaliert: 0 },
        { timestamp: new Date('2026-02-01T10:15:00Z'), erstellt: 1, ausgeloest: 2, eskaliert: 1 },
      ],
    };

    repository.getZeitverlaufStatistik.mockResolvedValue(Result.ok(mockStats));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      intervalMinutes: 15,
      buckets: [
        { timestamp: '2026-02-01T10:00:00.000Z', erstellt: 3, ausgeloest: 1, eskaliert: 0 },
        { timestamp: '2026-02-01T10:15:00.000Z', erstellt: 1, ausgeloest: 2, eskaliert: 1 },
      ],
    });
    expect(repository.getZeitverlaufStatistik).toHaveBeenCalledWith(expect.objectContaining({ value: einsatzId }));
  });

  it('should return empty buckets when no data', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetZeitverlaufStatistikQuery.create({ einsatzId }).value!;

    const mockStats: ZeitverlaufStatistik = {
      intervalMinutes: 60,
      buckets: [],
    };

    repository.getZeitverlaufStatistik.mockResolvedValue(Result.ok(mockStats));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.intervalMinutes).toBe(60);
    expect(result.value?.buckets).toEqual([]);
  });

  it('should return failure on repository error', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetZeitverlaufStatistikQuery.create({ einsatzId }).value!;

    repository.getZeitverlaufStatistik.mockResolvedValue(Result.fail('Database Error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return failure on invalid einsatzId', async () => {
    // Given
    const invalidQuery = { einsatzId: 'invalid' } as any;

    const spy = jest.spyOn(EinsatzId, 'create').mockReturnValue(Result.fail('Invalid ID'));

    // When
    const result = await handler.execute(invalidQuery);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();

    spy.mockRestore();
  });

  it('should convert Date timestamps to ISO strings', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetZeitverlaufStatistikQuery.create({ einsatzId }).value!;

    const testDate = new Date('2026-02-01T14:30:00.000Z');
    const mockStats: ZeitverlaufStatistik = {
      intervalMinutes: 30,
      buckets: [{ timestamp: testDate, erstellt: 5, ausgeloest: 0, eskaliert: 0 }],
    };

    repository.getZeitverlaufStatistik.mockResolvedValue(Result.ok(mockStats));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.buckets[0].timestamp).toBe('2026-02-01T14:30:00.000Z');
    expect(typeof result.value?.buckets[0].timestamp).toBe('string');
  });
});
