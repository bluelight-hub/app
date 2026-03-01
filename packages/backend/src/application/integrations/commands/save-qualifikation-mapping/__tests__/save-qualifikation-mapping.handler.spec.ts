/**
 * Unit Tests fuer SaveQualifikationMappingHandler.
 *
 * Testet das Aktualisieren von Qualifikations-Mappings.
 *
 * @module application/integrations/commands/save-qualifikation-mapping/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_ERROR_CODES, INTEGRATION_TYPES } from '@domain/integrations';
import { QualifikationMapping } from '@domain/integrations/entities/qualifikation-mapping.entity';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SaveQualifikationMappingHandler } from '../save-qualifikation-mapping.handler';
import { SaveQualifikationMappingCommand } from '../save-qualifikation-mapping.command';

describe('SaveQualifikationMappingHandler', () => {
  let handler: SaveQualifikationMappingHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockMappingRepo: jest.Mocked<IQualifikationMappingRepository>;
  let mockQualifikationRepo: jest.Mocked<IQualifikationRepository>;

  // Test fixtures - CUID2 Format fuer alle IDs
  const testUserId = 'clp1234567890abcdef123456';
  const testMappingId = 'clmap12345678901234567890';
  const testQualifikationId = 'clqual1234567890123456789';

  /**
   * Erzeugt ein Test-QualifikationMapping.
   */
  const createTestMapping = (overrides?: { id?: string; qualifikationId?: string | null; isAutoMatched?: boolean }): QualifikationMapping => {
    const result = QualifikationMapping.reconstitute({
      id: overrides?.id ?? testMappingId,
      externalName: 'Rettungssanitaeter',
      externalSource: INTEGRATION_TYPES.HIORG_SERVER,
      qualifikationId: overrides?.qualifikationId ?? null,
      isAutoMatched: overrides?.isAutoMatched ?? true,
      confidence: 95,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: testUserId,
      updatedBy: null,
    });
    return result.value!;
  };

  /**
   * Erzeugt ein Mock-Qualifikation Aggregate.
   */
  const createMockQualifikation = (id: string): Partial<Qualifikation> => ({
    id: { value: id } as Qualifikation['id'],
    bezeichnung: 'Rettungssanitaeter',
    abkuerzung: 'RS',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockMappingRepo = {
      findById: jest.fn(),
      findByExternalSource: jest.fn(),
      findByExternalName: jest.fn(),
      findByQualifikationId: jest.fn(),
      findUnmapped: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      deleteBySource: jest.fn(),
      count: jest.fn(),
    };

    mockQualifikationRepo = {
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      existsMany: jest.fn(),
      findByIds: jest.fn(),
    };

    handler = new SaveQualifikationMappingHandler(mockLogger, mockMappingRepo, mockQualifikationRepo);
  });

  describe('execute', () => {
    it('should update existing mapping successfully', async () => {
      // Given: Gueltiges Command, existierendes Mapping und gueltige Qualifikation
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping();
      const qualifikation = createMockQualifikation(testQualifikationId);

      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      mockQualifikationRepo.findById.mockResolvedValue(Result.ok(qualifikation as Qualifikation));
      mockMappingRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBe(testMappingId);
      expect(result.value?.qualifikationId).toBe(testQualifikationId);
      expect(result.value?.isAutoMatched).toBe(false); // Manuelles Update setzt auf false
      expect(mockMappingRepo.save).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(testMappingId));
    });

    it('should return error when mapping not found', async () => {
      // Given: Mapping existiert nicht
      const command = SaveQualifikationMappingCommand.create({
        mappingId: 'nonexistent-mapping-id-1234',
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      mockMappingRepo.findById.mockResolvedValue(Result.ok(null));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.MAPPING_NOT_FOUND);
      expect(mockMappingRepo.save).not.toHaveBeenCalled();
    });

    it('should return error when qualifikation ID invalid (not a valid CUID)', async () => {
      // Given: Ungueltige Qualifikation-ID (nicht CUID-Format)
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: 'invalid-not-a-cuid-format', // Kein valides CUID-Format
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping();
      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));

      // When
      const result = await handler.execute(command);

      // Then: QualifikationId.create() schlaegt fehl bei ungueltigem CUID-Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige Qualifikation-ID');
    });

    it('should treat empty string as null (unmapping)', async () => {
      // Given: Leerer String wird als falsy behandelt (wie null)
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: '', // Leerer String ist falsy in JS
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping({
        qualifikationId: testQualifikationId,
      });
      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      mockMappingRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then: Leerer String wird wie null behandelt (Unmapping)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationId).toBe(''); // Der Wert bleibt ''
      expect(mockQualifikationRepo.findById).not.toHaveBeenCalled();
    });

    it('should handle setting qualifikationId to null (unmapping)', async () => {
      // Given: Bestehendes Mapping soll auf null gesetzt werden (Unmapping)
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: null,
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping({
        qualifikationId: testQualifikationId,
      });
      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      mockMappingRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationId).toBeNull();
      expect(result.value?.isAutoMatched).toBe(false);
      expect(mockMappingRepo.save).toHaveBeenCalled();
      // Qualifikation-Repository sollte nicht abgefragt werden bei null
      expect(mockQualifikationRepo.findById).not.toHaveBeenCalled();
    });

    it('should validate qualifikation exists before mapping', async () => {
      // Given: Qualifikation existiert nicht
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping();
      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      // Qualifikation nicht gefunden
      mockQualifikationRepo.findById.mockResolvedValue(Result.ok(null));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(result.error).toContain(testQualifikationId);
      expect(mockMappingRepo.save).not.toHaveBeenCalled();
    });

    it('should return error when mapping repository findById fails', async () => {
      // Given: Repository-Fehler beim Laden des Mappings
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      mockMappingRepo.findById.mockResolvedValue(Result.fail('Datenbankfehler beim Laden'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler beim Laden');
      expect(mockMappingRepo.save).not.toHaveBeenCalled();
    });

    it('should return error when qualifikation repository findById fails', async () => {
      // Given: Repository-Fehler beim Pruefen der Qualifikation
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping();
      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      mockQualifikationRepo.findById.mockResolvedValue(Result.fail('Qualifikation-Repository Fehler'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(mockMappingRepo.save).not.toHaveBeenCalled();
    });

    it('should return error when mapping save fails', async () => {
      // Given: Speichern schlaegt fehl
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      const existingMapping = createTestMapping();
      const qualifikation = createMockQualifikation(testQualifikationId);

      mockMappingRepo.findById.mockResolvedValue(Result.ok(existingMapping));
      mockQualifikationRepo.findById.mockResolvedValue(Result.ok(qualifikation as Qualifikation));
      mockMappingRepo.save.mockResolvedValue(Result.fail('Speichern fehlgeschlagen'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speichern fehlgeschlagen');
    });

    it('should reset auto-matched flag on manual update', async () => {
      // Given: Auto-matched Mapping wird manuell aktualisiert
      const command = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      }).value!;

      const autoMatchedMapping = createTestMapping({
        isAutoMatched: true,
        qualifikationId: 'other-qual-id-1234567890',
      });
      const qualifikation = createMockQualifikation(testQualifikationId);

      mockMappingRepo.findById.mockResolvedValue(Result.ok(autoMatchedMapping));
      mockQualifikationRepo.findById.mockResolvedValue(Result.ok(qualifikation as Qualifikation));
      mockMappingRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.isAutoMatched).toBe(false);
      // Verify save was called with updated mapping
      expect(mockMappingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isAutoMatched: false,
        }),
      );
    });
  });

  describe('command validation', () => {
    it('should fail when mappingId is empty', () => {
      // Given: Leere Mapping-ID
      const result = SaveQualifikationMappingCommand.create({
        mappingId: '',
        qualifikationId: testQualifikationId,
        updatedBy: testUserId,
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Mapping ID');
    });

    it('should fail when updatedBy is empty', () => {
      // Given: Leere UpdatedBy
      const result = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: testQualifikationId,
        updatedBy: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('UpdatedBy');
    });

    it('should allow null qualifikationId', () => {
      // Given: Null als qualifikationId (fuer Unmapping)
      const result = SaveQualifikationMappingCommand.create({
        mappingId: testMappingId,
        qualifikationId: null,
        updatedBy: testUserId,
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationId).toBeNull();
    });
  });
});
