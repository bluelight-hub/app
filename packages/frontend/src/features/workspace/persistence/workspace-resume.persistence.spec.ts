import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspaceResumeState, getWorkspaceResumeStorageKey, loadWorkspaceResumeState, saveWorkspaceResumeState } from './workspace-resume.persistence';

const storageAdapter = {
  getItem: vi.fn<(_: string) => Promise<string | null>>(),
  setItem: vi.fn<(_: string, __: string) => Promise<void>>(),
  removeItem: vi.fn<(_: string) => Promise<void>>(),
  clear: vi.fn<() => Promise<void>>(),
};

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => storageAdapter,
}));

describe('workspace-resume.persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T19:55:00.000Z'));
    storageAdapter.getItem.mockReset();
    storageAdapter.setItem.mockReset();
    storageAdapter.removeItem.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('speichert den Resume-Zustand mit scoped Key und Zeitstempel', async () => {
    await saveWorkspaceResumeState({
      serverId: 'server-1',
      userId: 'user-1',
      role: 'ADMIN',
      einsatzId: 'einsatz-7',
      moduleId: 'führung',
      pathname: '/app/einsatz/einsatz-7/führung/etb',
      search: { tab: 'offen' },
    });

    expect(storageAdapter.setItem).toHaveBeenCalledTimes(1);
    expect(storageAdapter.setItem).toHaveBeenCalledWith(
      'bluelight:server:server-1:user:user-1:role:ADMIN:einsatz:einsatz-7:feature:workspace-resume',
      JSON.stringify({
        version: 1,
        serverId: 'server-1',
        userId: 'user-1',
        role: 'ADMIN',
        einsatzId: 'einsatz-7',
        moduleId: 'führung',
        pathname: '/app/einsatz/einsatz-7/führung/etb',
        search: { tab: 'offen' },
        updatedAt: '2026-03-17T19:55:00.000Z',
      }),
    );
  });

  it('lädt nur gültige Resume-Zustände', async () => {
    storageAdapter.getItem.mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        serverId: 'server-1',
        userId: 'user-1',
        role: 'ADMIN',
        einsatzId: 'einsatz-7',
        moduleId: 'führung',
        pathname: '/app/einsatz/einsatz-7/führung/etb',
        search: { tab: 'offen' },
        updatedAt: '2026-03-17T19:55:00.000Z',
      }),
    );

    await expect(
      loadWorkspaceResumeState({
        serverId: 'server-1',
        userId: 'user-1',
        role: 'ADMIN',
        einsatzId: 'einsatz-7',
      }),
    ).resolves.toMatchObject({
      pathname: '/app/einsatz/einsatz-7/führung/etb',
      moduleId: 'führung',
    });

    storageAdapter.getItem.mockResolvedValueOnce('{"invalid":true}');

    await expect(
      loadWorkspaceResumeState({
        serverId: 'server-1',
        userId: 'user-1',
        role: 'ADMIN',
        einsatzId: 'einsatz-7',
      }),
    ).resolves.toBeNull();
  });

  it('entfernt scoped Resume-Zustände wieder', async () => {
    const scope = {
      serverId: 'server-1',
      userId: 'user-1',
      role: 'ADMIN',
      einsatzId: 'einsatz-7',
    };

    await clearWorkspaceResumeState(scope);

    expect(storageAdapter.removeItem).toHaveBeenCalledWith(getWorkspaceResumeStorageKey(scope));
  });
});
