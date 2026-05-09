import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepLinkError, type DeepLinkEvent, type DeepLinkParams, type EntityDeepLinkParams } from '../types/deep-link';

type Listener = (...args: never[]) => void;

const { mocks } = vi.hoisted(() => ({
  mocks: {
    navigate: vi.fn(),
    router: {
      history: {
        push: vi.fn(),
        replace: vi.fn(),
        flush: vi.fn(),
      },
    },
    exchangeInvite: vi.fn(),
    initialize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    handlers: new Map<string, Set<Listener>>(),
    toastLoading: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useRouter: () => mocks.router,
}));

vi.mock('sonner', () => ({
  toast: {
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../api/mutations', () => ({
  useExchangeInvite: () => ({
    mutateAsync: mocks.exchangeInvite,
  }),
}));

vi.mock('../services/deep-link.service', () => ({
  DeepLinkService: {
    getInstance: () => ({
      initialize: mocks.initialize,
      on: mocks.on,
      off: mocks.off,
    }),
  },
}));

import { useDeepLinkEffect } from './useDeepLinkEffect';

function emitEntityLink(params: EntityDeepLinkParams) {
  for (const handler of mocks.handlers.get('entity-link-received') ?? []) {
    handler(params as never);
  }
}

function emitInviteLink(params: DeepLinkParams) {
  for (const handler of mocks.handlers.get('deep-link-received') ?? []) {
    handler(params as never);
  }
}

function emitDeepLinkError(error: DeepLinkError, message: string) {
  for (const handler of mocks.handlers.get('deep-link-error') ?? []) {
    handler(error as never, message as never);
  }
}

describe('useDeepLinkEffect', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.navigate.mockResolvedValue(undefined);
    mocks.router.history.push.mockReset();
    mocks.router.history.replace.mockReset();
    mocks.router.history.flush.mockReset();
    mocks.exchangeInvite.mockReset();
    mocks.exchangeInvite.mockResolvedValue({
      data: {
        serverInfo: {
          name: 'Testserver',
          baseUrl: 'https://api.example.de',
        },
      },
    });
    mocks.initialize.mockReset();
    mocks.initialize.mockResolvedValue(undefined);
    mocks.toastLoading.mockReset();
    mocks.toastLoading.mockReturnValue('toast-loading');
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.handlers.clear();
    mocks.on.mockReset();
    mocks.on.mockImplementation((event: DeepLinkEvent, handler: Listener) => {
      const handlers = mocks.handlers.get(event) ?? new Set<Listener>();
      handlers.add(handler);
      mocks.handlers.set(event, handlers);
    });
    mocks.off.mockReset();
    mocks.off.mockImplementation((event: DeepLinkEvent, handler?: Listener) => {
      if (!handler) {
        mocks.handlers.delete(event);
        return;
      }
      mocks.handlers.get(event)?.delete(handler);
    });
  });

  it('navigiert Entity-Deep-Links direkt zur internen Route', async () => {
    const { unmount } = renderHook(() => useDeepLinkEffect());

    await waitFor(() => expect(mocks.initialize).toHaveBeenCalledOnce());
    await act(async () => {
      emitEntityLink({
        path: '/app/einsatz/einsatz-1/sicherheit/eigenschutz/gefaehrdungen/beurteilung-1?focusItem=item-1',
      });
    });

    expect(mocks.router.history.push).toHaveBeenCalledWith('/app/einsatz/einsatz-1/sicherheit/eigenschutz/gefaehrdungen/beurteilung-1?focusItem=item-1');
    expect(mocks.router.history.flush).toHaveBeenCalled();

    unmount();
    expect(mocks.off).toHaveBeenCalledWith('entity-link-received', expect.any(Function));
  });

  it('lässt den bestehenden Invite-Flow über Exchange und /auth-Navigation intakt', async () => {
    renderHook(() => useDeepLinkEffect());

    await waitFor(() => expect(mocks.initialize).toHaveBeenCalledOnce());
    await act(async () => {
      emitInviteLink({
        serverUrl: 'https://api.example.de',
        inviteCode: 'INV_12345678',
        expiresAt: null,
      });
    });

    expect(mocks.exchangeInvite).toHaveBeenCalledWith({
      inviteCode: 'INV_12345678',
      serverUrl: 'https://api.example.de',
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth' });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Server 'Testserver' hinzugefügt", expect.objectContaining({ id: 'toast-loading' }));
  });

  it('zeigt für ungültige Entity-Ziele eine verständliche Fehlermeldung', async () => {
    renderHook(() => useDeepLinkEffect());

    await waitFor(() => expect(mocks.initialize).toHaveBeenCalledOnce());
    act(() => {
      emitDeepLinkError(DeepLinkError.INVALID_TARGET, 'Entity deep link target is not an internal Einsatz path');
    });

    expect(mocks.toastError).toHaveBeenCalledWith(
      'Ungültiger Link',
      expect.objectContaining({
        description: 'Dieser Link zeigt nicht auf eine gültige Einsatzansicht.',
      }),
    );
  });
});
