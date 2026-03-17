import { serverStore } from '@/features/server/stores/server.store';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceResume } from '../use-workspace-resume';

const { mockNavigate, mockLoadWorkspaceResumeState, mockSaveWorkspaceResumeState, mockClearWorkspaceResumeState, mockAuthStateRef } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLoadWorkspaceResumeState: vi.fn(),
  mockSaveWorkspaceResumeState: vi.fn(),
  mockClearWorkspaceResumeState: vi.fn(),
  mockAuthStateRef: {
    current: {
      authStatus: 'authenticated' as const,
      user: { id: 'user-1', role: 'DISPATCHER' },
    },
  },
}));

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => mockAuthStateRef.current,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/workspace/persistence/workspace-resume.persistence', () => ({
  loadWorkspaceResumeState: mockLoadWorkspaceResumeState,
  saveWorkspaceResumeState: mockSaveWorkspaceResumeState,
  clearWorkspaceResumeState: mockClearWorkspaceResumeState,
}));

function createDeferredPromise<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

describe('useWorkspaceResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadWorkspaceResumeState.mockReset();
    mockSaveWorkspaceResumeState.mockReset();
    mockClearWorkspaceResumeState.mockReset();
    mockSaveWorkspaceResumeState.mockResolvedValue(undefined);
    mockClearWorkspaceResumeState.mockResolvedValue(undefined);
    serverStore.setState((state) => ({
      ...state,
      activeServerId: 'server-1',
    }));
    mockAuthStateRef.current = {
      authStatus: 'authenticated',
      user: { id: 'user-1', role: 'DISPATCHER' },
    };
  });

  it('überschreibt den gespeicherten Zielkontext beim Initial-Laden nicht sofort', async () => {
    const deferredResumeState = createDeferredPromise<{
      version: 1;
      serverId: string;
      userId: string;
      role: string;
      einsatzId: string;
      moduleId: string | null;
      pathname: string;
      search: Record<string, unknown>;
      updatedAt: string;
    } | null>();

    mockLoadWorkspaceResumeState.mockReturnValueOnce(deferredResumeState.promise);

    renderHook(() =>
      useWorkspaceResume({
        einsatzId: 'einsatz-7',
        pathname: '/app/einsatz/einsatz-7/übersicht',
        search: {},
        requiresAssignment: false,
      }),
    );

    await Promise.resolve();

    expect(mockSaveWorkspaceResumeState).not.toHaveBeenCalled();

    deferredResumeState.resolve({
      version: 1,
      serverId: 'server-1',
      userId: 'user-1',
      role: 'DISPATCHER',
      einsatzId: 'einsatz-7',
      moduleId: 'führung',
      pathname: '/app/einsatz/einsatz-7/führung/etb',
      search: { filter: 'offen' },
      updatedAt: '2026-03-17T10:00:00.000Z',
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/einsatz/einsatz-7/führung/etb',
        search: { filter: 'offen' },
        replace: true,
      });
    });
  });

  it('stellt Search-Kontext auch bei identischem Pathname wieder her', async () => {
    mockLoadWorkspaceResumeState.mockResolvedValueOnce({
      version: 1,
      serverId: 'server-1',
      userId: 'user-1',
      role: 'DISPATCHER',
      einsatzId: 'einsatz-7',
      moduleId: 'führung',
      pathname: '/app/einsatz/einsatz-7/führung/etb',
      search: { filter: 'offen' },
      updatedAt: '2026-03-17T10:00:00.000Z',
    });

    renderHook(() =>
      useWorkspaceResume({
        einsatzId: 'einsatz-7',
        pathname: '/app/einsatz/einsatz-7/führung/etb',
        search: {},
        requiresAssignment: false,
      }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/einsatz/einsatz-7/führung/etb',
        search: { filter: 'offen' },
        replace: true,
      });
    });
  });

  it('wartet mit der Wiederaufnahme, solange der Arbeitsraum durch Assignment blockiert ist', async () => {
    mockLoadWorkspaceResumeState.mockResolvedValueOnce({
      version: 1,
      serverId: 'server-1',
      userId: 'user-1',
      role: 'DISPATCHER',
      einsatzId: 'einsatz-7',
      moduleId: 'führung',
      pathname: '/app/einsatz/einsatz-7/führung/etb',
      search: { filter: 'offen' },
      updatedAt: '2026-03-17T10:00:00.000Z',
    });

    renderHook(() =>
      useWorkspaceResume({
        einsatzId: 'einsatz-7',
        pathname: '/app/einsatz/einsatz-7/übersicht',
        search: {},
        requiresAssignment: true,
      }),
    );

    await waitFor(() => {
      expect(mockLoadWorkspaceResumeState).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('verwirft unbekannte oder nicht mehr freigegebene Resume-Ziele', async () => {
    mockLoadWorkspaceResumeState.mockResolvedValueOnce({
      version: 1,
      serverId: 'server-1',
      userId: 'user-1',
      role: 'DISPATCHER',
      einsatzId: 'einsatz-7',
      moduleId: 'führung',
      pathname: '/app/einsatz/einsatz-7/führung/unbekannt',
      search: {},
      updatedAt: '2026-03-17T10:00:00.000Z',
    });

    renderHook(() =>
      useWorkspaceResume({
        einsatzId: 'einsatz-7',
        pathname: '/app/einsatz/einsatz-7/übersicht',
        search: {},
        requiresAssignment: false,
      }),
    );

    await waitFor(() => {
      expect(mockClearWorkspaceResumeState).toHaveBeenCalledWith({
        serverId: 'server-1',
        userId: 'user-1',
        role: 'DISPATCHER',
        einsatzId: 'einsatz-7',
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
