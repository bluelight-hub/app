import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriStorageAdapter } from '../tauri-storage-adapter';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Import mocked invoke
import { invoke } from '@tauri-apps/api/core';

describe('TauriStorageAdapter', () => {
  let adapter: TauriStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new TauriStorageAdapter();
  });

  describe('getItem', () => {
    it('should call storage_get command with key', async () => {
      // Given
      const mockValue = 'test-value';
      vi.mocked(invoke).mockResolvedValue(mockValue);

      // When
      const result = await adapter.getItem('test-key');

      // Then
      expect(invoke).toHaveBeenCalledWith('storage_get', { key: 'test-key' });
      expect(result).toBe(mockValue);
    });

    it('should return null when key does not exist', async () => {
      // Given
      vi.mocked(invoke).mockResolvedValue(null);

      // When
      const result = await adapter.getItem('non-existent-key');

      // Then
      expect(result).toBeNull();
    });

    it('should return null when invoke throws error', async () => {
      // Given
      vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When
      const result = await adapter.getItem('test-key');

      // Then
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setItem', () => {
    it('should call storage_set command with key and value', async () => {
      // Given
      vi.mocked(invoke).mockResolvedValue(undefined);

      // When
      await adapter.setItem('test-key', 'test-value');

      // Then
      expect(invoke).toHaveBeenCalledWith('storage_set', {
        key: 'test-key',
        value: 'test-value',
      });
    });

    it('should throw error when invoke fails', async () => {
      // Given
      const error = new Error('IPC error');
      vi.mocked(invoke).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.setItem('test-key', 'test-value')).rejects.toThrow('IPC error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] setItem failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('should call storage_remove command with key', async () => {
      // Given
      vi.mocked(invoke).mockResolvedValue(true);

      // When
      await adapter.removeItem('test-key');

      // Then
      expect(invoke).toHaveBeenCalledWith('storage_remove', { key: 'test-key' });
    });

    it('should handle when key does not exist', async () => {
      // Given
      vi.mocked(invoke).mockResolvedValue(false);

      // When/Then
      await expect(adapter.removeItem('non-existent-key')).resolves.not.toThrow();
    });

    it('should throw error when invoke fails', async () => {
      // Given
      const error = new Error('IPC error');
      vi.mocked(invoke).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.removeItem('test-key')).rejects.toThrow('IPC error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] removeItem failed:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should call storage_clear command', async () => {
      // Given
      vi.mocked(invoke).mockResolvedValue(undefined);

      // When
      await adapter.clear();

      // Then
      expect(invoke).toHaveBeenCalledWith('storage_clear');
    });

    it('should throw error when invoke fails', async () => {
      // Given
      const error = new Error('IPC error');
      vi.mocked(invoke).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then
      await expect(adapter.clear()).rejects.toThrow('IPC error');
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
    it('should throw error when Tauri invoke fails with permission denied', async () => {
      // Given: Mock invoke rejection mit Permission Error
      const error = new Error('Permission denied');
      vi.mocked(invoke).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: getItem sollte Error werfen
      await expect(adapter.getItem('test-key')).rejects.toThrow('Permission denied');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when Tauri invoke times out', async () => {
      // Given: Mock timeout scenario
      const timeoutError = new Error('Timeout');
      vi.mocked(invoke).mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(timeoutError), 100)));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: setItem sollte Timeout Error werfen
      await expect(adapter.setItem('key', 'value')).rejects.toThrow('Timeout');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] setItem failed:', timeoutError);

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when storage command not registered', async () => {
      // Given: Mock Tauri command not found error
      const commandError = new Error('Command storage_get not found');
      vi.mocked(invoke).mockRejectedValue(commandError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: getItem sollte Error werfen
      await expect(adapter.getItem('key')).rejects.toThrow('Command storage_get not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TauriStorageAdapter] getItem failed:', commandError);

      consoleErrorSpy.mockRestore();
    });
  });
});
