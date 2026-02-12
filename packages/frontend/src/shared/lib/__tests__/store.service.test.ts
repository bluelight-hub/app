import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Store Instanz
const mockStoreInstance = {
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  has: vi.fn().mockResolvedValue(false),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  save: vi.fn().mockResolvedValue(undefined),
};

// Mock @tauri-apps/api/core damit isTauri() true zurueckgibt
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
}));

// Mock @tauri-apps/plugin-store mit Store.load() als statische Methode (Tauri v2 API)
const loadSpy = vi.fn().mockResolvedValue(mockStoreInstance);

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: loadSpy,
  },
}));

describe('Store Service', () => {
  // Dynamisch importierte Module
  let initializeStore: typeof import('../store.service').initializeStore;
  let getStore: typeof import('../store.service').getStore;
  let setStoreValue: typeof import('../store.service').setStoreValue;
  let getStoreValue: typeof import('../store.service').getStoreValue;
  let hasStoreKey: typeof import('../store.service').hasStoreKey;
  let deleteStoreKey: typeof import('../store.service').deleteStoreKey;
  let clearStore: typeof import('../store.service').clearStore;
  let getStoreKeys: typeof import('../store.service').getStoreKeys;
  let storeService: typeof import('../store.service').storeService;

  beforeEach(async () => {
    // Reset aller Mocks
    vi.clearAllMocks();
    loadSpy.mockResolvedValue(mockStoreInstance);
    mockStoreInstance.set.mockResolvedValue(undefined);
    mockStoreInstance.get.mockResolvedValue(null);
    mockStoreInstance.has.mockResolvedValue(false);
    mockStoreInstance.delete.mockResolvedValue(undefined);
    mockStoreInstance.clear.mockResolvedValue(undefined);
    mockStoreInstance.keys.mockResolvedValue([]);
    mockStoreInstance.save.mockResolvedValue(undefined);

    // Reset des Moduls um Singleton zu clearen
    vi.resetModules();

    // Dynamischer Import nach Modul-Reset
    const storeModule = await import('../store.service');
    initializeStore = storeModule.initializeStore;
    getStore = storeModule.getStore;
    setStoreValue = storeModule.setStoreValue;
    getStoreValue = storeModule.getStoreValue;
    hasStoreKey = storeModule.hasStoreKey;
    deleteStoreKey = storeModule.deleteStoreKey;
    clearStore = storeModule.clearStore;
    getStoreKeys = storeModule.getStoreKeys;
    storeService = storeModule.storeService;
  });

  describe('Initialization', () => {
    it('should initialize store successfully', async () => {
      const store = await initializeStore();
      expect(store).toBeDefined();
      expect(loadSpy).toHaveBeenCalledWith('app-store.json');
    });

    it('should use custom store path', async () => {
      await initializeStore('custom-store.json');
      expect(loadSpy).toHaveBeenCalledWith('custom-store.json');
    });

    it('should return cached instance on subsequent calls', async () => {
      const store1 = await getStore();
      loadSpy.mockClear();
      const store2 = await getStore();
      expect(store1).toBe(store2);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      loadSpy.mockRejectedValueOnce(new Error('Initialization failed'));

      await expect(initializeStore()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Set and Get Operations', () => {
    it('should set string value', async () => {
      await getStore();
      await setStoreValue('testKey', 'testValue');

      expect(mockStoreInstance.set).toHaveBeenCalledWith('testKey', 'testValue');
      expect(mockStoreInstance.save).toHaveBeenCalled();
    });

    it('should set object value', async () => {
      await getStore();
      const testObj = { name: 'test', count: 42 };
      await setStoreValue('objKey', testObj);

      expect(mockStoreInstance.set).toHaveBeenCalledWith('objKey', testObj);
    });

    it('should get string value', async () => {
      await getStore();
      mockStoreInstance.get.mockResolvedValueOnce('testValue');

      const value = await getStoreValue('testKey');
      expect(value).toBe('testValue');
      expect(mockStoreInstance.get).toHaveBeenCalledWith('testKey');
    });

    it('should return default value when key not found', async () => {
      await getStore();
      mockStoreInstance.get.mockResolvedValueOnce(null);

      const value = await getStoreValue('missingKey', 'defaultValue');
      expect(value).toBe('defaultValue');
    });

    it('should handle set errors gracefully', async () => {
      await getStore();
      const error = new Error('Set failed');
      mockStoreInstance.set.mockRejectedValueOnce(error);

      await expect(setStoreValue('errorKey', 'value')).rejects.toThrow('Set failed');
    });

    it('should handle get errors gracefully', async () => {
      await getStore();
      const error = new Error('Get failed');
      mockStoreInstance.get.mockRejectedValueOnce(error);

      await expect(getStoreValue('errorKey')).rejects.toThrow('Get failed');
    });
  });

  describe('Key Operations', () => {
    it('should check if key exists', async () => {
      await getStore();
      mockStoreInstance.has.mockResolvedValueOnce(true);

      const exists = await hasStoreKey('existingKey');
      expect(exists).toBe(true);
      expect(mockStoreInstance.has).toHaveBeenCalledWith('existingKey');
    });

    it('should return false for non-existent keys', async () => {
      await getStore();
      mockStoreInstance.has.mockResolvedValueOnce(false);

      const exists = await hasStoreKey('missingKey');
      expect(exists).toBe(false);
    });

    it('should delete key', async () => {
      await getStore();
      await deleteStoreKey('deleteMe');

      expect(mockStoreInstance.delete).toHaveBeenCalledWith('deleteMe');
      expect(mockStoreInstance.save).toHaveBeenCalled();
    });

    it('should get all keys', async () => {
      await getStore();
      mockStoreInstance.keys.mockResolvedValueOnce(['key1', 'key2', 'key3']);

      const keys = await getStoreKeys();
      expect(keys).toEqual(['key1', 'key2', 'key3']);
      expect(mockStoreInstance.keys).toHaveBeenCalled();
    });
  });

  describe('Clear Operation', () => {
    it('should clear all keys', async () => {
      await getStore();
      await clearStore();

      expect(mockStoreInstance.clear).toHaveBeenCalled();
      expect(mockStoreInstance.save).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      await getStore();
      const error = new Error('Clear failed');
      mockStoreInstance.clear.mockRejectedValueOnce(error);

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
