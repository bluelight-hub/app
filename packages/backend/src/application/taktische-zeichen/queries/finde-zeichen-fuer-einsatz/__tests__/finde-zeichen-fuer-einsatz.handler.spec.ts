// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { FindeZeichenFuerEinsatzHandler } from '../finde-zeichen-fuer-einsatz.handler';
import { FindeZeichenFuerEinsatzQuery } from '../finde-zeichen-fuer-einsatz.query';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { TaktischesZeichenResponseFactory } from '../../../factories/taktisches-zeichen-response.factory';
import { Result } from '@domain/common/result';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

/**
 * Unit Tests für FindeZeichenFuerEinsatzHandler.
 *
 * Testet die Query-Orchestrierung gemäß AAA-Pattern.
 * Nutzt Mock Repositories für Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Happy Path: Zeichen-Liste erfolgreich laden
 * - Leere Liste: Kein Zeichen für Einsatz
 * - Error Handling: Repository-Fehler
 * - Query Validation: Pflichtfelder prüfen
 */
describe('FindeZeichenFuerEinsatzHandler', () => {
  let handler: FindeZeichenFuerEinsatzHandler;
  let mockRepository: jest.Mocked<ITaktischesZeichenRepository>;

  const VALID_EINSATZ_ID = 'clw3h8x9y0000qwertyuiopas';
  const VALID_USER_ID = 'clw3h8x9y0001qwertyuiopas';

  /**
   * Erstellt ein TaktischesZeichen-Aggregate für Tests.
   */
  const createTestZeichen = (einsatzId = VALID_EINSATZ_ID) => {
    const definition = ZeichenDefinition.create({ grundzeichen: 'kraftfahrzeug-gelaendegaengig' }).value!;
    return TaktischesZeichen.create({
      einsatzId,
      zeichenDefinition: definition,
      createdBy: VALID_USER_ID,
      istAusKatalog: false,
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
      findByLagekarteId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ITaktischesZeichenRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FindeZeichenFuerEinsatzHandler, TaktischesZeichenResponseFactory, { provide: TAKTISCHE_ZEICHEN_REPOSITORY, useValue: mockRepository }],
    }).compile();

    handler = module.get<FindeZeichenFuerEinsatzHandler>(FindeZeichenFuerEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return empty list when no zeichen exist', async () => {
      // Given
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId: VALID_EINSATZ_ID });
      const query = queryResult.value!;

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(VALID_EINSATZ_ID);
    });

    it('should return mapped DTOs for existing zeichen', async () => {
      // Given
      const zeichen1 = createTestZeichen();
      const zeichen2 = createTestZeichen();
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([zeichen1, zeichen2]));
      const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId: VALID_EINSATZ_ID });
      const query = queryResult.value!;

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value?.[0].einsatzId).toBe(VALID_EINSATZ_ID);
      expect(result.value?.[0].zeichenDefinition.grundzeichen).toBe('kraftfahrzeug-gelaendegaengig');
    });

    it('should return single zeichen DTO with correct fields', async () => {
      // Given
      const zeichen = createTestZeichen();
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([zeichen]));
      const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId: VALID_EINSATZ_ID });
      const query = queryResult.value!;

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      const dto = result.value?.[0];
      expect(dto?.id).toBeDefined();
      expect(dto?.einsatzId).toBe(VALID_EINSATZ_ID);
      expect(dto?.istPlatziert).toBe(false);
      expect(dto?.istAusKatalog).toBe(false);
      expect(dto?.createdAt).toBeDefined();
      expect(dto?.updatedAt).toBeDefined();
    });

    it('should fail when repository returns failure', async () => {
      // Given
      mockRepository.findByEinsatzId.mockResolvedValue(Result.fail('DB_ERROR'));
      const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId: VALID_EINSATZ_ID });
      const query = queryResult.value!;

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB_ERROR');
    });

    it('should pass einsatzId to repository', async () => {
      // Given
      const otherEinsatzId = 'clw3h8x9y0099qwertyuiopas';
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId: otherEinsatzId });
      const query = queryResult.value!;

      // When
      await handler.execute(query);

      // Then
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(otherEinsatzId);
    });
  });

  describe('Query Validation', () => {
    it('should fail when einsatzId is empty', () => {
      // Given & When
      const result = FindeZeichenFuerEinsatzQuery.create({ einsatzId: '' });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EINSATZ_ID_REQUIRED');
    });

    it('should fail when einsatzId is whitespace only', () => {
      // Given & When
      const result = FindeZeichenFuerEinsatzQuery.create({ einsatzId: '   ' });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EINSATZ_ID_REQUIRED');
    });

    it('should trim einsatzId whitespace', () => {
      // Given & When
      const result = FindeZeichenFuerEinsatzQuery.create({ einsatzId: '  clw3h8x9y0000qwertyuiopas  ' });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe('clw3h8x9y0000qwertyuiopas');
    });
  });
});
