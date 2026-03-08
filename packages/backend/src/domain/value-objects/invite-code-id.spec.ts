// @ts-nocheck
import { InviteCodeId } from '@domain/value-objects/invite-code-id';

// Valid InviteCodeId: inv_ + 24 lowercase alphanumeric CUID2
const VALID_ID = 'inv_ckpf2xrkc0001zyp8jq8qzx9';
const VALID_ID_2 = 'inv_abcdef123456ghijkl789012';

describe('InviteCodeId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create() - Auto-Generation ohne Parameter', () => {
    it('should generate ID with inv_ prefix and 24-char CUID2', () => {
      // Given: keine Vorbereitung noetig

      // When: Generiere neue ID
      const result = InviteCodeId.create();

      // Then: Erfolgreiche Generation mit korrektem Format
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toHaveLength(28); // inv_ (4) + CUID2 (24)
      expect(result.value?.value).toMatch(/^inv_[a-z0-9]{24}$/);
    });

    it('should generate ID starting with inv_ prefix', () => {
      // Given: keine Vorbereitung noetig

      // When: Generiere neue ID
      const result = InviteCodeId.create();

      // Then: ID startet mit korrektem Prefix
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value.startsWith('inv_')).toBe(true);
    });

    it('should generate unique IDs on each call', () => {
      // Given: Mehrere Generierungen

      // When: Generiere 10 IDs
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = InviteCodeId.create();
        expect(result.isSuccess).toBe(true);
        ids.push(result.value?.value);
      }

      // Then: Alle IDs sollten einzigartig sein
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should always return Result.ok (never fails without parameter)', () => {
      // Given: Viele Generierungsversuche

      // When/Then: Alle sollten erfolgreich sein
      for (let i = 0; i < 50; i++) {
        const result = InviteCodeId.create();
        expect(result.isSuccess).toBe(true);
        expect(result.isFailure).toBe(false);
      }
    });

    it('should generate CUID2 body with only lowercase alphanumeric', () => {
      // Given: keine Vorbereitung noetig

      // When: Generiere neue ID
      const result = InviteCodeId.create();

      // Then: Body Teil enthaelt nur lowercase alphanumeric
      expect(result.isSuccess).toBe(true);
      const body = result.value?.value.substring(4); // Nach "inv_"
      expect(body).toHaveLength(24);
      expect(body).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('create(id) - Validierung existierender ID', () => {
    it('should accept valid 28-character ID with inv_ prefix', () => {
      // Given: Gueltige ID
      const id = VALID_ID;

      // When: Parsen
      const result = InviteCodeId.create(id);

      // Then: Erfolg mit korrektem Wert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(id);
    });

    it('should trim whitespace before validation', () => {
      // Given: ID mit Whitespace
      const idWithSpaces = `  ${VALID_ID}  `;

      // When: Parsen
      const result = InviteCodeId.create(idWithSpaces);

      // Then: Erfolg mit getrimmtem Wert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(VALID_ID);
    });

    it('should reject empty string', () => {
      // Given: Leerer String

      // When: Parsen
      const result = InviteCodeId.create('');

      // Then: Fehler wegen falscher Laenge
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('28 Zeichen');
    });

    it('should reject ID that is too short (27 characters)', () => {
      // Given: 27-stellige ID (1 Zeichen zu kurz)
      const tooShort = 'inv_ckpf2xrkc0001zyp8jq8qz';

      // When: Parsen
      const result = InviteCodeId.create(tooShort);

      // Then: Fehler wegen falscher Laenge
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('28 Zeichen');
    });

    it('should reject ID that is too long (29 characters)', () => {
      // Given: 29-stellige ID (1 Zeichen zu lang)
      const tooLong = 'inv_ckpf2xrkc0001zyp8jq8qzx9a';

      // When: Parsen
      const result = InviteCodeId.create(tooLong);

      // Then: Fehler wegen falscher Laenge
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('28 Zeichen');
    });

    it('should reject ID with wrong prefix (user_ instead of inv_)', () => {
      // Given: ID mit falschem Prefix
      const wrongPrefix = 'user_ckpf2xrkc0001zyp8jq8qzx';

      // When: Parsen
      const result = InviteCodeId.create(wrongPrefix);

      // Then: Fehler wegen falschem Prefix
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("'inv_'");
    });

    it('should reject ID with no prefix', () => {
      // Given: ID ohne korrektes Prefix (28 Zeichen, aber falsches Prefix)
      const noPrefix = 'usr_ckpf2xrkc0001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(noPrefix);

      // Then: Fehler wegen falschem Prefix
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("'inv_'");
    });

    it('should reject ID with uppercase characters in body', () => {
      // Given: ID mit Grossbuchstaben im Body
      const withUppercase = 'inv_CKPF2xrkc0001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(withUppercase);

      // Then: Fehler wegen ungueltigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });

    it('should reject ID with special characters', () => {
      // Given: ID mit Sonderzeichen
      const withSpecial = 'inv_ckpf2xrkc0001zyp8jq8qz-!';

      // When: Parsen
      const result = InviteCodeId.create(withSpecial);

      // Then: Fehler wegen ungueltigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });

    it('should reject ID with hyphen in body', () => {
      // Given: ID mit Bindestrich
      const withHyphen = 'inv_ckpf2xrkc-001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(withHyphen);

      // Then: Fehler wegen ungueltigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });

    it('should reject ID with underscore in body', () => {
      // Given: ID mit Unterstrich im Body
      const withUnderscore = 'inv_ckpf2xrkc_001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(withUnderscore);

      // Then: Fehler wegen ungueltigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Format ungültig');
    });

    it('should reject ID with spaces in body', () => {
      // Given: ID mit Leerzeichen im Body
      const withSpace = 'inv_ckpf2xrkc 001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(withSpace);

      // Then: Fehler (nach Trim falsche Laenge oder Format)
      expect(result.isFailure).toBe(true);
    });
  });

  describe('equals() - Gleichheitsvergleich', () => {
    it('should return true for same value', () => {
      // Given: Zwei InviteCodeIds mit gleichem Wert
      const id1 = InviteCodeId.create(VALID_ID).value!;
      const id2 = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      // Given: Zwei unterschiedliche IDs
      const id1 = InviteCodeId.create(VALID_ID).value!;
      const id2 = InviteCodeId.create(VALID_ID_2).value!;

      // When/Then
      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false for null', () => {
      // Given: InviteCodeId
      const id = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id.equals(null as unknown as InviteCodeId)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Given: InviteCodeId
      const id = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id.equals(undefined)).toBe(false);
    });

    it('should return true for same instance', () => {
      // Given: Gleiche Instanz
      const id = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id.equals(id)).toBe(true);
    });

    it('should compare auto-generated IDs correctly', () => {
      // Given: Zwei auto-generierte IDs
      const id1 = InviteCodeId.create().value!;
      const id2 = InviteCodeId.create().value!;

      // When/Then: Unterschiedliche IDs
      expect(id1.equals(id2)).toBe(false);
      // Aber gleich mit sich selbst
      expect(id1.equals(id1)).toBe(true);
    });
  });

  describe('toString() - String-Repraesentation', () => {
    it('should return the full ID value', () => {
      // Given: InviteCodeId
      const id = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id.toString()).toBe(VALID_ID);
    });

    it('should return auto-generated ID correctly', () => {
      // Given: Auto-generierte ID
      const id = InviteCodeId.create().value!;

      // When/Then
      expect(id.toString()).toBe(id.value);
      expect(id.toString()).toMatch(/^inv_[a-z0-9]{24}$/);
    });
  });

  describe('value getter', () => {
    it('should return the ID value', () => {
      // Given: InviteCodeId
      const id = InviteCodeId.create(VALID_ID).value!;

      // When/Then
      expect(id.value).toBe(VALID_ID);
    });

    it('should be consistent (same value on multiple calls)', () => {
      // Given: InviteCodeId
      const id = InviteCodeId.create(VALID_ID).value!;

      // When: Mehrfacher Zugriff
      const value1 = id.value;
      const value2 = id.value;

      // Then: Gleicher Wert
      expect(value1).toBe(value2);
    });

    it('should return auto-generated value correctly', () => {
      // Given: Auto-generierte ID
      const id = InviteCodeId.create().value!;

      // When/Then
      expect(id.value).toHaveLength(28);
      expect(id.value.startsWith('inv_')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle only-whitespace input as invalid', () => {
      // Given: Nur Whitespace
      const whitespace = '   ';

      // When: Parsen
      const result = InviteCodeId.create(whitespace);

      // Then: Fehler wegen Laenge nach Trim
      expect(result.isFailure).toBe(true);
    });

    it('should handle numeric body correctly', () => {
      // Given: ID mit nur Zahlen im Body
      const numericBody = 'inv_123456789012345678901234';

      // When: Parsen
      const result = InviteCodeId.create(numericBody);

      // Then: Erfolg (nur lowercase alphanumeric erlaubt)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(numericBody);
    });

    it('should handle letter-only body correctly', () => {
      // Given: ID mit nur Buchstaben im Body
      const letterBody = 'inv_abcdefghijklmnopqrstuvwx';

      // When: Parsen
      const result = InviteCodeId.create(letterBody);

      // Then: Erfolg
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(letterBody);
    });

    it('should reject ID with unicode characters', () => {
      // Given: ID mit Unicode
      const withUnicode = 'inv_ckpf2xrkc0001zyp8jq8qz\u00E4';

      // When: Parsen
      const result = InviteCodeId.create(withUnicode);

      // Then: Fehler (entweder Laenge oder Format)
      expect(result.isFailure).toBe(true);
    });

    it('should reject ID with uppercase prefix', () => {
      // Given: ID mit Grossbuchstaben im Prefix
      const uppercasePrefix = 'INV_ckpf2xrkc0001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(uppercasePrefix);

      // Then: Fehler wegen falschem Prefix
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("'inv_'");
    });

    it('should reject mixed case prefix', () => {
      // Given: ID mit Mixed Case Prefix
      const mixedPrefix = 'Inv_ckpf2xrkc0001zyp8jq8qzx9';

      // When: Parsen
      const result = InviteCodeId.create(mixedPrefix);

      // Then: Fehler wegen falschem Prefix
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("'inv_'");
    });
  });
});
