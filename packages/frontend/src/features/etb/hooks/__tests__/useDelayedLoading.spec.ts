import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDelayedLoading } from '../useDelayedLoading';

describe('useDelayedLoading', () => {
  it('gibt false zurück wenn isLoading false ist', () => {
    const { result } = renderHook(() => useDelayedLoading(false));
    expect(result.current).toBe(false);
  });

  it('gibt false zurück wenn isLoading true ist aber delay noch nicht abgelaufen', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedLoading(true, 300));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it('gibt true zurück nach Ablauf des Delays', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedLoading(true, 300));

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it('setzt auf false zurück wenn isLoading auf false wechselt', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ isLoading }) => useDelayedLoading(isLoading, 300), {
      initialProps: { isLoading: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it('zeigt keinen Skeleton wenn Laden schneller als delay ist', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ isLoading }) => useDelayedLoading(isLoading, 300), {
      initialProps: { isLoading: true },
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);

    // Laden endet vor 300ms
    rerender({ isLoading: false });
    expect(result.current).toBe(false);

    // Auch nach 300ms bleibt es false
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it('räumt Timer bei Unmount korrekt auf', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useDelayedLoading(true, 300));

    // Unmount vor Timer-Ablauf
    unmount();

    // Timer nach Ablauf darf keinen Fehler werfen
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();
  });
});
