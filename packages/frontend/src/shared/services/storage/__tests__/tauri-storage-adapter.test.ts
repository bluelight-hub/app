import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriStorageAdapter } from '../tauri-storage-adapter';

// Mock @tauri-apps/plugin-store LazyStore
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockClear = vi.fn();

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: class MockLazyStore {
    get = mockGet;
    set = mockSet;
    delete = mockDelete;
    clear = mockClear;
  },
}));

describe('TauriStorageAdapter', () => {
  let adapter: TauriStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new TauriStorageAdapter();
  });

  describe('getItem', () => {
    it('should call store.get with key', async () => {
      // Given
      const mockValue = 'test-value';
      mockGet.mockResolvedValue(mockValue);

      // When
      const result = await adapter.getItem('test-key');

      // Then
      expect(mockGet).toHaveBeenCalledWith('test-key');
      expect(result).toBe(mockValue);
    });

    it('should return null when key does not exist', async () => {
      // Given
      mockGet.mockResolvedValue(undefined);

      // When
      const result = await adapter.getItem('non-existent-key');

      // Then
      expect(result).toBeNull();
    });

    it('should throw error when store.get throws error', async () => {
      // Given
      const error = new Error('Store error');
      mockGet.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.getItem('test-key')).rejects.toThrow('Store error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setItem', () => {
    it('should call store.set with key and value', async () => {
      // Given
      mockSet.mockResolvedValue(undefined);

      // When
      await adapter.setItem('test-key', 'test-value');

      // Then
      expect(mockSet).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should throw error when store.set fails', async () => {
      // Given
      const error = new Error('Store error');
      mockSet.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.setItem('test-key', 'test-value')).rejects.toThrow('Store error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] setItem failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('should call store.delete with key', async () => {
      // Given
      mockDelete.mockResolvedValue(true);

      // When
      await adapter.removeItem('test-key');

      // Then
      expect(mockDelete).toHaveBeenCalledWith('test-key');
    });

    it('should handle when key does not exist', async () => {
      // Given
      mockDelete.mockResolvedValue(false);

      // When/Then
      await expect(adapter.removeItem('non-existent-key')).resolves.not.toThrow();
    });

    it('should throw error when store.delete fails', async () => {
      // Given
      const error = new Error('Store error');
      mockDelete.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.removeItem('test-key')).rejects.toThrow('Store error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] removeItem failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should call store.clear', async () => {
      // Given
      mockClear.mockResolvedValue(undefined);

      // When
      await adapter.clear();

      // Then
      expect(mockClear).toHaveBeenCalled();
    });

    it('should throw error when store.clear fails', async () => {
      // Given
      const error = new Error('Store error');
      mockClear.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.clear()).rejects.toThrow('Store error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] clear failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('IStoragePort interface compliance', () => {
    it('should implement all required methods', () => {
      // Given/When/Then
      expect(adapter).toHaveProperty('getItem');
      expect(adapter).toHaveProperty('setItem');
      expect(adapter).toHaveProperty('removeItem');
      expect(adapter).toHaveProperty('clear');
      expect(typeof adapter.getItem).toBe('function');
      expect(typeof adapter.setItem).toBe('function');
      expect(typeof adapter.removeItem).toBe('function');
      expect(typeof adapter.clear).toBe('function');
    });
  });

  describe('Error Handling - Critical Edge Cases', () => {
    it('should throw error when store fails with permission denied', async () => {
      // Given: Mock store rejection mit Permission Error
      const error = new Error('Permission denied');
      mockGet.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: getItem sollte Error werfen
      await expect(adapter.getItem('test-key')).rejects.toThrow('Permission denied');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when store times out', async () => {
      // Given: Mock timeout scenario
      const timeoutError = new Error('Timeout');
      mockSet.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(timeoutError), 100)));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: setItem sollte Timeout Error werfen
      await expect(adapter.setItem('key', 'value')).rejects.toThrow('Timeout');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] setItem failed:', timeoutError);

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when store plugin not initialized', async () => {
      // Given: Mock store plugin not found error
      const pluginError = new Error('Store plugin not initialized');
      mockGet.mockRejectedValue(pluginError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: getItem sollte Error werfen
      await expect(adapter.getItem('key')).rejects.toThrow('Store plugin not initialized');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', pluginError);

      consoleErrorSpy.mockRestore();
    });
  });
});
