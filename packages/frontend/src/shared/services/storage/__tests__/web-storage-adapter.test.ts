import { describe, it, expect, beforeEach } from 'vitest';
import { WebStorageAdapter } from '../web-storage-adapter';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;

  beforeEach(() => {
    // Given: Leerer localStorage vor jedem Test
    localStorageMock.clear();
    adapter = new WebStorageAdapter();
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
      const rawData = localStorageMock.getItem(key);
      expect(rawData).toBeTruthy();

      const parsed = JSON.parse(rawData!);
      expect(parsed).toHaveProperty('storageType', 'insecure');
      expect(parsed).toHaveProperty('data', value);
    });

    it('should correctly parse stored data with security flag', async () => {
      // Given: Direkt gespeicherte Daten mit Security Flag
      const key = 'test-key';
      const value = 'test-value';
      localStorageMock.setItem(key, JSON.stringify({ data: value, storageType: 'insecure' }));

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
      localStorageMock.setItem(key, 'invalid-json');

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben (statt Exception)
      expect(result).toBeNull();
    });

    it('should handle storage quota exceeded error', async () => {
      // Given: localStorage Mock der QuotaExceededError wirft
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };

      // When: Wert speichern
      // Then: Exception wird geworfen
      await expect(adapter.setItem('key', 'value')).rejects.toThrow();

      // Cleanup
      localStorageMock.setItem = originalSetItem;
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
      localStorageMock.setItem(key, JSON.stringify({ storageType: 'insecure' }));

      // When: Wert abrufen
      const result = await adapter.getItem(key);

      // Then: Null wird zurückgegeben
      expect(result).toBeNull();
    });
  });
});
