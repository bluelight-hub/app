import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ReaktionszeitStatistik } from '@domain/repositories/reaktionszeit-statistik';
import { GetReaktionszeitStatistikHandler } from '../get-reaktionszeit-statistik.handler';
import { GetReaktionszeitStatistikQuery } from '../get-reaktionszeit-statistik.query';
import { ERINNERUNG_ERROR_CODES } from '../../../errors/erinnerung-error.codes';

describe('GetReaktionszeitStatistikHandler', () => {
  let handler: GetReaktionszeitStatistikHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let logger: jest.Mocked<ILogger>;

  const EINSATZ_ID = 'clw3h8x9y000108l6d8888888';

  beforeEach(async () => {
    const repositoryMock = {
      getReaktionszeitStatistik: jest.fn(),
    };
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetReaktionszeitStatistikHandler, { provide: ERINNERUNG_REPOSITORY, useValue: repositoryMock }, { provide: LOGGER, useValue: loggerMock }],
    }).compile();

    handler = module.get<GetReaktionszeitStatistikHandler>(GetReaktionszeitStatistikHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Helper: Erstellt eine vollständige Mock-Statistik */
  function createMockStatistik(overrides: Partial<ReaktionszeitStatistik> = {}): ReaktionszeitStatistik {
    return {
      totalAcknowledged: 5,
      avgReaktionszeitSeconds: 83,
      medianReaktionszeitSeconds: 65,
      minReaktionszeitSeconds: 12,
      maxReaktionszeitSeconds: 525,
      buckets: [
        { label: '0-30s', minSeconds: 0, maxSeconds: 30, count: 1 },
        { label: '30s-1m', minSeconds: 30, maxSeconds: 60, count: 1 },
        { label: '1-2m', minSeconds: 60, maxSeconds: 120, count: 2 },
        { label: '2-5m', minSeconds: 120, maxSeconds: 300, count: 0 },
        { label: '5-10m', minSeconds: 300, maxSeconds: 600, count: 1 },
        { label: '>10m', minSeconds: 600, maxSeconds: Number.POSITIVE_INFINITY, count: 0 },
      ],
      ...overrides,
    };
  }

  // --- AC1: Mapping Domain → DTO ---

  it('should return complete reaktionszeit-statistik dto', async () => {
    // Given
    const query = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const mockStatistik = createMockStatistik();
    repository.getReaktionszeitStatistik.mockResolvedValue(Result.ok(mockStatistik));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalAcknowledged).toBe(5);
    expect(dto.avgReaktionszeitSeconds).toBe(83);
    expect(dto.medianReaktionszeitSeconds).toBe(65);
    expect(dto.minReaktionszeitSeconds).toBe(12);
    expect(dto.maxReaktionszeitSeconds).toBe(525);
    expect(dto.buckets).toHaveLength(6);
    expect(dto.buckets[0]).toEqual({ label: '0-30s', minSeconds: 0, maxSeconds: 30, count: 1 });
    expect(dto.buckets[2]).toEqual({ label: '1-2m', minSeconds: 60, maxSeconds: 120, count: 2 });
  });

  // --- AC4: Leere Liste ---

  it('should handle empty acknowledged list (no acknowledged erinnerungen)', async () => {
    // Given
    const query = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const emptyStatistik = createMockStatistik({
      totalAcknowledged: 0,
      avgReaktionszeitSeconds: 0,
      medianReaktionszeitSeconds: 0,
      minReaktionszeitSeconds: 0,
      maxReaktionszeitSeconds: 0,
      buckets: [],
    });
    repository.getReaktionszeitStatistik.mockResolvedValue(Result.ok(emptyStatistik));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalAcknowledged).toBe(0);
    expect(dto.avgReaktionszeitSeconds).toBe(0);
    expect(dto.medianReaktionszeitSeconds).toBe(0);
    expect(dto.minReaktionszeitSeconds).toBe(0);
    expect(dto.maxReaktionszeitSeconds).toBe(0);
    expect(dto.buckets).toEqual([]);
  });

  // --- Edge Case: Einzelne Erinnerung ---

  it('should handle single acknowledged erinnerung where all stats are identical', async () => {
    // Given - eine einzige quittierte Erinnerung mit 45s Reaktionszeit
    const query = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const singleStatistik = createMockStatistik({
      totalAcknowledged: 1,
      avgReaktionszeitSeconds: 45,
      medianReaktionszeitSeconds: 45,
      minReaktionszeitSeconds: 45,
      maxReaktionszeitSeconds: 45,
      buckets: [
        { label: '0-30s', minSeconds: 0, maxSeconds: 30, count: 0 },
        { label: '30s-1m', minSeconds: 30, maxSeconds: 60, count: 1 },
        { label: '1-2m', minSeconds: 60, maxSeconds: 120, count: 0 },
        { label: '2-5m', minSeconds: 120, maxSeconds: 300, count: 0 },
        { label: '5-10m', minSeconds: 300, maxSeconds: 600, count: 0 },
        { label: '>10m', minSeconds: 600, maxSeconds: Number.POSITIVE_INFINITY, count: 0 },
      ],
    });
    repository.getReaktionszeitStatistik.mockResolvedValue(Result.ok(singleStatistik));

    // When
    const result = await handler.execute(query);

    // Then - avg, median, min, max sind alle identisch
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalAcknowledged).toBe(1);
    expect(dto.avgReaktionszeitSeconds).toBe(45);
    expect(dto.medianReaktionszeitSeconds).toBe(45);
    expect(dto.minReaktionszeitSeconds).toBe(45);
    expect(dto.maxReaktionszeitSeconds).toBe(45);
    // Nur ein Bucket hat count=1, alle anderen sind 0
    expect(dto.buckets).toHaveLength(6);
    const nonZeroBuckets = dto.buckets.filter((b) => b.count > 0);
    expect(nonZeroBuckets).toHaveLength(1);
    expect(nonZeroBuckets[0]).toEqual({ label: '30s-1m', minSeconds: 30, maxSeconds: 60, count: 1 });
  });

  // --- Error Handling ---

  it('should return failure on repository error', async () => {
    // Given
    const query = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    repository.getReaktionszeitStatistik.mockResolvedValue(Result.fail('Database Error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return QUERY_FAILED when repository error is undefined', async () => {
    // Given
    const query = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const failResult = Result.fail('placeholder');
    Object.defineProperty(failResult, 'error', { value: undefined });
    repository.getReaktionszeitStatistik.mockResolvedValue(failResult as any);

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
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

  it('should return EINSATZ_ID_INVALID when EinsatzId.create() fails with undefined error', async () => {
    // Given - EinsatzId.create() gibt ein Fail-Result mit undefined error zurück
    const invalidQuery = { einsatzId: 'invalid' } as any;
    const failResult = Result.fail('placeholder');
    Object.defineProperty(failResult, 'error', { value: undefined });
    const spy = jest.spyOn(EinsatzId, 'create').mockReturnValue(failResult as any);

    // When
    const result = await handler.execute(invalidQuery);

    // Then - Fallback auf EINSATZ_ID_INVALID
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    spy.mockRestore();
  });

  // --- Query Validation ---

  it('should reject empty einsatzId in query creation', () => {
    // Given - ein leerer einsatzId String
    // When - Query wird erstellt
    const result = GetReaktionszeitStatistikQuery.create({ einsatzId: '' });
    // Then - Ergebnis ist ein Failure
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid einsatzId format in query creation', () => {
    // Given - ein ungültiges einsatzId Format
    // When - Query wird erstellt
    const result = GetReaktionszeitStatistikQuery.create({ einsatzId: 'INVALID-FORMAT!' });
    // Then - Ergebnis ist ein Failure
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid einsatzId in query creation', () => {
    // Given - eine gültige einsatzId
    // When - Query wird erstellt
    const result = GetReaktionszeitStatistikQuery.create({ einsatzId: EINSATZ_ID });
    // Then - Ergebnis ist ein Success mit korrekter einsatzId
    expect(result.isSuccess).toBe(true);
    expect(result.value?.einsatzId).toBe(EINSATZ_ID);
  });
});
