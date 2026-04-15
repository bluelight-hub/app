// @ts-nocheck
import { EtbEintrag } from '@domain/entities/etb-eintrag.entity';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { EtbKategorie } from '@domain/value-objects/etb-kategorie';
import { EtbSequenceNumber } from '@domain/value-objects/etb-sequence-number';
import { UserId } from '@domain/value-objects/user-id';

// Mock cuid2 for Jest compatibility (ESM module issue)
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
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('EtbEintrag Entity', () => {
  let eintragId: EintragId;
  let sequenceNumber: EtbSequenceNumber;
  let userId: UserId;
  const testText = 'Fahrzeug W1 am Einsatzort eingetroffen';

  beforeEach(() => {
    eintragId = EintragId.create().value!;
    sequenceNumber = EtbSequenceNumber.create(1).value!;
    userId = UserId.create().value!;
  });

  describe('constructor', () => {
    it('should create valid EtbEintrag with required fields', () => {
      // When: Creating entity with required fields
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      // Then: Entity is created with correct properties
      expect(eintrag.id.equals(eintragId)).toBe(true);
      expect(eintrag.sequenceNumber.equals(sequenceNumber)).toBe(true);
      expect(eintrag.text).toBe(testText);
      expect(eintrag.createdBy.equals(userId)).toBe(true);
      expect(eintrag.isDeleted).toBe(false);
    });

    it('should initialize with LAGE kategorie as default', () => {
      // When: Creating entity without kategorie
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      // Then: Kategorie defaults to LAGE
      expect(eintrag.kategorie.equals(EtbKategorie.LAGE())).toBe(true);
    });

    it('should accept custom kategorie', () => {
      // Given: Custom kategorie
      const kategorie = EtbKategorie.MASSNAHME();

      // When: Creating entity with kategorie
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, kategorie);

      // Then: Kategorie is set correctly
      expect(eintrag.kategorie.equals(kategorie)).toBe(true);
    });

    it('should use provided createdAt or default to new Date()', () => {
      // Given: Custom createdAt
      const customDate = new Date('2024-01-01T12:00:00.000Z');

      // When: Creating entity with custom createdAt
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, customDate);

      // Then: createdAt is set correctly
      expect(eintrag.createdAt).toEqual(customDate);
    });

    it('should initialize updatedAt as undefined', () => {
      // When: Creating new entity
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      // Then: updatedAt is undefined
      expect(eintrag.updatedAt).toBeUndefined();
    });

    it('should accept optional metadata', () => {
      // Given: Custom metadata
      const metadata = { screenshot: 'path/to/image.png', coordinates: { lat: 51.5, lon: 7.5 } };

      // When: Creating entity with metadata (absender, empfaenger are undefined)
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, metadata);

      // Then: Metadata is set correctly
      expect(eintrag.metadata).toEqual(metadata);
    });
  });

  describe('readonly properties (Immutability)', () => {
    it('should have immutable id', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const originalId = eintrag.id;

      // Attempt to modify id should fail (TypeScript prevents this)
      expect(eintrag.id).toBe(originalId);
      expect(eintrag.id.equals(eintragId)).toBe(true);
    });

    it('should have immutable sequenceNumber', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const originalSeq = eintrag.sequenceNumber;

      // Sequence number is readonly via getter
      expect(eintrag.sequenceNumber).toBe(originalSeq);
      expect(eintrag.sequenceNumber.value).toBe(1);
    });

    it('should have immutable createdBy', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const originalCreatedBy = eintrag.createdBy;

      expect(eintrag.createdBy).toBe(originalCreatedBy);
      expect(eintrag.createdBy.equals(userId)).toBe(true);
    });

    it('should have immutable createdAt', () => {
      const customDate = new Date('2024-01-01T12:00:00.000Z');
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, customDate);

      expect(eintrag.createdAt).toEqual(customDate);
    });

    it('should have immutable kategorie', () => {
      const kategorie = EtbKategorie.BEFEHL();
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, kategorie);

      expect(eintrag.kategorie.equals(kategorie)).toBe(true);
    });
  });

  describe('markAsKorrigiert() method', () => {
    it('should set korrigiertDurchId and updatedAt', () => {
      // Given: Existing entry
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const korrekturId = EintragId.create().value!;

      // When: Marking as korrigiert
      eintrag.markAsKorrigiert(korrekturId);

      // Then: korrigiertDurchId is set and updatedAt is set
      expect(eintrag.korrigiertDurchId?.equals(korrekturId)).toBe(true);
      expect(eintrag.isKorrigiert).toBe(true);
      expect(eintrag.updatedAt).toBeDefined();
      expect(eintrag.updatedAt).toBeInstanceOf(Date);
    });

    it('should not change other properties when marking as korrigiert', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const originalId = eintrag.id;
      const originalSeq = eintrag.sequenceNumber;
      const originalText = eintrag.text;
      const originalCreatedBy = eintrag.createdBy;
      const originalCreatedAt = eintrag.createdAt;
      const originalIsDeleted = eintrag.isDeleted;
      const korrekturId = EintragId.create().value!;

      eintrag.markAsKorrigiert(korrekturId);

      expect(eintrag.id).toBe(originalId);
      expect(eintrag.sequenceNumber).toBe(originalSeq);
      expect(eintrag.text).toBe(originalText);
      expect(eintrag.createdBy).toBe(originalCreatedBy);
      expect(eintrag.createdAt).toBe(originalCreatedAt);
      expect(eintrag.isDeleted).toBe(originalIsDeleted);
    });
  });

  describe('Korrektur-Pattern properties', () => {
    it('should have isKorrektur=true when korrigiertEintragId is set', () => {
      const originalId = EintragId.create().value!;
      const eintrag = new EtbEintrag(
        eintragId,
        sequenceNumber,
        testText,
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        originalId, // korrigiertEintragId
      );

      expect(eintrag.isKorrektur).toBe(true);
      expect(eintrag.korrigiertEintragId?.equals(originalId)).toBe(true);
    });

    it('should have isKorrektur=false when korrigiertEintragId is not set', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.isKorrektur).toBe(false);
      expect(eintrag.korrigiertEintragId).toBeUndefined();
    });

    it('should have isKorrigiert=false initially', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.isKorrigiert).toBe(false);
      expect(eintrag.korrigiertDurchId).toBeUndefined();
    });

    it('should support isDeleted via constructor parameter', () => {
      const eintrag = new EtbEintrag(
        eintragId,
        sequenceNumber,
        testText,
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true, // isDeleted
      );

      expect(eintrag.isDeleted).toBe(true);
    });
  });

  describe('equals() method (ID-based Equality)', () => {
    it('should return true for same ID', () => {
      const eintrag1 = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const eintrag2 = new EtbEintrag(eintragId, sequenceNumber, 'Different text', userId);

      expect(eintrag1.equals(eintrag2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const otherId = EintragId.create().value!;
      const eintrag1 = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const eintrag2 = new EtbEintrag(otherId, sequenceNumber, testText, userId);

      expect(eintrag1.equals(eintrag2)).toBe(false);
    });

    it('should return true when comparing to itself', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.equals(eintrag)).toBe(true);
    });

    it('should return false for null', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.equals(null as unknown as EtbEintrag)).toBe(false);
    });

    it('should return false for undefined', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.equals(undefined)).toBe(false);
    });

    it('should ignore text differences (ID-based equality)', () => {
      const eintrag1 = new EtbEintrag(eintragId, sequenceNumber, 'Text 1', userId);
      const eintrag2 = new EtbEintrag(eintragId, sequenceNumber, 'Text 2', userId);

      expect(eintrag1.equals(eintrag2)).toBe(true);
    });

    it('should ignore isDeleted flag (ID-based equality)', () => {
      const eintrag1 = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const eintrag2 = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true); // isDeleted = true

      expect(eintrag1.equals(eintrag2)).toBe(true);
    });
  });

  describe('immutability scenarios', () => {
    it('should create entry with isDeleted=true via constructor (legacy data)', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);

      expect(eintrag.text).toBe(testText);
      expect(eintrag.isDeleted).toBe(true);
    });

    it('should maintain entity consistency after markAsKorrigiert', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const korrekturId = EintragId.create().value!;

      eintrag.markAsKorrigiert(korrekturId);

      // Entity remains consistent
      expect(eintrag.id.equals(eintragId)).toBe(true);
      expect(eintrag.sequenceNumber.equals(sequenceNumber)).toBe(true);
      expect(eintrag.createdBy.equals(userId)).toBe(true);
      expect(eintrag.text).toBe(testText); // Text is immutable
      expect(eintrag.isKorrigiert).toBe(true);
    });
  });

  describe('kategorie handling', () => {
    it('should support all available kategorien', () => {
      const kategorien = [
        EtbKategorie.ALARMIERUNG(),
        EtbKategorie.ANKUNFT(),
        EtbKategorie.BEFEHL(),
        EtbKategorie.ERKUNDUNG(),
        EtbKategorie.LAGE(),
        EtbKategorie.MASSNAHME(),
        EtbKategorie.PERSONAL(),
        EtbKategorie.FAHRZEUG(),
        EtbKategorie.MATERIAL(),
        EtbKategorie.KOMMUNIKATION(),
        EtbKategorie.WETTER(),
        EtbKategorie.DOKUMENTATION(),
        EtbKategorie.SONSTIGES(),
        EtbKategorie.SYSTEM(),
      ];

      kategorien.forEach((kategorie) => {
        const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, kategorie);
        expect(eintrag.kategorie.equals(kategorie)).toBe(true);
      });
    });

    it('should preserve kategorie after markAsKorrigiert', () => {
      const kategorie = EtbKategorie.MASSNAHME();
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, kategorie);
      const korrekturId = EintragId.create().value!;

      eintrag.markAsKorrigiert(korrekturId);

      expect(eintrag.kategorie.equals(kategorie)).toBe(true);
    });

    it('should preserve kategorie for legacy deleted entries', () => {
      const kategorie = EtbKategorie.BEFEHL();
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, kategorie, undefined, undefined, undefined, undefined, undefined, true); // isDeleted via constructor

      expect(eintrag.kategorie.equals(kategorie)).toBe(true);
    });
  });

  describe('metadata handling', () => {
    it('should handle complex metadata objects', () => {
      const metadata = {
        screenshot: 'path/to/image.png',
        coordinates: { lat: 51.5, lon: 7.5 },
        tags: ['important', 'geo-tagged'],
        customData: { key: 'value' },
      };

      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, metadata);

      expect(eintrag.metadata).toEqual(metadata);
    });

    it('should preserve metadata after markAsKorrigiert', () => {
      const metadata = { key: 'value' };
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, metadata);
      const korrekturId = EintragId.create().value!;

      eintrag.markAsKorrigiert(korrekturId);

      expect(eintrag.metadata).toEqual(metadata);
    });

    it('should preserve metadata for legacy deleted entries', () => {
      const metadata = { screenshot: 'image.png' };
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, metadata, undefined, undefined, true); // isDeleted via constructor

      expect(eintrag.metadata).toEqual(metadata);
    });

    it('should handle undefined metadata', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);

      expect(eintrag.metadata).toBeUndefined();
    });
  });

  describe('Kontext und Zeitstempel (Issue #407)', () => {
    it('setzt erfasstAm automatisch auf jetzt, wenn nicht übergeben', () => {
      const before = Date.now();
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      const after = Date.now();

      expect(eintrag.erfasstAm.getTime()).toBeGreaterThanOrEqual(before);
      expect(eintrag.erfasstAm.getTime()).toBeLessThanOrEqual(after);
    });

    it('erfasstAm kann explizit für Rehydration aus DB gesetzt werden', () => {
      // Positional args 5-13: createdAt..updatedAt (9 slots), 14: ereignisZeitpunkt, 15: erfasstAm
      const erfasstAm = new Date('2026-04-14T10:00:00Z');
      const eintrag = new EtbEintrag(
        eintragId,
        sequenceNumber,
        testText,
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        erfasstAm,
      );
      expect(eintrag.erfasstAm.getTime()).toBe(erfasstAm.getTime());
    });

    it('ereignisZeitpunkt default = createdAt', () => {
      const created = new Date('2026-04-14T09:00:00Z');
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, created);
      expect(eintrag.ereignisZeitpunkt.getTime()).toBe(created.getTime());
    });

    it('ereignisZeitpunkt kann explizit gesetzt werden (Pos 14)', () => {
      const ereignis = new Date('2026-04-14T08:30:00Z');
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, ereignis);
      expect(eintrag.ereignisZeitpunkt.getTime()).toBe(ereignis.getTime());
    });

    it('Default-Kontext ist standard', () => {
      const eintrag = new EtbEintrag(eintragId, sequenceNumber, testText, userId);
      expect(eintrag.kontext.type).toBe('standard');
    });

    it('speichert FunkKontext korrekt (Pos 16)', () => {
      const { EintragKontext } = require('@domain/value-objects/eintrag-kontext');
      const kontext = EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' });
      const eintrag = new EtbEintrag(
        eintragId,
        sequenceNumber,
        testText,
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        kontext,
      );
      expect(eintrag.kontext.type).toBe('funkspruch');
      expect((eintrag.kontext as { kanalId: string }).kanalId).toBe('k1');
    });
  });
});
