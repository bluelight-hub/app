import { createId } from '@paralleldrive/cuid2';
import { RegistrierePersonViaQrCodeCommand } from '../registriere-person-qr.command';

describe('RegistrierePersonViaQrCodeCommand', () => {
  const validUserId = createId();
  const validEinsatzId = createId();

  const createValidProps = (overrides = {}) => ({
    einsatzId: validEinsatzId,
    personalnummer: '12345',
    vorname: 'Max',
    nachname: 'Mustermann',
    funkkennung: 'FL-1',
    registriertVon: validUserId,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('valid inputs', () => {
      it('should accept German names with umlauts', () => {
        // Given
        const props = createValidProps({ vorname: 'Müller', nachname: 'Größe' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Müller');
        expect(result.value?.nachname).toBe('Größe');
      });

      it('should accept names with hyphens', () => {
        // Given
        const props = createValidProps({ vorname: 'Hans-Peter', nachname: 'Müller-Schmidt' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Hans-Peter');
        expect(result.value?.nachname).toBe('Müller-Schmidt');
      });

      it('should accept names with apostrophes', () => {
        // Given
        const props = createValidProps({ vorname: 'Patrick', nachname: "O'Brien" });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toBe("O'Brien");
      });

      it('should accept names with spaces', () => {
        // Given
        const props = createValidProps({ vorname: 'Maria Anna', nachname: 'von Müller' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Maria Anna');
        expect(result.value?.nachname).toBe('von Müller');
      });

      it('should accept eszett character', () => {
        // Given
        const props = createValidProps({ nachname: 'Straße' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toBe('Straße');
      });

      it('should accept all German umlauts combined', () => {
        // Given
        const props = createValidProps({ vorname: 'Äöüß', nachname: 'ÄÖÜẞ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Äöüß');
        expect(result.value?.nachname).toBe('ÄÖÜẞ');
      });

      it('should accept valid personalnummer', () => {
        // Given
        const props = createValidProps({ personalnummer: 'DRK-12345-AB' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toBe('DRK-12345-AB');
      });

      it('should accept valid funkkennung', () => {
        // Given
        const props = createValidProps({ funkkennung: 'FL-1234' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toBe('FL-1234');
      });

      it('should accept undefined funkkennung', () => {
        // Given
        const props = createValidProps({ funkkennung: undefined });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toBeUndefined();
      });

      it('should convert empty funkkennung to undefined', () => {
        // Given
        const props = createValidProps({ funkkennung: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toBeUndefined();
      });
    });

    describe('XSS attack prevention - vorname', () => {
      it.each([
        ['script tag', '<script>alert(1)</script>'],
        ['closing script tag', '</script>'],
        ['encoded script tag', '&lt;script&gt;'],
        ['uppercase script', '<SCRIPT>alert(1)</SCRIPT>'],
        ['event handler onerror', 'Max onerror=alert(1)'],
        ['event handler onclick', 'Max onclick=alert(1)'],
        ['event handler onload', 'Max onload=alert(1)'],
        ['event handler onmouseover', 'Max onmouseover=alert(1)'],
        ['event handler onfocus', 'Max onfocus=alert(1)'],
        ['javascript protocol', 'javascript:alert(1)'],
        ['javascript protocol mixed case', 'JaVaScRiPt:alert(1)'],
        ['data uri', 'data:text/html,<script>'],
        ['data uri with base64', 'data:text/html;base64,PHNjcmlwdD4='],
        ['less-than symbol', 'Max < Min'],
        ['greater-than symbol', 'Max > Min'],
        ['HTML tag img', '<img src=x>'],
        ['HTML tag iframe', '<iframe src=x>'],
        ['HTML tag object', '<object data=x>'],
        ['HTML tag embed', '<embed src=x>'],
      ])('should reject %s in vorname', (_name, maliciousInput) => {
        // Given
        const props = createValidProps({ vorname: maliciousInput });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('XSS attack prevention - nachname', () => {
      it.each([
        ['script tag', '<script>alert(1)</script>'],
        ['encoded script tag', '&lt;script&gt;'],
        ['encoded script end tag', '&gt;script&lt;'],
        ['event handler', 'Schmidt onerror=alert(1)'],
        ['event handler onchange', 'Schmidt onchange=alert(1)'],
        ['javascript protocol', 'javascript:void(0)'],
        ['data uri', 'data:text/html,test'],
        ['less-than symbol', 'A < B'],
        ['greater-than symbol', 'A > B'],
        ['HTML tag div', '<div>test</div>'],
        ['HTML tag a', '<a href=x>'],
      ])('should reject %s in nachname', (_name, maliciousInput) => {
        // Given
        const props = createValidProps({ nachname: maliciousInput });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('XSS attack prevention - personalnummer', () => {
      it.each([
        ['script tag', '<script>alert(1)</script>'],
        ['encoded script tag', '&lt;script&gt;'],
        ['event handler', '12345 onerror=alert(1)'],
        ['event handler onsubmit', '12345 onsubmit=alert(1)'],
        ['javascript protocol', 'javascript:alert(1)'],
        ['data uri', 'data:text/html,<script>'],
        ['less-than symbol', '123<456'],
        ['greater-than symbol', '123>456'],
        ['HTML tag', '<b>12345</b>'],
      ])('should reject %s in personalnummer', (_name, maliciousInput) => {
        // Given
        const props = createValidProps({ personalnummer: maliciousInput });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('XSS attack prevention - funkkennung', () => {
      it.each([
        ['script tag', '<script>alert(1)</script>'],
        ['encoded script tag', '&lt;script&gt;'],
        ['event handler', 'FL-1 onerror=alert(1)'],
        ['event handler oninput', 'FL-1 oninput=alert(1)'],
        ['javascript protocol', 'javascript:alert(1)'],
        ['data uri', 'data:text/html,test'],
        ['less-than symbol', 'FL<1'],
        ['greater-than symbol', 'FL>1'],
        ['HTML tag span', '<span>FL-1</span>'],
      ])('should reject %s in funkkennung', (_name, maliciousInput) => {
        // Given
        const props = createValidProps({ funkkennung: maliciousInput });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('Unicode homoglyph attacks', () => {
      it('should reject fullwidth less-than (U+FF1C)', () => {
        // Given
        const props = createValidProps({ vorname: 'Max＜script＞' }); // Fullwidth < >

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // The implementation rejects HTML entities like &lt; which catches this pattern
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should document behavior with mathematical less-than (U+2264)', () => {
        // Given
        const props = createValidProps({ vorname: 'Max≤script≥' }); // Mathematical <= >=

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // Note: Current implementation only checks for standard < > characters
        // This documents that Unicode variants are not currently blocked
        expect(result.isSuccess).toBe(true);
      });

      it('should reject small form variants (U+FE64)', () => {
        // Given
        const props = createValidProps({ vorname: 'Max﹤script﹥' }); // Small form < >

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // The implementation rejects HTML entities like &lt; which catches this pattern
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('SQL injection prevention', () => {
      it.each([
        ['DROP TABLE', "'; DROP TABLE users--"],
        ['UNION SELECT', "' UNION SELECT * FROM users--"],
        ['stacked queries', "'; DELETE FROM users--"],
        ['comment injection', "admin'--"],
      ])('should reject SQL injection pattern %s in vorname', (_name, sqlPattern) => {
        // Given
        const props = createValidProps({ vorname: sqlPattern });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // SQL injection patterns are blocked by DANGEROUS_PATTERN for defense in depth
        // Primary protection is still Prisma ORM (prepared statements)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it.each([
        ['simple OR', "' OR '1'='1"],
        ['OR comment', "' OR '1'='1'"],
        ['tautology', "admin' OR 1=1"],
        ['time-based blind', "' AND SLEEP(5)"],
      ])('should accept non-keyword SQL pattern %s (ORM-protected)', (_name, sqlPattern) => {
        // Given
        const props = createValidProps({ vorname: sqlPattern });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // Patterns without SQL keywords (DROP, DELETE, etc.) are allowed
        // ORM prepared statements provide the actual protection
        expect(result.isSuccess).toBe(true);
      });

      it('should accept legitimate apostrophes in names', () => {
        // Given
        const props = createValidProps({ nachname: "O'Neill" });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toBe("O'Neill");
      });

      it('should accept SQL keywords in legitimate names', () => {
        // Given
        const props = createValidProps({ vorname: 'Select', nachname: 'Union' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Select');
        expect(result.value?.nachname).toBe('Union');
      });
    });

    describe('CRLF injection prevention', () => {
      it.each([
        ['carriage return', 'Max\rAdmin'],
        ['line feed', 'Max\nAdmin'],
        ['CRLF combined', 'Max\r\nAdmin'],
        ['multiple CRLF', 'Max\r\n\r\nAdmin'],
        ['tab character', 'Max\tAdmin'],
      ])('should accept raw %s characters in vorname (HTTP layer protection)', (_name, input) => {
        // Given
        const props = createValidProps({ vorname: input });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // Raw CRLF characters are allowed (handled by HTTP/email layer)
        expect(result.isSuccess).toBe(true);
      });

      it.each([
        ['URL encoded CR', 'Max%0dAdmin'],
        ['URL encoded LF', 'Max%0aAdmin'],
        ['URL encoded CRLF', 'Max%0d%0aAdmin'],
      ])('should reject %s in vorname', (_name, input) => {
        // Given
        const props = createValidProps({ vorname: input });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // URL-encoded CRLF (%0d, %0a) is blocked by DANGEROUS_PATTERN
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('NULL byte injection prevention', () => {
      it('should reject null byte in vorname', () => {
        // Given
        const props = createValidProps({ vorname: 'Max\x00Admin' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // NULL bytes are blocked by containsDangerousContent
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should reject URL encoded null in vorname', () => {
        // Given
        const props = createValidProps({ vorname: 'Max%00Admin' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        // URL encoded null (%00) is blocked by DANGEROUS_PATTERN
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should reject multiple nulls in vorname', () => {
        // Given
        const props = createValidProps({ vorname: 'Max\x00\x00Admin' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('boundary tests - required fields', () => {
      it('should reject empty einsatzId', () => {
        // Given
        const props = createValidProps({ einsatzId: '' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('einsatzId ist erforderlich');
      });

      it('should reject whitespace-only einsatzId', () => {
        // Given
        const props = createValidProps({ einsatzId: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('einsatzId ist erforderlich');
      });

      it('should reject empty personalnummer', () => {
        // Given
        const props = createValidProps({ personalnummer: '' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Personalnummer ist erforderlich');
      });

      it('should reject whitespace-only personalnummer', () => {
        // Given
        const props = createValidProps({ personalnummer: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Personalnummer ist erforderlich');
      });

      it('should reject empty vorname', () => {
        // Given
        const props = createValidProps({ vorname: '' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Vorname ist erforderlich');
      });

      it('should reject whitespace-only vorname', () => {
        // Given
        const props = createValidProps({ vorname: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Vorname ist erforderlich');
      });

      it('should reject empty nachname', () => {
        // Given
        const props = createValidProps({ nachname: '' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Nachname ist erforderlich');
      });

      it('should reject whitespace-only nachname', () => {
        // Given
        const props = createValidProps({ nachname: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Nachname ist erforderlich');
      });

      it('should reject empty registriertVon', () => {
        // Given
        const props = createValidProps({ registriertVon: '' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon ist erforderlich');
      });

      it('should reject whitespace-only registriertVon', () => {
        // Given
        const props = createValidProps({ registriertVon: '   ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon ist erforderlich');
      });
    });

    describe('boundary tests - max length', () => {
      it('should accept personalnummer at max length (50 chars)', () => {
        // Given
        const props = createValidProps({ personalnummer: 'A'.repeat(50) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toHaveLength(50);
      });

      it('should reject personalnummer exceeding max length (51 chars)', () => {
        // Given
        const props = createValidProps({ personalnummer: 'A'.repeat(51) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Personalnummer darf maximal 50 Zeichen lang sein');
      });

      it('should accept personalnummer with special character at position 50 (Medium Issue 5)', () => {
        // Given - Special char at boundary
        const props = createValidProps({ personalnummer: `${'A'.repeat(49)}-` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toHaveLength(50);
        expect(result.value?.personalnummer.endsWith('-')).toBe(true);
      });

      it('should reject personalnummer with XSS at position 50', () => {
        // Given - XSS character at boundary position
        const props = createValidProps({ personalnummer: `${'A'.repeat(49)}<` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should accept vorname at max length (100 chars)', () => {
        // Given
        const props = createValidProps({ vorname: 'M'.repeat(100) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toHaveLength(100);
      });

      it('should reject vorname exceeding max length (101 chars)', () => {
        // Given
        const props = createValidProps({ vorname: 'M'.repeat(101) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Vorname darf maximal 100 Zeichen lang sein');
      });

      it('should accept nachname at max length (100 chars)', () => {
        // Given
        const props = createValidProps({ nachname: 'S'.repeat(100) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toHaveLength(100);
      });

      it('should reject nachname exceeding max length (101 chars)', () => {
        // Given
        const props = createValidProps({ nachname: 'S'.repeat(101) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Nachname darf maximal 100 Zeichen lang sein');
      });

      it('should accept funkkennung at max length (50 chars)', () => {
        // Given
        const props = createValidProps({ funkkennung: 'F'.repeat(50) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toHaveLength(50);
      });

      it('should reject funkkennung exceeding max length (51 chars)', () => {
        // Given
        const props = createValidProps({ funkkennung: 'F'.repeat(51) });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Funkkennung darf maximal 50 Zeichen lang sein');
      });
    });

    describe('format tests - registriertVon', () => {
      it('should accept valid CUID2', () => {
        // Given
        const validCuid = createId();
        const props = createValidProps({ registriertVon: validCuid });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.registriertVon).toBe(validCuid);
      });

      it('should reject invalid CUID2 format', () => {
        // Given
        const props = createValidProps({ registriertVon: 'invalid-cuid' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon muss ein gueltiger CUID2-Identifier sein');
      });

      it('should reject UUID as registriertVon (not CUID2)', () => {
        // Given
        const props = createValidProps({ registriertVon: '123e4567-e89b-12d3-a456-426614174000' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon muss ein gueltiger CUID2-Identifier sein');
      });

      it('should reject obvious non-CUID string as registriertVon', () => {
        // Given - Use a clearly invalid string (CUIDs are 24+ chars, start with specific patterns)
        const props = createValidProps({ registriertVon: 'x' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon muss ein gueltiger CUID2-Identifier sein');
      });
    });

    describe('trimming behavior', () => {
      it('should trim whitespace from einsatzId', () => {
        // Given
        const props = createValidProps({ einsatzId: `  ${validEinsatzId}  ` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.einsatzId).toBe(validEinsatzId);
      });

      it('should trim whitespace from personalnummer', () => {
        // Given
        const props = createValidProps({ personalnummer: '  12345  ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toBe('12345');
      });

      it('should trim whitespace from vorname', () => {
        // Given
        const props = createValidProps({ vorname: '  Max  ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Max');
      });

      it('should trim whitespace from nachname', () => {
        // Given
        const props = createValidProps({ nachname: '  Mustermann  ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toBe('Mustermann');
      });

      it('should trim whitespace from funkkennung', () => {
        // Given
        const props = createValidProps({ funkkennung: '  FL-1  ' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toBe('FL-1');
      });

      it('should trim whitespace from registriertVon', () => {
        // Given
        const props = createValidProps({ registriertVon: `  ${validUserId}  ` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.registriertVon).toBe(validUserId);
      });
    });

    describe('combined attack vectors', () => {
      it('should reject multiple XSS patterns in single field', () => {
        // Given
        const props = createValidProps({ vorname: '<script>alert(1)</script><img src=x onerror=alert(2)>' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should reject XSS patterns across multiple fields', () => {
        // Given
        const props = createValidProps({
          vorname: '<script>',
          nachname: 'onerror=alert(1)',
          funkkennung: 'javascript:void(0)',
        });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should reject when vorname is XSS and length exceeded (length check first)', () => {
        // Given
        const props = createValidProps({ vorname: `<script>${'A'.repeat(100)}` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        // Length check happens BEFORE XSS check in implementation (lines 119-120 before 122-123)
        expect(result.error).toContain('maximal 100 Zeichen');
      });

      it('should reject XSS character at exact boundary position (MEDIUM Issue 17)', () => {
        // Given - XSS character at position 100 (exact limit)
        const props = createValidProps({ vorname: `${'A'.repeat(99)}<` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then - XSS check should trigger, not length
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });

      it('should reject XSS character at exact boundary position in nachname (MEDIUM Issue 17)', () => {
        // Given - XSS character at position 100 (exact limit)
        const props = createValidProps({ nachname: `${'B'.repeat(99)}>` });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then - XSS check should trigger, not length
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültige Zeichen');
      });
    });

    describe('edge cases', () => {
      it('should throw when props object is undefined', () => {
        // Given
        const props = undefined as any;

        // When/Then - Implementation throws TypeError for undefined props
        expect(() => RegistrierePersonViaQrCodeCommand.create(props)).toThrow(TypeError);
      });

      it('should handle undefined props gracefully', () => {
        // Given
        const props = {
          einsatzId: undefined as any,
          personalnummer: undefined as any,
          vorname: undefined as any,
          nachname: undefined as any,
          registriertVon: undefined as any,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('einsatzId ist erforderlich');
      });

      it('should handle null props gracefully', () => {
        // Given
        const props = {
          einsatzId: null as any,
          personalnummer: null as any,
          vorname: null as any,
          nachname: null as any,
          registriertVon: null as any,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('einsatzId ist erforderlich');
      });

      it('should handle null field value in vorname', () => {
        // Given
        const props = createValidProps({ vorname: null as any });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname');
      });

      it('should handle null field value in nachname', () => {
        // Given
        const props = createValidProps({ nachname: null as any });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname');
      });

      it('should preserve internal whitespace in names', () => {
        // Given
        const props = createValidProps({ vorname: 'Maria Anna', nachname: 'von der Leyen' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Maria Anna');
        expect(result.value?.nachname).toBe('von der Leyen');
      });

      it('should handle maximum valid input', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: 'P'.repeat(50),
          vorname: 'V'.repeat(100),
          nachname: 'N'.repeat(100),
          funkkennung: 'F'.repeat(50),
          registriertVon: validUserId,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toHaveLength(50);
        expect(result.value?.vorname).toHaveLength(100);
        expect(result.value?.nachname).toHaveLength(100);
        expect(result.value?.funkkennung).toHaveLength(50);
      });
    });

    describe('DRK QR-Code Mapping', () => {
      it('should correctly map DRK QR parameters (mnr -> personalnummer)', () => {
        // Given - Simulating data extracted from DRK QR code
        // drk://person?mnr=87654321&vn=Erika&nn=Musterfrau&fk=4711
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: '87654321', // mnr from QR
          vorname: 'Erika', // vn from QR
          nachname: 'Musterfrau', // nn from QR
          funkkennung: '4711', // fk from QR
          registriertVon: validUserId,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toBe('87654321');
        expect(result.value?.vorname).toBe('Erika');
        expect(result.value?.nachname).toBe('Musterfrau');
        expect(result.value?.funkkennung).toBe('4711');
      });
    });

    describe('numeric-only boundary tests', () => {
      it('should accept numeric-only personalnummer', () => {
        // Given
        const props = createValidProps({ personalnummer: '123456789' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.personalnummer).toBe('123456789');
      });

      it('should accept names with numbers', () => {
        // Given
        const props = createValidProps({ vorname: 'R2D2', nachname: 'C3PO' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('R2D2');
        expect(result.value?.nachname).toBe('C3PO');
      });

      it('should accept numeric-only vorname', () => {
        // Given
        const props = createValidProps({ vorname: '42' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('42');
      });

      it('should accept numeric-only nachname', () => {
        // Given
        const props = createValidProps({ nachname: '007' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.nachname).toBe('007');
      });

      it('should accept mixed alphanumeric funkkennung', () => {
        // Given
        const props = createValidProps({ funkkennung: '4711A' });

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkennung).toBe('4711A');
      });
    });

    describe('ReDoS prevention', () => {
      it('should complete validation quickly even with many spaces after apostrophe', () => {
        // Given - This input would cause polynomial backtracking with vulnerable regex
        // Pattern: ' followed by many spaces was vulnerable to ReDoS
        const manySpaces = ' '.repeat(50);
        const props = createValidProps({ vorname: `O'Brien${manySpaces}test` });

        // When - Should complete in < 100ms (vulnerable regex would take seconds/minutes)
        const startTime = performance.now();
        const result = RegistrierePersonViaQrCodeCommand.create(props);
        const endTime = performance.now();

        // Then
        expect(endTime - startTime).toBeLessThan(100);
        expect(result.isSuccess).toBe(true);
      });

      it('should handle apostrophe followed by whitespace without hanging', () => {
        // Given - Edge case that triggered the ReDoS
        const props = createValidProps({ nachname: `'${' '.repeat(100)}` });

        // When
        const startTime = performance.now();
        const result = RegistrierePersonViaQrCodeCommand.create(props);
        const endTime = performance.now();

        // Then - Must complete quickly (< 50ms)
        expect(endTime - startTime).toBeLessThan(50);
        // Input is just whitespace after apostrophe, should be valid (no dangerous keywords)
        expect(result.isSuccess).toBe(true);
      });
    });
  });
});
