import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStore, useStoreObject } from '../use-store';
import * as storeService from '../../lib/store.service';

// Mock the store service
vi.mock('../../lib/store.service', () => ({
  getStoreValue: vi.fn().mockResolvedValue(undefined),
  setStoreValue: vi.fn().mockResolvedValue(undefined),
  deleteStoreKey: vi.fn().mockResolvedValue(undefined),
  initializeStore: vi.fn().mockResolvedValue(undefined),
}));

describe('useStore Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default value', async () => {
    const { result } = renderHook(() => useStore('testKey', 'defaultValue'));

    expect(result.current[3]).toBe(true); // isLoading
    expect(result.current[0]).toBe('defaultValue');

    await waitFor(() => {
      expect(result.current[3]).toBe(false);
    });
  });

  it('should load value from store', async () => {
    vi.mocked(storeService.getStoreValue).mockResolvedValueOnce('storedValue');

    const { result } = renderHook(() => useStore('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[0]).toBe('storedValue');
      expect(result.current[3]).toBe(false); // isLoading
    });
  });

  it('should set and persist value', async () => {
    const { result } = renderHook(() => useStore('testKey', 'defaultValue'));

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current[3]).toBe(false); // isLoading
    });

    await act(async () => {
      await result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(storeService.setStoreValue).toHaveBeenCalledWith('testKey', 'newValue');
  });

  it('should delete value', async () => {
    vi.mocked(storeService.getStoreValue).mockResolvedValueOnce('storedValue');

    const { result } = renderHook(() => useStore('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[3]).toBe(false);
    });

    await act(async () => {
      await result.current[2]();
    });

    expect(result.current[0]).toBe('defaultValue');
    expect(storeService.deleteStoreKey).toHaveBeenCalledWith('testKey');
  });

  it('should handle set errors gracefully', async () => {
    // Setup: first call returns 'initialValue', then reject on set
    vi.mocked(storeService.getStoreValue).mockResolvedValueOnce('initialValue');
    const error = new Error('Save failed');
    vi.mocked(storeService.setStoreValue).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStore('testKey', 'initialValue'));

    // Wait for initial load to complete and value to be set
    await waitFor(() => {
      expect(result.current[3]).toBe(false); // isLoading
      expect(result.current[0]).toBe('initialValue');
    });

    await expect(
      act(async () => {
        await result.current[1]('newValue');
      }),
    ).rejects.toThrow('Save failed');

    // Value should be rolled back
    expect(result.current[0]).toBe('initialValue');
  });
});

describe('useStoreObject Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    const defaults = { name: '', count: 0, enabled: false };
    const { result } = renderHook(() => useStoreObject('settings', defaults));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.values).toEqual(defaults);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should load object from store', async () => {
    const defaults = { name: '', count: 0 };
    const stored = { name: 'Test', count: 42 };

    vi.mocked(storeService.getStoreValue).mockResolvedValueOnce(stored);

    const { result } = renderHook(() => useStoreObject('settings', defaults));

    await waitFor(() => {
      expect(result.current.values).toEqual(stored);
    });
  });

  it('should merge stored and default values', async () => {
    const defaults = { name: '', count: 0, enabled: false };
    const stored = { name: 'Test' }; // partial

    vi.mocked(storeService.getStoreValue).mockResolvedValueOnce(stored);

    const { result } = renderHook(() => useStoreObject('settings', defaults));

    await waitFor(() => {
      expect(result.current.values).toEqual({
        name: 'Test',
        count: 0,
        enabled: false,
      });
    });
  });

  it('should set single property', async () => {
    const defaults = { name: '', count: 0 };
    const { result } = renderHook(() => useStoreObject('settings', defaults));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.set('name', 'NewName');
    });

    expect(result.current.values.name).toBe('NewName');
    expect(storeService.setStoreValue).toHaveBeenCalledWith('settings', {
      name: 'NewName',
      count: 0,
    });
  });

  it('should set multiple properties', async () => {
    const defaults = { name: '', count: 0 };
    const { result } = renderHook(() => useStoreObject('settings', defaults));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setAll({ name: 'Test', count: 42 });
    });

    expect(result.current.values).toEqual({ name: 'Test', count: 42 });
    expect(storeService.setStoreValue).toHaveBeenCalledWith('settings', {
      name: 'Test',
      count: 42,
    });
  });
});
