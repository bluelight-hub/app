import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { GetPersonStatistikHandler } from '../get-person-statistik.handler';
import { GetPersonStatistikQuery } from '../get-person-statistik.query';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

describe('GetPersonStatistikHandler', () => {
  let handler: GetPersonStatistikHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    const repositoryMock = {
      getPersonStatistik: jest.fn(),
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
        GetPersonStatistikHandler,
        {
          provide: ERINNERUNG_REPOSITORY,
          useValue: repositoryMock,
        },
        {
          provide: USER_REPOSITORY,
          useValue: userRepositoryMock,
        },
        {
          provide: LOGGER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    handler = module.get<GetPersonStatistikHandler>(GetPersonStatistikHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return person statistics with resolved user names', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;

    const user1Id = UserId.create('clw3h8x9y000108l6d1111111').value!;
    const user2Id = UserId.create('clw3h8x9y000108l6d2222222').value!;

    const mockStats = {
      items: [
        { userId: user1Id, zugewiesen: 5, acknowledged: 3, eskalationen: 1, avgReaktionszeitSeconds: 45.5 },
        { userId: user2Id, zugewiesen: 2, acknowledged: 1, eskalationen: 0, avgReaktionszeitSeconds: null },
      ],
    };

    repository.getPersonStatistik.mockResolvedValue(Result.ok(mockStats));
    userRepository.findById.mockImplementation(async (id) => {
      if (id.equals(user1Id)) {
        return Result.ok({ username: { value: 'Max Mustermann' } } as any);
      }
      if (id.equals(user2Id)) {
        return Result.ok({ username: { value: 'Erika Musterfrau' } } as any);
      }
      return Result.fail('Not found');
    });

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.items).toHaveLength(2);
    expect(result.value!.items[0]).toEqual({
      userId: user1Id.toString(),
      userName: 'Max Mustermann',
      zugewiesen: 5,
      acknowledged: 3,
      eskalationen: 1,
      avgReaktionszeitSeconds: 45.5,
    });
    expect(result.value!.items[1]).toEqual({
      userId: user2Id.toString(),
      userName: 'Erika Musterfrau',
      zugewiesen: 2,
      acknowledged: 1,
      eskalationen: 0,
      avgReaktionszeitSeconds: null,
    });
    expect(userRepository.findById).toHaveBeenCalledTimes(2);
  });

  it('should return empty items list when no persons found', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;

    repository.getPersonStatistik.mockResolvedValue(Result.ok({ items: [] }));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.items).toHaveLength(0);
  });

  it('should handle missing users gracefully with "Unbekannt"', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;
    const userId = UserId.create('clw3h8x9y000108l6d1111111').value!;

    repository.getPersonStatistik.mockResolvedValue(Result.ok({ items: [{ userId, zugewiesen: 1, acknowledged: 0, eskalationen: 0, avgReaktionszeitSeconds: null }] }));
    userRepository.findById.mockResolvedValue(Result.fail('User not found'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.items[0].userName).toBe('Unbekannt');
  });

  it('should return failure on repository error', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;

    repository.getPersonStatistik.mockResolvedValue(Result.fail('Database Error'));

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
    expect(repository.getPersonStatistik).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should include persons with all zero values (AC2)', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;
    const user1Id = UserId.create('clw3h8x9y000108l6d1111111').value!;

    repository.getPersonStatistik.mockResolvedValue(Result.ok({ items: [{ userId: user1Id, zugewiesen: 0, acknowledged: 0, eskalationen: 0, avgReaktionszeitSeconds: null }] }));
    userRepository.findById.mockResolvedValue(Result.ok({ username: { value: 'Inaktiver User' } } as any));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.items).toHaveLength(1);
    expect(result.value!.items[0]).toEqual({
      userId: user1Id.toString(),
      userName: 'Inaktiver User',
      zugewiesen: 0,
      acknowledged: 0,
      eskalationen: 0,
      avgReaktionszeitSeconds: null,
    });
  });

  it('should preserve null avgReaktionszeitSeconds for persons without acknowledges', async () => {
    // Given
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetPersonStatistikQuery.create({ einsatzId }).value!;
    const userId = UserId.create('clw3h8x9y000108l6d1111111').value!;

    repository.getPersonStatistik.mockResolvedValue(Result.ok({ items: [{ userId, zugewiesen: 3, acknowledged: 0, eskalationen: 0, avgReaktionszeitSeconds: null }] }));
    userRepository.findById.mockResolvedValue(Result.ok({ username: { value: 'Test User' } } as any));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.items[0].avgReaktionszeitSeconds).toBeNull();
  });
});
