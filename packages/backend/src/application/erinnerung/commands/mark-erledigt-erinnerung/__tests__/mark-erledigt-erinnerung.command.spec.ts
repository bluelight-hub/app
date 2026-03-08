// @ts-nocheck
import { MarkErledigtErinnerungCommand } from '../mark-erledigt-erinnerung.command';

/**
 * Unit Tests für MarkErledigtErinnerungCommand - erledigungsNotiz Validierung.
 *
 * Testet AC2: Optionale Notiz maximal 500 Zeichen.
 * Nutzt Result Pattern (isSuccess, isFailure, value, error).
 */
describe('MarkErledigtErinnerungCommand', () => {
  // Deterministic Test Fixtures (R2-TEST3: No Math.random())
  const TEST_CUID_ERINNERUNG = 'clwx2a9fb0000pq8r3p5t1b9x'; // 26 chars, valid CUID2
  const TEST_CUID_USER = 'clwx2a9fb0001pq8r3p5t1b9y'; // 26 chars, valid CUID2

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('erledigungsNotiz Validation (AC2: max 500 Zeichen)', () => {
    it('should create command with valid erledigungsNotiz (500 chars)', () => {
      // Given (Arrange)
      const notiz500Chars = 'A'.repeat(500); // Exakt 500 Zeichen - Grenzfall

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: notiz500Chars,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.erledigungsNotiz).toBe(notiz500Chars);
      expect(result.value?.erledigungsNotiz?.length).toBe(500);
    });

    it('should fail with ERLEDIGUNGS_NOTIZ_TOO_LONG for 501 chars', () => {
      // Given (Arrange)
      const notiz501Chars = 'A'.repeat(501); // 501 Zeichen - 1 über dem Limit

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: notiz501Chars,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('ERLEDIGUNGS_NOTIZ_TOO_LONG');
    });

    it('should trim whitespace before length check', () => {
      // Given (Arrange)
      // 500 Zeichen Content + Whitespace drumherum
      const contentWith500Chars = 'A'.repeat(500);
      const notizWithWhitespace = `   ${contentWith500Chars}   `;

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: notizWithWhitespace,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erledigungsNotiz).toBe(contentWith500Chars);
      expect(result.value?.erledigungsNotiz?.length).toBe(500);
    });

    it('should convert empty string to null', () => {
      // Given (Arrange)
      const emptyString = '';

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: emptyString,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erledigungsNotiz).toBeNull();
    });

    it('should accept undefined erledigungsNotiz', () => {
      // Given (Arrange) - erledigungsNotiz nicht angegeben

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        // erledigungsNotiz: undefined (implizit)
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erledigungsNotiz).toBeNull();
    });

    it('should accept null erledigungsNotiz', () => {
      // Given (Arrange)
      const nullNotiz = null as unknown as string;

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: nullNotiz,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erledigungsNotiz).toBeNull();
    });

    it('should convert whitespace-only string to null', () => {
      // Given (Arrange)
      const whitespaceOnly = '   \t\n   ';

      // When (Act)
      const result = MarkErledigtErinnerungCommand.create({
        erinnerungId: TEST_CUID_ERINNERUNG,
        erledigtBy: TEST_CUID_USER,
        erledigungsNotiz: whitespaceOnly,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.erledigungsNotiz).toBeNull();
    });
  });
});
