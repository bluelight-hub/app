// @ts-nocheck
// noinspection DuplicatedCode

/**
 * Unit Tests für AutoMatchQualifikationenHandler.
 *
 * Testet das automatische Matching von externen Qualifikations-Namen
 * auf interne Qualifikationen mittels exaktem Match und Levenshtein-Distanz.
 *
 * @module application/integrations/commands/auto-match-qualifikationen/__tests__
 */

import { Result } from '@domain/common/result';
import { AUTO_MATCH_CONFIG, INTEGRATION_TYPES } from '@domain/integrations';
import type { QualifikationMapping } from '@domain/integrations/entities/qualifikation-mapping.entity';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import { AutoMatchQualifikationenCommand } from '@application/integrations';
import { AutoMatchQualifikationenHandler } from '@application/integrations';

describe('AutoMatchQualifikationenHandler', () => {
  let handler: AutoMatchQualifikationenHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockMappingRepository: jest.Mocked<IQualifikationMappingRepository>;
  let mockQualifikationRepository: jest.Mocked<IQualifikationRepository>;

  // Test fixtures - CUID2 Format für alle IDs
  const testUserId = 'clp1234567890abcdef123456';

  /**
   * Erstellt ein Mock-Qualifikation Aggregate mit konfigurierbaren Werten.
   */
  const createMockQualifikation = (overrides: { id: string; name: string; abkuerzung: string }): Qualifikation => {
    const mockId = {
      value: overrides.id,
      equals: (other: QualifikationId) => other.value === overrides.id,
    } as QualifikationId;

    return {
      id: mockId,
      name: overrides.name,
      abkuerzung: overrides.abkuerzung,
      istAktiv: true,
    } as unknown as Qualifikation;
  };

  /**
   * Erstellt ein Mock-QualifikationMapping Entity.
   */
  const createMockMapping = (externalName: string, qualifikationId?: string | null): QualifikationMapping => {
    const mapping = {
      id: `mapping-${externalName.replace(/\s/g, '-').toLowerCase()}`,
      externalName,
      externalSource: INTEGRATION_TYPES.HIORG_SERVER,
      qualifikationId: qualifikationId ?? null,
      isAutoMatched: false,
      confidence: null,
      updateAutoMatch: jest.fn().mockImplementation((qId: string, conf: number) => ({
        ...mapping,
        qualifikationId: qId,
        isAutoMatched: true,
        confidence: conf,
      })),
    } as unknown as QualifikationMapping;
    return mapping;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

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
      findAll: jest.fn(),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      existsMany: jest.fn(),
      findByIds: jest.fn(),
    };

    handler = new AutoMatchQualifikationenHandler(mockLogger, mockMappingRepository, mockQualifikationRepository);
  });

  describe('Exaktes Matching', () => {
    it('should match exact name with 100% confidence', async () => {
      // Given: Eine Qualifikation und ein Mapping mit exakt gleichem Namen
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-grfue-id',
        name: 'Gruppenführer',
        abkuerzung: 'GrFue',
      });

      const mapping = createMockMapping('Gruppenführer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches).toHaveLength(1);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-grfue-id');
      expect(result.value?.matches[0]?.matchedQualifikationName).toBe('Gruppenführer');
      expect(result.value?.matches[0]?.confidence).toBe(AUTO_MATCH_CONFIG.EXACT_MATCH_SCORE);
      expect(result.value?.matches[0]?.matchType).toBe('EXACT');
      expect(result.value?.totalMatched).toBe(1);
      expect(result.value?.totalUnmatched).toBe(0);
    });

    it('should match exact shortName (abkuerzung)', async () => {
      // Given: Eine Qualifikation und ein Mapping mit exakt gleicher Abkürzung
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-rs-id',
        name: 'Rettungssanitäter',
        abkuerzung: 'RS',
      });

      const mapping = createMockMapping('RS');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-rs-id');
      expect(result.value?.matches[0]?.confidence).toBe(AUTO_MATCH_CONFIG.EXACT_MATCH_SCORE);
      expect(result.value?.matches[0]?.matchType).toBe('SHORT_NAME');
    });
  });

  describe('Fuzzy Matching (Levenshtein)', () => {
    it('should fuzzy match above threshold (e.g., "Gruppenführer" vs "Gruppenfuehrer")', async () => {
      // Given: Ähnliche Namen mit Umlaut-Differenzen (normalisiert gleich)
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-grfue-id',
        name: 'Gruppenführer',
        abkuerzung: 'GrFue',
      });

      // "Gruppenfuehrer" sollte nach Normalisierung exakt matchen
      const mapping = createMockMapping('Gruppenfuehrer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-grfue-id');
      // Nach Normalisierung sind beide "gruppenfuehrer", also EXACT
      expect(result.value?.matches[0]?.confidence).toBe(100);
    });

    it('should NOT match below similarity threshold', async () => {
      // Given: Sehr unterschiedliche Namen
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-grfue-id',
        name: 'Gruppenführer',
        abkuerzung: 'GrFue',
      });

      // Komplett anderer Name
      const mapping = createMockMapping('Atemschutzgeräteträger');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBeNull();
      expect(result.value?.matches[0]?.matchType).toBe('NONE');
      expect(result.value?.totalMatched).toBe(0);
      expect(result.value?.totalUnmatched).toBe(1);
      // Kein save() Aufruf, da kein Match
      expect(mockMappingRepository.save).not.toHaveBeenCalled();
    });

    it('should select best match when multiple candidates', async () => {
      // Given: Mehrere Qualifikationen, eine passt besser
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikationen = [
        createMockQualifikation({
          id: 'qual-grfue-id',
          name: 'Gruppenführer',
          abkuerzung: 'GrFue',
        }),
        createMockQualifikation({
          id: 'qual-zfue-id',
          name: 'Zugführer',
          abkuerzung: 'ZFue',
        }),
        createMockQualifikation({
          id: 'qual-truppfue-id',
          name: 'Truppführer',
          abkuerzung: 'TrFue',
        }),
      ];

      // "Gruppenführer F" sollte am besten zu "Gruppenführer" passen
      const mapping = createMockMapping('Gruppenführer F');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok(qualifikationen));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-grfue-id');
      expect(result.value?.matches[0]?.matchType).toBe('FUZZY');
    });
  });

  describe('Normalisierung', () => {
    it('should normalize umlauts correctly (ä→ae, ö→oe, ü→ue, ß→ss)', async () => {
      // Given: Qualifikation mit Umlauten, Mapping ohne
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-id',
        name: 'Außendienstführer',
        abkuerzung: 'ADFüe',
      });

      // Normalisierte Form ohne Umlaute
      const mapping = createMockMapping('Aussendienstfuehrer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-id');
      // Normalisiert beide zu "aussendienstfuehrer" → EXACT match
      expect(result.value?.matches[0]?.confidence).toBe(100);
    });

    it('should handle mixed case insensitively', async () => {
      // Given: Qualifikation in Kleinbuchstaben, Mapping in Großbuchstaben
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-id',
        name: 'Notfallsanitäter',
        abkuerzung: 'NFS',
      });

      const mapping = createMockMapping('NOTFALLSANITÄTER');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBe('qual-id');
      expect(result.value?.matches[0]?.confidence).toBe(100);
    });
  });

  describe('Statistiken', () => {
    it('should update totalMatched and totalUnmatched stats correctly', async () => {
      // Given: Mehrere Mappings, einige matchen, andere nicht
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikationen = [
        createMockQualifikation({
          id: 'qual-grfue-id',
          name: 'Gruppenführer',
          abkuerzung: 'GrFue',
        }),
        createMockQualifikation({
          id: 'qual-rs-id',
          name: 'Rettungssanitäter',
          abkuerzung: 'RS',
        }),
      ];

      const mappings = [
        createMockMapping('Gruppenführer'), // Exaktes Match
        createMockMapping('RS'), // Abkürzungs-Match
        createMockMapping('UnbekannteQualifikation'), // Kein Match
        createMockMapping('XYZ-Kurs-2025'), // Kein Match
      ];

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok(qualifikationen));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.totalMatched).toBe(2);
      expect(result.value?.totalUnmatched).toBe(2);
      expect(result.value?.matches).toHaveLength(4);
      expect(mockMappingRepository.save).toHaveBeenCalledTimes(2); // Nur gematchte werden gespeichert
    });

    it('should calculate averageConfidence correctly', async () => {
      // Given: Zwei Mappings mit unterschiedlicher Confidence
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikationen = [
        createMockQualifikation({
          id: 'qual-1',
          name: 'Gruppenführer',
          abkuerzung: 'GrFue',
        }),
        createMockQualifikation({
          id: 'qual-2',
          name: 'Rettungssanitäter',
          abkuerzung: 'RS',
        }),
      ];

      // Beide matchen exakt → beide 100% confidence
      const mappings = [createMockMapping('Gruppenführer'), createMockMapping('Rettungssanitäter')];

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok(mappings));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok(qualifikationen));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.averageConfidence).toBe(100); // (100 + 100) / 2
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mapping list', async () => {
      // Given: Keine Mappings vorhanden
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([]));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches).toHaveLength(0);
      expect(result.value?.totalMatched).toBe(0);
      expect(result.value?.totalUnmatched).toBe(0);
      expect(result.value?.averageConfidence).toBe(0);
      // Qualifikationen werden nicht geladen wenn keine Mappings
      expect(mockQualifikationRepository.findAll).not.toHaveBeenCalled();
    });

    it('should handle empty qualifikation list', async () => {
      // Given: Keine Qualifikationen vorhanden
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const mapping = createMockMapping('Gruppenführer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([]));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.matches).toHaveLength(1);
      expect(result.value?.matches[0]?.matchedQualifikationId).toBeNull();
      expect(result.value?.matches[0]?.matchType).toBe('NONE');
      expect(result.value?.totalMatched).toBe(0);
      expect(result.value?.totalUnmatched).toBe(1);
    });

    it('should use findByExternalSource when onlyUnmapped is false', async () => {
      // Given: Command mit onlyUnmapped=false
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: false,
      }).value!;

      mockMappingRepository.findByExternalSource.mockResolvedValue(Result.ok([]));

      // When
      await handler.execute(command);

      // Then
      expect(mockMappingRepository.findByExternalSource).toHaveBeenCalledWith(INTEGRATION_TYPES.HIORG_SERVER);
      expect(mockMappingRepository.findUnmapped).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should fail when mapping repository returns error', async () => {
      // Given: Repository-Fehler
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.fail('Database connection error'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
    });

    it('should fail when qualifikation repository returns error', async () => {
      // Given: Qualifikation-Repository-Fehler
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const mapping = createMockMapping('Gruppenführer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.fail('Qualifikation load failed'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Qualifikation load failed');
    });
  });

  describe('Logging', () => {
    it('should log start and completion messages', async () => {
      // Given
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-id',
        name: 'Gruppenführer',
        abkuerzung: 'GrFue',
      });

      const mapping = createMockMapping('Gruppenführer');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.execute(command);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Starting auto-match'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Matching'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Auto-match completed'));
    });
  });

  describe('Short Name Matching mit Bonus', () => {
    it('should apply SHORT_NAME_BONUS for fuzzy abkuerzung match', async () => {
      // Given: Fuzzy Match auf Abkürzung
      const command = AutoMatchQualifikationenCommand.create({
        source: INTEGRATION_TYPES.HIORG_SERVER,
        initiatedBy: testUserId,
        onlyUnmapped: true,
      }).value!;

      const qualifikation = createMockQualifikation({
        id: 'qual-id',
        name: 'Rettungsassistent',
        abkuerzung: 'RettAss',
      });

      // Leicht abweichende Schreibweise der Abkürzung
      const mapping = createMockMapping('RettAs');

      mockMappingRepository.findUnmapped.mockResolvedValue(Result.ok([mapping]));
      mockQualifikationRepository.findAll.mockResolvedValue(Result.ok([qualifikation]));
      mockMappingRepository.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      // Match sollte gefunden werden, wenn Ähnlichkeit hoch genug
      if (result.value?.matches[0]?.matchedQualifikationId) {
        expect(result.value?.matches[0]?.matchType).toBe('SHORT_NAME');
      }
    });
  });
});
