/**
 * Unit Tests für URL-Parameter Schema
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: 12+ Tests für alle Validierungs-Regeln
 */

import { describe, it, expect } from 'vitest';
import { urlParamsSchema } from '../url-params.schema';

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

    it('should validate localhost server URL (development)', () => {
      // Given (Arrange)
      const input = {
        server: 'http://localhost:3091',
        invite: 'DEV12345',
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server).toBe('http://localhost:3091');
      }
    });

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
        expect(result.error.issues[0].message).toContain('gültige HTTP/HTTPS URL');
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
        expect(result.error.issues[0].message).toContain('gültige HTTP/HTTPS URL');
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
        expect(result.error.issues[0].message).toContain('gültige HTTP/HTTPS URL');
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
        expect(result.error.issues[0].message).toContain('gültige HTTP/HTTPS URL');
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
        expect(result.error.issues[0].message).toContain('mindestens 8 Zeichen');
      }
    });

    it('should accept invite code exactly 8 characters', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABCD1234', // Exakt 8 Zeichen
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      expect(result.success).toBe(true);
    });

    it('should accept invite code longer than 8 characters (backend validates exact length)', () => {
      // Given (Arrange)
      const input = {
        server: 'https://api.example.de',
        invite: 'ABCD1234567890', // > 8 Zeichen (Backend wird exakte Länge prüfen)
      };

      // When (Act)
      const result = urlParamsSchema.safeParse(input);

      // Then (Assert)
      // Frontend akzeptiert längere Codes, Backend validiert exakte Länge
      expect(result.success).toBe(true);
    });
  });
});
