/**
 * Unit Tests für GetQualifikationMappingsHandler.
 *
 * Testet das Laden von Qualifikations-Mappings für eine externe Quelle.
 *
 * @module application/integrations/queries/get-qualifikation-mappings/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES } from '@domain/integrations';
import type { QualifikationMapping } from '@domain/integrations/entities/qualifikation-mapping.entity';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { GetQualifikationMappingsHandler } from '../get-qualifikation-mappings.handler';
import { GetQualifikationMappingsQuery } from '../get-qualifikation-mappings.query';

describe('GetQualifikationMappingsHandler', () => {
  let handler: GetQualifikationMappingsHandler;
  let mockMappingRepository: jest.Mocked<IQualifikationMappingRepository>;
  let mockQualifikationRepository: jest.Mocked<IQualifikationRepository>;

  // Test fixtures - CUID2 Format für alle IDs
  const testQualifikationId1 = 'clqual12345678901234567';
  const testQualifikationId2 = 'clqual98765432109876543';

  const createMockMapping = (overrides?: Partial<QualifikationMapping>): QualifikationMapping =>
    ({
      id: 'mapping-id-123',
      externalName: 'Gruppenführer',
      externalSource: INTEGRATION_TYPES.HIORG_SERVER,
      qualifikationId: null,
      isAutoMatched: false,
      confidence: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      createdBy: null,
      updatedBy: null,
      ...overrides,
    }) as QualifikationMapping;

  const createMockQualifikation = (id: string, name: string, abkuerzung: string): Qualifikation =>
    ({
      id: { value: id } as QualifikationId,
      name,
      abkuerzung,
    }) as Qualifikation;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMappingRepository = {
      findByExternalSource: jest.fn(),
      findUnmapped: jest.fn(),
      findByExternalName: jest.fn(),
      findById: jest.fn(),
      findByQualifikationId: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      deleteBySource: jest.fn(),
      count: jest.fn(),
    };

    mockQualifikationRepository = {
      findByIds: jest.fn(),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      existsMany: jest.fn(),
      save: jest.fn(),
    };

    handler = new GetQualifikationMappingsHandler(mockMappingRepository, mockQualifikationRepository);
  });

  describe('execute', () => {
    it('should return all mappings when onlyUnmapped is false', async () => {
      // Given: Query ohne onlyUnmapped Filter
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({ id: 'mapping-1', externalName: 'Gruppenführer', qualifikationId: testQualifikationId1 }),
        createMockMapping({ id: 'mapping-2', externalName: 'Rettungssanitäter', qualifikationId: null }),
        createMockMapping({ id: 'mapping-3', externalName: 'Notarzt', qualifikationId: testQualifikationId2 }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(
        Result.ok([createMockQualifikation(testQualifikationId1, 'Gruppenführer', 'GrFü'), createMockQualifikation(testQualifikationId2, 'Notarzt', 'NA')]),
      );
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 3, mapped: 2, unmapped: 1 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.mappings).toHaveLength(3);
      expect(mockMappingRepository.findByExternalSource).toHaveBeenCalledWith(INTEGRATION_TYPES.HIORG_SERVER);
      expect(mockMappingRepository.findUnmapped).not.toHaveBeenCalled();
    });

    it('should return only unmapped when onlyUnmapped is true', async () => {
      // Given: Query mit onlyUnmapped=true
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: true,
      }).value!;

      const unmappedMappings = [createMockMapping({ id: 'mapping-2', externalName: 'Rettungssanitäter', qualifikationId: null })];

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok(unmappedMappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 3, mapped: 2, unmapped: 1 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.mappings).toHaveLength(1);
      expect(result.value?.mappings[0].externalName).toBe('Rettungssanitäter');
      expect(result.value?.mappings[0].qualifikationId).toBeNull();
      expect(mockMappingRepository.findUnmapped).toHaveBeenCalledWith(INTEGRATION_TYPES.HIORG_SERVER);
      expect(mockMappingRepository.findByExternalSource).not.toHaveBeenCalled();
    });

    it('should enrich mappings with qualifikation details (name, shortName)', async () => {
      // Given: Gemappte Einträge mit Qualifikation-Details
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({
          id: 'mapping-1',
          externalName: 'Gruppenführer (HiOrg)',
          qualifikationId: testQualifikationId1,
          isAutoMatched: true,
          confidence: 95,
        }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([createMockQualifikation(testQualifikationId1, 'Gruppenführer', 'GrFü')]));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 1, mapped: 1, unmapped: 0 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      const mapping = result.value?.mappings[0];
      expect(mapping.qualifikationId).toBe(testQualifikationId1);
      expect(mapping.qualifikationName).toBe('Gruppenführer');
      expect(mapping.qualifikationAbkuerzung).toBe('GrFü');
      expect(mapping.isAutoMatched).toBe(true);
      expect(mapping.confidence).toBe(95);
    });

    it('should handle empty result correctly', async () => {
      // Given: Keine Mappings vorhanden
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok([]));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 0, mapped: 0, unmapped: 0 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.mappings).toHaveLength(0);
      expect(result.value?.total).toBe(0);
      expect(result.value?.mapped).toBe(0);
      expect(result.value?.unmapped).toBe(0);
      // findByIds sollte nicht aufgerufen werden wenn keine qualifikationIds vorhanden
      expect(mockQualifikationRepository.findByIds).not.toHaveBeenCalled();
    });

    it('should calculate stats correctly (totalMapped, totalUnmapped)', async () => {
      // Given: Gemischte Mappings
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({ id: 'mapping-1', qualifikationId: testQualifikationId1 }),
        createMockMapping({ id: 'mapping-2', qualifikationId: null }),
        createMockMapping({ id: 'mapping-3', qualifikationId: testQualifikationId2 }),
        createMockMapping({ id: 'mapping-4', qualifikationId: null }),
        createMockMapping({ id: 'mapping-5', qualifikationId: testQualifikationId1 }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(
        Result.ok([createMockQualifikation(testQualifikationId1, 'Gruppenführer', 'GrFü'), createMockQualifikation(testQualifikationId2, 'Notarzt', 'NA')]),
      );
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 5, mapped: 3, unmapped: 2 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.total).toBe(5);
      expect(result.value?.mapped).toBe(3);
      expect(result.value?.unmapped).toBe(2);
    });

    it('should handle repository error gracefully', async () => {
      // Given: Repository liefert Fehler
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.fail('Datenbankverbindung fehlgeschlagen'));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Datenbankverbindung fehlgeschlagen');
    });

    it('should handle qualifikation repository error gracefully and still return mappings', async () => {
      // Given: QualifikationRepository liefert Fehler
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [createMockMapping({ id: 'mapping-1', qualifikationId: testQualifikationId1 })];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.fail('Qualifikationen nicht gefunden'));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 1, mapped: 1, unmapped: 0 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      // Mapping wird zurückgegeben, aber ohne Qualifikations-Details
      expect(result.value?.mappings).toHaveLength(1);
      expect(result.value?.mappings[0].qualifikationName).toBeNull();
      expect(result.value?.mappings[0].qualifikationAbkuerzung).toBeNull();
    });

    it('should handle count repository error gracefully with fallback stats', async () => {
      // Given: Count-Methode liefert Fehler
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [createMockMapping({ id: 'mapping-1', qualifikationId: testQualifikationId1 }), createMockMapping({ id: 'mapping-2', qualifikationId: null })];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([createMockQualifikation(testQualifikationId1, 'Gruppenführer', 'GrFü')]));
      mockMappingRepository.count.mockResolvedValue(Result.fail('Count fehlgeschlagen'));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      // Fallback: mappings.length als total, alle als unmapped
      expect(result.value?.total).toBe(2);
      expect(result.value?.mapped).toBe(0);
      expect(result.value?.unmapped).toBe(2);
    });

    it('should correctly map all DTO fields', async () => {
      // Given: Vollständiges Mapping mit allen Feldern
      const createdAt = new Date('2025-01-15T10:30:00Z');
      const updatedAt = new Date('2025-01-16T14:45:00Z');

      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({
          id: 'mapping-full-dto-test',
          externalName: 'Rettungsassistent',
          externalSource: INTEGRATION_TYPES.HIORG_SERVER,
          qualifikationId: testQualifikationId1,
          isAutoMatched: true,
          confidence: 87,
          createdAt,
          updatedAt,
        }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([createMockQualifikation(testQualifikationId1, 'Rettungsassistent', 'RA')]));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 1, mapped: 1, unmapped: 0 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      const dto = result.value?.mappings[0];
      expect(dto.id).toBe('mapping-full-dto-test');
      expect(dto.externalName).toBe('Rettungsassistent');
      expect(dto.externalSource).toBe(INTEGRATION_TYPES.HIORG_SERVER);
      expect(dto.qualifikationId).toBe(testQualifikationId1);
      expect(dto.qualifikationName).toBe('Rettungsassistent');
      expect(dto.qualifikationAbkuerzung).toBe('RA');
      expect(dto.isAutoMatched).toBe(true);
      expect(dto.confidence).toBe(87);
      expect(dto.createdAt).toEqual(createdAt);
      expect(dto.updatedAt).toEqual(updatedAt);
    });

    it('should set qualifikation details to null for unmapped entries', async () => {
      // Given: Ungemappter Eintrag
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({
          id: 'unmapped-entry',
          externalName: 'Sonderkurs XYZ',
          qualifikationId: null,
          isAutoMatched: false,
          confidence: null,
        }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(Result.ok([]));
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 1, mapped: 0, unmapped: 1 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      const dto = result.value?.mappings[0];
      expect(dto.qualifikationId).toBeNull();
      expect(dto.qualifikationName).toBeNull();
      expect(dto.qualifikationAbkuerzung).toBeNull();
      expect(dto.isAutoMatched).toBe(false);
      expect(dto.confidence).toBeNull();
    });

    it('should batch load qualifikations efficiently', async () => {
      // Given: Mehrere Mappings mit gleicher und unterschiedlicher QualifikationId
      const query = GetQualifikationMappingsQuery.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        onlyUnmapped: false,
      }).value!;

      const mappings = [
        createMockMapping({ id: 'mapping-1', qualifikationId: testQualifikationId1 }),
        createMockMapping({ id: 'mapping-2', qualifikationId: testQualifikationId2 }),
        createMockMapping({ id: 'mapping-3', qualifikationId: testQualifikationId1 }), // Doppelte ID
        createMockMapping({ id: 'mapping-4', qualifikationId: null }),
      ];

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findByIds.mockResolvedValue(
        Result.ok([createMockQualifikation(testQualifikationId1, 'Gruppenführer', 'GrFü'), createMockQualifikation(testQualifikationId2, 'Notarzt', 'NA')]),
      );
      mockMappingRepository.count.mockResolvedValue(Result.ok({ total: 4, mapped: 3, unmapped: 1 }));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      // findByIds sollte nur einmal aufgerufen werden (Batch-Load)
      expect(mockQualifikationRepository.findByIds).toHaveBeenCalledTimes(1);
      // Alle 3 IDs sollten übergeben werden (inkl. Duplikat)
      expect(mockQualifikationRepository.findByIds).toHaveBeenCalledWith([{ value: testQualifikationId1 }, { value: testQualifikationId2 }, { value: testQualifikationId1 }]);
    });
  });
});
