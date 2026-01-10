/**
 * URL Parameters Service Unit Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: 8+ Tests für alle Service-Funktionen
 */

import { describe, it, expect } from 'vitest';
import { parseUrlParams, validateParams, normalizeServerUrl, isValidInviteCode } from '../url-params.service';

describe('parseUrlParams()', () => {
  it('should parse URL with both server and invite parameters', () => {
    // Given (Arrange)
    const searchString = '?server=https://api.example.de&invite=ABC12345';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({
      server: 'https://api.example.de',
      invite: 'ABC12345',
    });
  });

  it('should parse URL with only server parameter', () => {
    // Given (Arrange)
    const searchString = '?server=https://api.example.de';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({
      server: 'https://api.example.de',
    });
    expect(result.invite).toBeUndefined();
  });

  it('should parse URL with only invite parameter', () => {
    // Given (Arrange)
    const searchString = '?invite=ABC12345';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({
      invite: 'ABC12345',
    });
    expect(result.server).toBeUndefined();
  });

  it('should return empty object for empty search string', () => {
    // Given (Arrange)
    const searchString = '';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({});
  });

  it('should handle URL-encoded parameter values', () => {
    // Given (Arrange)
    const searchString = '?server=https%3A%2F%2Fapi.example.de&invite=ABC%2012345';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({
      server: 'https://api.example.de',
      invite: 'ABC 12345',
    });
  });

  it('should ignore invalid parameter names', () => {
    // Given (Arrange)
    const searchString = '?server=https://api.example.de&foo=bar&invite=ABC12345&baz=qux';

    // When (Act)
    const result = parseUrlParams(searchString);

    // Then (Assert)
    expect(result).toEqual({
      server: 'https://api.example.de',
      invite: 'ABC12345',
    });
    expect(result).not.toHaveProperty('foo');
    expect(result).not.toHaveProperty('baz');
  });
});

describe('validateParams()', () => {
  it('should validate correct params with server and invite', () => {
    // Given (Arrange)
    const params = {
      server: 'https://api.example.de',
      invite: 'ABC12345',
    };

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.server).toBe('https://api.example.de');
      expect(result.data.invite).toBe('ABC12345');
    }
  });

  it('should validate params with only server (AC2 Fallback)', () => {
    // Given (Arrange)
    const params = {
      server: 'https://api.example.de',
    };

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.server).toBe('https://api.example.de');
      expect(result.data.invite).toBeUndefined();
    }
  });

  it('should reject invalid server URL (missing protocol)', () => {
    // Given (Arrange)
    const params = {
      server: 'api.example.de', // Kein Protokoll
      invite: 'ABC12345',
    };

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      const serverError = result.error.issues.find((err) => err.path.includes('server'));
      expect(serverError).toBeDefined();
    }
  });

  it('should reject invalid server URL (wrong protocol)', () => {
    // Given (Arrange)
    const params = {
      server: 'ftp://api.example.de', // FTP nicht erlaubt
      invite: 'ABC12345',
    };

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(false);
    if (!result.success) {
      const serverError = result.error.issues.find((err) => err.path.includes('server'));
      expect(serverError).toBeDefined();
      expect(serverError?.message).toContain('HTTP/HTTPS');
    }
  });

  it('should reject invite code shorter than 8 characters', () => {
    // Given (Arrange)
    const params = {
      server: 'https://api.example.de',
      invite: 'ABC123', // Nur 6 Zeichen
    };

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(false);
    if (!result.success) {
      const inviteError = result.error.issues.find((err) => err.path.includes('invite'));
      expect(inviteError).toBeDefined();
      expect(inviteError?.message).toContain('mindestens 8 Zeichen');
    }
  });

  it('should validate empty params object (both optional)', () => {
    // Given (Arrange)
    const params = {};

    // When (Act)
    const result = validateParams(params);

    // Then (Assert)
    expect(result.success).toBe(true);
  });
});

describe('normalizeServerUrl()', () => {
  it('should add https:// to URL without protocol', () => {
    // Given (Arrange)
    const url = 'api.example.de';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('https://api.example.de');
  });

  it('should keep existing https:// protocol', () => {
    // Given (Arrange)
    const url = 'https://api.example.de';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('https://api.example.de');
  });

  it('should keep existing http:// protocol (no forced upgrade)', () => {
    // Given (Arrange)
    const url = 'http://api.example.de';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('http://api.example.de');
  });

  it('should keep other protocols unchanged (for Zod rejection)', () => {
    // Given (Arrange)
    const url = 'ftp://api.example.de';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('ftp://api.example.de');
  });

  it('should trim whitespace before normalization', () => {
    // Given (Arrange)
    const url = '  api.example.de  ';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('https://api.example.de');
  });

  it('should handle URL with port number', () => {
    // Given (Arrange)
    const url = 'api.example.de:8080';

    // When (Act)
    const result = normalizeServerUrl(url);

    // Then (Assert)
    expect(result).toBe('https://api.example.de:8080');
  });
});

describe('isValidInviteCode()', () => {
  it('should accept invite code with exactly 8 characters', () => {
    // Given (Arrange)
    const inviteCode = 'ABC12345';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(true);
  });

  it('should accept invite code with more than 8 characters', () => {
    // Given (Arrange)
    const inviteCode = 'ABC123456789';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(true);
  });

  it('should reject invite code with less than 8 characters', () => {
    // Given (Arrange)
    const inviteCode = 'ABC123';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(false);
  });

  it('should reject empty invite code', () => {
    // Given (Arrange)
    const inviteCode = '';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(false);
  });

  it('should trim whitespace before validation', () => {
    // Given (Arrange)
    const inviteCode = '  ABC12345  ';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(true);
  });

  it('should reject whitespace-only invite code', () => {
    // Given (Arrange)
    const inviteCode = '        ';

    // When (Act)
    const result = isValidInviteCode(inviteCode);

    // Then (Assert)
    expect(result).toBe(false);
  });
});
