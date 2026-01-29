import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { GetErinnerungStatistikHandler } from '../get-erinnerung-statistik.handler';
import { GetErinnerungStatistikQuery } from '../get-erinnerung-statistik.query';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

describe('GetErinnerungStatistikHandler', () => {
  let handler: GetErinnerungStatistikHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    const repositoryMock = {
      getStatistik: jest.fn(),
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
        GetErinnerungStatistikHandler,
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

    handler = module.get<GetErinnerungStatistikHandler>(GetErinnerungStatistikHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return statistics dto on success with resolved names', async () => {
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetErinnerungStatistikQuery.create({ einsatzId }).value!;

    const user1Id = UserId.create('clw3h8x9y000108l6d1111111').value!;
    const user2Id = UserId.create('clw3h8x9y000108l6d2222222').value!;

    const mockStats = {
      totalEscalated: 5,
      avgEscalationTimeSeconds: 120.5,
      topReceivers: [
        { userId: user1Id, count: 3 },
        { userId: user2Id, count: 2 },
      ],
    };

    repository.getStatistik.mockResolvedValue(Result.ok(mockStats));

    // Mock User Resolution
    userRepository.findById.mockImplementation(async (id) => {
      if (id.equals(user1Id)) {
        return Result.ok({ username: { value: 'Max Mustermann' } } as any);
      }
      if (id.equals(user2Id)) {
        return Result.ok({ username: { value: 'Erika Musterfrau' } } as any);
      }
      return Result.fail('Not found');
    });

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      totalEscalated: 5,
      avgEscalationTimeSeconds: 120.5,
      topReceivers: [
        { userId: user1Id.toString(), userName: 'Max Mustermann', count: 3 },
        { userId: user2Id.toString(), userName: 'Erika Musterfrau', count: 2 },
      ],
    });
    expect(repository.getStatistik).toHaveBeenCalledWith(expect.objectContaining({ value: einsatzId }));
    expect(userRepository.findById).toHaveBeenCalledTimes(2);
  });

  it('should handle missing users gracefully', async () => {
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetErinnerungStatistikQuery.create({ einsatzId }).value!;
    const user1Id = UserId.create('clw3h8x9y000108l6d1111111').value!;

    const mockStats = {
      totalEscalated: 1,
      avgEscalationTimeSeconds: 60,
      topReceivers: [{ userId: user1Id, count: 1 }],
    };

    repository.getStatistik.mockResolvedValue(Result.ok(mockStats));
    userRepository.findById.mockResolvedValue(Result.fail('User not found'));

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value?.topReceivers[0].userName).toBe('Unbekannt');
  });

  it('should return failure on repository error', async () => {
    const einsatzId = 'clw3h8x9y000108l6d8888888';
    const query = GetErinnerungStatistikQuery.create({ einsatzId }).value!;

    repository.getStatistik.mockResolvedValue(Result.fail('Database Error'));

    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return failure on invalid einsatzId', async () => {
    const invalidQuery = { einsatzId: 'invalid' } as any;

    const spy = jest.spyOn(EinsatzId, 'create').mockReturnValue(Result.fail('Invalid ID'));

    const result = await handler.execute(invalidQuery);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();

    spy.mockRestore();
  });
});
