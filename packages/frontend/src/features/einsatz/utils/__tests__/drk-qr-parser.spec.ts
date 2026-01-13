import { describe, it, expect } from 'vitest';
import { isDrkQrCodeFormat, parseDrkQrCode, DrkQrParseErrorCode } from '../drk-qr-parser';

describe('DRK QR Parser', () => {
  describe('isDrkQrCodeFormat', () => {
    describe('valid formats', () => {
      describe('CSV format (echte DRK-Meldekarten)', () => {
        it('should accept valid CSV format with all fields', () => {
          // Given - echte DRK-Meldekarte Format
          const qrContent = 'Vitt;Ruben;07.04.1997;m;29525;;deutsch;;M45GVP3KNS;KV;DRK;;;;;0151;mail;358556;UUID';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should accept minimal CSV format with 18 fields', () => {
          // Given - minimale Feldanzahl
          const qrContent = 'Name;Vorname;;;;;;;;;;;;;;;;;123456;';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should accept CSV with special characters', () => {
          // Given
          const qrContent = 'Müller;Hans-Peter;01.01.1990;m;12345;;deutsch;;ABC123;KV;DRK;;;;;0151;test@example.com;999;UUID';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should accept CSV with URL-encoded characters', () => {
          // Given
          const qrContent = 'M%C3%BCller;Hans%20Peter;;;;;;;;;;;;;;;;;123;';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });
      });

      describe('URL format (Legacy)', () => {
        it('should accept standard DRK person QR code', () => {
          // Given
          const qrContent = 'drk://person?mnr=12345&vn=Max&nn=Mustermann';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should accept URL format with optional funkkennung', () => {
          // Given
          const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test&fk=FL-1';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should be case insensitive for protocol', () => {
          // Given / When / Then
          expect(isDrkQrCodeFormat('DRK://person?mnr=1&vn=A&nn=B')).toBe(true);
          expect(isDrkQrCodeFormat('Drk://Person?mnr=1&vn=A&nn=B')).toBe(true);
          expect(isDrkQrCodeFormat('drk://PERSON?mnr=1&vn=A&nn=B')).toBe(true);
        });

        it('should accept URL with extra whitespace', () => {
          // Given
          const qrContent = '  drk://person?mnr=123&vn=Max&nn=Test  ';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true);
        });

        it('should accept URL format without query params (CRITICAL Issue 4)', () => {
          // Given - Edge case: drk://person without params
          const qrContent = 'drk://person';

          // When
          const result = isDrkQrCodeFormat(qrContent);

          // Then
          expect(result).toBe(true); // Format detection passes, parsing will fail later
        });
      });
    });

    describe('invalid formats', () => {
      it.each([
        ['http protocol', 'http://example.com'],
        ['https protocol', 'https://example.com'],
        ['mailto protocol', 'mailto:test@example.com'],
        ['empty string', ''],
        ['whitespace only', '   '],
        ['random text', 'not a qr code'],
        ['incomplete CSV (< 18 fields)', 'Name;Vorname;Date'],
        ['null-like input', 'null'],
        ['undefined-like input', 'undefined'],
      ])('should reject %s', (_name, input) => {
        expect(isDrkQrCodeFormat(input)).toBe(false);
      });

      // Note: isDrkQrCodeFormat accepts any drk:// URL for format detection
      // The actual type validation happens during parsing (parseDrkQrCode)
      it.each([
        ['wrong drk type', 'drk://vehicle?id=123'],
        ['drk without type', 'drk://'],
      ])('should accept %s (validation happens during parsing)', (_name, input) => {
        // Format detection accepts all drk:// URLs
        expect(isDrkQrCodeFormat(input)).toBe(true);
      });

      it('should reject non-string input', () => {
        // @ts-expect-error - Testing runtime validation
        expect(isDrkQrCodeFormat(null)).toBe(false);
        // @ts-expect-error - Testing runtime validation
        expect(isDrkQrCodeFormat(undefined)).toBe(false);
        // @ts-expect-error - Testing runtime validation
        expect(isDrkQrCodeFormat(123)).toBe(false);
        // @ts-expect-error - Testing runtime validation
        expect(isDrkQrCodeFormat({})).toBe(false);
      });
    });
  });

  describe('parseDrkQrCode', () => {
    describe('CSV format - success cases', () => {
      it('should parse complete CSV with all fields (Medium Issue 6 - Complete assertions)', () => {
        // Given - echte DRK-Meldekarte
        const qrContent = 'Vitt;Ruben;07.04.1997;m;29525;;deutsch;;M45GVP3KNS;KV;DRK;;;;;0151;mail;358556;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          // Medium Issue 6: Verify ALL extracted fields, not just success
          expect(result.data.nachname).toBe('Vitt');
          expect(result.data.vorname).toBe('Ruben');
          expect(result.data.personalnummer).toBe('358556'); // Mitgliedsnummer (Index 17)
          expect(result.data.funkkennung).toBeUndefined(); // CSV format has no funkkennung

          // Verify field extraction correctness
          expect(result.data.nachname).toHaveLength(4);
          expect(result.data.vorname).toHaveLength(5);
          expect(result.data.personalnummer).toHaveLength(6);

          // Verify no extra whitespace
          expect(result.data.nachname.trim()).toBe(result.data.nachname);
          expect(result.data.vorname.trim()).toBe(result.data.vorname);
          expect(result.data.personalnummer.trim()).toBe(result.data.personalnummer);
        }
      });

      it('should use PersonalCode as fallback if Mitgliedsnummer is empty', () => {
        // Given - Mitgliedsnummer (Index 17) leer, PersonalCode (Index 8) vorhanden
        // Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = 'Mustermann;Max;01.01.1990;m;12345;;deutsch;;M45GVP3KNS;KV;DRK;;;;;0151;mail;;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('M45GVP3KNS'); // PersonalCode fallback
        }
      });

      it('should decode URL-encoded German umlauts in CSV', () => {
        // Given - Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = 'M%C3%BCller;Gro%C3%9Fe;01.01.1990;m;12345;;deutsch;;ABC123;KV;DRK;;;;;0151;mail;999;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nachname).toBe('Müller');
          expect(result.data.vorname).toBe('Große');
        }
      });

      it('should trim whitespace from CSV fields', () => {
        // Given - Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = ' Mustermann ; Max ;01.01.1990;m;12345;;deutsch;;ABC123;KV;DRK;;;;;0151;mail; 123456 ;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nachname).toBe('Mustermann');
          expect(result.data.vorname).toBe('Max');
          expect(result.data.personalnummer).toBe('123456');
        }
      });

      it('should handle special characters in names (hyphen, apostrophe)', () => {
        // Given - Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = "O'Connor;Jean-Paul;01.01.1990;m;12345;;deutsch;;ABC123;KV;DRK;;;;;0151;mail;999;UUID";

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nachname).toBe("O'Connor");
          expect(result.data.vorname).toBe('Jean-Paul');
        }
      });

      it('should handle CSV with more than minimum fields', () => {
        // Given - 21 Felder statt nur 18 (echte DRK-Karte hat 19)
        // Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID;extra;field
        const qrContent = 'Test;User;01.01.1990;m;12345;;deutsch;;CODE123;KV;DRK;;;;;0151;mail;456;UUID;extra;field';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('456');
        }
      });
    });

    describe('CSV format - error cases (CRITICAL Issue 6)', () => {
      it('should return INVALID_PROTOCOL when CSV has less than 18 fields', () => {
        // Given - Only 17 fields (< 18 minimum)
        const qrContent = 'Name;Vorname;Date;M;12345;;deutsch;;CODE;KV;DRK;;;;;0151;mail';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.INVALID_PROTOCOL);
          expect(result.error.message).toContain('unbekanntes Format');
        }
      });

      it('should return INVALID_PROTOCOL when CSV has only 3 fields', () => {
        // Given - Way too few fields
        const qrContent = 'Name;Vorname;Date';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.INVALID_PROTOCOL);
        }
      });

      it('should return EMPTY_FIELD_VALUE when nachname is empty (CRITICAL Issue 6)', () => {
        // Given - Nachname (Index 0) ist leer
        const qrContent = ';Vorname;;;;;;;;;CODE;KV;DRK;;;;;;;;;123;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe('nachname');
          expect(result.error.message).toContain('Nachname');
        }
      });

      it('should return EMPTY_FIELD_VALUE when vorname is empty', () => {
        // Given - Vorname (Index 1) ist leer
        const qrContent = 'Nachname;;;;;;;;;;CODE;KV;DRK;;;;;;;;;123;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe('vorname');
          expect(result.error.message).toContain('Vorname');
        }
      });

      it('should return MISSING_REQUIRED_FIELD when both personalnummer and personalcode are empty (CRITICAL Issue 6)', () => {
        // Given - PersonalCode (Index 8) und Mitgliedsnummer (Index 17) beide leer
        const qrContent = 'Nachname;Vorname;;;;;;;;;KV;DRK;;;;;;;;;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.MISSING_REQUIRED_FIELD);
          expect(result.error.field).toBe('personalnummer');
          expect(result.error.message).toContain('Mitgliedsnummer');
        }
      });

      it('should return EMPTY_FIELD_VALUE when vorname is whitespace-only (CRITICAL Issue 6)', () => {
        // Given - Vorname (Index 1) ist nur Whitespace
        const qrContent = 'Nachname;   ;;;;;;;;;CODE;KV;DRK;;;;;;;;;123;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe('vorname');
        }
      });

      it('should return error when all critical fields are empty (CRITICAL Issue 6)', () => {
        // Given - Nachname, Vorname, beide IDs leer (nur Separatoren)
        const qrContent = ';;;;;;;;;;KV;DRK;;;;;;;;;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should fail on first critical field check (nachname)
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe('nachname');
        }
      });

      it('should return INVALID_PROTOCOL when CSV has insufficient fields', () => {
        // Given - Weniger als 18 Felder
        const qrContent = 'Nachname;Vorname;Date';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.INVALID_PROTOCOL);
          expect(result.error.message).toContain('unbekanntes Format');
        }
      });
    });

    describe('URL format - success cases', () => {
      it('should parse complete URL QR code with all fields', () => {
        // Given
        const qrContent = 'drk://person?mnr=12345&vn=Max&nn=Mustermann&fk=FL-1';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('12345');
          expect(result.data.vorname).toBe('Max');
          expect(result.data.nachname).toBe('Mustermann');
          expect(result.data.funkkennung).toBe('FL-1');
        }
      });

      it('should parse URL QR code without optional funkkennung', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('123');
          expect(result.data.vorname).toBe('Max');
          expect(result.data.nachname).toBe('Test');
          expect(result.data.funkkennung).toBeUndefined();
        }
      });

      it('should decode URL-encoded German umlauts', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=M%C3%BCller&nn=Gro%C3%9Fe';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('Müller');
          expect(result.data.nachname).toBe('Große');
        }
      });

      it('should decode URL-encoded spaces and special characters', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=Hans%20Peter&nn=M%C3%BCller-Schmidt';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('Hans Peter');
          expect(result.data.nachname).toBe('Müller-Schmidt');
        }
      });

      it('should trim whitespace from URL parameter values', () => {
        // Given
        const qrContent = 'drk://person?mnr= 123 &vn= Max &nn= Test ';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('123');
          expect(result.data.vorname).toBe('Max');
          expect(result.data.nachname).toBe('Test');
        }
      });

      it('should ignore empty funkkennung parameter', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test&fk=';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.funkkennung).toBeUndefined();
        }
      });

      it('should ignore whitespace-only funkkennung parameter', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test&fk=   ';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.funkkennung).toBeUndefined();
        }
      });

      it('should ignore unknown parameters', () => {
        // Given - extra Parameter "extra" und "unknown"
        const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test&extra=value&unknown=123';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('123');
          // Extra parameters werden ignoriert
        }
      });

      it('should handle parameter order variations', () => {
        // Given - Parameter in unterschiedlicher Reihenfolge
        const qrContent = 'drk://person?nn=Test&vn=Max&mnr=123';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('123');
          expect(result.data.vorname).toBe('Max');
          expect(result.data.nachname).toBe('Test');
        }
      });

      it('should handle very long personalnummer (up to URL limits)', () => {
        // Given
        const longNumber = 'A'.repeat(100);
        const qrContent = `drk://person?mnr=${longNumber}&vn=Max&nn=Test`;

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe(longNumber);
        }
      });

      it('should handle names with apostrophes and hyphens', () => {
        // Given
        const qrContent = "drk://person?mnr=123&vn=Jean-Paul&nn=O'Connor";

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('Jean-Paul');
          expect(result.data.nachname).toBe("O'Connor");
        }
      });

      it('should handle double URL encoding (Medium Issue 9)', () => {
        // Given - Double encoded umlaut: ü -> %C3%BC -> %25C3%25BC
        const qrContent = 'drk://person?mnr=123&vn=M%25C3%25BCller&nn=Test';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          // First decode: %25 -> %, resulting in M%C3%BCller
          // Parser should handle this gracefully
          expect(result.data.vorname).toBeTruthy();
        }
      });

      it('should handle invalid URL encoding gracefully (Medium Issue 9)', () => {
        // Given - Invalid encoding: % without hex digits
        const qrContent = 'drk://person?mnr=123&vn=Test%&nn=Name';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          // Should keep original or handle gracefully
          expect(result.data.vorname).toBeTruthy();
        }
      });

      it('should handle mixed encoded and unencoded characters (Medium Issue 9)', () => {
        // Given - Some chars encoded, some not
        const qrContent = 'drk://person?mnr=123&vn=Max%20M%C3%BCller&nn=Test-Name';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('Max Müller');
          expect(result.data.nachname).toBe('Test-Name');
        }
      });

      it('should be case insensitive for protocol and type', () => {
        // Given
        const qrContent = 'DRK://PERSON?mnr=123&vn=Max&nn=Test';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('123');
        }
      });
    });

    describe('URL format - error cases', () => {
      it('should return EMPTY_INPUT for empty string', () => {
        // Given
        const qrContent = '';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_INPUT);
          expect(result.error.message).toContain('leer');
        }
      });

      it('should return EMPTY_INPUT for whitespace-only string', () => {
        // Given
        const qrContent = '   ';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_INPUT);
        }
      });

      it('should return EMPTY_INPUT for non-string input', () => {
        // Given / When / Then
        // @ts-expect-error - Testing runtime validation
        expect(parseDrkQrCode(null).success).toBe(false);
        // @ts-expect-error - Testing runtime validation
        expect(parseDrkQrCode(undefined).success).toBe(false);
      });

      it('should return MALFORMED_URL for invalid URL structure', () => {
        // Given - eckige Klammer ohne schließende Klammer ist ungültig
        const qrContent = 'drk://[invalid';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.MALFORMED_URL);
          expect(result.error.message).toContain('ungültiges URL-Format');
        }
      });

      it('should return INVALID_PROTOCOL for wrong protocol', () => {
        // Given - non-drk protocol is rejected as unknown format
        const qrContent = 'http://person?mnr=123&vn=Max&nn=Test';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          // Non-drk URLs are treated as unknown format, not parsed as URL
          expect(result.error.code).toBe(DrkQrParseErrorCode.INVALID_PROTOCOL);
          expect(result.error.message).toContain('unbekanntes Format');
        }
      });

      it('should return INVALID_TYPE for wrong type (not person)', () => {
        // Given
        const qrContent = 'drk://vehicle?mnr=123&vn=Max&nn=Test';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.INVALID_TYPE);
          expect(result.error.message).toContain('Ungültiger Typ');
        }
      });

      it.each([
        ['mnr', 'drk://person?vn=Max&nn=Test', 'personalnummer'],
        ['vn', 'drk://person?mnr=123&nn=Test', 'vorname'],
        ['nn', 'drk://person?mnr=123&vn=Max', 'nachname'],
      ])('should return MISSING_REQUIRED_FIELD when %s is missing', (_param, input, field) => {
        // When
        const result = parseDrkQrCode(input);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.MISSING_REQUIRED_FIELD);
          expect(result.error.field).toBe(field);
          expect(result.error.message).toContain('fehlt');
        }
      });

      it.each([
        ['mnr', 'drk://person?mnr=&vn=Max&nn=Test', 'personalnummer'],
        ['vn', 'drk://person?mnr=123&vn=&nn=Test', 'vorname'],
        ['nn', 'drk://person?mnr=123&vn=Max&nn=', 'nachname'],
      ])('should return EMPTY_FIELD_VALUE when %s is empty', (_param, input, field) => {
        // When
        const result = parseDrkQrCode(input);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe(field);
          expect(result.error.message).toContain('darf nicht leer sein');
        }
      });

      it.each([
        ['mnr', 'drk://person?mnr=   &vn=Max&nn=Test', 'personalnummer'],
        ['vn', 'drk://person?mnr=123&vn=   &nn=Test', 'vorname'],
        ['nn', 'drk://person?mnr=123&vn=Max&nn=   ', 'nachname'],
      ])('should return EMPTY_FIELD_VALUE when %s is whitespace-only', (_param, input, field) => {
        // When
        const result = parseDrkQrCode(input);

        // Then
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(DrkQrParseErrorCode.EMPTY_FIELD_VALUE);
          expect(result.error.field).toBe(field);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle duplicate parameters (URL uses first value)', () => {
        // Given - mnr erscheint zweimal
        const qrContent = 'drk://person?mnr=123&vn=Max&nn=Test&mnr=456';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          // URLSearchParams.get() returns the first value for duplicate keys
          expect(result.data.personalnummer).toBe('123');
        }
      });

      it('should handle mixed URL encoding in CSV', () => {
        // Given - teilweise encoded, teilweise nicht
        // Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = 'M%C3%BCller;Hans Peter;01.01.1990;m;12345;;deutsch;;ABC;KV;DRK;;;;;0151;mail;123;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nachname).toBe('Müller');
          expect(result.data.vorname).toBe('Hans Peter');
        }
      });

      it('should handle invalid URL encoding gracefully in CSV', () => {
        // Given - ungültiges URL-Encoding (% ohne Hex)
        // Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = 'Test%Name;Vorname;01.01.1990;m;12345;;deutsch;;ABC;KV;DRK;;;;;0151;mail;123;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          // Sollte den Original-String behalten wenn Decoding fehlschlägt
          expect(result.data.nachname).toBe('Test%Name');
        }
      });

      it('should handle numeric-only names', () => {
        // Given
        const qrContent = 'drk://person?mnr=123&vn=123&nn=456';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('123');
          expect(result.data.nachname).toBe('456');
        }
      });

      it('should handle single character names', () => {
        // Given
        const qrContent = 'drk://person?mnr=1&vn=A&nn=B';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vorname).toBe('A');
          expect(result.data.nachname).toBe('B');
        }
      });

      it('should handle CSV with exactly 18 fields (minimum)', () => {
        // Given - genau 18 Felder (Index 0-17), 17 Semikolons
        // Format: 0;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17
        const qrContent = 'N;V;;;;;;;PC;;;;;;;;;M';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nachname).toBe('N');
          expect(result.data.vorname).toBe('V');
          expect(result.data.personalnummer).toBe('M');
        }
      });

      it('should prefer Mitgliedsnummer over PersonalCode when both present', () => {
        // Given - beide Felder gefüllt
        // Format: Nachname;Vorname;Geb;Geschl;PLZ;;Nat;;PersonalCode;KV;Bereit;;;;;Tel;Mail;MitgliedsNr;UUID
        const qrContent = 'Test;User;01.01.1990;m;12345;;deutsch;;PERSONAL_CODE;KV;DRK;;;;;0151;mail;MITGLIEDSNUMMER;UUID';

        // When
        const result = parseDrkQrCode(qrContent);

        // Then
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.personalnummer).toBe('MITGLIEDSNUMMER'); // bevorzugt
        }
      });
    });
  });
});
