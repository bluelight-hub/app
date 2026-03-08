// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { GetFuehrungsrhythmusStatistikHandler } from '../get-fuehrungsrhythmus-statistik.handler';
import { GetFuehrungsrhythmusStatistikQuery } from '../get-fuehrungsrhythmus-statistik.query';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FuehrungsrhythmusStatistik } from '@domain/repositories/fuehrungsrhythmus-statistik';
import { ERINNERUNG_ERROR_CODES } from '../../../errors/erinnerung-error.codes';

describe('GetFuehrungsrhythmusStatistikHandler', () => {
  let handler: GetFuehrungsrhythmusStatistikHandler;
  let repository: jest.Mocked<IErinnerungRepository>;
  let logger: jest.Mocked<ILogger>;

  const EINSATZ_ID = 'clw3h8x9y000108l6d8888888';

  beforeEach(async () => {
    const repositoryMock = {
      getFuehrungsrhythmusStatistik: jest.fn(),
    };
    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetFuehrungsrhythmusStatistikHandler, { provide: ERINNERUNG_REPOSITORY, useValue: repositoryMock }, { provide: LOGGER, useValue: loggerMock }],
    }).compile();

    handler = module.get<GetFuehrungsrhythmusStatistikHandler>(GetFuehrungsrhythmusStatistikHandler);
    repository = module.get(ERINNERUNG_REPOSITORY);
    logger = module.get(LOGGER);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockStatistik(overrides: Partial<FuehrungsrhythmusStatistik> = {}): FuehrungsrhythmusStatistik {
    return {
      activations: [
        {
          activationTimestamp: new Date('2026-02-08T14:00:00Z'),
          reminderCount: 3,
          totalCycles: 12,
          completedParents: 2,
          completionRate: 0.667,
          escalatedCount: 1,
          reminderTypeStats: [
            {
              reminderType: 'Lagebesprechung',
              totalOccurrences: 2,
              snoozeCount: 3,
              snoozeRate: 0.5,
              escalationCount: 1,
              escalationRate: 0.5,
            },
            {
              reminderType: 'Wasserversorgung',
              totalOccurrences: 1,
              snoozeCount: 0,
              snoozeRate: 0,
              escalationCount: 0,
              escalationRate: 0,
            },
          ],
        },
      ],
      totalActivations: 1,
      totalCycles: 12,
      avgCompletionRate: 0.667,
      totalEscalations: 1,
      overallSnoozeRate: 0.333,
      ...overrides,
    };
  }

  it('should return statistics for einsatz with active Fuehrungsrhythmus (AC1)', async () => {
    // Given
    const query = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const mockStatistik = createMockStatistik();
    repository.getFuehrungsrhythmusStatistik.mockResolvedValue(Result.ok(mockStatistik));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalActivations).toBe(1);
    expect(dto.totalCycles).toBe(12);
    expect(dto.avgCompletionRate).toBe(0.667);
    expect(dto.totalEscalations).toBe(1);
    expect(dto.overallSnoozeRate).toBe(0.333);

    // Activation group mapping
    expect(dto.activations).toHaveLength(1);
    expect(dto.activations[0]?.activationTimestamp).toBe('2026-02-08T14:00:00.000Z');
    expect(dto.activations[0]?.reminderCount).toBe(3);
    expect(dto.activations[0]?.totalCycles).toBe(12);
    expect(dto.activations[0]?.completedParents).toBe(2);
    expect(dto.activations[0]?.completionRate).toBe(0.667);
    expect(dto.activations[0]?.escalatedCount).toBe(1);

    // Reminder type stats
    expect(dto.activations[0]?.reminderTypeStats).toHaveLength(2);
    expect(dto.activations[0]?.reminderTypeStats[0]).toEqual({
      reminderType: 'Lagebesprechung',
      totalOccurrences: 2,
      snoozeCount: 3,
      snoozeRate: 0.5,
      escalationCount: 1,
      escalationRate: 0.5,
    });
  });

  it('should return empty statistics when no recurring reminders exist (AC2)', async () => {
    // Given
    const query = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const emptyStatistik = createMockStatistik({
      activations: [],
      totalActivations: 0,
      totalCycles: 0,
      avgCompletionRate: 0,
      totalEscalations: 0,
      overallSnoozeRate: 0,
    });
    repository.getFuehrungsrhythmusStatistik.mockResolvedValue(Result.ok(emptyStatistik));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalActivations).toBe(0);
    expect(dto.activations).toEqual([]);
    expect(dto.totalCycles).toBe(0);
    expect(dto.avgCompletionRate).toBe(0);
  });

  it('should fail with invalid einsatzId (AC1)', async () => {
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

  it('should handle repository error gracefully (AC4)', async () => {
    // Given
    const query = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    repository.getFuehrungsrhythmusStatistik.mockResolvedValue(Result.fail('Database Error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database Error');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return QUERY_FAILED when repository error is undefined', async () => {
    // Given
    const query = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const failResult = Result.fail('placeholder');
    Object.defineProperty(failResult, 'error', { value: undefined });
    repository.getFuehrungsrhythmusStatistik.mockResolvedValue(failResult as any);

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should group multiple activations correctly (AC1)', async () => {
    // Given
    const query = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID }).value!;
    const multiActivation = createMockStatistik({
      activations: [
        {
          activationTimestamp: new Date('2026-02-08T10:00:00Z'),
          reminderCount: 2,
          totalCycles: 6,
          completedParents: 1,
          completionRate: 0.5,
          escalatedCount: 0,
          reminderTypeStats: [{ reminderType: 'Funkcheck', totalOccurrences: 2, snoozeCount: 1, snoozeRate: 0.5, escalationCount: 0, escalationRate: 0 }],
        },
        {
          activationTimestamp: new Date('2026-02-08T14:00:00Z'),
          reminderCount: 3,
          totalCycles: 9,
          completedParents: 3,
          completionRate: 1.0,
          escalatedCount: 0,
          reminderTypeStats: [{ reminderType: 'Lagebesprechung', totalOccurrences: 3, snoozeCount: 0, snoozeRate: 0, escalationCount: 0, escalationRate: 0 }],
        },
      ],
      totalActivations: 2,
      totalCycles: 15,
      avgCompletionRate: 0.75,
      totalEscalations: 0,
      overallSnoozeRate: 0.2,
    });
    repository.getFuehrungsrhythmusStatistik.mockResolvedValue(Result.ok(multiActivation));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const dto = result.value!;
    expect(dto.totalActivations).toBe(2);
    expect(dto.activations).toHaveLength(2);
    expect(dto.activations[0]?.activationTimestamp).toBe('2026-02-08T10:00:00.000Z');
    expect(dto.activations[1]?.activationTimestamp).toBe('2026-02-08T14:00:00.000Z');
    expect(dto.totalCycles).toBe(15);
    expect(dto.avgCompletionRate).toBe(0.75);
  });

  // --- Query Validation ---

  it('should reject empty einsatzId in query creation', () => {
    const result = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid einsatzId format in query creation', () => {
    const result = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: 'INVALID-FORMAT!' });
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid einsatzId in query creation', () => {
    const result = GetFuehrungsrhythmusStatistikQuery.create({ einsatzId: EINSATZ_ID });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.einsatzId).toBe(EINSATZ_ID);
  });
});
