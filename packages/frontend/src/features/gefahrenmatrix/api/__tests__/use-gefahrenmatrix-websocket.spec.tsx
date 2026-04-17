import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Handler = (payload: unknown) => void;

const { handlers, emitMock, disconnectMock, socketInstance, pushAlertMock, playBeepMock } = vi.hoisted(() => {
  const h: Record<string, Handler> = {};
  const emit = vi.fn();
  const disconnect = vi.fn();
  return {
    handlers: h,
    emitMock: emit,
    disconnectMock: disconnect,
    socketInstance: {
      on: vi.fn((event: string, handler: Handler) => {
        h[event] = handler;
      }),
      emit,
      disconnect,
      connected: true,
    },
    pushAlertMock: vi.fn(),
    playBeepMock: vi.fn(),
  };
});

vi.mock('socket.io-client', () => ({
  io: () => socketInstance,
}));

vi.mock('../../stores/akut-broadcast.store', () => ({
  akutBroadcastActions: { pushAlert: pushAlertMock },
  playAkutBeep: playBeepMock,
}));

import { useGefahrenmatrixWebSocket } from '../use-gefahrenmatrix-websocket';

function wrapperWith() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useGefahrenmatrixWebSocket', () => {
  beforeEach(() => {
    pushAlertMock.mockReset();
    playBeepMock.mockReset();
    emitMock.mockReset();
    disconnectMock.mockReset();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
  });

  afterEach(() => {
    Object.keys(handlers).forEach((k) => delete handlers[k]);
  });

  function fireAktualisiert(payload: Record<string, unknown>) {
    act(() => handlers['gefahrenmatrix:aktualisiert']?.(payload));
  }

  it('AKUT von fremdem Nutzer → pushAlert + playAkutBeep', () => {
    const Wrapper = wrapperWith();
    renderHook(() => useGefahrenmatrixWebSocket({ einsatzId: 'e1', currentUserId: 'me' }), { wrapper: Wrapper });
    fireAktualisiert({ einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'AKUT', aktualisiertVon: 'other' });
    expect(pushAlertMock).toHaveBeenCalled();
    expect(playBeepMock).toHaveBeenCalled();
  });

  it('AKUT vom eigenen Nutzer → kein Alert (Self-Filter)', () => {
    const Wrapper = wrapperWith();
    renderHook(() => useGefahrenmatrixWebSocket({ einsatzId: 'e1', currentUserId: 'me' }), { wrapper: Wrapper });
    fireAktualisiert({ einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'AKUT', aktualisiertVon: 'me' });
    expect(pushAlertMock).not.toHaveBeenCalled();
    expect(playBeepMock).not.toHaveBeenCalled();
  });

  it('Nicht-AKUT-Warnstufen lösen keinen Alert aus', () => {
    const Wrapper = wrapperWith();
    renderHook(() => useGefahrenmatrixWebSocket({ einsatzId: 'e1', currentUserId: 'me' }), { wrapper: Wrapper });
    for (const warnstufe of ['KEINE', 'NIEDRIG', 'MITTEL', 'HOCH']) {
      fireAktualisiert({ einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe, aktualisiertVon: 'other' });
    }
    expect(pushAlertMock).not.toHaveBeenCalled();
    expect(playBeepMock).not.toHaveBeenCalled();
  });
});
