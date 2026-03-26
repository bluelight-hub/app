// @ts-nocheck
import { GetEintraegeQueryHandler } from '@application/etb/queries';
import { GetEintraegeQuery } from '@application/etb/queries';
import { InMemoryEtbRepository } from '../../__tests__/in-memory-etb.repository';
import { createTestEtb } from '@domain/aggregates/__tests__/fixtures/etb.fixtures';
import { UserId } from '@domain/value-objects/user-id';
import { createValidTestId } from './helpers/test-id.helper';
import type { PrismaService } from '@/infrastructure/database/prisma.service';

// Mock cuid2 fuer deterministische Test-IDs
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/**
 * Unit Tests fuer GetEintraegeQueryHandler.
 *
 * Testet die Abfrage von ETB-Eintraegen mit optionaler Filterung.
 * Wichtiger Unterschied zu GetEtbQueryHandler:
 * - GetEtbQuery: null ist valide (ETB existiert nicht)
 * - GetEintraegeQuery: Result.fail() (Eintraege ohne ETB haben keinen Kontext)
 *
 * Coverage Target: >90%
 */
describe('GetEintraegeQueryHandler', () => {
  let handler: GetEintraegeQueryHandler;
  let repository: InMemoryEtbRepository;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    repository = new InMemoryEtbRepository();
    // Story 5.4: Mock PrismaService für linkedErinnerung Query
    mockPrisma = {
      erinnerung: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;
    handler = new GetEintraegeQueryHandler(repository, mockPrisma);
  });

  afterEach(() => {
    repository.clear();
    jest.clearAllMocks();
  });

  describe('Erfolgreiche Abfragen', () => {
    it('sollte alle nicht-geloeschten Eintraege zurueckgeben', async () => {
      // Given: ETB mit 3 Eintraegen
      const einsatzId = createValidTestId('einsatz1');
      const userId = createValidTestId('user0001');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 3 });
      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value?.every((e) => !e.isDeleted)).toBe(true);
    });

    it('sollte Eintraege aufsteigend nach sequenceNumber sortieren', async () => {
      // Given: ETB mit mehreren Eintraegen
      const einsatzId = createValidTestId('einsatz2');
      const userId = createValidTestId('user0002');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 5 });
      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then: Sortierung nach sequenceNumber ascending
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(5);

      for (let i = 1; i < result.value?.length; i++) {
        expect(result.value?.[i].sequenceNumber).toBeGreaterThan(result.value?.[i - 1].sequenceNumber);
      }
    });

    it('sollte alle Eintraege zurueckgeben wenn keine geloescht sind', async () => {
      // Given: ETB mit 4 Eintraegen (keine geloescht, da deleteEintrag entfernt)
      const einsatzId = createValidTestId('einsatz3');
      const userId = createValidTestId('user0003');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 4 });

      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value, false); // includeDeleted = false

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(4);
      expect(result.value?.every((e) => !e.isDeleted)).toBe(true);
    });

    it('sollte korrigierte Eintraege zusammen mit Korrektur-Eintraegen zurueckgeben', async () => {
      // Given: ETB mit Eintraegen, wovon einer korrigiert wird
      const einsatzId = createValidTestId('einsatz4');
      const userId = createValidTestId('user0004');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 3 });
      const userIdVo = UserId.create(createValidTestId('koruser01')).value!;

      // Einen Eintrag korrigieren
      const originalEntry = etb.eintraege[1];
      etb.addKorrekturEintrag(originalEntry.id, 'Korrektur-Text', userIdVo);

      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value, false);

      // When
      const result = await handler.execute(query);

      // Then: 3 original + 1 korrektur = 4
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(4);
    });

    it('sollte leeres Array fuer ETB ohne Eintraege zurueckgeben', async () => {
      // Given: ETB ohne Eintraege
      const einsatzId = createValidTestId('einsatz5');
      const userId = createValidTestId('user0005');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 0 });
      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then: Leeres Array ist valide Response
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
      expect(result.value).toHaveLength(0);
    });

    it('sollte mehrere Eintraege in korrekter Reihenfolge behandeln', async () => {
      // Given: ETB mit mehreren Eintraegen in sequentieller Reihenfolge
      const einsatzId = createValidTestId('einsatz6');
      const userId = createValidTestId('user0006');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 10 });
      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(10);

      // Verifiziere chronologische Reihenfolge
      result.value?.forEach((entry, index) => {
        expect(entry.sequenceNumber).toBe(index + 1);
        expect(entry.text).toContain(`Eintrag ${index + 1}`);
      });
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Result.fail() zurueckgeben wenn ETB nicht gefunden', async () => {
      // Given: ETB-ID die nicht existiert
      const nonExistentEtbId = createValidTestId('notfound');
      const query = new GetEintraegeQuery(nonExistentEtbId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() erwartet (framework-agnostisch, UNTERSCHIED zu GetEtbQuery!)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatztagebuch nicht gefunden');
    });

    it('sollte bei ungueltigem etbId Format fehlschlagen', async () => {
      // Given: Ungueltige ETB-ID (nicht CUID2 konform)
      const invalidEtbId = 'invalid-format';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEintraegeQuery(invalidEtbId)).toThrow();
    });

    it('sollte bei leerem etbId fehlschlagen', async () => {
      // Given: Leere ETB-ID
      const emptyEtbId = '';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEintraegeQuery(emptyEtbId)).toThrow('etbId is required');
    });
  });

  describe('DTO Mapping', () => {
    it('sollte Eintraege korrekt zu EintragDto mappen', async () => {
      // Given: ETB mit Eintraegen
      const einsatzId = createValidTestId('einsatz7');
      const userId = createValidTestId('user0007');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 2 });
      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then: DTO-Struktur verifizieren
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);

      const dto = result.value?.[0];
      expect(dto.id).toBeDefined();
      expect(typeof dto.id).toBe('string');
      expect(dto.sequenceNumber).toBeGreaterThanOrEqual(1);
      expect(typeof dto.sequenceNumber).toBe('number');
      expect(dto.text).toBeDefined();
      expect(typeof dto.text).toBe('string');
      expect(dto.createdBy).toBeDefined();
      expect(typeof dto.createdBy).toBe('string');
      expect(dto.createdAt).toBeInstanceOf(Date);
      expect(typeof dto.isDeleted).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('sollte ETB mit korrigierten Eintraegen korrekt behandeln', async () => {
      // Given: ETB mit korrigierten Eintraegen
      const einsatzId = createValidTestId('einsatz8');
      const userId = createValidTestId('user0008');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 3 });
      const userIdVo = UserId.create(createValidTestId('koruser03')).value!;

      // Alle Eintraege korrigieren
      for (const entry of etb.eintraege) {
        etb.addKorrekturEintrag(entry.id, `Korrektur fuer ${entry.text}`, userIdVo);
      }

      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value, false);

      // When
      const result = await handler.execute(query);

      // Then: 3 original + 3 korrektur = 6
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(6);
    });

    it('sollte Eintraege inklusive Korrekturen in korrekter Reihenfolge sortieren', async () => {
      // Given: ETB mit Eintraegen und Korrekturen
      const einsatzId = createValidTestId('einsatz9');
      const userId = createValidTestId('user0009');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 3 });
      const userIdVo = UserId.create(createValidTestId('koruser04')).value!;

      // Eintraege korrigieren
      etb.addKorrekturEintrag(etb.eintraege[0]?.id, 'Korrektur 1', userIdVo);
      etb.addKorrekturEintrag(etb.eintraege[2]?.id, 'Korrektur 3', userIdVo);

      await repository.save(etb);

      const query = new GetEintraegeQuery(etb.id.value, false);

      // When
      const result = await handler.execute(query);

      // Then: 3 original + 2 korrektur = 5, sortiert nach sequenceNumber
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(5);

      for (let i = 1; i < result.value?.length; i++) {
        expect(result.value?.[i].sequenceNumber).toBeGreaterThan(result.value?.[i - 1].sequenceNumber);
      }
    });
  });

  describe('Story 5.4: linkedErinnerung', () => {
    it('sollte linkedErinnerung enthalten wenn Erinnerung mit etbEntryId existiert', async () => {
      // Given: ETB mit Eintrag
      const einsatzId = createValidTestId('einsatz10');
      const userId = createValidTestId('user0010');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 2 });
      await repository.save(etb);

      const eintragId = etb.eintraege[0]?.id.value;

      // Mock: Erinnerung mit etbEntryId existiert
      mockPrisma.erinnerung.findMany = jest.fn().mockResolvedValue([{ id: 'erinnerung-id-1', titel: 'Follow-up Test', etbEntryId: eintragId }]);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      const linkedEntry = result.value?.find((e) => e.id === eintragId);
      expect(linkedEntry?.linkedErinnerung).toEqual({
        id: 'erinnerung-id-1',
        titel: 'Follow-up Test',
      });

      // Eintrag ohne Verknüpfung sollte null haben
      const unlinkedEntry = result.value?.find((e) => e.id !== eintragId);
      expect(unlinkedEntry?.linkedErinnerung).toBeNull();
    });

    it('sollte linkedErinnerung = null haben wenn keine Erinnerung verknüpft', async () => {
      // Given: ETB mit Eintrag, keine verknüpfte Erinnerung
      const einsatzId = createValidTestId('einsatz11');
      const userId = createValidTestId('user0011');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 1 });
      await repository.save(etb);

      // Mock: Keine Erinnerungen gefunden
      mockPrisma.erinnerung.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.[0]?.linkedErinnerung).toBeNull();
    });

    it('sollte einsatzId im where-Clause fuer linkedErinnerung Query enthalten', async () => {
      // Given: ETB mit Eintrag
      const einsatzId = createValidTestId('einsatz13');
      const userId = createValidTestId('user0013');
      const etb = createTestEtb({ einsatzId, userId, entriesCount: 1 });
      await repository.save(etb);

      const eintragId = etb.eintraege[0]?.id.value;

      // Mock: Verifiziere dass einsatzId-Filter im Query enthalten ist
      mockPrisma.erinnerung.findMany = jest.fn().mockImplementation((args) => {
        // Prüfe dass einsatzId im where-Clause ist
        expect(args.where.einsatzId).toBe(einsatzId);
        return Promise.resolve([]);
      });

      const query = new GetEintraegeQuery(etb.id.value);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockPrisma.erinnerung.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            einsatzId: einsatzId,
            etbEntryId: { in: [eintragId] },
            isDeleted: false,
          }),
        }),
      );
    });
  });
});
