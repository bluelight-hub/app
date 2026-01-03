/**
 * Unit Tests für AesEncryptionAdapter.
 *
 * @module infrastructure/security/__tests__
 */

import type { ConfigService } from '@nestjs/config';
import { AesEncryptionAdapter } from '../aes-encryption.adapter';

describe('AesEncryptionAdapter', () => {
  // Valid 256-bit key (64 hex chars = 32 bytes)
  const validKey = 'a'.repeat(64);
  let adapter: AesEncryptionAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('onModuleInit', () => {
    it('sollte erfolgreich initialisieren mit gültigem Key', () => {
      // Given
      mockConfigService.get.mockReturnValue(validKey);
      adapter = new AesEncryptionAdapter(mockConfigService);

      // When
      adapter.onModuleInit();

      // Then - kein Fehler, encrypt/decrypt sollten funktionieren
      expect(() => adapter.encrypt('test')).not.toThrow();
    });

    it('sollte Fehler werfen wenn Key fehlt (Hard-Fail)', () => {
      // Given
      mockConfigService.get.mockReturnValue(undefined);
      adapter = new AesEncryptionAdapter(mockConfigService);

      // When/Then - App-Start wird verhindert
      expect(() => adapter.onModuleInit()).toThrow(/nicht konfiguriert/);
    });

    it('sollte Fehler werfen wenn Key zu kurz ist (Hard-Fail)', () => {
      // Given
      mockConfigService.get.mockReturnValue('abc123'); // Zu kurz
      adapter = new AesEncryptionAdapter(mockConfigService);

      // When/Then - App-Start wird verhindert
      expect(() => adapter.onModuleInit()).toThrow(/ungültige Länge/);
    });

    it('sollte Fehler werfen wenn Key ungültige Zeichen enthält (Hard-Fail)', () => {
      // Given
      mockConfigService.get.mockReturnValue('g'.repeat(64)); // 'g' ist kein Hex
      adapter = new AesEncryptionAdapter(mockConfigService);

      // When/Then - App-Start wird verhindert
      expect(() => adapter.onModuleInit()).toThrow(/ungültige Zeichen/);
    });
  });

  describe('encrypt/decrypt Roundtrip', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(validKey);
      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();
    });

    it('sollte Klartext korrekt ver- und entschlüsseln', () => {
      // Given
      const plainText = 'mein-geheimes-api-token-12345';

      // When
      const encrypted = adapter.encrypt(plainText);
      const decrypted = adapter.decrypt(encrypted);

      // Then
      expect(decrypted).toBe(plainText);
    });

    it('sollte unterschiedliche Cipher für gleichen Klartext erzeugen (IV-Varianz)', () => {
      // Given
      const plainText = 'gleiches-token';

      // When
      const encrypted1 = adapter.encrypt(plainText);
      const encrypted2 = adapter.encrypt(plainText);

      // Then - IVs sind unterschiedlich, daher unterschiedliche Cipher-Texte
      expect(encrypted1).not.toBe(encrypted2);

      // Aber beide entschlüsseln zum gleichen Klartext
      expect(adapter.decrypt(encrypted1)).toBe(plainText);
      expect(adapter.decrypt(encrypted2)).toBe(plainText);
    });

    it('sollte Unicode korrekt behandeln', () => {
      // Given
      const plainText = 'Hällö Wörld 🔐 日本語';

      // When
      const encrypted = adapter.encrypt(plainText);
      const decrypted = adapter.decrypt(encrypted);

      // Then
      expect(decrypted).toBe(plainText);
    });

    it('sollte leeren String behandeln', () => {
      // Given
      const plainText = '';

      // When
      const encrypted = adapter.encrypt(plainText);
      const decrypted = adapter.decrypt(encrypted);

      // Then
      expect(decrypted).toBe(plainText);
    });

    it('sollte langen Text behandeln', () => {
      // Given
      const plainText = 'x'.repeat(10000);

      // When
      const encrypted = adapter.encrypt(plainText);
      const decrypted = adapter.decrypt(encrypted);

      // Then
      expect(decrypted).toBe(plainText);
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(validKey);
      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();
    });

    it('sollte korrektes Format erzeugen (iv:authTag:cipherText)', () => {
      // Given
      const plainText = 'test-token';

      // When
      const encrypted = adapter.encrypt(plainText);

      // Then
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);

      // Alle Teile sollten Base64 sein
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      }

      // IV: 16 bytes = 24 Base64 chars (mit Padding)
      const ivBuffer = Buffer.from(parts[0], 'base64');
      expect(ivBuffer.length).toBe(16);

      // Auth Tag: 16 bytes
      const authTagBuffer = Buffer.from(parts[1], 'base64');
      expect(authTagBuffer.length).toBe(16);
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(validKey);
      adapter = new AesEncryptionAdapter(mockConfigService);
      adapter.onModuleInit();
    });

    it('sollte Fehler werfen bei ungültigem Format', () => {
      // Given
      const invalidCipherText = 'invalid-format';

      // When/Then
      expect(() => adapter.decrypt(invalidCipherText)).toThrow(/Ungültiges verschlüsseltes Format/);
    });

    it('sollte Fehler werfen bei zu wenigen Teilen', () => {
      // Given
      const invalidCipherText = 'part1:part2';

      // When/Then
      expect(() => adapter.decrypt(invalidCipherText)).toThrow(/Ungültiges verschlüsseltes Format/);
    });

    it('sollte Fehler werfen bei ungültiger IV Länge', () => {
      // Given - IV zu kurz (nur 8 bytes statt 16)
      const shortIv = Buffer.from('12345678').toString('base64');
      const authTag = Buffer.alloc(16).toString('base64');
      const cipherText = Buffer.from('encrypted').toString('base64');
      const invalidCipherText = `${shortIv}:${authTag}:${cipherText}`;

      // When/Then
      expect(() => adapter.decrypt(invalidCipherText)).toThrow(/Ungültige IV Länge/);
    });

    it('sollte Fehler werfen bei manipuliertem Cipher-Text', () => {
      // Given
      const plainText = 'original-token';
      const encrypted = adapter.encrypt(plainText);
      const parts = encrypted.split(':');

      // Manipuliere den Cipher-Text
      const manipulated = `${parts[0]}:${parts[1]}:${Buffer.from('manipulated').toString('base64')}`;

      // When/Then - GCM erkennt Manipulation via Auth Tag
      expect(() => adapter.decrypt(manipulated)).toThrow();
    });

    it('sollte Fehler werfen bei manipuliertem Auth-Tag', () => {
      // Given
      const plainText = 'original-token';
      const encrypted = adapter.encrypt(plainText);
      const parts = encrypted.split(':');

      // Manipuliere den Auth-Tag
      const fakeAuthTag = Buffer.alloc(16).fill(0).toString('base64');
      const manipulated = `${parts[0]}:${fakeAuthTag}:${parts[2]}`;

      // When/Then - GCM erkennt Manipulation
      expect(() => adapter.decrypt(manipulated)).toThrow();
    });
  });

  describe('Key-Isolation', () => {
    it('sollte mit unterschiedlichen Keys unterschiedliche Cipher erzeugen', () => {
      // Given
      const key1 = 'a'.repeat(64);
      const key2 = 'b'.repeat(64);
      const plainText = 'same-token';

      mockConfigService.get.mockReturnValue(key1);
      const adapter1 = new AesEncryptionAdapter(mockConfigService);
      adapter1.onModuleInit();

      mockConfigService.get.mockReturnValue(key2);
      const adapter2 = new AesEncryptionAdapter(mockConfigService);
      adapter2.onModuleInit();

      // When
      const encrypted1 = adapter1.encrypt(plainText);

      // Then - Entschlüsselung mit anderem Key sollte fehlschlagen
      expect(() => adapter2.decrypt(encrypted1)).toThrow();
    });
  });
});
