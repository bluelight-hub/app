/**
 * Onboarding Error Codes Unit Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: Alle Fehlercodes, Mapping-Funktionen, deutsche Texte
 */

import { describe, it, expect } from 'vitest';
import { ResponseError } from '@/shared/api/types';
import { OnboardingErrorCode, getOnboardingErrorDetails, parseOnboardingErrorCode } from './error-codes.constants';

describe('OnboardingErrorCode Enum', () => {
  it('should have all expected error codes defined', () => {
    // Given (Arrange)
    const expectedCodes = ['INVITE_EXPIRED', 'INVITE_ALREADY_USED', 'INVITE_INVALID', 'INVITE_RATE_LIMITED', 'SERVER_NOT_SETUP', 'NETWORK_ERROR', 'UNKNOWN'];

    // When (Act)
    const actualCodes = Object.values(OnboardingErrorCode);

    // Then (Assert)
    expect(actualCodes).toHaveLength(expectedCodes.length);
    for (const code of expectedCodes) {
      expect(actualCodes).toContain(code);
    }
  });
});

describe('getOnboardingErrorDetails()', () => {
  describe('INVITE_EXPIRED', () => {
    it('should return correct German texts for INVITE_EXPIRED', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Einladungslink abgelaufen');
      expect(details.message).toBe('Dieser Einladungslink ist nicht mehr gültig.');
      expect(details.cta).toBe('Fordere einen neuen Link bei deinem Administrator an.');
      expect(details.severity).toBe('error');
      expect(details.fullscreen).toBe(true);
      expect(details.retryable).toBe(false);
    });
  });

  describe('INVITE_ALREADY_USED', () => {
    it('should return correct German texts for INVITE_ALREADY_USED', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.INVITE_ALREADY_USED;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Link bereits verwendet');
      expect(details.message).toBe('Dieser Einladungslink wurde bereits eingelöst.');
      expect(details.cta).toBe('Falls du Probleme hast, kontaktiere deinen Administrator.');
      expect(details.severity).toBe('error');
      expect(details.fullscreen).toBe(true);
      expect(details.retryable).toBe(false);
    });
  });

  describe('INVITE_INVALID', () => {
    it('should return correct German texts for INVITE_INVALID', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.INVITE_INVALID;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Ungültiger Link');
      expect(details.message).toBe('Dieser Einladungslink ist ungültig.');
      expect(details.cta).toBe('Prüfe die URL und versuche es erneut.');
      expect(details.severity).toBe('error');
      expect(details.fullscreen).toBe(true);
      expect(details.retryable).toBe(false);
    });
  });

  describe('INVITE_RATE_LIMITED', () => {
    it('should return correct German texts for INVITE_RATE_LIMITED', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.INVITE_RATE_LIMITED;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Zu viele Versuche');
      expect(details.message).toBe('Du hast zu viele Anfragen gesendet.');
      expect(details.cta).toBe('Bitte warte einige Minuten und versuche es erneut.');
      expect(details.severity).toBe('warning');
      expect(details.fullscreen).toBe(false);
      expect(details.retryable).toBe(true);
    });
  });

  describe('SERVER_NOT_SETUP', () => {
    it('should return correct German texts for SERVER_NOT_SETUP', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.SERVER_NOT_SETUP;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Server nicht eingerichtet');
      expect(details.message).toBe('Dieser Server wurde noch nicht initialisiert.');
      expect(details.cta).toBe('Kontaktiere den Server-Administrator.');
      expect(details.severity).toBe('error');
      expect(details.fullscreen).toBe(true);
      expect(details.retryable).toBe(false);
    });
  });

  describe('NETWORK_ERROR', () => {
    it('should return correct German texts for NETWORK_ERROR', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.NETWORK_ERROR;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Server nicht erreichbar');
      expect(details.message).toBe('Der Server konnte nicht erreicht werden.');
      expect(details.cta).toBe('Prüfe deine Internetverbindung und versuche es erneut.');
      expect(details.severity).toBe('warning');
      expect(details.fullscreen).toBe(false);
      expect(details.retryable).toBe(true);
    });
  });

  describe('UNKNOWN', () => {
    it('should return correct German texts for UNKNOWN', () => {
      // Given (Arrange)
      const errorCode = OnboardingErrorCode.UNKNOWN;

      // When (Act)
      const details = getOnboardingErrorDetails(errorCode);

      // Then (Assert)
      expect(details.title).toBe('Unerwarteter Fehler');
      expect(details.message).toBe('Ein unerwarteter Fehler ist aufgetreten.');
      expect(details.cta).toBe('Versuche es erneut oder richte den Server manuell ein.');
      expect(details.severity).toBe('error');
      expect(details.fullscreen).toBe(true);
      expect(details.retryable).toBe(true);
    });
  });

  describe('Fallback behavior', () => {
    it('should return UNKNOWN details for unrecognized error codes', () => {
      // Given (Arrange)
      const invalidCode = 'SOME_INVALID_CODE';

      // When (Act)
      const details = getOnboardingErrorDetails(invalidCode);

      // Then (Assert)
      expect(details.title).toBe('Unerwarteter Fehler');
      expect(details.message).toBe('Ein unerwarteter Fehler ist aufgetreten.');
    });

    it('should return UNKNOWN details for empty string', () => {
      // Given (Arrange)
      const emptyCode = '';

      // When (Act)
      const details = getOnboardingErrorDetails(emptyCode);

      // Then (Assert)
      expect(details.title).toBe('Unerwarteter Fehler');
    });

    it('should return UNKNOWN details for numeric string', () => {
      // Given (Arrange)
      const numericCode = '500';

      // When (Act)
      const details = getOnboardingErrorDetails(numericCode);

      // Then (Assert)
      expect(details.title).toBe('Unerwarteter Fehler');
    });
  });
});

describe('parseOnboardingErrorCode()', () => {
  /**
   * Helper: Erstellt einen Mock ResponseError mit JSON-Body
   */
  function createMockResponseError(status: number, body: Record<string, unknown>): ResponseError {
    const response = new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    return new ResponseError(response, `HTTP ${status}`);
  }

  describe('TypeError handling (network errors)', () => {
    it('should return NETWORK_ERROR for TypeError (fetch failure)', async () => {
      // Given (Arrange)
      const error = new TypeError('Failed to fetch');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for TypeError (network request failed)', async () => {
      // Given (Arrange)
      const error = new TypeError('Network request failed');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });
  });

  describe('ResponseError handling', () => {
    it('should extract INVITE_EXPIRED from response code field', async () => {
      // Given (Arrange)
      const error = createMockResponseError(400, {
        code: 'INVITE_EXPIRED',
        message: 'The invite code has expired',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_EXPIRED);
    });

    it('should extract INVITE_ALREADY_USED from response error field', async () => {
      // Given (Arrange)
      const error = createMockResponseError(400, {
        error: 'INVITE_ALREADY_USED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_ALREADY_USED);
    });

    it('should extract INVITE_INVALID from response code field', async () => {
      // Given (Arrange)
      const error = createMockResponseError(404, {
        code: 'INVITE_INVALID',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_INVALID);
    });

    it('should map INVITE_CODE_EXPIRED to INVITE_EXPIRED', async () => {
      // Given (Arrange) - Backend sendet alternativen Code
      const error = createMockResponseError(400, {
        code: 'INVITE_CODE_EXPIRED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_EXPIRED);
    });

    it('should map INVITE_CODE_ALREADY_USED to INVITE_ALREADY_USED', async () => {
      // Given (Arrange)
      const error = createMockResponseError(400, {
        code: 'INVITE_CODE_ALREADY_USED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_ALREADY_USED);
    });

    it('should map INVITE_CODE_NOT_FOUND to INVITE_INVALID', async () => {
      // Given (Arrange)
      const error = createMockResponseError(404, {
        code: 'INVITE_CODE_NOT_FOUND',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_INVALID);
    });

    it('should map RATE_LIMITED to INVITE_RATE_LIMITED', async () => {
      // Given (Arrange)
      const error = createMockResponseError(429, {
        code: 'RATE_LIMITED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_RATE_LIMITED);
    });

    it('should map TOO_MANY_REQUESTS to INVITE_RATE_LIMITED', async () => {
      // Given (Arrange)
      const error = createMockResponseError(429, {
        code: 'TOO_MANY_REQUESTS',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_RATE_LIMITED);
    });

    it('should map SERVER_NOT_INITIALIZED to SERVER_NOT_SETUP', async () => {
      // Given (Arrange)
      const error = createMockResponseError(503, {
        code: 'SERVER_NOT_INITIALIZED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.SERVER_NOT_SETUP);
    });

    it('should map SETUP_REQUIRED to SERVER_NOT_SETUP', async () => {
      // Given (Arrange)
      const error = createMockResponseError(503, {
        code: 'SETUP_REQUIRED',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.SERVER_NOT_SETUP);
    });

    it('should return INVITE_RATE_LIMITED for HTTP 429 without code', async () => {
      // Given (Arrange) - Status-basiertes Fallback
      const error = createMockResponseError(429, {
        message: 'Too many requests',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.INVITE_RATE_LIMITED);
    });

    it('should return NETWORK_ERROR for HTTP 502', async () => {
      // Given (Arrange)
      const error = createMockResponseError(502, {
        message: 'Bad Gateway',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for HTTP 503', async () => {
      // Given (Arrange)
      const error = createMockResponseError(503, {
        message: 'Service Unavailable',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return UNKNOWN for unrecognized error code in response', async () => {
      // Given (Arrange)
      const error = createMockResponseError(400, {
        code: 'SOME_OTHER_ERROR',
        message: 'Something went wrong',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should return UNKNOWN for response without error code', async () => {
      // Given (Arrange)
      const error = createMockResponseError(400, {
        message: 'Bad request',
      });

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should handle ResponseError with non-JSON body gracefully', async () => {
      // Given (Arrange)
      const response = new Response('Not JSON', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
      const error = new ResponseError(response, 'HTTP 500');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });
  });

  describe('Generic Error handling', () => {
    it('should return NETWORK_ERROR for network-related error messages', async () => {
      // Given (Arrange)
      const error = new Error('Network connection failed');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for fetch-related error messages', async () => {
      // Given (Arrange)
      const error = new Error('fetch failed');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for connection-related error messages', async () => {
      // Given (Arrange)
      const error = new Error('Connection refused');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for timeout-related error messages', async () => {
      // Given (Arrange)
      const error = new Error('Request timeout');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for ECONNREFUSED error messages', async () => {
      // Given (Arrange)
      const error = new Error('ECONNREFUSED');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR for DNS-related error messages', async () => {
      // Given (Arrange)
      const error = new Error('DNS lookup failed');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.NETWORK_ERROR);
    });

    it('should return UNKNOWN for generic error messages', async () => {
      // Given (Arrange)
      const error = new Error('Something went wrong');

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });
  });

  describe('Unknown error types', () => {
    it('should return UNKNOWN for null', async () => {
      // Given (Arrange)
      const error = null;

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should return UNKNOWN for undefined', async () => {
      // Given (Arrange)
      const error = undefined;

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should return UNKNOWN for string', async () => {
      // Given (Arrange)
      const error = 'Some error string';

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should return UNKNOWN for number', async () => {
      // Given (Arrange)
      const error = 500;

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });

    it('should return UNKNOWN for plain object', async () => {
      // Given (Arrange)
      const error = { message: 'Error object' };

      // When (Act)
      const result = await parseOnboardingErrorCode(error);

      // Then (Assert)
      expect(result).toBe(OnboardingErrorCode.UNKNOWN);
    });
  });
});

describe('German text verification', () => {
  it('should have all texts in German (no English)', () => {
    // Given (Arrange)
    const allCodes = Object.values(OnboardingErrorCode);
    const englishPatterns = [/\bthe\b/i, /\bis\b/i, /\bare\b/i, /\bwas\b/i, /\bwere\b/i, /\bhas\b/i, /\bhave\b/i, /\bplease\b/i, /\btry\b/i, /\berror\b/i, /\binvalid\b/i, /\bexpired\b/i];

    // When (Act)
    for (const code of allCodes) {
      const details = getOnboardingErrorDetails(code);
      const allText = `${details.title} ${details.message} ${details.cta}`;

      // Then (Assert) - Keine englischen Wörter in den deutschen Texten
      for (const pattern of englishPatterns) {
        expect(allText).not.toMatch(pattern);
      }
    }
  });

  it('should have proper German characters (Umlauts allowed)', () => {
    // Given (Arrange) - Deutsche Umlaute und Sonderzeichen erlaubt
    const details = getOnboardingErrorDetails(OnboardingErrorCode.INVITE_INVALID);

    // When (Act)
    const allText = `${details.title} ${details.message} ${details.cta}`;

    // Then (Assert) - Text enthält gültige Zeichen
    expect(allText).toMatch(/^[\w\säöüÄÖÜß.,!?-]+$/);
  });
});
