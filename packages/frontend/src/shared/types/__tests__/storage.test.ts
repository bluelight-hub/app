import { describe, expect, it } from 'vitest';
import type { IStoragePort } from '../storage';

/**
 * Tests für IStoragePort Interface
 *
 * Validiert Type Contracts für Storage Abstraction Layer
 */
describe('IStoragePort Interface', () => {
  it('should define required methods with correct signatures', () => {
    // Given: Mock implementation
    const mockStorage: IStoragePort = {
      getItem: async (_key: string) => null,
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
      clear: async () => {},
    };

    // Then: All methods exist and are callable
    expect(mockStorage.getItem).toBeDefined();
    expect(mockStorage.setItem).toBeDefined();
    expect(mockStorage.removeItem).toBeDefined();
    expect(mockStorage.clear).toBeDefined();

    expect(typeof mockStorage.getItem).toBe('function');
    expect(typeof mockStorage.setItem).toBe('function');
    expect(typeof mockStorage.removeItem).toBe('function');
    expect(typeof mockStorage.clear).toBe('function');
  });

  it('should return Promise<string|null> from getItem', async () => {
    // Given: Mock returning string
    const mockStorage: IStoragePort = {
      getItem: async (key: string) => (key === 'test' ? 'value' : null),
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
    };

    // When: Get existing item
    const result = await mockStorage.getItem('test');

    // Then: Returns string
    expect(result).toBe('value');
    expect(typeof result).toBe('string');
  });

  it('should return Promise<string|null> as null for non-existent keys', async () => {
    // Given: Mock returning null
    const mockStorage: IStoragePort = {
      getItem: async (_key: string) => null,
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
    };

    // When: Get non-existent item
    const result = await mockStorage.getItem('nonexistent');

    // Then: Returns null
    expect(result).toBeNull();
  });

  it('should accept string key and value in setItem', async () => {
    // Given: Mock tracking calls
    let storedKey = '';
    let storedValue = '';

    const mockStorage: IStoragePort = {
      getItem: async () => null,
      setItem: async (key: string, value: string) => {
        storedKey = key;
        storedValue = value;
      },
      removeItem: async () => {},
      clear: async () => {},
    };

    // When: Set item
    await mockStorage.setItem('testKey', 'testValue');

    // Then: Values are passed correctly
    expect(storedKey).toBe('testKey');
    expect(storedValue).toBe('testValue');
  });

  it('should accept string key in removeItem', async () => {
    // Given: Mock tracking calls
    let removedKey = '';

    const mockStorage: IStoragePort = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async (key: string) => {
        removedKey = key;
      },
      clear: async () => {},
    };

    // When: Remove item
    await mockStorage.removeItem('keyToRemove');

    // Then: Key is passed correctly
    expect(removedKey).toBe('keyToRemove');
  });

  it('should accept no parameters in clear', async () => {
    // Given: Mock tracking calls
    let clearCalled = false;

    const mockStorage: IStoragePort = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {
        clearCalled = true;
      },
    };

    // When: Clear storage
    await mockStorage.clear();

    // Then: Clear is called
    expect(clearCalled).toBe(true);
  });
});
