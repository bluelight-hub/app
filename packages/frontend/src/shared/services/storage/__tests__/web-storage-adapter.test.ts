import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebStorageAdapter } from '../web-storage-adapter';

// Mock Storage Implementation
interface MockStorage {
  data: Map<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  get length(): number;
  key: ReturnType<typeof vi.fn>;
}

function createMockStorage(): MockStorage {
  const data = new Map<string, string>();

  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => {
      data.clear();
    }),
    get length() {
      return data.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(data.keys());
      return keys[index] ?? null;
    }),
  };
}

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;
  let mockLocalStorage: MockStorage;

  beforeEach(() => {
    // Given: Leerer localStorage vor jedem Test
    mockLocalStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.clearAllMocks();
    adapter = new WebStorageAdapter();
  });

  afterEach(() => {
    // Restore original globals
    vi.unstubAllGlobals();
  });

  describe('getItem() / setItem() Roundtrip', () => {
    it('should store and retrieve a value', async () => {
      // Given: Ein Key-Value Paar
      const key = 'test-key';
      const value = 'test-value';

      // When: Wert speichern und abrufen
      await adapter.setItem(key, value);
      const result = await adapter.getItem(key);

      // Then: Gespeicherter Wert wird zurückgegeben
      expect(result).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      // Given: Ein nicht existierender Key
      const key = 'non-existent-key';

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben
      expect(result).toBeNull();
    });

    it('should overwrite existing value', async () => {
      // Given: Ein existierender Key mit Wert
      const key = 'test-key';
      await adapter.setItem(key, 'old-value');

      // When: Wert überschreiben
      await adapter.setItem(key, 'new-value');
      const result = await adapter.getItem(key);

      // Then: Neuer Wert wird zurückgegeben
      expect(result).toBe('new-value');
    });
  });

  describe('removeItem()', () => {
    it('should remove an existing item', async () => {
      // Given: Ein gespeicherter Key-Value Paar
      const key = 'test-key';
      await adapter.setItem(key, 'test-value');

      // When: Item entfernen
      await adapter.removeItem(key);
      const result = await adapter.getItem(key);

      // Then: Item existiert nicht mehr
      expect(result).toBeNull();
    });

    it('should not throw error when removing non-existent item', async () => {
      // Given: Ein nicht existierender Key
      const key = 'non-existent-key';

      // When: Item entfernen
      // Then: Keine Exception
      await expect(adapter.removeItem(key)).resolves.not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all items', async () => {
      // Given: Mehrere gespeicherte Items
      await adapter.setItem('key1', 'value1');
      await adapter.setItem('key2', 'value2');
      await adapter.setItem('key3', 'value3');

      // When: Alle Items löschen
      await adapter.clear();

      // Then: Alle Items sind gelöscht
      expect(await adapter.getItem('key1')).toBeNull();
      expect(await adapter.getItem('key2')).toBeNull();
      expect(await adapter.getItem('key3')).toBeNull();
    });
  });

  describe('Security Flag', () => {
    it('should store security flag "insecure" in localStorage', async () => {
      // Given: Ein Key-Value Paar
      const key = 'test-key';
      const value = 'test-value';

      // When: Wert speichern
      await adapter.setItem(key, value);

      // Then: Security Flag wird mitgespeichert
      const rawData = mockLocalStorage.data.get(key);
      expect(rawData).toBeTruthy();

      const parsed = JSON.parse(rawData!);
      expect(parsed).toHaveProperty('storageType', 'insecure');
      expect(parsed).toHaveProperty('data', value);
    });

    it('should correctly parse stored data with security flag', async () => {
      // Given: Direkt gespeicherte Daten mit Security Flag
      const key = 'test-key';
      const value = 'test-value';
      mockLocalStorage.data.set(key, JSON.stringify({ data: value, storageType: 'insecure' }));

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Nur data-Feld wird zurückgegeben
      expect(result).toBe(value);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      // Given: Ungültige JSON-Daten im localStorage
      const key = 'invalid-json-key';
      mockLocalStorage.data.set(key, 'invalid-json');

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben (statt Exception)
      expect(result).toBeNull();
    });

    it('should handle storage quota exceeded error', async () => {
      // Given: localStorage Mock der QuotaExceededError wirft
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // When: Wert speichern
      // Then: Exception wird geworfen
      await expect(adapter.setItem('key', 'value')).rejects.toThrow();

      // Cleanup
      mockLocalStorage.setItem = originalSetItem;
    });

    it('should return null when localStorage returns null', async () => {
      // Given: Ein Key der null zurückgibt
      const key = 'null-key';

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben
      expect(result).toBeNull();
    });

    it('should handle missing data field gracefully', async () => {
      // Given: Gespeicherte Daten ohne data-Feld
      const key = 'no-data-field-key';
      mockLocalStorage.data.set(key, JSON.stringify({ storageType: 'insecure' }));

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben
      expect(result).toBeNull();
    });
  });

  describe('Browser Edge Cases - Critical Scenarios', () => {
    it('should throw error when storage quota is exceeded', async () => {
      // Given: Mock QuotaExceededError (z.B. durch zu große Daten)
      mockLocalStorage.setItem.mockImplementation(() => {
        const quotaError = new Error('QuotaExceededError');
        quotaError.name = 'QuotaExceededError';
        throw quotaError;
      });

      const hugeData = 'x'.repeat(10_000_000); // 10MB

      // When/Then: setItem sollte QuotaExceededError werfen
      await expect(adapter.setItem('key', hugeData)).rejects.toThrow('QuotaExceededError');
    });

    it('should throw error in private browsing mode (SecurityError)', async () => {
      // Given: Mock SecurityError (Private Browsing / Incognito Mode)
      mockLocalStorage.setItem.mockImplementation(() => {
        const securityError = new Error('SecurityError');
        securityError.name = 'SecurityError';
        throw securityError;
      });

      // When/Then: setItem sollte SecurityError werfen
      await expect(adapter.setItem('key', 'value')).rejects.toThrow('SecurityError');
    });

    it('should throw error when localStorage is disabled', async () => {
      // Given: Mock disabled localStorage (z.B. durch Browser-Einstellungen)
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      // When/Then: removeItem sollte Error werfen
      await expect(adapter.removeItem('key')).rejects.toThrow('not available');
    });
  });
});
