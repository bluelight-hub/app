// @ts-nocheck
import { Result } from '@domain/common/result';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GetTaktischeStaerkeHandler } from '../get-taktische-staerke.handler';
import { GetTaktischeStaerkeQuery } from '../get-taktische-staerke.query';

// Gültige CUID2 IDs für Tests (Generator: @paralleldrive/cuid2)
const VALID_CUID_1 = 'z3h5idy36i9aqgkh7st81q57';
const VALID_CUID_2 = 'y0k4xvqhkidfhdhvtqey3lik';
const VALID_CUID_3 = 'xfohqq7skz5muyqialxel8ic';

describe('GetTaktischeStaerkeHandler', () => {
  let handler: GetTaktischeStaerkeHandler;
  let mockPersonRepository: jest.Mocked<IEinsatzPersonRepository>;
  let mockQualifikationRepository: jest.Mocked<IQualifikationRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Erstellt einen Mock für EinsatzPerson Aggregate.
   */
  const createMockPerson = (overrides: Partial<{ funktion: string; qualifikationIds: string[] }> = {}): EinsatzPerson => {
    return {
      funktion: 'Helfer',
      qualifikationIds: [],
      ...overrides,
    } as unknown as EinsatzPerson;
  };

  /**
   * Erstellt einen Mock für Qualifikation Aggregate.
   */
  const createMockQualifikation = (id: string, name: string): Qualifikation => {
    return {
      id: { value: id },
      name,
    } as unknown as Qualifikation;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPersonRepository = {
      findByEinsatzId: jest.fn(),
      findById: jest.fn(),
      findByFahrzeugId: jest.fn(),
      save: jest.fn(),
      existsByEinsatzIdAndStammId: jest.fn(),
    } as unknown as jest.Mocked<IEinsatzPersonRepository>;

    mockQualifikationRepository = {
      findByIds: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByAbkuerzung: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      existsMany: jest.fn(),
    } as unknown as jest.Mocked<IQualifikationRepository>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    handler = new GetTaktischeStaerkeHandler(mockPersonRepository, mockQualifikationRepository, mockLogger);
  });

  describe('AC1: Stärke-Berechnung', () => {
    it('should calculate 3/1/8/12 for mixed personnel', async () => {
      // Given: 3 Führung, 1 Unterführung, 8 Mannschaft
      const persons = [
        // Führung (3)
        createMockPerson({ funktion: 'Einsatzleiter' }),
        createMockPerson({ funktion: 'LNA' }),
        createMockPerson({ funktion: 'OrgL' }),
        // Unterführung (1)
        createMockPerson({ funktion: 'Gruppenführer' }),
        // Mannschaft (8)
        createMockPerson({ funktion: 'Helfer' }),
        createMockPerson({ funktion: 'Sanitäter' }),
        createMockPerson({ funktion: 'Rettungshelfer' }),
        createMockPerson({ funktion: 'Rettungssanitäter' }),
        createMockPerson({ funktion: 'Helfer' }),
        createMockPerson({ funktion: 'Helfer' }),
        createMockPerson({ funktion: 'Helfer' }),
        createMockPerson({ funktion: 'Helfer' }),
      ];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');
      expect(queryResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        fuehrung: 3,
        unterfuehrung: 1,
        mannschaft: 8,
        gesamt: 12,
      });
    });

    it('should recognize Zugführer as Führung', async () => {
      // Given
      const persons = [createMockPerson({ funktion: 'Zugführer' })];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fuehrung).toBe(1);
      expect(result.value?.unterfuehrung).toBe(0);
    });

    it('should recognize Truppführer as Unterführung', async () => {
      // Given
      const persons = [createMockPerson({ funktion: 'Truppführer' })];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.unterfuehrung).toBe(1);
      expect(result.value?.mannschaft).toBe(0);
    });

    it('should recognize GF (abbreviation) as Unterführung', async () => {
      // Given
      const persons = [createMockPerson({ funktion: 'GF' })];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.unterfuehrung).toBe(1);
    });
  });

  describe('AC1b: Empty State', () => {
    it('should return 0/0/0/0 when no persons exist', async () => {
      // Given
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 0,
        gesamt: 0,
      });
    });

    it('should return 0/0/0/0 when findByEinsatzId returns null-like result', async () => {
      // Given
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(undefined as unknown as EinsatzPerson[]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 0,
        gesamt: 0,
      });
    });
  });

  describe('AC4: Funktion > Qualifikation Priority', () => {
    it('should count Gruppenführer as Unterführung despite Sanitäter qualification', async () => {
      // Given: Person mit Gruppenführer Funktion aber Sanitäter Qualifikation
      const qualifikationId = VALID_CUID_1;
      const persons = [createMockPerson({ funktion: 'Gruppenführer', qualifikationIds: [qualifikationId] })];
      const qualifikationen = [createMockQualifikation(qualifikationId, 'Rettungssanitäter')];

      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok(qualifikationen));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.unterfuehrung).toBe(1); // Funktion hat Priorität
      expect(result.value?.mannschaft).toBe(0);
      expect(result.value?.fuehrung).toBe(0);
    });

    it('should count Einsatzleiter as Führung even without qualification', async () => {
      // Given: Person als Einsatzleiter ohne Qualifikation
      const persons = [createMockPerson({ funktion: 'Einsatzleiter', qualifikationIds: [] })];

      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fuehrung).toBe(1);
    });
  });

  describe('AC5: Arzt → Führung', () => {
    it('should count person with Arzt qualification as Führung', async () => {
      // Given: Person mit Helfer Funktion aber Arzt Qualifikation
      const qualifikationId = VALID_CUID_1;
      const persons = [createMockPerson({ funktion: 'Helfer', qualifikationIds: [qualifikationId] })];
      const qualifikationen = [createMockQualifikation(qualifikationId, 'Arzt')];

      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok(qualifikationen));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fuehrung).toBe(1);
      expect(result.value?.mannschaft).toBe(0);
    });

    it('should count person with Notarzt qualification as Führung', async () => {
      // Given
      const qualifikationId = VALID_CUID_2;
      const persons = [createMockPerson({ funktion: 'Sanitäter', qualifikationIds: [qualifikationId] })];
      const qualifikationen = [createMockQualifikation(qualifikationId, 'Notarzt')];

      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok(qualifikationen));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fuehrung).toBe(1);
    });

    it('should NOT count Arzt qualification if person is already Unterführung by function', async () => {
      // Given: Gruppenführer mit Arzt Qualifikation
      // Funktion hat Priorität → bleibt Unterführung (NICHT Führung)
      const qualifikationId = VALID_CUID_3;
      const persons = [createMockPerson({ funktion: 'Gruppenführer', qualifikationIds: [qualifikationId] })];
      const qualifikationen = [createMockQualifikation(qualifikationId, 'Arzt')];

      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok(qualifikationen));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.unterfuehrung).toBe(1); // Funktion hat Priorität!
      expect(result.value?.fuehrung).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return failure when person repository fails', async () => {
      // Given
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.fail('DB Error'));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB Error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle qualifikation repository failure gracefully', async () => {
      // Given: Persons loaded, but qualifikation lookup fails
      const persons = [createMockPerson({ funktion: 'Helfer', qualifikationIds: [VALID_CUID_1] })];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.fail('Qualifikation lookup failed'));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then: Should still succeed, just without qualification names
      expect(result.isSuccess).toBe(true);
      expect(result.value?.mannschaft).toBe(1); // Categorized as Mannschaft (no Arzt match)
    });
  });

  describe('Case Insensitive Matching', () => {
    it('should match function names case-insensitively', async () => {
      // Given
      const persons = [createMockPerson({ funktion: 'EINSATZLEITER' }), createMockPerson({ funktion: 'gruppenführer' }), createMockPerson({ funktion: 'Lna' })];
      mockPersonRepository.findByEinsatzId.mockResolvedValue(Result.ok(persons));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));

      const queryResult = GetTaktischeStaerkeQuery.create('test-einsatz-123');

      // When
      const result = await handler.execute(queryResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.fuehrung).toBe(2); // EINSATZLEITER + Lna
      expect(result.value?.unterfuehrung).toBe(1); // gruppenführer
    });
  });
});
