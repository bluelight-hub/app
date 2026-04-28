import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from '../use-long-press';

describe('useLongPress (Story 3.2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('feuert nach default-delay (500 ms)', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onPointerDown(undefined as never);
    });
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('feuert NICHT, wenn vor Ablauf der delay-Zeit pointerup kommt', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, delay: 400 }));

    act(() => {
      result.current.onPointerDown(undefined as never);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancelt bei pointerleave und pointercancel', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, delay: 300 }));

    act(() => {
      result.current.onPointerDown(undefined as never);
      result.current.onPointerLeave();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      result.current.onPointerDown(undefined as never);
      result.current.onPointerCancel();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('onContextMenu ruft preventDefault auf', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));
    const preventDefault = vi.fn();
    act(() => {
      result.current.onContextMenu({ preventDefault } as never);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
