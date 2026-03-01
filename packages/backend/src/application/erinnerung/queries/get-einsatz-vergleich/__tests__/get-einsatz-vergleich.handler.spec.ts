import { GetEinsatzVergleichHandler } from '../get-einsatz-vergleich.handler';
import { GetEinsatzVergleichQuery } from '../get-einsatz-vergleich.query';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { EinsatzVergleich } from '@domain/repositories/einsatz-vergleich';

describe('GetEinsatzVergleichHandler', () => {
  let handler: GetEinsatzVergleichHandler;
  let mockRepository: jest.Mocked<IErinnerungRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  const VALID_EINSATZ_ID_1 = 'abcdefghijklmnopqrstuvwx';
  const VALID_EINSATZ_ID_2 = 'zyxwvutsrqponmlkjihgfedc';

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      exists: jest.fn(),
      findOverdue: jest.fn(),
      getStatistik: jest.fn(),
      getPersonStatistik: jest.fn(),
      getZeitverlaufStatistik: jest.fn(),
      getEskalationsAnalyse: jest.fn(),
      getReaktionszeitStatistik: jest.fn(),
      findActiveChildByParentId: jest.fn(),
      getErinnerungenForExport: jest.fn(),
      getFuehrungsrhythmusStatistik: jest.fn(),
      getVergleichsStatistik: jest.fn(),
    } as jest.Mocked<IErinnerungRepository>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    handler = new GetEinsatzVergleichHandler(mockRepository, mockLogger);
  });

  it('should return comparison data for multiple Einsaetze', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1, VALID_EINSATZ_ID_2],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    const mockVergleich: EinsatzVergleich = {
      items: [
        {
          einsatzId: EinsatzId.create(VALID_EINSATZ_ID_1).value!,
          alarmstichwort: 'Brand',
          alarmierungszeit: new Date('2026-01-01T10:00:00Z'),
          erinnerungenProStunde: 5.5,
          eskalationsrate: 12.5,
          durchschnittlicheReaktionszeit: 120,
          gesamtErinnerungen: 22,
          dauer: 4.0,
        },
        {
          einsatzId: EinsatzId.create(VALID_EINSATZ_ID_2).value!,
          alarmstichwort: 'THL',
          alarmierungszeit: new Date('2026-01-02T08:00:00Z'),
          erinnerungenProStunde: 3.2,
          eskalationsrate: 5.0,
          durchschnittlicheReaktionszeit: 60,
          gesamtErinnerungen: 16,
          dauer: 5.0,
        },
      ],
    };

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.ok(mockVergleich));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.items).toHaveLength(2);
    expect(result.value?.items[0].einsatzId).toBe(VALID_EINSATZ_ID_1);
    expect(result.value?.items[0].alarmstichwort).toBe('Brand');
    expect(result.value?.items[1].einsatzId).toBe(VALID_EINSATZ_ID_2);
    expect(mockRepository.getVergleichsStatistik).toHaveBeenCalledTimes(1);
    expect(mockRepository.getVergleichsStatistik).toHaveBeenCalledWith([
      expect.objectContaining({ props: { value: VALID_EINSATZ_ID_1 } }),
      expect.objectContaining({ props: { value: VALID_EINSATZ_ID_2 } }),
    ]);
  });

  it('should return empty items when repository returns empty result', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.ok({ items: [] }));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.items).toHaveLength(0);
    expect(mockRepository.getVergleichsStatistik).toHaveBeenCalledWith([expect.objectContaining({ props: { value: VALID_EINSATZ_ID_1 } })]);
  });

  it('should fail when EinsatzId is invalid', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: ['INVALID-ID!!'],
    });

    // Then
    expect(queryResult.isFailure).toBe(true);
  });

  it('should fail when einsatzIds array is empty', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [],
    });

    // Then
    expect(queryResult.isFailure).toBe(true);
  });

  it('should work with a single Einsatz', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    const mockVergleich: EinsatzVergleich = {
      items: [
        {
          einsatzId: EinsatzId.create(VALID_EINSATZ_ID_1).value!,
          alarmstichwort: 'Brand',
          alarmierungszeit: new Date('2026-01-01T10:00:00Z'),
          erinnerungenProStunde: 5.5,
          eskalationsrate: 0,
          durchschnittlicheReaktionszeit: null,
          gesamtErinnerungen: 11,
          dauer: 2.0,
        },
      ],
    };

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.ok(mockVergleich));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.items).toHaveLength(1);
    expect(result.value?.items[0].gesamtErinnerungen).toBe(11);
    expect(mockRepository.getVergleichsStatistik).toHaveBeenCalledWith([expect.objectContaining({ props: { value: VALID_EINSATZ_ID_1 } })]);
  });

  it('should correctly map Domain to DTO (dates to ISO, null values)', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    const alarmTime = new Date('2026-01-01T10:00:00.000Z');
    const mockVergleich: EinsatzVergleich = {
      items: [
        {
          einsatzId: EinsatzId.create(VALID_EINSATZ_ID_1).value!,
          alarmstichwort: null,
          alarmierungszeit: alarmTime,
          erinnerungenProStunde: 3.14,
          eskalationsrate: 25.55,
          durchschnittlicheReaktionszeit: null,
          gesamtErinnerungen: 8,
          dauer: 2.54,
        },
      ],
    };

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.ok(mockVergleich));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    const item = result.value?.items[0];
    expect(item.alarmstichwort).toBeNull();
    expect(item.alarmierungszeit).toBe('2026-01-01T10:00:00.000Z');
    expect(item.durchschnittlicheReaktionszeit).toBeNull();
    expect(item.erinnerungenProStunde).toBe(3.14);
    expect(item.eskalationsrate).toBe(25.55);
    expect(item.dauer).toBe(2.54);
  });

  it('should handle null alarmierungszeit', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    const mockVergleich: EinsatzVergleich = {
      items: [
        {
          einsatzId: EinsatzId.create(VALID_EINSATZ_ID_1).value!,
          alarmstichwort: 'Test',
          alarmierungszeit: null,
          erinnerungenProStunde: 0,
          eskalationsrate: 0,
          durchschnittlicheReaktionszeit: null,
          gesamtErinnerungen: 0,
          dauer: 0.01,
        },
      ],
    };

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.ok(mockVergleich));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value?.items[0].alarmierungszeit).toBeNull();
  });

  it('should return failure when repository fails', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1],
    });
    expect(queryResult.isSuccess).toBe(true);
    const query = queryResult.value!;

    mockRepository.getVergleichsStatistik.mockResolvedValue(Result.fail('Database error'));

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.isFailure).toBe(true);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should deduplicate einsatzIds in query', async () => {
    // Given
    const queryResult = GetEinsatzVergleichQuery.create({
      einsatzIds: [VALID_EINSATZ_ID_1, VALID_EINSATZ_ID_1, VALID_EINSATZ_ID_2],
    });

    // Then
    expect(queryResult.isSuccess).toBe(true);
    expect(queryResult.value?.einsatzIds).toHaveLength(2);
  });
});
