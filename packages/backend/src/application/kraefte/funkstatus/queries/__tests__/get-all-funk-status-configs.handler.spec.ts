import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { GetAllFunkStatusConfigsHandler } from '../get-all-funk-status-configs.handler';

describe('GetAllFunkStatusConfigsHandler', () => {
  let handler: GetAllFunkStatusConfigsHandler;
  let mockRepository: {
    findAll: jest.Mock;
    findByCode: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
  };

  /**
   * Erstellt ein Mock FunkStatusConfig Aggregate für Tests.
   */
  const createMockFunkStatusConfig = (
    code: number,
    overrides: Partial<{
      id: string;
      standardLabel: string;
      customLabel: string;
      farbe: string;
      istAlarmierbar: boolean;
      beschreibung: string;
    }> = {},
  ) => {
    const standardLabels: Record<number, string> = {
      0: 'Betriebsbereit auf Funk',
      1: 'Einsatzbereit über Funk',
      2: 'Einsatzbereit auf Wache',
      3: 'Einsatzübernahme',
      4: 'Ankunft Einsatzstelle',
      5: 'Sprechwunsch',
      6: 'Nicht einsatzbereit',
      7: 'Patient aufgenommen',
      8: 'Ankunft Krankenhaus',
      9: 'Handquittung',
    };

    return FunkStatusConfig.reconstitute({
      id: overrides.id ?? createId(),
      code,
      standardLabel: overrides.standardLabel ?? standardLabels[code] ?? `Status ${code}`,
      customLabel: overrides.customLabel,
      farbe: overrides.farbe ?? '#00AA00',
      istAlarmierbar: overrides.istAlarmierbar ?? false,
      beschreibung: overrides.beschreibung,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'cm1111111111abcdef11111',
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      findAll: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllFunkStatusConfigsHandler,
        {
          provide: KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAllFunkStatusConfigsHandler>(GetAllFunkStatusConfigsHandler);
  });

  describe('execute', () => {
    it('sollte alle FunkStatusConfig Einträge zurückgeben', async () => {
      // Given
      const configs = [createMockFunkStatusConfig(0), createMockFunkStatusConfig(1), createMockFunkStatusConfig(7, { customLabel: 'Custom 7' })];
      mockRepository.findAll.mockResolvedValue(Result.ok(configs));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value![0].code).toBe(0);
      expect(result.value![1].code).toBe(1);
      expect(result.value![2].code).toBe(7);
      expect(result.value![2].customLabel).toBe('Custom 7');
    });

    it('sollte leeres Array zurückgeben wenn keine Einträge existieren', async () => {
      // Given
      mockRepository.findAll.mockResolvedValue(Result.ok([]));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('sollte alle 10 Status (0-9) korrekt mappen', async () => {
      // Given
      const allConfigs = Array.from({ length: 10 }, (_, i) => createMockFunkStatusConfig(i));
      mockRepository.findAll.mockResolvedValue(Result.ok(allConfigs));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(10);

      // Verify all codes are present
      const codes = result.value!.map((dto) => dto.code);
      expect(codes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('sollte displayLabel korrekt setzen (customLabel oder standardLabel)', async () => {
      // Given
      const configs = [
        createMockFunkStatusConfig(7, { customLabel: 'Mein Custom Label' }),
        createMockFunkStatusConfig(8), // Kein customLabel
      ];
      mockRepository.findAll.mockResolvedValue(Result.ok(configs));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].displayLabel).toBe('Mein Custom Label');
      expect(result.value![1].displayLabel).toBe('Ankunft Krankenhaus');
    });

    it('sollte isEditable korrekt setzen (nur Code 7-9)', async () => {
      // Given
      const configs = [createMockFunkStatusConfig(0), createMockFunkStatusConfig(6), createMockFunkStatusConfig(7), createMockFunkStatusConfig(9)];
      mockRepository.findAll.mockResolvedValue(Result.ok(configs));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value![0].isEditable).toBe(false); // Code 0
      expect(result.value![1].isEditable).toBe(false); // Code 6
      expect(result.value![2].isEditable).toBe(true); // Code 7
      expect(result.value![3].isEditable).toBe(true); // Code 9
    });

    it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
      // Given
      const errorMessage = 'Datenbankfehler beim Laden';
      mockRepository.findAll.mockResolvedValue(Result.fail(errorMessage));

      // When
      const result = await handler.execute();

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(errorMessage);
    });

    it('sollte Error werfen wenn Repository isFailure ohne error ist', async () => {
      // Given
      mockRepository.findAll.mockResolvedValue({ isFailure: true, error: null });

      // When/Then
      await expect(handler.execute()).rejects.toThrow('Repository returned failure without error message');
    });
  });
});
