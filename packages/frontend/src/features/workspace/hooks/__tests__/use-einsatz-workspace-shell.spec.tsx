import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEinsatzWorkspaceShell } from '../use-einsatz-workspace-shell';

describe('useEinsatzWorkspaceShell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('zeigt im stabilen Normalzustand keine zusätzliche Status-Karte', () => {
    const { result } = renderHook(() =>
      useEinsatzWorkspaceShell({
        isLoading: false,
        requiresAssignment: false,
        isRemindersDegraded: false,
      }),
    );

    expect(result.current.statusItems).toHaveLength(0);
  });

  it('wartet 300 Millisekunden, bevor der globale Ladezustand sichtbar wird', async () => {
    const { result } = renderHook(() =>
      useEinsatzWorkspaceShell({
        isLoading: true,
        requiresAssignment: false,
        isRemindersDegraded: false,
      }),
    );

    expect(result.current.statusItems).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.statusItems[0]?.label).toBe('Arbeitsraum wird vorbereitet');
  });

  it('ordnet Offline-Zustände mit einer nächsten Aktion semantisch ein', async () => {
    const { result } = renderHook(() =>
      useEinsatzWorkspaceShell({
        isLoading: false,
        requiresAssignment: false,
        isRemindersDegraded: false,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.statusItems[0]).toMatchObject({
      label: 'Verbindung unterbrochen',
      role: 'alert',
      nextActionLabel: 'Nächster Schritt',
    });
  });

  it('markiert schreibgeschützte Arbeitsräume klar als readonly', () => {
    const { result } = renderHook(() =>
      useEinsatzWorkspaceShell({
        isLoading: false,
        requiresAssignment: false,
        isRemindersDegraded: false,
        isReadonly: true,
      }),
    );

    expect(result.current.statusItems[0]).toMatchObject({
      label: 'Arbeitsraum schreibgeschützt',
      tone: 'readonly',
      nextActionLabel: 'Nächster Schritt',
    });
  });
});
