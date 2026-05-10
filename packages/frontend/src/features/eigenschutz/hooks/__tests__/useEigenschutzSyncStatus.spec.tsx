import { act, renderHook, waitFor } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEigenschutzSyncStatus } from '../useEigenschutzSyncStatus';
import { notifyPendingCommandChange, type EigenschutzPendingCommandV1 } from '../../lib/pending-command-queue';

const mocks = vi.hoisted(() => ({
  syncConflictsState: {
    data: [] as Array<{ id: string }> | undefined,
    fetchStatus: 'idle' as 'idle' | 'fetching' | 'paused',
  },
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useSyncConflicts: () => mocks.syncConflictsState,
}));

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => ({
    getItem: mocks.getItem,
    setItem: mocks.setItem,
  }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

function command(overrides: Partial<EigenschutzPendingCommandV1> = {}): EigenschutzPendingCommandV1 {
  return {
    schemaVersion: 1,
    id: 'cmd-1',
    entityType: 'gefaehrdungsbeurteilung',
    einsatzId: 'einsatz-1',
    entityId: 'gb-1',
    expectedVersion: 1,
    payload: { items: [{ title: 'Strom' }] },
    queuedAt: '2026-05-09T10:00:00.000Z',
    updatedAt: '2026-05-09T10:02:00.000Z',
    source: 'auto-save',
    status: 'pending',
    ...overrides,
  };
}

describe('useEigenschutzSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onlineManager.setOnline(true);
    mocks.syncConflictsState = { data: [], fetchStatus: 'idle' };
    mocks.getItem.mockResolvedValue(null);
    mocks.setItem.mockResolvedValue(undefined);
  });

  it('leitet synced ab, wenn online keine Pending Commands und keine Konflikte existieren', async () => {
    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.status).toBe('synced');
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.conflictCount).toBe(0);
  });

  it('priorisiert offene Sync-Konflikte vor pending und offline', async () => {
    onlineManager.setOnline(false);
    mocks.getItem.mockResolvedValue(JSON.stringify([command()]));
    mocks.syncConflictsState = { data: [{ id: 'conflict-1' }], fetchStatus: 'paused' };

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    expect(result.current.status).toBe('conflict');
    expect(result.current.conflictCount).toBe(1);
  });

  it('zeigt offline, wenn keine Konflikte existieren und der TanStack Online-State offline ist', async () => {
    onlineManager.setOnline(false);

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.isOnline).toBe(false);
  });

  it('zeigt pending mit ältestem Queue-Zeitpunkt, wenn lokale Commands existieren', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'cmd-new', queuedAt: '2026-05-09T10:05:00.000Z' }), command({ id: 'cmd-old', queuedAt: '2026-05-09T09:55:00.000Z' })]));

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.pendingCount).toBe(2));
    expect(result.current.status).toBe('pending');
    expect(result.current.oldestPendingAt).toBe('2026-05-09T09:55:00.000Z');
  });

  it('ignoriert Pending Commands aus anderen Einsätzen', async () => {
    mocks.getItem.mockResolvedValue(JSON.stringify([command({ id: 'cmd-fremd', einsatzId: 'einsatz-2' })]));

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.status).toBe('synced');
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.conflictCount).toBe(0);
  });

  it('liest die Queue nach Pending-Command-Änderungen neu', async () => {
    mocks.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce(JSON.stringify([command({ id: 'cmd-after' })]));

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('synced'));

    await act(async () => {
      notifyPendingCommandChange();
    });

    await waitFor(() => expect(result.current.status).toBe('pending'));
    expect(result.current.pendingCount).toBe(1);
  });

  it('wechselt nach Replay von pending zurück auf synced und merkt sich die Sync-Zeit', async () => {
    mocks.getItem.mockResolvedValueOnce(JSON.stringify([command({ id: 'cmd-before' })])).mockResolvedValueOnce(JSON.stringify([]));

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(async () => {
      notifyPendingCommandChange();
    });

    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.lastSyncAt).toEqual(expect.any(String));
  });

  it('wechselt nach lokal markiertem 409-Konflikt auf conflict', async () => {
    mocks.getItem.mockResolvedValueOnce(JSON.stringify([command({ id: 'cmd-before' })])).mockResolvedValueOnce(JSON.stringify([command({ id: 'cmd-before', status: 'conflict' })]));

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(async () => {
      notifyPendingCommandChange();
    });

    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(result.current.conflictCount).toBe(1);
  });

  it('aktualisiert Online -> Offline -> Online während des Mounts deterministisch', async () => {
    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('synced'));

    act(() => {
      onlineManager.setOnline(false);
    });
    await waitFor(() => expect(result.current.status).toBe('offline'));

    act(() => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(result.current.status).toBe('synced'));
  });

  it('interpretiert pausierte Konflikt-Queries nicht als synchronisiert', async () => {
    mocks.syncConflictsState = { data: [], fetchStatus: 'paused' };

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('pending'));
    expect(result.current.hasPausedConflictQuery).toBe(true);
  });

  it('interpretiert eine laufende Konflikt-Prüfung ohne Daten nicht als synchronisiert', async () => {
    mocks.syncConflictsState = { data: undefined, fetchStatus: 'fetching' };

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.status).toBe('pending'));
  });

  it('bleibt bei Storage-Parse-Fehlern ehrlich pending und meldet den Lesefehler', async () => {
    mocks.getItem.mockResolvedValue('{kaputt');

    const { result } = renderHook(() => useEigenschutzSyncStatus('einsatz-1'));

    await waitFor(() => expect(result.current.hasStorageReadError).toBe(true));
    expect(result.current.status).toBe('pending');
    expect(result.current.hasStorageReadError).toBe(true);
    expect(result.current.pendingCount).toBe(0);
  });
});
