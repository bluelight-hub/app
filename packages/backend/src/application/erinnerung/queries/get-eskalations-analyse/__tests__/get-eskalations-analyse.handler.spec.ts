import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { GetEskalationsAnalyseHandler } from '../get-eskalations-analyse.handler';
import { GetEskalationsAnalyseQuery } from '../get-eskalations-analyse.query';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import type { EskalationsAnalyse } from '@domain/repositories/eskalations-analyse';
import { ERINNERUNG_ERROR_CODES } from '../../../errors/erinnerung-error.codes';

describe('GetEskalationsAnalyseHandler', () => {
  let handler: GetEskalationsAnalyseHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let logger: jest.Mocked<ILogger>;

  const EINSATZ_ID = 'clw3h8x9y000108l6d8888888';
  const USER1_ID = 'clw3h8x9y000108l6d1111111';
  const USER2_ID = 'clw3h8x9y000108l6d2222222';
  const USER3_ID = 'clw3h8x9y000108l6d3333333';
  const ERINNERUNG1_ID = 'clw3h8x9y000108l6daaaaaaa';
  const ERINNERUNG2_ID = 'clw3h8x9y000108l6dbbbbbbbb';

  beforeEach(async () => {
    const repositoryMock = {
      getEskalationsAnalyse: jest.fn(),
    };
    const userRepositoryMock = {
      findById: jest.fn(),
    };
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetEskalationsAnalyseHandler,
        { provide: ERINNERUNG_REPOSITORY, useValue: repositoryMock },
        { provide: USER_REPOSITORY, useValue: userRepositoryMock },
        { provide: LOGGER, useValue: loggerMock },
      ],
    }).compile();

    handler = module.get<GetEskalationsAnalyseHandler>(GetEskalationsAnalyseHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Helper: Erstellt eine vollständige Mock-Analyse */
  function createMockAnalyse(overrides: Partial<EskalationsAnalyse> = {}): EskalationsAnalyse {
    return {
      totalEscalated: 3,
      totalErinnerungen: 20,
      eskalationsRate: 0.15,
      avgZeitBisEskalationSeconds: 272,
      topReceivers: [
        { userId: UserId.create(USER1_ID).value!, count: 2 },
        { userId: UserId.create(USER2_ID).value!, count: 1 },
      ],
      topSources: [
        { userId: UserId.create(USER3_ID).value!, count: 2 },
        { userId: UserId.create(USER1_ID).value!, count: 1 },
      ],
      items: [
        {
          erinnerungId: ErinnerungId.create(ERINNERUNG1_ID).value!,
          titel: 'Lagebesprechung',
          ausgeloestAm: new Date('2026-02-08T14:00:00Z'),
          eskaliertAm: new Date('2026-02-08T14:05:00Z'),
          zeitBisEskalationSeconds: 300,
          eskaliertAnId: UserId.create(USER1_ID).value!,
          previousAssigneeId: UserId.create(USER3_ID).value!,
        },
        {
          erinnerungId: ErinnerungId.create(ERINNERUNG2_ID).value!,
          titel: 'Wasserversorgung prüfen',
          ausgeloestAm: new Date('2026-02-08T15:00:00Z'),
          eskaliertAm: new Date('2026-02-08T15:04:04Z'),
          zeitBisEskalationSeconds: 244,
          eskaliertAnId: UserId.create(USER2_ID).value!,
          previousAssigneeId: null,
        },
      ],
      ...overrides,
    };
  }

  /** Helper: Mock User Resolution */
  function setupUserMocks() {
    userRepository.findById.mockImplementation(async (id) => {
      const idStr = id.toString();
      if (idStr === USER1_ID) return Result.ok({ username: { value: 'Max Müller' } } as any);
      if (idStr === USER2_ID) return Result.ok({ username: { value: 'Anna Schmidt' } } as any);
      if (idStr === USER3_ID) return Result.ok({ username: { value: 'Tim Wolf' } } as any);
      return Result.fail('User not found');
    });
  }

  // --- AC1: Mapping Domain → DTO ---

  it('should return complete eskalations-analyse dto with resolved user names', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const mockAnalyse = createMockAnalyse();
    repository.getEskalationsAnalyse.mockResolvedValue(Result.ok(mockAnalyse));
    setupUserMocks();

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalEscalated).toBe(3);
    expect(dto.totalErinnerungen).toBe(20);
    expect(dto.eskalationsRate).toBe(0.15);
    expect(dto.avgZeitBisEskalationSeconds).toBe(272);

    // Top Receivers mit aufgelösten Namen
    expect(dto.topReceivers).toHaveLength(2);
    expect(dto.topReceivers[0]).toEqual({ userId: USER1_ID, userName: 'Max Müller', count: 2 });
    expect(dto.topReceivers[1]).toEqual({ userId: USER2_ID, userName: 'Anna Schmidt', count: 1 });

    // Top Sources mit aufgelösten Namen
    expect(dto.topSources).toHaveLength(2);
    expect(dto.topSources[0]).toEqual({ userId: USER3_ID, userName: 'Tim Wolf', count: 2 });
    expect(dto.topSources[1]).toEqual({ userId: USER1_ID, userName: 'Max Müller', count: 1 });

    // Items mit aufgelösten Namen
    expect(dto.items).toHaveLength(2);
    expect(dto.items[0]).toEqual({
      erinnerungId: ERINNERUNG1_ID,
      titel: 'Lagebesprechung',
      ausgeloestAm: '2026-02-08T14:00:00.000Z',
      eskaliertAm: '2026-02-08T14:05:00.000Z',
      zeitBisEskalationSeconds: 300,
      eskaliertAn: 'Max Müller',
      previousAssignee: 'Tim Wolf',
    });
    expect(dto.items[1].previousAssignee).toBeNull();
    expect(dto.items[1].eskaliertAn).toBe('Anna Schmidt');
  });

  // --- AC4: Leere Liste ---

  it('should handle empty escalation list (no escalations in einsatz)', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const emptyAnalyse = createMockAnalyse({
      totalEscalated: 0,
      totalErinnerungen: 10,
      eskalationsRate: 0,
      avgZeitBisEskalationSeconds: 0,
      topReceivers: [],
      topSources: [],
      items: [],
    });
    repository.getEskalationsAnalyse.mockResolvedValue(Result.ok(emptyAnalyse));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalEscalated).toBe(0);
    expect(dto.eskalationsRate).toBe(0);
    expect(dto.topReceivers).toEqual([]);
    expect(dto.topSources).toEqual([]);
    expect(dto.items).toEqual([]);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  // --- User Name Resolution ---

  it('should fallback to "Unbekannt" for unresolvable users', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const mockAnalyse = createMockAnalyse();
    repository.getEskalationsAnalyse.mockResolvedValue(Result.ok(mockAnalyse));
    userRepository.findById.mockResolvedValue(Result.fail('User not found'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.topReceivers[0].userName).toBe('Unbekannt');
    expect(dto.topSources[0].userName).toBe('Unbekannt');
    expect(dto.items[0].eskaliertAn).toBe('Unbekannt');
    expect(dto.items[0].previousAssignee).toBe('Unbekannt');
  });

  // --- Rate-Berechnung ---

  it('should pass through eskalationsRate from repository', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const mockAnalyse = createMockAnalyse({ eskalationsRate: 0.333, totalEscalated: 5, totalErinnerungen: 15 });
    repository.getEskalationsAnalyse.mockResolvedValue(Result.ok(mockAnalyse));
    setupUserMocks();

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.value?.eskalationsRate).toBe(0.333);
    expect(result.value?.totalErinnerungen).toBe(15);
  });

  // --- Error Handling ---

  it('should return failure on repository error', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    repository.getEskalationsAnalyse.mockResolvedValue(Result.fail('Database Error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return QUERY_FAILED when repository error is undefined', async () => {
    // Given
    const query = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const failResult = Result.fail('placeholder');
    Object.defineProperty(failResult, 'error', { value: undefined });
    repository.getEskalationsAnalyse.mockResolvedValue(failResult as any);

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

  // --- Query Validation ---

  it('should reject empty einsatzId in query creation', () => {
    const result = GetEskalationsAnalyseQuery.create({ einsatzId: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid einsatzId format in query creation', () => {
    const result = GetEskalationsAnalyseQuery.create({ einsatzId: 'INVALID-FORMAT!' });
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid einsatzId in query creation', () => {
    const result = GetEskalationsAnalyseQuery.create({ einsatzId: EINSATZ_ID });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.einsatzId).toBe(EINSATZ_ID);
  });
});
