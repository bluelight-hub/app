import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useEtbDraftResume } from '../useEtbDraftResume';
import type { EtbDraftState } from '../../types/draft-state.types';

// Mock: useCurrentUser
const mockUser = { id: 'user-1', role: 'EINSATZLEITUNG' };
vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({
    user: mockUser,
    authStatus: 'authenticated',
  }),
}));

// Mock: serverStore
vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: { state: { activeServerId: 'server-1' } },
}));

vi.mock('@tanstack/react-store', () => ({
  useStore: (_store: unknown, selector: (state: { activeServerId: string }) => string) => selector({ activeServerId: 'server-1' }),
}));

// Mock: Persistence-Funktionen
const mockLoadEtbDraft = vi.fn<() => Promise<EtbDraftState | null>>();
const mockSaveEtbDraft = vi.fn<() => Promise<void>>();
const mockClearEtbDraft = vi.fn<() => Promise<void>>();

vi.mock('../../persistence/etb-draft.persistence', () => ({
  loadEtbDraft: (...args: unknown[]) => mockLoadEtbDraft(...args),
  saveEtbDraft: (...args: unknown[]) => mockSaveEtbDraft(...args),
  clearEtbDraft: (...args: unknown[]) => mockClearEtbDraft(...args),
}));

const validDraft: EtbDraftState = {
  version: 1,
  kategorie: 'LAGE' as never,
  text: 'Hochwasser steigt',
  absender: 'EL',
  empfaenger: 'Leitstelle',
  etbId: 'etb-1',
  updatedAt: new Date().toISOString(),
};

describe('useEtbDraftResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadEtbDraft.mockResolvedValue(null);
    mockSaveEtbDraft.mockResolvedValue(undefined);
    mockClearEtbDraft.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lädt Draft bei Mount', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    // Anfangszustand: loading
    expect(result.current.isLoadingDraft).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    expect(result.current.pendingDraft).toEqual(validDraft);
    expect(mockLoadEtbDraft).toHaveBeenCalledOnce();
  });

  it('setzt pendingDraft auf null wenn kein Draft vorhanden', async () => {
    mockLoadEtbDraft.mockResolvedValue(null);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    expect(result.current.pendingDraft).toBeNull();
  });

  it('verwirft Draft wenn ETB LOCKED ist (AC3)', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1', etbStatus: 'LOCKED' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    expect(result.current.pendingDraft).toBeNull();
    expect(result.current.discardReason).toBe('Entwurf verworfen — ETB wurde zwischenzeitlich gesperrt');
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('verwirft Draft wenn etbId nicht übereinstimmt (AC3)', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft); // draft.etbId = 'etb-1'

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-OTHER' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    expect(result.current.pendingDraft).toBeNull();
    expect(result.current.discardReason).toBe('Entwurf verworfen — gehört zu einem anderen ETB');
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('restoreDraft gibt Draft zurück und setzt pendingDraft auf null', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.pendingDraft).toEqual(validDraft);
    });

    let restored: EtbDraftState | undefined;
    act(() => {
      restored = result.current.restoreDraft();
    });

    expect(restored).toEqual(validDraft);
    expect(result.current.pendingDraft).toBeNull();
  });

  it('restoreDraft wirft Fehler wenn kein Draft vorhanden', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    expect(() => result.current.restoreDraft()).toThrow('Kein Draft zum Wiederherstellen vorhanden');
  });

  it('discardDraft löscht Draft und setzt pendingDraft auf null', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.pendingDraft).toEqual(validDraft);
    });

    await act(async () => {
      await result.current.discardDraft();
    });

    expect(result.current.pendingDraft).toBeNull();
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('saveDraft debounced Aufrufe mit 1000ms', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    // Fake Timers erst NACH dem initialen Load aktivieren
    vi.useFakeTimers();

    act(() => {
      result.current.saveDraft({ text: 'A', kategorie: 'LAGE', etbId: 'etb-1' });
      result.current.saveDraft({ text: 'AB', kategorie: 'LAGE', etbId: 'etb-1' });
      result.current.saveDraft({ text: 'ABC', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    // Vor Ablauf des Debounce: noch kein Aufruf
    expect(mockSaveEtbDraft).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Nur der letzte Aufruf wird gespeichert
    expect(mockSaveEtbDraft).toHaveBeenCalledOnce();
    expect(mockSaveEtbDraft).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'server-1', userId: 'user-1' }), expect.objectContaining({ text: 'ABC' }));
  });

  it('saveDraft löscht existierende Drafts bei leerem Text', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.saveDraft({ text: 'Gespeicherter Entwurf', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSaveEtbDraft).toHaveBeenCalledOnce();

    act(() => {
      result.current.saveDraft({ text: '  ', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSaveEtbDraft).toHaveBeenCalledOnce();
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('saveDraft cancelt ausstehende Saves bei leerem Text', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.saveDraft({ text: 'Noch nicht persistiert', kategorie: 'LAGE', etbId: 'etb-1' });
      result.current.saveDraft({ text: '   ', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSaveEtbDraft).not.toHaveBeenCalled();
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('clearDraft löscht den Draft aus dem Storage', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    await act(async () => {
      await result.current.clearDraft();
    });

    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('clearDraft cancelt ausstehende Autosaves vor dem Löschen', async () => {
    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.saveDraft({ text: 'Noch nicht persistiert', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    await act(async () => {
      await result.current.clearDraft();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSaveEtbDraft).not.toHaveBeenCalled();
    expect(mockClearEtbDraft).toHaveBeenCalledOnce();
  });

  it('räumt Debounce-Timer bei Unmount auf', async () => {
    const { result, unmount } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1' }));

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.saveDraft({ text: 'Test', kategorie: 'LAGE', etbId: 'etb-1' });
    });

    unmount();

    // Timer nach Unmount ausführen — darf keinen Fehler werfen
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });

  it('discardReason wird nach 5s automatisch ausgeblendet', async () => {
    mockLoadEtbDraft.mockResolvedValue(validDraft);

    const { result } = renderHook(() => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId: 'etb-1', etbStatus: 'LOCKED' }));

    await waitFor(() => {
      expect(result.current.discardReason).toBeTruthy();
    });

    // discardReason ist gesetzt — warte 5s bis es verschwindet
    await waitFor(
      () => {
        expect(result.current.discardReason).toBeNull();
      },
      { timeout: 6000 },
    );
  }, 10000);

  it('isCancelled-Flag verhindert Race Conditions', async () => {
    let resolveFirst: (value: EtbDraftState | null) => void;
    const firstPromise = new Promise<EtbDraftState | null>((resolve) => {
      resolveFirst = resolve;
    });

    mockLoadEtbDraft.mockReturnValueOnce(firstPromise);

    const { result, rerender } = renderHook(({ etbId }) => useEtbDraftResume({ einsatzId: 'einsatz-1', etbId }), { initialProps: { etbId: 'etb-1' } });

    // Zweiter Render mit anderem etbId — cancelt den ersten
    mockLoadEtbDraft.mockResolvedValue(null);
    rerender({ etbId: 'etb-2' });

    // Erster Load resolved — sollte ignoriert werden (isCancelled)
    await act(async () => {
      resolveFirst!(validDraft);
    });

    await waitFor(() => {
      expect(result.current.isLoadingDraft).toBe(false);
    });

    // Der erste Draft (etb-1) sollte NICHT gesetzt worden sein
    expect(result.current.pendingDraft).toBeNull();
  });
});
