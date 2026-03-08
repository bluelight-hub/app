// @ts-nocheck
import type { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { AesEncryptionAdapter } from '@infrastructure/security';

const MASTER_KEY_HEX = 'a'.repeat(64);
const LEGACY_KEY_HEX = 'b'.repeat(64);

describe('AesEncryptionAdapter', () => {
  let adapter: AesEncryptionAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('onModuleInit', () => {
    it('sollte mit gueltigem MASTER_SECRET initialisieren', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MASTER_SECRET') return MASTER_KEY_HEX;
        return undefined;
      });

      adapter = new AesEncryptionAdapter(mockConfigService);

      expect(() => adapter.onModuleInit()).not.toThrow();
      expect(() => adapter.encrypt('hello')).not.toThrow();
    });

    it('sollte Fehler werfen wenn MASTER_SECRET fehlt', () => {
      mockConfigService.get.mockReturnValue(undefined);
      adapter = new AesEncryptionAdapter(mockConfigService);

      expect(() => adapter.onModuleInit()).not.toThrow();
      expect(() => adapter.encrypt('hello')).toThrow(/MASTER_SECRET ist nicht verfügbar/);
    });
  });

  describe('v1 encrypt/decrypt', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MASTER_SECRET') return MASTER_KEY_HEX;
        return undefined;
      });
      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();
    });

    it('sollte Klartext korrekt ver- und entschluesseln', () => {
      const plainText = 'mein-geheimes-api-token-12345';

      const encrypted = adapter.encrypt(plainText);
      const decrypted = adapter.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('sollte v1 Payload als JSON schreiben', () => {
      const encrypted = adapter.encrypt('token');
      const payload = JSON.parse(encrypted) as {
        version: string;
        alg: string;
        iv: string;
        authTag: string;
        ciphertext: string;
      };

      expect(payload.version).toBe('v1');
      expect(payload.alg).toBe('aes-256-gcm');
      expect(typeof payload.iv).toBe('string');
      expect(typeof payload.authTag).toBe('string');
      expect(typeof payload.ciphertext).toBe('string');
    });
  });

  describe('legacy dual-read', () => {
    it('sollte Legacy-Ciphertexte lesen wenn Legacy-Key konfiguriert ist', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MASTER_SECRET') return MASTER_KEY_HEX;
        if (key === 'INTEGRATION_ENCRYPTION_KEY') return LEGACY_KEY_HEX;
        return undefined;
      });

      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();

      const legacyCipher = encryptLegacy('legacy-token', LEGACY_KEY_HEX);
      expect(adapter.decrypt(legacyCipher)).toBe('legacy-token');
    });

    it('sollte Legacy-Reads ohne Legacy-Key ablehnen', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MASTER_SECRET') return MASTER_KEY_HEX;
        return undefined;
      });

      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();

      const legacyCipher = encryptLegacy('legacy-token', LEGACY_KEY_HEX);
      expect(() => adapter.decrypt(legacyCipher)).toThrow(/Legacy-Ciphertext erkannt/);
    });

    it('sollte Legacy-Ciphertexte auch ohne MASTER_SECRET lesen können', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INTEGRATION_ENCRYPTION_KEY') return LEGACY_KEY_HEX;
        return undefined;
      });

      adapter = new AesEncryptionAdapter(mockConfigService);
      expect(() => adapter.onModuleInit()).not.toThrow();

      const legacyCipher = encryptLegacy('legacy-token', LEGACY_KEY_HEX);
      expect(adapter.decrypt(legacyCipher)).toBe('legacy-token');
      expect(() => adapter.encrypt('new-secret')).toThrow(/MASTER_SECRET ist nicht verfügbar/);
    });
  });
});

function encryptLegacy(plainText: string, keyHex: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(keyHex, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}
