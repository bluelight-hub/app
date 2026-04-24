import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GefaehrdungsbeurteilungConflictError } from '../../api/queries';
import { useAutoSave } from '../useAutoSave';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAutoSave (Story 2.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('debounced drei Änderungen innerhalb von 2 Sekunden zu genau einem Save mit letztem Draft', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2 });
    const { result } = renderHook(() =>
      useAutoSave({
        entityId: 'gb-1',
        entityType: 'gefaehrdungsbeurteilung',
        saveFn,
        debounceMs: 2000,
      }),
    );

    act(() => {
      result.current.scheduleSave({ title: 'A' });
      result.current.scheduleSave({ title: 'AB' });
      result.current.scheduleSave({ title: 'ABC' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ title: 'ABC' });
    expect(result.current.status).toBe('synced');
  });

  it('finalizeNow beendet offenen Debounce sofort und erzeugt keinen zweiten identischen Save', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2 });
    const { result } = renderHook(() =>
      useAutoSave({
        entityId: 'gb-1',
        entityType: 'gefaehrdungsbeurteilung',
        saveFn,
        debounceMs: 2000,
      }),
    );

    await act(async () => {
      result.current.scheduleSave({ title: 'A' });
      await result.current.finalizeNow();
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ title: 'A' });
    expect(result.current.status).toBe('synced');
  });

  it('erstellt bei invalidem Draft weder Server-Save noch Pending-State', () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2 });
    const { result } = renderHook(() =>
      useAutoSave({
        entityId: 'gb-1',
        entityType: 'gefaehrdungsbeurteilung',
        saveFn,
        debounceMs: 2000,
        isValid: (draft: { title: string }) => draft.title.trim().length > 0,
      }),
    );

    act(() => {
      result.current.scheduleSave({ title: '   ' });
    });

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('ignoriert ältere Serverantworten für onSaved, wenn während in-flight ein neuer Draft entsteht', async () => {
    const first = deferred<{ version: number }>();
    const saveFn = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ version: 3 });
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave({
        entityId: 'gb-1',
        entityType: 'gefaehrdungsbeurteilung',
        saveFn,
        debounceMs: 2000,
        onSaved,
      }),
    );

    let firstFlush: Promise<unknown> | undefined;
    act(() => {
      result.current.scheduleSave({ title: 'alt' });
      firstFlush = result.current.flushNow();
    });
    expect(saveFn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.scheduleSave({ title: 'neu' });
    });
    first.resolve({ version: 2 });

    await act(async () => {
      await firstFlush;
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(saveFn).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith({ version: 3 }, { title: 'neu' });
  });

  it('setzt Konfliktstatus und pausiert weitere Auto-Saves nach 409', async () => {
    const conflict = new GefaehrdungsbeurteilungConflictError(4, 3, { response: { status: 409 } });
    const saveFn = vi.fn().mockRejectedValue(conflict);
    const { result } = renderHook(() =>
      useAutoSave({
        entityId: 'gb-1',
        entityType: 'gefaehrdungsbeurteilung',
        saveFn,
        debounceMs: 2000,
      }),
    );

    await act(async () => {
      result.current.scheduleSave({ title: 'A' });
      await result.current.flushNow();
    });

    expect(result.current.status).toBe('conflict');

    act(() => {
      result.current.scheduleSave({ title: 'B' });
    });
    expect(saveFn).toHaveBeenCalledTimes(1);
  });
});
