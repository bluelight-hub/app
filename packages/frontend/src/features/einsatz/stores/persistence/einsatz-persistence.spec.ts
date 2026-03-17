import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearActiveEinsatz, loadActiveEinsatzId, saveActiveEinsatzId, subscribeToStorageChanges } from './einsatz-persistence';

const storageAdapter = {
  getItem: vi.fn<(_: string) => Promise<string | null>>(),
  setItem: vi.fn<(_: string, __: string) => Promise<void>>(),
  removeItem: vi.fn<(_: string) => Promise<void>>(),
  clear: vi.fn<() => Promise<void>>(),
};

const storageScope = {
  serverId: 'server-1',
  userId: 'user-1',
  role: 'DISPATCHER',
} as const;

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => storageAdapter,
}));

describe('einsatz-persistence', () => {
  beforeEach(() => {
    storageAdapter.getItem.mockReset();
    storageAdapter.setItem.mockReset();
    storageAdapter.removeItem.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persistiert die aktive Einsatz-ID nach Server, Nutzer und Rolle getrennt', async () => {
    await saveActiveEinsatzId('einsatz-42', storageScope);

    expect(storageAdapter.setItem).toHaveBeenCalledWith('bluelight:server:server-1:user:user-1:role:DISPATCHER:feature:einsatz:active', 'einsatz-42');
  });

  it('verwirft unscoped Legacy-localStorage-Einträge beim Laden', async () => {
    storageAdapter.getItem.mockResolvedValueOnce(null);
    window.localStorage.setItem('activeEinsatzId', 'legacy-7');

    await expect(loadActiveEinsatzId(storageScope)).resolves.toBeNull();

    expect(storageAdapter.setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('activeEinsatzId')).toBeNull();
  });

  it('meldet Same-Tab-Sync-Ereignisse nur innerhalb desselben Scopes', async () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToStorageChanges(storageScope, callback);

    await saveActiveEinsatzId('einsatz-9', storageScope);
    await saveActiveEinsatzId('einsatz-fremd', {
      serverId: 'server-1',
      userId: 'user-2',
      role: 'DISPATCHER',
    });
    await clearActiveEinsatz(storageScope);

    expect(callback).toHaveBeenNthCalledWith(1, 'einsatz-9');
    expect(callback).toHaveBeenNthCalledWith(2, null);
    expect(callback).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
