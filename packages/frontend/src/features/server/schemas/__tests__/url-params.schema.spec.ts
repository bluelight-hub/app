/**
 * Unit Tests für URL-Parameter Schema
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: 20+ Tests für alle Validierungs-Regeln inkl. INSECURE_MODE
 *
 * **AC6: URL-Validierung**
 * - HTTPS immer erlaubt
 * - HTTP nur im INSECURE_MODE
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { urlParamsSchema, serverUrlSchema } from '../url-params.schema';

describe('urlParamsSchema', () => {
  describe('Valid Inputs', () => {
    it('should validate both server and invite parameters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBe('https://api.example.de');
        expect(result.data.invite).toBe('ABC12345');
      }
    });

    it('should validate only server parameter (AC2 fallback)', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBe('https://api.example.de');
        expect(result.data.invite).toBeUndefined();
      }
    });

    it('should validate only invite parameter', () => {
      // Given (Arrange)
      const input = {
        invite: 'XYZ98765',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBeUndefined();
        expect(result.data.invite).toBe('XYZ98765');
      }
    });

    it('should validate empty object (both parameters optional)', () => {
      // Given (Arrange)
      const input = {};

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBeUndefined();
        expect(result.data.invite).toBeUndefined();
      }
    });

    it('should validate HTTPS localhost server URL (development)', () => {
      // Given (Arrange) - HTTPS ist immer erlaubt, auch localhost
      const input = {
        server: 'https://localhost:3091',
        invite: 'DEV12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBe('https://localhost:3091');
      }
    });

    // Hinweis: HTTP localhost wird nur im INSECURE_MODE erlaubt
    // Siehe "INSECURE_MODE" describe-Block für HTTP-Tests

    it('should validate server URL with path and query params', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de/v1?region=eu',
        invite: 'TEST1234',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBe('https://api.example.de/v1?region=eu');
      }
    });
  });

  describe('Invalid Server URLs', () => {
    it('should reject invalid URL format', () => {
      // Given (Arrange)
      const input = {
        server: 'not-a-valid-url',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // Shared serverUrlSchema gibt "Ungültige Server-URL" für ungültiges URL-Format
        expect(result.error.issues[0].message).toContain('Ungültige Server-URL');
      }
    });

    it('should reject server URL without protocol', () => {
      // Given (Arrange)
      const input = {
        server: 'api.example.de',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // Shared serverUrlSchema gibt "Ungültige Server-URL" für URLs ohne Protokoll
        expect(result.error.issues[0].message).toContain('Ungültige Server-URL');
      }
    });

    it('should reject server URL with invalid protocol (file://)', () => {
      // Given (Arrange)
      const input = {
        server: 'file:///etc/passwd',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // serverUrlSchema gibt Protokoll-Fehlermeldung für nicht-HTTP(S) URLs
        expect(result.error.issues[0].message).toContain('https://');
      }
    });

    it('should reject server URL with invalid protocol (javascript://)', () => {
      // Given (Arrange)
      const input = {
        server: 'javascript:alert(1)',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // serverUrlSchema gibt Protokoll-Fehlermeldung für nicht-HTTP(S) URLs
        expect(result.error.issues[0].message).toContain('https://');
      }
    });

    it('should reject HTTP URL without INSECURE_MODE (AC6)', () => {
      // Given (Arrange) - HTTP ist ohne INSECURE_MODE nicht erlaubt
      const input = {
        server: 'http://api.example.de',
        invite: 'ABC12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert) - HTTP wird abgelehnt
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('https://');
        expect(result.error.issues[0].message).toContain('Entwicklungsmodus');
      }
    });
  });

  describe('Invalid Invite Codes', () => {
    it('should reject invite code shorter than 8 characters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABC123', // Nur 6 Zeichen
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // Shared inviteCodeSchema erfordert exakt 8 Zeichen
        expect(result.error.issues[0].message).toContain('exakt 8 Zeichen');
      }
    });

    it('should accept invite code exactly 8 characters (A-Z0-9 format)', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABCD1234', // Exakt 8 Zeichen, A-Z0-9 Format
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
    });

    it('should reject invite code longer than 8 characters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABCD1234567890', // > 8 Zeichen
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      // Shared inviteCodeSchema erfordert exakt 8 Zeichen
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exakt 8 Zeichen');
      }
    });

    it('should reject invite code with lowercase letters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'abcd1234', // Kleinbuchstaben nicht erlaubt
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        // Shared inviteCodeSchema erlaubt nur A-Z0-9
        expect(result.error.issues[0].message).toContain('Großbuchstaben');
      }
    });

    it('should reject invite code with special characters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABC_1234', // Underscore nicht erlaubt
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Großbuchstaben');
      }
    });
  });
});

/**
 * Direkte Tests für serverUrlSchema (AC6: URL-Validierung)
 *
 * Diese Tests validieren das Schema direkt ohne das urlParamsSchema-Wrapper.
 */
describe('serverUrlSchema', () => {
  describe('HTTPS URLs (immer erlaubt)', () => {
    it('should accept valid HTTPS URL', () => {
      // Given (Arrange)
      const url = 'https://api.example.de';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(true);
    });

    it('should accept HTTPS localhost', () => {
      // Given (Arrange)
      const url = 'https://localhost:3091';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(true);
    });

    it('should accept HTTPS with path and query', () => {
      // Given (Arrange)
      const url = 'https://api.example.de/v1/health?check=true';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(true);
    });
  });

  describe('HTTP URLs (nur im INSECURE_MODE)', () => {
    // Hinweis: INSECURE_MODE ist standardmäßig deaktiviert
    // Diese Tests validieren das Verhalten im SECURE mode (default)

    it('should reject HTTP URL in secure mode (default)', () => {
      // Given (Arrange) - INSECURE_MODE ist nicht gesetzt
      const url = 'http://api.example.de';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert) - HTTP wird im SECURE mode abgelehnt
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('https://');
      }
    });

    it('should reject HTTP localhost in secure mode', () => {
      // Given (Arrange)
      const url = 'http://localhost:3091';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Entwicklungsmodus');
      }
    });
  });

  describe('Invalid Protocols', () => {
    it('should reject file:// protocol', () => {
      // Given (Arrange)
      const url = 'file:///etc/passwd';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });

    it('should reject ftp:// protocol', () => {
      // Given (Arrange)
      const url = 'ftp://files.example.de';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });

    it('should reject javascript: protocol', () => {
      // Given (Arrange)
      const url = 'javascript:alert(1)';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid URLs', () => {
    it('should reject non-URL string', () => {
      // Given (Arrange)
      const url = 'not-a-url';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      // Given (Arrange)
      const url = '';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });

    it('should reject URL without protocol', () => {
      // Given (Arrange)
      const url = 'api.example.de';

      // When (Act)
      const result = serverUrlSchema.safeParse(url);

      // Then (Assert)
      expect(result.success).toBe(false);
    });
  });
});

/**
 * H4: Tests für INSECURE_MODE Aktivierung
 *
 * Diese Tests validieren das Verhalten wenn VITE_INSECURE_MODE='true' gesetzt ist.
 */
describe('serverUrlSchema with INSECURE_MODE', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_INSECURE_MODE', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should accept HTTP localhost when INSECURE_MODE enabled', async () => {
    // Given (Arrange)
    const url = 'http://localhost:3091';

    // Dynamic re-import um Env-Variable zu picken
    const { serverUrlSchema: freshSchema } = await import('../url-params.schema');

    // When (Act)
    const result = freshSchema.safeParse(url);

    // Then (Assert)
    expect(result.success).toBe(true);
  });

  it('should accept HTTP URL when INSECURE_MODE enabled', async () => {
    // Given (Arrange)
    const url = 'http://api.example.de';

    // Dynamic re-import um Env-Variable zu picken
    const { serverUrlSchema: freshSchema } = await import('../url-params.schema');

    // When (Act)
    const result = freshSchema.safeParse(url);

    // Then (Assert)
    expect(result.success).toBe(true);
  });
});
