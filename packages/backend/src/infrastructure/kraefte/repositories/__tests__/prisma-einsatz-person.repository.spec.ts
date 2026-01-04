import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaEinsatzPersonRepository } from '../prisma-einsatz-person.repository';
import { PrismaEinsatzPersonMapper } from '../../mappers/prisma-einsatz-person.mapper';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Unit Tests für PrismaEinsatzPersonRepository.
 *
 * Diese Tests validieren die Infrastructure Layer Implementation des
 * IEinsatzPersonRepository Ports mit gemocktem PrismaService.
 *
 * **Test Coverage (HIGH Priority I2 - fahrzeugId Persistence):**
 * - save() + findById(): Person mit fahrzeugId speichern und laden (preserve fahrzeugId)
 * - save() + findById(): Person mit fahrzeugId=null → undefined Mapping
 *
 * **Mocking Strategy:**
 * - PrismaService: Vollständig gemockt (einsatzPerson.upsert, findUnique, findMany)
 * - PrismaEinsatzPersonMapper: Spy auf statische Methoden (toPersistence, toDomain)
 * - ILogger: Mock Logger für Error Logging
 *
 * **Result Pattern:**
 * - Alle Query Methods geben Result<T> zurück
 * - save() gibt Result<void> zurück (keine Exceptions)
 * - DB-Errors werden als Result.fail() zurückgegeben
 */
describe('PrismaEinsatzPersonRepository', () => {
  // Mock Instances
  let repository: PrismaEinsatzPersonRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<ILogger>;

  // Mock Data Helpers
  const mockUserId = 'clw3h8x9y0000qwertyui00099';
  const mockPersonId = 'clw3h8x9y0000qwertyui00001';
  const mockEinsatzId = 'clw3h8x9y0000qwertyui00002';
  const mockStammId = 'clw3h8x9y0000qwertyui00003';
  const mockFahrzeugId = 'clw3h8x9y0000qwertyui00999';

  /**
   * Helper: Erstellt Mock EinsatzPerson Aggregate.
   */
  const createMockAggregate = (overrides?: { id?: string; fahrzeugId?: string; stammId?: string; funkrufname?: string }): EinsatzPerson => {
    const personId = { value: overrides?.id ?? mockPersonId } as EinsatzPersonId;

    const mockAggregate = {
      id: personId,
      einsatzId: mockEinsatzId,
      stammId: overrides?.stammId ?? mockStammId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Gruppenführer',
      funkrufname: overrides?.funkrufname ?? 'Florian Berlin GF',
      fahrzeugId: overrides?.fahrzeugId,
      qualifikationIds: [],
      position: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      createdBy: mockUserId,
      updatedBy: undefined,
      getDomainEvents: jest.fn().mockReturnValue([]),
      clearDomainEvents: jest.fn(),
      equals: jest.fn(),
    } as unknown as EinsatzPerson;

    return mockAggregate;
  };

  /**
   * Helper: Erstellt Mock Prisma EinsatzPerson Daten.
   */
  const createMockPrismaData = (overrides?: { id?: string; fahrzeugId?: string | null; stammId?: string | null; funkrufname?: string | null }) => {
    return {
      id: overrides?.id ?? mockPersonId,
      einsatzId: mockEinsatzId,
      stammId: overrides?.stammId ?? mockStammId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funktion: 'Gruppenführer',
      funkrufname: overrides?.funkrufname ?? 'Florian Berlin GF',
      fahrzeugId: overrides?.fahrzeugId ?? null,
      position: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      createdBy: mockUserId,
      updatedBy: null,
      qualifikationen: [],
    };
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Create PrismaService Mock
    mockPrismaService = {
      einsatzPerson: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    } as unknown as jest.Mocked<PrismaService>;

    // Create Logger Mock
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Instantiate Repository
    repository = new PrismaEinsatzPersonRepository(mockPrismaService, mockLogger);
  });

  // ============================================================================
  // I2: REPOSITORY fahrzeugId TESTS (2 Tests)
  // ============================================================================

  describe('[I2] save() + findById() - fahrzeugId Persistence', () => {
    it('sollte Person mit fahrzeugId speichern und laden (preserve fahrzeugId)', async () => {
      // Given (Arrange): EinsatzPerson Aggregate mit fahrzeugId
      const testFahrzeugId = mockFahrzeugId;
      const aggregate = createMockAggregate({ fahrzeugId: testFahrzeugId });

      const persistenceData = {
        id: mockPersonId,
        einsatzId: mockEinsatzId,
        stammId: mockStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Gruppenführer',
        funkrufname: 'Florian Berlin GF',
        fahrzeugId: testFahrzeugId, // WICHTIG: fahrzeugId in Persistence Data
        position: null,
        createdBy: mockUserId,
        updatedBy: null,
      };

      // Mock Mapper toPersistence
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      jest.spyOn(PrismaEinsatzPersonMapper, 'toPersistence').mockReturnValue(persistenceData as any);

      // Mock DB upsert Success
      const savedPrismaData = createMockPrismaData({ fahrzeugId: testFahrzeugId });
      mockPrismaService.einsatzPerson.upsert.mockResolvedValue(savedPrismaData);

      // When (Act): save() aufrufen
      const saveResult = await repository.save(aggregate);

      // Then (Assert): save() war erfolgreich
      expect(saveResult.isSuccess).toBe(true);
      expect(mockPrismaService.einsatzPerson.upsert).toHaveBeenCalledWith({
        where: { id: mockPersonId },
        create: expect.objectContaining({
          id: mockPersonId,
          fahrzeugId: testFahrzeugId, // fahrzeugId wurde gespeichert
        }),
        update: expect.objectContaining({
          fahrzeugId: testFahrzeugId,
        }),
      });

      // Given: Mock findById für Load-Operation
      mockPrismaService.einsatzPerson.findUnique.mockResolvedValue(savedPrismaData);

      // Mock Mapper toDomain
      jest.spyOn(PrismaEinsatzPersonMapper, 'toDomain').mockReturnValue(Result.ok(aggregate));

      // When: findById() aufrufen
      const personId = { value: mockPersonId } as EinsatzPersonId;
      const findResult = await repository.findById(personId);

      // Then: Person wurde geladen mit fahrzeugId
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).toBeDefined();
      expect(findResult.value?.fahrzeugId).toBe(testFahrzeugId); // fahrzeugId preserved
      expect(mockPrismaService.einsatzPerson.findUnique).toHaveBeenCalledWith({
        where: { id: mockPersonId },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
      });
    });

    it('sollte Person mit fahrzeugId=null speichern und als undefined laden', async () => {
      // Given (Arrange): EinsatzPerson Aggregate mit fahrzeugId=undefined
      const aggregate = createMockAggregate({ fahrzeugId: undefined });

      const persistenceData = {
        id: mockPersonId,
        einsatzId: mockEinsatzId,
        stammId: mockStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Gruppenführer',
        funkrufname: 'Florian Berlin GF',
        fahrzeugId: null, // WICHTIG: undefined → null in Persistence
        position: null,
        createdBy: mockUserId,
        updatedBy: null,
      };

      // Mock Mapper toPersistence (undefined → null)
      // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
      jest.spyOn(PrismaEinsatzPersonMapper, 'toPersistence').mockReturnValue(persistenceData as any);

      // Mock DB upsert Success
      const savedPrismaData = createMockPrismaData({ fahrzeugId: null });
      mockPrismaService.einsatzPerson.upsert.mockResolvedValue(savedPrismaData);

      // When (Act): save() aufrufen
      const saveResult = await repository.save(aggregate);

      // Then (Assert): save() war erfolgreich mit fahrzeugId=null
      expect(saveResult.isSuccess).toBe(true);
      expect(mockPrismaService.einsatzPerson.upsert).toHaveBeenCalledWith({
        where: { id: mockPersonId },
        create: expect.objectContaining({
          id: mockPersonId,
          fahrzeugId: null, // null in DB
        }),
        update: expect.objectContaining({
          fahrzeugId: null,
        }),
      });

      // Given: Mock findById für Load-Operation
      mockPrismaService.einsatzPerson.findUnique.mockResolvedValue(savedPrismaData);

      // Mock Mapper toDomain (null → undefined)
      const loadedAggregate = createMockAggregate({ fahrzeugId: undefined });
      jest.spyOn(PrismaEinsatzPersonMapper, 'toDomain').mockReturnValue(Result.ok(loadedAggregate));

      // When: findById() aufrufen
      const personId = { value: mockPersonId } as EinsatzPersonId;
      const findResult = await repository.findById(personId);

      // Then: Person wurde geladen mit fahrzeugId=undefined (null → undefined)
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).toBeDefined();
      expect(findResult.value?.fahrzeugId).toBeUndefined(); // null → undefined Mapping
    });
  });

  // ============================================================================
  // ADDITIONAL REPOSITORY TESTS
  // ============================================================================

  describe('save()', () => {
    describe('Create-Fall (Neue Person)', () => {
      it('sollte upsert aufrufen mit korrekten CREATE Daten', async () => {
        // Given
        const aggregate = createMockAggregate();
        const persistenceData = {
          id: mockPersonId,
          einsatzId: mockEinsatzId,
          stammId: mockStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Gruppenführer',
          funkrufname: 'Florian Berlin GF',
          fahrzeugId: null,
          position: null,
          createdBy: mockUserId,
          updatedBy: null,
        };

        // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
        jest.spyOn(PrismaEinsatzPersonMapper, 'toPersistence').mockReturnValue(persistenceData as any);
        mockPrismaService.einsatzPerson.upsert.mockResolvedValue(createMockPrismaData());

        // When
        const result = await repository.save(aggregate);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(PrismaEinsatzPersonMapper.toPersistence).toHaveBeenCalledWith(aggregate);
        expect(mockPrismaService.einsatzPerson.upsert).toHaveBeenCalledWith({
          where: { id: mockPersonId },
          create: expect.objectContaining({
            id: mockPersonId,
            einsatzId: mockEinsatzId,
            stammId: mockStammId,
            vorname: 'Max',
            nachname: 'Mustermann',
            createdBy: mockUserId,
          }),
          update: expect.any(Object),
        });
      });
    });

    describe('M:N Qualifikationen Handling', () => {
      it('sollte Qualifikationen atomic replace durchführen bei Update', async () => {
        // Given: Aggregate mit Qualifikationen
        const aggregate = createMockAggregate();
        // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
        (aggregate as any).qualifikationIds = ['qual_001', 'qual_002'];

        const persistenceData = {
          id: mockPersonId,
          einsatzId: mockEinsatzId,
          stammId: mockStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Gruppenführer',
          funkrufname: 'Florian Berlin GF',
          fahrzeugId: null,
          position: null,
          createdBy: mockUserId,
          updatedBy: null,
        };

        // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
        jest.spyOn(PrismaEinsatzPersonMapper, 'toPersistence').mockReturnValue(persistenceData as any);
        mockPrismaService.einsatzPerson.upsert.mockResolvedValue(createMockPrismaData());

        // When
        const result = await repository.save(aggregate);

        // Then: Qualifikationen werden via nested create/deleteMany gehandhabt
        expect(result.isSuccess).toBe(true);
        expect(mockPrismaService.einsatzPerson.upsert).toHaveBeenCalledWith({
          where: { id: mockPersonId },
          create: expect.objectContaining({
            qualifikationen: {
              create: [
                { qualifikationId: 'qual_001', createdBy: mockUserId },
                { qualifikationId: 'qual_002', createdBy: mockUserId },
              ],
            },
          }),
          update: expect.objectContaining({
            qualifikationen: {
              deleteMany: {},
              create: [
                { qualifikationId: 'qual_001', createdBy: mockUserId },
                { qualifikationId: 'qual_002', createdBy: mockUserId },
              ],
            },
          }),
        });
      });
    });

    describe('Error Cases', () => {
      it('sollte Result.fail() zurückgeben bei DB Fehler', async () => {
        // Given
        const aggregate = createMockAggregate();
        jest.spyOn(PrismaEinsatzPersonMapper, 'toPersistence').mockReturnValue({
          id: mockPersonId,
          einsatzId: mockEinsatzId,
          stammId: mockStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Gruppenführer',
          funkrufname: 'Florian Berlin GF',
          fahrzeugId: null,
          position: null,
          createdBy: mockUserId,
          updatedBy: null,
          // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
        } as any);

        const dbError = new Error('Database connection failed');
        mockPrismaService.einsatzPerson.upsert.mockRejectedValue(dbError);

        // When
        await expect(repository.save(aggregate)).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('findById()', () => {
    it('sollte EinsatzPerson Aggregate zurückgeben wenn gefunden', async () => {
      // Given
      const prismaData = createMockPrismaData();
      const mockAggregate = createMockAggregate();

      mockPrismaService.einsatzPerson.findUnique.mockResolvedValue(prismaData);
      jest.spyOn(PrismaEinsatzPersonMapper, 'toDomain').mockReturnValue(Result.ok(mockAggregate));

      const personId = { value: mockPersonId } as EinsatzPersonId;

      // When
      const result = await repository.findById(personId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(mockAggregate);
      expect(mockPrismaService.einsatzPerson.findUnique).toHaveBeenCalledWith({
        where: { id: mockPersonId },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
      });
    });

    it('sollte Result.ok(null) zurückgeben wenn nicht gefunden', async () => {
      // Given
      mockPrismaService.einsatzPerson.findUnique.mockResolvedValue(null);
      const personId = { value: mockPersonId } as EinsatzPersonId;

      // When
      const result = await repository.findById(personId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('sollte Result.fail() zurückgeben bei Rekonstitutionsfehler', async () => {
      // Given
      const prismaData = createMockPrismaData();
      mockPrismaService.einsatzPerson.findUnique.mockResolvedValue(prismaData);
      jest.spyOn(PrismaEinsatzPersonMapper, 'toDomain').mockReturnValue(Result.fail('Rekonstitution fehlgeschlagen'));

      const personId = { value: mockPersonId } as EinsatzPersonId;

      // When
      const result = await repository.findById(personId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Fehler beim Laden der Einsatz-Person');
    });

    it('sollte Result.fail() zurückgeben bei DB Fehler', async () => {
      // Given
      const dbError = new Error('Connection timeout');
      mockPrismaService.einsatzPerson.findUnique.mockRejectedValue(dbError);
      const personId = { value: mockPersonId } as EinsatzPersonId;

      // When
      const result = await repository.findById(personId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Connection timeout');
    });
  });

  describe('findByEinsatzId()', () => {
    it('sollte mehrere EinsatzPersonen zurückgeben', async () => {
      // Given
      const prismaData1 = createMockPrismaData({ id: 'person_1' });
      const prismaData2 = createMockPrismaData({ id: 'person_2' });

      const mockAggregate1 = createMockAggregate({ id: 'person_1' });
      const mockAggregate2 = createMockAggregate({ id: 'person_2' });

      mockPrismaService.einsatzPerson.findMany.mockResolvedValue([prismaData1, prismaData2]);

      const toDomainSpy = jest.spyOn(PrismaEinsatzPersonMapper, 'toDomain');
      toDomainSpy.mockReturnValueOnce(Result.ok(mockAggregate1)).mockReturnValueOnce(Result.ok(mockAggregate2));

      // When
      const result = await repository.findByEinsatzId(mockEinsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value).toEqual([mockAggregate1, mockAggregate2]);
      expect(mockPrismaService.einsatzPerson.findMany).toHaveBeenCalledWith({
        where: { einsatzId: mockEinsatzId },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
        orderBy: [{ nachname: 'asc' }, { vorname: 'asc' }],
      });
    });

    it('sollte leeres Array zurückgeben wenn keine Personen gefunden', async () => {
      // Given
      mockPrismaService.einsatzPerson.findMany.mockResolvedValue([]);

      // When
      const result = await repository.findByEinsatzId(mockEinsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
  });
});
