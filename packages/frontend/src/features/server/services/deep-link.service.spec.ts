/**
 * Deep Link Service Unit Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 * Coverage: >10 Tests für alle Service-Funktionen
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DeepLinkService } from './deep-link.service';
import { DeepLinkError } from '../types/deep-link';
import type { DeepLinkParams } from '../types/deep-link';

// Mock Tauri Deep Link Plugin
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  register: vi.fn(),
}));

import { register } from '@tauri-apps/plugin-deep-link';

describe('DeepLinkService', () => {
  let service: DeepLinkService;

  beforeEach(() => {
    // CRITICAL: Mock Reset
    vi.clearAllMocks();

    // Reset Singleton zwischen Tests
    DeepLinkService.reset();

    // Neue Instance erstellen
    service = DeepLinkService.getInstance();
  });

  afterEach(() => {
    DeepLinkService.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple getInstance() calls', () => {
      // Given (Arrange)
      const instance1 = DeepLinkService.getInstance();

      // When (Act)
      const instance2 = DeepLinkService.getInstance();

      // Then (Assert)
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize()', () => {
    it('should register Tauri deep link listener on first call', async () => {
      // Given (Arrange)
      const registerMock = vi.mocked(register);

      // When (Act)
      await service.initialize();

      // Then (Assert)
      expect(registerMock).toHaveBeenCalledOnce();
      expect(registerMock).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should skip registration on second initialize() call', async () => {
      // Given (Arrange)
      const registerMock = vi.mocked(register);
      await service.initialize();
      vi.clearAllMocks();

      // When (Act)
      await service.initialize();

      // Then (Assert)
      expect(registerMock).not.toHaveBeenCalled();
    });
  });

  describe('parseUrl()', () => {
    it('should parse valid deep link URL with all parameters', async () => {
      // Given (Arrange)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // +30 Tage
      const expiresIso = futureDate.toISOString();
      const url = `bluelight://connect?url=https://api.example.de&invite=INV_12345678&expires=${expiresIso}`;
      const receivedParams: DeepLinkParams[] = [];

      service.on('deep-link-received', (params) => {
        receivedParams.push(params);
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(receivedParams).toHaveLength(1);
      expect(receivedParams[0]).toEqual({
        serverUrl: 'https://api.example.de',
        inviteCode: 'INV_12345678',
        expiresAt: expiresIso,
      });
    });

    it('should parse valid deep link URL without expiry', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678';
      const receivedParams: DeepLinkParams[] = [];

      service.on('deep-link-received', (params) => {
        receivedParams.push(params);
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(receivedParams).toHaveLength(1);
      expect(receivedParams[0]).toEqual({
        serverUrl: 'https://api.example.de',
        inviteCode: 'INV_12345678',
        expiresAt: null,
      });
    });

    it('should emit error for invalid protocol (https://)', async () => {
      // Given (Arrange)
      const url = 'https://connect?url=https://api.example.de&invite=INV_12345678';
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.INVALID_PROTOCOL);
    });

    it('should emit error for missing required parameter (url)', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?invite=INV_12345678';
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.MISSING_PARAMETERS);
    });

    it('should emit error for missing required parameter (invite)', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de';
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.MISSING_PARAMETERS);
    });

    it('should emit error for empty URL array', async () => {
      // Given (Arrange)
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.PARSE_ERROR);
    });
  });

  describe('Expiry Validation', () => {
    it('should accept link with future expiry date', async () => {
      // Given (Arrange)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // +7 Tage
      const url = `bluelight://connect?url=https://api.example.de&invite=INV_12345678&expires=${futureDate.toISOString()}`;
      const receivedParams: DeepLinkParams[] = [];

      service.on('deep-link-received', (params) => {
        receivedParams.push(params);
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(receivedParams).toHaveLength(1);
    });

    it('should reject link with past expiry date', async () => {
      // Given (Arrange)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // -1 Tag
      const url = `bluelight://connect?url=https://api.example.de&invite=INV_12345678&expires=${pastDate.toISOString()}`;
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.EXPIRED_LINK);
    });

    it('should reject link with invalid expiry date format', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678&expires=invalid-date';
      const errors: Array<{ error: DeepLinkError; message: string }> = [];

      service.on('deep-link-error', (error, message) => {
        errors.push({ error, message });
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(DeepLinkError.EXPIRED_LINK);
    });
  });

  describe('Event Emitter', () => {
    it('should emit deep-link-received event with correct params', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678';
      const receivedParams: DeepLinkParams[] = [];

      service.on('deep-link-received', (params) => {
        receivedParams.push(params);
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(receivedParams).toHaveLength(1);
      expect(receivedParams[0].serverUrl).toBe('https://api.example.de');
      expect(receivedParams[0].inviteCode).toBe('INV_12345678');
    });

    it('should call multiple listeners for same event', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678';
      let listener1Called = false;
      let listener2Called = false;

      service.on('deep-link-received', () => {
        listener1Called = true;
      });
      service.on('deep-link-received', () => {
        listener2Called = true;
      });

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    it('should remove listener with off()', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678';
      const receivedParams: DeepLinkParams[] = [];

      const listener = (params: DeepLinkParams) => {
        receivedParams.push(params);
      };

      service.on('deep-link-received', listener);
      service.off('deep-link-received', listener);

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(receivedParams).toHaveLength(0);
    });

    it('should remove all listeners when off() called without callback', async () => {
      // Given (Arrange)
      const url = 'bluelight://connect?url=https://api.example.de&invite=INV_12345678';
      let listener1Called = false;
      let listener2Called = false;

      service.on('deep-link-received', () => {
        listener1Called = true;
      });
      service.on('deep-link-received', () => {
        listener2Called = true;
      });

      service.off('deep-link-received'); // Alle entfernen

      const registerMock = vi.mocked(register);
      await service.initialize();
      const callback = registerMock.mock.calls[0][0];

      // When (Act)
      callback([url]);

      // Then (Assert)
      expect(listener1Called).toBe(false);
      expect(listener2Called).toBe(false);
    });
  });
});
