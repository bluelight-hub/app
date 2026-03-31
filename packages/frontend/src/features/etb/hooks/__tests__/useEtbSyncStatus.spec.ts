import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useEtbSyncStatus, type MutationStatusInput } from '../useEtbSyncStatus';

/** Factory für leeren Mutation-Status */
function idleMutation(): MutationStatusInput {
  return { isPending: false, isSuccess: false, isError: false };
}

/** Factory für pending Mutation */
function pendingMutation(): MutationStatusInput {
  return { isPending: true, isSuccess: false, isError: false };
}

/** Factory für erfolgreiche Mutation */
function successMutation(): MutationStatusInput {
  return { isPending: false, isSuccess: true, isError: false };
}

/** Factory für fehlgeschlagene Mutation */
function errorMutation(msg?: string): MutationStatusInput {
  return { isPending: false, isSuccess: false, isError: true, errorMessage: msg };
}

describe('useEtbSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // navigator.onLine ist standardmäßig true in jsdom
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === Status-Mapping (Task 7.1) ===

  it('gibt local-draft zurück wenn keine Mutation aktiv ist', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: idleMutation(),
        updateMutation: idleMutation(),
      }),
    );
    expect(result.current.status).toBe('local-draft');
    expect(result.current.message).toBe('');
  });

  it('gibt syncing zurück nach 300ms wenn Mutation pending ist', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: pendingMutation(),
        updateMutation: idleMutation(),
      }),
    );

    // Vor 300ms → local-draft (kein Syncing-Flicker)
    expect(result.current.status).toBe('local-draft');

    // Nach 300ms → syncing
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.status).toBe('syncing');
    expect(result.current.message).toBe('Wird synchronisiert…');
  });

  it('gibt synced zurück bei erfolgreicher Mutation', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: successMutation(),
        updateMutation: idleMutation(),
      }),
    );
    expect(result.current.status).toBe('synced');
    expect(result.current.message).toBe('Erfolgreich gespeichert');
  });

  it('gibt failed zurück bei fehlgeschlagener Mutation', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: errorMutation('Netzwerkfehler'),
        updateMutation: idleMutation(),
      }),
    );
    expect(result.current.status).toBe('failed');
    expect(result.current.message).toBe('Speichern fehlgeschlagen');
    expect(result.current.nextAction?.label).toBe('Erneut versuchen');
    expect(result.current.nextAction?.description).toBe('Netzwerkfehler');
  });

  it('gibt readonly-locked zurück wenn Einsatz abgeschlossen ist', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: idleMutation(),
        updateMutation: idleMutation(),
        einsatzStatus: 'ABGESCHLOSSEN',
      }),
    );
    expect(result.current.status).toBe('readonly-locked');
    expect(result.current.message).toBe('Schreibgeschützt – Einsatz ist abgeschlossen');
  });

  it('gibt degraded-connection zurück wenn offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: idleMutation(),
        updateMutation: idleMutation(),
      }),
    );

    // Offline-Event feuern um den Hook zu benachrichtigen
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.status).toBe('degraded-connection');
    expect(result.current.message).toBe('Verbindung unterbrochen – Eingabe wird lokal gehalten');
  });

  // === Delayed Syncing (Task 7.1 — 300ms Gate) ===

  it('zeigt KEIN syncing bei schneller Mutation (<300ms)', () => {
    const { result, rerender } = renderHook(
      ({ createMutation }) =>
        useEtbSyncStatus({
          createMutation,
          updateMutation: idleMutation(),
        }),
      { initialProps: { createMutation: pendingMutation() } },
    );

    // Vor 300ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.status).toBe('local-draft');

    // Mutation endet schnell → synced
    rerender({ createMutation: successMutation() });
    expect(result.current.status).toBe('synced');
  });

  // === Prioritäts-Reihenfolge ===

  it('Abgeschlossener Einsatz hat höchste Priorität vor allem anderen', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: errorMutation(),
        updateMutation: pendingMutation(),
        einsatzStatus: 'ABGESCHLOSSEN',
      }),
    );
    expect(result.current.status).toBe('readonly-locked');
  });

  it('degraded-connection hat Priorität vor pending', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: pendingMutation(),
        updateMutation: idleMutation(),
      }),
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.status).toBe('degraded-connection');
  });

  // === Next-Action ===

  it('zeigt Retry-Handler bei failed Status', () => {
    const retryFn = vi.fn();
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: errorMutation(),
        updateMutation: idleMutation(),
        onRetry: retryFn,
      }),
    );
    expect(result.current.nextAction?.handler).toBe(retryFn);
  });

  it('zeigt keinen Next-Action bei synced/local-draft', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: idleMutation(),
        updateMutation: idleMutation(),
      }),
    );
    expect(result.current.nextAction).toBeUndefined();
  });

  // === Update-Mutation ===

  it('erkennt Update-Mutation genauso wie Create-Mutation', () => {
    const { result } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: idleMutation(),
        updateMutation: successMutation(),
      }),
    );
    expect(result.current.status).toBe('synced');
  });

  // === Timer-Cleanup ===

  it('räumt Timer bei Unmount korrekt auf', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useEtbSyncStatus({
        createMutation: pendingMutation(),
        updateMutation: idleMutation(),
      }),
    );

    unmount();

    // clearTimeout muss beim Unmount aufgerufen werden
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Timer nach Ablauf darf keinen State-Update-Fehler werfen
    act(() => {
      vi.advanceTimersByTime(400);
    });

    clearTimeoutSpy.mockRestore();
  });
});
