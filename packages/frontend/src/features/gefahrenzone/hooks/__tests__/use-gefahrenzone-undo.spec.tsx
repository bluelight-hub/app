import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const { hotkeyHandlers, createMock, updateGeometryMock, deleteMock, toastMock } = vi.hoisted(() => {
  const handlers: Record<string, (event: KeyboardEvent) => void> = {};
  const toast = vi.fn() as unknown as ((message: string, opts?: Record<string, unknown>) => void) & { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  (toast as { error: ReturnType<typeof vi.fn> }).error = vi.fn();
  (toast as { info: ReturnType<typeof vi.fn> }).info = vi.fn();
  return {
    hotkeyHandlers: handlers,
    createMock: vi.fn(),
    updateGeometryMock: vi.fn(),
    deleteMock: vi.fn(),
    toastMock: toast,
  };
});

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (keys: string, handler: (event: KeyboardEvent) => void) => {
    hotkeyHandlers[keys] = handler;
  },
}));

vi.mock('../../api/mutations', () => ({
  useCreateGefahrenzone: () => ({ mutate: createMock, mutateAsync: createMock, isPending: false }),
  useUpdateGefahrenzoneGeometry: () => ({ mutate: updateGeometryMock, mutateAsync: updateGeometryMock, isPending: false }),
  useDeleteGefahrenzone: () => ({ mutate: deleteMock, mutateAsync: deleteMock, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

import { useGefahrenzoneUndo } from '../use-gefahrenzone-undo';
import { undoActions, undoStore } from '../../stores/undo.store';

function makeZone(id: string): GefahrenzoneDto {
  return {
    id,
    einsatzId: 'e1',
    gefahrentyp: 'BRAND',
    schutzobjekt: 'MENSCHEN',
    geometryType: 'POLYGON',
    geometry: { type: 'Polygon', coordinates: [[[0, 0]]] } as unknown as { [key: string]: unknown },
    bezeichnung: null,
    warnstufe: 'HOCH',
    erstelltVon: 'u',
    aktualisiertVon: null,
    erstelltAm: new Date(),
    aktualisiertAm: new Date(),
  } as GefahrenzoneDto;
}

function wrapperWith() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useGefahrenzoneUndo', () => {
  beforeEach(() => {
    undoActions.clearAll();
    createMock.mockReset();
    updateGeometryMock.mockReset();
    deleteMock.mockReset();
    (toastMock as unknown as ReturnType<typeof vi.fn>).mockReset?.();
    Object.keys(hotkeyHandlers).forEach((k) => delete hotkeyHandlers[k]);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('recordCreate pusht Action mit kind=create', () => {
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordCreate('e1', makeZone('z1')));
    expect(undoStore.state.stack).toHaveLength(1);
    expect(undoStore.state.stack[0]).toMatchObject({ kind: 'create', einsatzId: 'e1' });
    expect(undoStore.state.stack[0].after?.id).toBe('z1');
  });

  it('recordDelete pusht Action mit kind=delete und before', () => {
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordDelete('e1', makeZone('z2')));
    expect(undoStore.state.stack[0]).toMatchObject({ kind: 'delete' });
    expect(undoStore.state.stack[0].before?.id).toBe('z2');
  });

  it('cmd+z auf Create-Action ruft deleteMutation', () => {
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordCreate('e1', makeZone('z1')));
    act(() => hotkeyHandlers['mod+z']?.({ preventDefault: () => undefined } as KeyboardEvent));
    expect(deleteMock).toHaveBeenCalledWith({ einsatzId: 'e1', zoneId: 'z1' }, expect.any(Object));
  });

  it('cmd+z auf Delete-Action ruft createMutation mit vorigen Feldern', () => {
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordDelete('e1', makeZone('z9')));
    act(() => hotkeyHandlers['mod+z']?.({ preventDefault: () => undefined } as KeyboardEvent));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        einsatzId: 'e1',
        data: expect.objectContaining({ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' }),
      }),
      expect.any(Object),
    );
  });

  it('cmd+z auf Update-Geometry-Action ruft updateGeometryMutation mit before.geometry', () => {
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    const before = makeZone('z3');
    const after = { ...makeZone('z3'), geometry: { type: 'Polygon', coordinates: [[[9, 9]]] } as unknown as { [key: string]: unknown } };
    act(() => result.current.recordUpdateGeometry('e1', before, after));
    act(() => hotkeyHandlers['mod+z']?.({ preventDefault: () => undefined } as KeyboardEvent));
    expect(updateGeometryMock).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: 'e1', zoneId: 'z3', data: { geometry: before.geometry } }), expect.any(Object));
  });

  it('cmd+z auf leerem Stack ist no-op (keine Mutation)', () => {
    const Wrapper = wrapperWith();
    renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => hotkeyHandlers['mod+z']?.({ preventDefault: () => undefined } as KeyboardEvent));
    expect(deleteMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateGeometryMock).not.toHaveBeenCalled();
  });

  it('cmd+z offline triggert Info-Toast, kein Undo', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const Wrapper = wrapperWith();
    const { result } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordCreate('e1', makeZone('z1')));
    act(() => hotkeyHandlers['mod+z']?.({ preventDefault: () => undefined } as KeyboardEvent));
    expect(deleteMock).not.toHaveBeenCalled();
    expect((toastMock as { info: ReturnType<typeof vi.fn> }).info).toHaveBeenCalledWith(expect.stringMatching(/offline/i));
  });

  it('Mount → Unmount-Cycle läuft ohne Runtime-Error (Subscription-API korrekt benutzt)', () => {
    // Regression-Guard: `@tanstack/store.subscribe()` gibt ein Subscription-Objekt
    // zurück, keine Cleanup-Function. Falsche Nutzung wirft beim Unmount.
    const Wrapper = wrapperWith();
    const { result, unmount } = renderHook(() => useGefahrenzoneUndo(), { wrapper: Wrapper });
    act(() => result.current.recordCreate('e1', makeZone('z1')));
    expect(() => unmount()).not.toThrow();
  });
});
