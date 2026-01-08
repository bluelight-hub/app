import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeStore, getStore, setStoreValue, getStoreValue, hasStoreKey, deleteStoreKey, clearStore, getStoreKeys, storeService } from '../store.service';
import { Store } from '@tauri-apps/plugin-store';

// Mock @tauri-apps/plugin-store
vi.mock('@tauri-apps/plugin-store', () => {
  const mockStore = {
    load: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    has: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  };

  return {
    Store: vi.fn(() => mockStore),
  };
});

describe('Store Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize store successfully', async () => {
      const store = await initializeStore();
      expect(store).toBeDefined();
      expect(Store).toHaveBeenCalledWith('app-store.json');
    });

    it('should use custom store path', async () => {
      vi.clearAllMocks();
      await initializeStore('custom-store.json');
      expect(Store).toHaveBeenCalledWith('custom-store.json');
    });

    it('should return cached instance on subsequent calls', async () => {
      const store1 = await getStore();
      vi.clearAllMocks();
      const store2 = await getStore();
      expect(store1).toBe(store2);
      expect(Store).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      vi.mocked(Store).mockImplementationOnce(() => {
        throw error;
      });

      await expect(initializeStore('error-store.json')).rejects.toThrow('Initialization failed');
    });
  });

  describe('Set and Get Operations', () => {
    it('should set string value', async () => {
      const store = await getStore();
      await setStoreValue('testKey', 'testValue');

      expect(store.set).toHaveBeenCalledWith('testKey', 'testValue');
      expect(store.save).toHaveBeenCalled();
    });

    it('should set object value', async () => {
      const store = await getStore();
      const testObj = { name: 'test', count: 42 };
      await setStoreValue('objKey', testObj);

      expect(store.set).toHaveBeenCalledWith('objKey', testObj);
    });

    it('should get string value', async () => {
      const store = await getStore();
      const mockStore = store as unknown as Record<string, unknown>;
      (mockStore.get as any).mockResolvedValueOnce('testValue');

      const value = await getStoreValue('testKey');
      expect(value).toBe('testValue');
      expect(store.get).toHaveBeenCalledWith('testKey');
    });

    it('should return default value when key not found', async () => {
      const store = await getStore();
      const mockStore = store as any;
      mockStore.get.mockResolvedValueOnce(null);

      const value = await getStoreValue('missingKey', 'defaultValue');
      expect(value).toBe('defaultValue');
    });

    it('should handle set errors gracefully', async () => {
      const store = await getStore();
      const mockStore = store as any;
      const error = new Error('Set failed');
      mockStore.set.mockRejectedValueOnce(error);

      await expect(setStoreValue('errorKey', 'value')).rejects.toThrow('Set failed');
    });

    it('should handle get errors gracefully', async () => {
      const store = await getStore();
      const mockStore = store as any;
      const error = new Error('Get failed');
      mockStore.get.mockRejectedValueOnce(error);

      await expect(getStoreValue('errorKey')).rejects.toThrow('Get failed');
    });
  });

  describe('Key Operations', () => {
    it('should check if key exists', async () => {
      const store = await getStore();
      const mockStore = store as any;
      mockStore.has.mockResolvedValueOnce(true);

      const exists = await hasStoreKey('existingKey');
      expect(exists).toBe(true);
      expect(store.has).toHaveBeenCalledWith('existingKey');
    });

    it('should return false for non-existent keys', async () => {
      const store = await getStore();
      const mockStore = store as any;
      mockStore.has.mockResolvedValueOnce(false);

      const exists = await hasStoreKey('missingKey');
      expect(exists).toBe(false);
    });

    it('should delete key', async () => {
      const store = await getStore();
      await deleteStoreKey('deleteMe');

      expect(store.delete).toHaveBeenCalledWith('deleteMe');
      expect(store.save).toHaveBeenCalled();
    });

    it('should get all keys', async () => {
      const store = await getStore();
      const mockStore = store as any;
      mockStore.keys.mockResolvedValueOnce(['key1', 'key2', 'key3']);

      const keys = await getStoreKeys();
      expect(keys).toEqual(['key1', 'key2', 'key3']);
      expect(store.keys).toHaveBeenCalled();
    });
  });

  describe('Clear Operation', () => {
    it('should clear all keys', async () => {
      const store = await getStore();
      await clearStore();

      expect(store.clear).toHaveBeenCalled();
      expect(store.save).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      const store = await getStore();
      const mockStore = store as any;
      const error = new Error('Clear failed');
      mockStore.clear.mockRejectedValueOnce(error);

      await expect(clearStore()).rejects.toThrow('Clear failed');
    });
  });

  describe('Service Object', () => {
    it('should expose all methods in storeService', () => {
      expect(storeService).toHaveProperty('initialize');
      expect(storeService).toHaveProperty('get');
      expect(storeService).toHaveProperty('set');
      expect(storeService).toHaveProperty('has');
      expect(storeService).toHaveProperty('delete');
      expect(storeService).toHaveProperty('clear');
      expect(storeService).toHaveProperty('keys');
    });
  });
});
