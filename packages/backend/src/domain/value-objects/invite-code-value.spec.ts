import { InviteCodeValue } from '@domain/value-objects/invite-code-value';

// Valid InviteCodeValue: 8 Zeichen, uppercase alphanumeric
const VALID_CODE = 'ABC12345';
const VALID_CODE_2 = 'XYZ98765';

describe('InviteCodeValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generate() - Zufällige Code-Generierung', () => {
    it('should generate 8-character alphanumeric code', () => {
      // Given: keine Vorbereitung nötig

      // When: Generiere neuen Code
      const result = InviteCodeValue.generate();

      // Then: Erfolgreiche Generation mit korrektem Format
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.value).toHaveLength(8);
    });

    it('should generate uppercase letters and digits only', () => {
      // Given: keine Vorbereitung nötig

      // When: Generiere neuen Code
      const result = InviteCodeValue.generate();

      // Then: Nur Großbuchstaben und Ziffern
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should generate unique codes on each call', () => {
      // Given: Mehrere Generierungen

      // When: Generiere 10 Codes
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = InviteCodeValue.generate();
        expect(result.isSuccess).toBe(true);
        codes.push(result.value!.value);
      }

      // Then: Alle Codes sollten einzigartig sein
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should always return Result.ok (never fails)', () => {
      // Given: Viele Generierungsversuche

      // When/Then: Alle sollten erfolgreich sein
      for (let i = 0; i < 100; i++) {
        const result = InviteCodeValue.generate();
        expect(result.isSuccess).toBe(true);
        expect(result.isFailure).toBe(false);
      }
    });
  });

  describe('fromString() - Code-Parsing und Validierung', () => {
    it('should parse valid 8-character uppercase code', () => {
      // Given: Gültiger Code
      const code = VALID_CODE;

      // When: Parsen
      const result = InviteCodeValue.fromString(code);

      // Then: Erfolg mit korrektem Wert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(code);
    });

    it('should normalize lowercase to uppercase', () => {
      // Given: Kleinbuchstaben-Code
      const lowercaseCode = 'abc12345';

      // When: Parsen
      const result = InviteCodeValue.fromString(lowercaseCode);

      // Then: Erfolg mit uppercase Normalisierung
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ABC12345');
    });

    it('should normalize mixed case to uppercase', () => {
      // Given: Mixed Case Code
      const mixedCase = 'AbC12xYz';

      // When: Parsen
      const result = InviteCodeValue.fromString(mixedCase);

      // Then: Erfolg mit uppercase Normalisierung
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ABC12XYZ');
    });

    it('should trim whitespace before validation', () => {
      // Given: Code mit Whitespace
      const codeWithSpaces = `  ${VALID_CODE}  `;

      // When: Parsen
      const result = InviteCodeValue.fromString(codeWithSpaces);

      // Then: Erfolg mit getrimmtem Wert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe(VALID_CODE);
    });

    it('should reject empty string', () => {
      // Given: Leerer String

      // When: Parsen
      const result = InviteCodeValue.fromString('');

      // Then: Fehler
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EMPTY');
    });

    it('should reject null-like empty input', () => {
      // Given: Nur Whitespace

      // When: Parsen (trim macht es leer, dann zu kurz)
      const result = InviteCodeValue.fromString('   ');

      // Then: Fehler wegen ungültiger Länge nach Trim
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_LENGTH');
    });

    it('should reject code with 7 characters (too short)', () => {
      // Given: 7-stelliger Code
      const tooShort = 'ABC1234';

      // When: Parsen
      const result = InviteCodeValue.fromString(tooShort);

      // Then: Fehler wegen falscher Länge
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_LENGTH');
    });

    it('should reject code with 9 characters (too long)', () => {
      // Given: 9-stelliger Code
      const tooLong = 'ABC123456';

      // When: Parsen
      const result = InviteCodeValue.fromString(tooLong);

      // Then: Fehler wegen falscher Länge
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_LENGTH');
    });

    it('should reject code with special characters', () => {
      // Given: Code mit Sonderzeichen
      const withSpecial = 'ABC1234!';

      // When: Parsen
      const result = InviteCodeValue.fromString(withSpecial);

      // Then: Fehler wegen ungültigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_FORMAT');
    });

    it('should reject code with hyphen', () => {
      // Given: Code mit Bindestrich
      const withHyphen = 'ABC-1234';

      // When: Parsen
      const result = InviteCodeValue.fromString(withHyphen);

      // Then: Fehler wegen ungültigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_FORMAT');
    });

    it('should reject code with underscore', () => {
      // Given: Code mit Unterstrich
      const withUnderscore = 'ABC_1234';

      // When: Parsen
      const result = InviteCodeValue.fromString(withUnderscore);

      // Then: Fehler wegen ungültigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_FORMAT');
    });

    it('should reject code with spaces inside', () => {
      // Given: Code mit Leerzeichen in der Mitte
      const withInternalSpace = 'ABC 1234';

      // When: Parsen (8 Zeichen inklusive Leerzeichen)
      const result = InviteCodeValue.fromString(withInternalSpace);

      // Then: Fehler wegen ungültigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_FORMAT');
    });
  });

  describe('equals() - Gleichheitsvergleich', () => {
    it('should return true for same value', () => {
      // Given: Zwei InviteCodeValues mit gleichem Wert
      const code1 = InviteCodeValue.fromString(VALID_CODE).value!;
      const code2 = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code1.equals(code2)).toBe(true);
    });

    it('should return true for same normalized value', () => {
      // Given: Gleicher Code, unterschiedliche Schreibweise
      const code1 = InviteCodeValue.fromString('ABC12345').value!;
      const code2 = InviteCodeValue.fromString('abc12345').value!;

      // When/Then: Nach Normalisierung sollten sie gleich sein
      expect(code1.equals(code2)).toBe(true);
    });

    it('should return false for different values', () => {
      // Given: Zwei unterschiedliche Codes
      const code1 = InviteCodeValue.fromString(VALID_CODE).value!;
      const code2 = InviteCodeValue.fromString(VALID_CODE_2).value!;

      // When/Then
      expect(code1.equals(code2)).toBe(false);
    });

    it('should return false for null', () => {
      // Given: InviteCodeValue
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code.equals(null as unknown as InviteCodeValue)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Given: InviteCodeValue
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code.equals(undefined)).toBe(false);
    });

    it('should return true for same instance', () => {
      // Given: Gleiche Instanz
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code.equals(code)).toBe(true);
    });
  });

  describe('toMasked() - Maskierte Darstellung', () => {
    it('should show first 4 characters and mask the rest with asterisks', () => {
      // Given: Gültiger Code
      const code = InviteCodeValue.fromString('ABC12345').value!;

      // When: Maskierung
      const masked = code.toMasked();

      // Then: Erste 4 Zeichen sichtbar, Rest maskiert
      expect(masked).toBe('ABC1****');
    });

    it('should produce consistent masked output format', () => {
      // Given: Verschiedene Codes
      const codes = ['ABCD1234', 'XYZ98765', 'TEST0000', 'AAAA1111'];

      for (const codeStr of codes) {
        // When: Maskierung
        const code = InviteCodeValue.fromString(codeStr).value!;
        const masked = code.toMasked();

        // Then: Format prüfen (4 Zeichen + 4 Sternchen)
        expect(masked).toHaveLength(8);
        expect(masked.substring(0, 4)).toBe(codeStr.substring(0, 4));
        expect(masked.substring(4)).toBe('****');
      }
    });

    it('should preserve case in masked output', () => {
      // Given: Code (wird zu Uppercase normalisiert)
      const code = InviteCodeValue.fromString('abcd1234').value!;

      // When: Maskierung
      const masked = code.toMasked();

      // Then: Uppercase in maskierter Ausgabe
      expect(masked).toBe('ABCD****');
    });

    it('should validate masked output matches expected format', () => {
      // Given: Verschiedene gültige Codes
      const codes = ['ABC12345', 'XYZ98765', 'TEST0000', '12345678', 'ABCDEFGH'];

      for (const codeStr of codes) {
        // When: Maskierung
        const code = InviteCodeValue.fromString(codeStr).value!;
        const masked = code.toMasked();

        // Then: Maskierter Code muss Format [A-Z0-9]{4}\*{4} entsprechen
        expect(masked).toMatch(/^[A-Z0-9]{4}\*{4}$/);
      }
    });

    it('should throw error if masking produces invalid format (defensive programming)', () => {
      // Given: Code mit korrupten internen State simulieren
      const code = InviteCodeValue.fromString('ABC12345').value!;

      // Mock substring() um fehlerhaften Masking-Output zu simulieren
      jest.spyOn(String.prototype, 'substring').mockReturnValueOnce('AB'); // Nur 2 Zeichen

      // When/Then: toMasked() sollte Error werfen bei ungültigem Format
      expect(() => code.toMasked()).toThrow('Code masking validation failed');

      // Cleanup
      jest.restoreAllMocks();
    });

    it('should throw error with descriptive message on invalid masked format', () => {
      // Given: Code mit simuliertem fehlerhaften Maskierungs-Output
      const code = InviteCodeValue.fromString('ABC12345').value!;

      // Mock substring() um ungültigen Output zu erzeugen
      jest.spyOn(String.prototype, 'substring').mockReturnValueOnce('ABC'); // 3 Zeichen

      // When/Then: Error enthält erwartetes Format
      expect(() => code.toMasked()).toThrow(/expected format \[A-Z0-9\]\{4\}\\\*\{4\}/);

      // Cleanup
      jest.restoreAllMocks();
    });
  });

  describe('toString() - String-Repräsentation', () => {
    it('should return the full code value', () => {
      // Given: InviteCodeValue
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code.toString()).toBe(VALID_CODE);
    });

    it('should return normalized (uppercase) code', () => {
      // Given: Code erstellt aus Kleinbuchstaben
      const code = InviteCodeValue.fromString('abc12345').value!;

      // When/Then
      expect(code.toString()).toBe('ABC12345');
    });
  });

  describe('value getter', () => {
    it('should return the code value', () => {
      // Given: InviteCodeValue
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When/Then
      expect(code.value).toBe(VALID_CODE);
    });

    it('should be immutable (same reference on multiple calls)', () => {
      // Given: InviteCodeValue
      const code = InviteCodeValue.fromString(VALID_CODE).value!;

      // When: Mehrfacher Zugriff
      const value1 = code.value;
      const value2 = code.value;

      // Then: Gleicher Wert
      expect(value1).toBe(value2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all-digit code', () => {
      // Given: Nur Ziffern
      const numericCode = '12345678';

      // When: Parsen
      const result = InviteCodeValue.fromString(numericCode);

      // Then: Erfolg
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('12345678');
    });

    it('should handle all-letter code', () => {
      // Given: Nur Buchstaben
      const letterCode = 'ABCDEFGH';

      // When: Parsen
      const result = InviteCodeValue.fromString(letterCode);

      // Then: Erfolg
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ABCDEFGH');
    });

    it('should reject umlaut characters', () => {
      // Given: Code mit Umlauten
      const withUmlauts = 'ÄBCD1234';

      // When: Parsen
      const result = InviteCodeValue.fromString(withUmlauts);

      // Then: Fehler wegen ungültigem Format
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID_FORMAT');
    });

    it('should reject unicode characters', () => {
      // Given: Code mit Unicode
      const withUnicode = 'ABC🚀1234';

      // When: Parsen - Unicode-Zeichen zählen ggf. anders
      const result = InviteCodeValue.fromString(withUnicode);

      // Then: Fehler (entweder Länge oder Format)
      expect(result.isFailure).toBe(true);
    });
  });
});
