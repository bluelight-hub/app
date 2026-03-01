import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';
import { FindAllRollenBesetzungQueryHandler } from '../find-all-rollen-besetzung.handler';
import { FindAllRollenBesetzungQuery } from '../find-all-rollen-besetzung.query';

/**
 * Unit Tests für FindAllRollenBesetzungQueryHandler.
 *
 * Diese Tests validieren das Query-Handler-Verhalten für das Laden
 * aller aktiven RollenBesetzungen eines Einsatzes.
 *
 * @see Story TD1.1 - Query Handler Tests für RollenBesetzung
 */
describe('FindAllRollenBesetzungQueryHandler', () => {
  let handler: FindAllRollenBesetzungQueryHandler;
  let mockRepository: jest.Mocked<IRollenBesetzungRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test Data - Deterministic fixtures
  const validEinsatzId = createId();

  /**
   * Erstellt einen Mock-Logger mit allen ILogger-Methoden.
   */
  const createMockLogger = (): jest.Mocked<ILogger> => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  /**
   * Erstellt ein Mock-Repository mit allen IRollenBesetzungRepository-Methoden.
   */
  const createMockRepository = (): jest.Mocked<IRollenBesetzungRepository> => ({
    findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
    findById: jest.fn().mockResolvedValue(Result.ok(null)),
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findByEinsatzIdAndRolleId: jest.fn().mockResolvedValue(Result.ok(null)),
    delete: jest.fn().mockResolvedValue(Result.ok(undefined)),
  });

  /**
   * Factory für Test-RollenBesetzung Aggregates.
   *
   * Verwendet RollenBesetzung.reconstitute() für korrekte Domain-Objekte.
   */
  const createTestRollenBesetzung = (
    overrides: Partial<{
      id: string;
      einsatzId: string;
      rollenName: string;
      personVorname: string;
      personNachname: string;
      freigegebenAm: Date | undefined;
    }> = {},
  ): RollenBesetzung => {
    const result = RollenBesetzung.reconstitute({
      id: RollenBesetzungId.create(overrides.id ?? createId()).value!,
      einsatzId: EinsatzId.create(overrides.einsatzId ?? validEinsatzId).value!,
      rolleId: RolleId.create(createId()).value!,
      einsatzPersonId: EinsatzPersonId.create(createId()).value!,
      rollenName: overrides.rollenName ?? 'Einsatzleiter',
      personVorname: overrides.personVorname ?? 'Max',
      personNachname: overrides.personNachname ?? 'Mustermann',
      createdAt: new Date(),
      createdBy: 'test-user-id',
      updatedAt: new Date(),
      updatedBy: undefined,
      freigegebenAm: overrides.freigegebenAm,
      freigegebenVon: undefined,
    });

    if (result.isFailure) {
      throw new Error(`Test setup failed: ${result.error}`);
    }
    return result.value!;
  };

  beforeEach(() => {
    // AC6: Clear mocks in beforeEach
    jest.clearAllMocks();

    mockRepository = createMockRepository();
    mockLogger = createMockLogger();

    // Direct instantiation ohne NestJS DI (simpler für Query Handler)
    handler = new FindAllRollenBesetzungQueryHandler(mockRepository, mockLogger);
  });

  // ==========================================
  // AC1: Success Cases
  // ==========================================
  describe('execute - Success Cases (AC1)', () => {
    it('should return mapped DTOs when repository returns active RollenBesetzungen', async () => {
      // Given (Arrange)
      const testBesetzung = createTestRollenBesetzung({
        personVorname: 'Anna',
        personNachname: 'Schmidt',
        rollenName: 'LNA',
      });
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testBesetzung]));

      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value?.[0].personName).toBe('Anna Schmidt');
      expect(result.value?.[0].rollenName).toBe('LNA');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return empty array when repository returns empty list', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([]));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // AC2: Error Cases
  // ==========================================
  describe('execute - Error Cases (AC2)', () => {
    it('should return Result.fail and log error when repository returns failure', async () => {
      // Given (Arrange)
      mockRepository.findByEinsatzId.mockResolvedValue(Result.fail('Database connection error'));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database connection error'), 'FindAllRollenBesetzungQueryHandler');
    });

    it('should handle null result from repository with nullish coalescing', async () => {
      // Given (Arrange)
      // Repository gibt Result.ok(null) zurück - edge case
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok(null as unknown as RollenBesetzung[]));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // AC3: DTO Mapping Cases
  // ==========================================
  describe('execute - DTO Mapping (AC3)', () => {
    it('should correctly concatenate personVorname and personNachname to personName', async () => {
      // Given (Arrange)
      const testBesetzung = createTestRollenBesetzung({
        personVorname: 'Hans',
        personNachname: 'Müller',
      });
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testBesetzung]));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.[0].personName).toBe('Hans Müller');
    });

    it('should map all required DTO fields from domain aggregate', async () => {
      // Given (Arrange)
      const testBesetzung = createTestRollenBesetzung({
        rollenName: 'Organisatorischer Leiter',
      });
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testBesetzung]));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const dto = result.value?.[0];

      // Alle Pflichtfelder prüfen
      expect(dto.id).toBe(testBesetzung.id.value);
      expect(dto.rollenName).toBe('Organisatorischer Leiter');
      expect(dto.personName).toBe(`${testBesetzung.personVorname} ${testBesetzung.personNachname}`);
      expect(dto.rollenDefinitionId).toBe(testBesetzung.rolleId.value);
      expect(dto.einsatzPersonId).toBe(testBesetzung.einsatzPersonId.value);
    });

    it('should map multiple RollenBesetzungen correctly', async () => {
      // Given (Arrange)
      const besetzung1 = createTestRollenBesetzung({
        personVorname: 'Anna',
        personNachname: 'Schmidt',
        rollenName: 'LNA',
      });
      const besetzung2 = createTestRollenBesetzung({
        personVorname: 'Peter',
        personNachname: 'Weber',
        rollenName: 'OrgL',
      });
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([besetzung1, besetzung2]));
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      const result = await handler.execute(query);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value?.[0].personName).toBe('Anna Schmidt');
      expect(result.value?.[0].rollenName).toBe('LNA');
      expect(result.value?.[1].personName).toBe('Peter Weber');
      expect(result.value?.[1].rollenName).toBe('OrgL');
    });
  });

  // ==========================================
  // Repository Interaction
  // ==========================================
  describe('Repository Interaction', () => {
    it('should call repository.findByEinsatzId with correct einsatzId', async () => {
      // Given (Arrange)
      const query = FindAllRollenBesetzungQuery.create(validEinsatzId).value!;

      // When (Act)
      await handler.execute(query);

      // Then (Assert)
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith(expect.objectContaining({ value: validEinsatzId }));
    });
  });
});
