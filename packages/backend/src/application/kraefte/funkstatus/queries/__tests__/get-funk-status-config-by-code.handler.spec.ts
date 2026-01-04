import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { GetFunkStatusConfigByCodeHandler } from '../get-funk-status-config-by-code.handler';
import { FUNKSTATUS_VALIDATION_ERRORS } from '@domain/kraefte/constants/funkstatus-validation.constants';

describe('GetFunkStatusConfigByCodeHandler', () => {
  let handler: GetFunkStatusConfigByCodeHandler;
  let mockRepository: {
    findAll: jest.Mock;
    findByCode: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
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

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFunkStatusConfigByCodeHandler,
        {
          provide: KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG,
          useValue: mockRepository,
        },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<GetFunkStatusConfigByCodeHandler>(GetFunkStatusConfigByCodeHandler);
  });

  describe('execute', () => {
    describe('Erfolgreiche Abfragen', () => {
      it('sollte FunkStatusConfig für gültigen Code (0) zurückgeben', async () => {
        // Given
        const config = createMockFunkStatusConfig(0);
        mockRepository.findByCode.mockResolvedValue(Result.ok(config));

        // When
        const result = await handler.execute(0);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value).not.toBeNull();
        expect(result.value!.code).toBe(0);
        expect(result.value!.standardLabel).toBe('Betriebsbereit auf Funk');
        expect(mockRepository.findByCode).toHaveBeenCalledWith(0);
      });

      it('sollte FunkStatusConfig für gültigen Code (9) zurückgeben', async () => {
        // Given
        const config = createMockFunkStatusConfig(9, { customLabel: 'Custom 9' });
        mockRepository.findByCode.mockResolvedValue(Result.ok(config));

        // When
        const result = await handler.execute(9);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.code).toBe(9);
        expect(result.value!.customLabel).toBe('Custom 9');
      });

      it('sollte null zurückgeben wenn Code nicht gefunden wird', async () => {
        // Given
        mockRepository.findByCode.mockResolvedValue(Result.ok(null));

        // When
        const result = await handler.execute(5);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeNull();
      });

      it('sollte displayLabel korrekt setzen (customLabel überschreibt standardLabel)', async () => {
        // Given
        const config = createMockFunkStatusConfig(7, { customLabel: 'Mein Custom Label' });
        mockRepository.findByCode.mockResolvedValue(Result.ok(config));

        // When
        const result = await handler.execute(7);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.displayLabel).toBe('Mein Custom Label');
      });

      it('sollte isEditable für editierbare Codes (7-9) auf true setzen', async () => {
        // Given
        const config = createMockFunkStatusConfig(7);
        mockRepository.findByCode.mockResolvedValue(Result.ok(config));

        // When
        const result = await handler.execute(7);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.isEditable).toBe(true);
      });

      it('sollte isEditable für read-only Codes (0-6) auf false setzen', async () => {
        // Given
        const config = createMockFunkStatusConfig(3);
        mockRepository.findByCode.mockResolvedValue(Result.ok(config));

        // When
        const result = await handler.execute(3);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.isEditable).toBe(false);
      });
    });

    describe('Code Validation', () => {
      it('sollte fehlschlagen bei negativem Code (-1)', async () => {
        // When
        const result = await handler.execute(-1);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(FUNKSTATUS_VALIDATION_ERRORS.CODE_OUT_OF_RANGE);
        expect(mockRepository.findByCode).not.toHaveBeenCalled();
      });

      it('sollte fehlschlagen bei Code > 9 (10)', async () => {
        // When
        const result = await handler.execute(10);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(FUNKSTATUS_VALIDATION_ERRORS.CODE_OUT_OF_RANGE);
        expect(mockRepository.findByCode).not.toHaveBeenCalled();
      });

      it('sollte fehlschlagen bei nicht-integer Code (7.5)', async () => {
        // When
        const result = await handler.execute(7.5);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Code muss eine ganze Zahl sein');
        expect(mockRepository.findByCode).not.toHaveBeenCalled();
      });

      it('sollte fehlschlagen bei NaN', async () => {
        // When
        const result = await handler.execute(Number.NaN);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Code muss eine ganze Zahl sein');
        expect(mockRepository.findByCode).not.toHaveBeenCalled();
      });

      it('sollte fehlschlagen bei Infinity', async () => {
        // When
        const result = await handler.execute(Number.POSITIVE_INFINITY);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Code muss eine ganze Zahl sein');
        expect(mockRepository.findByCode).not.toHaveBeenCalled();
      });
    });

    describe('Fehlerbehandlung', () => {
      it('sollte fehlschlagen wenn Repository-Fehler auftritt', async () => {
        // Given
        const errorMessage = 'Datenbankfehler beim Laden';
        mockRepository.findByCode.mockResolvedValue(Result.fail(errorMessage));

        // When
        const result = await handler.execute(5);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(errorMessage);
      });

      it('sollte Error werfen wenn Repository isFailure ohne error ist', async () => {
        // Given
        mockRepository.findByCode.mockResolvedValue({ isFailure: true, error: null });

        // When/Then
        await expect(handler.execute(5)).rejects.toThrow('Repository returned failure without error message');
      });
    });
  });
});
