import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as routerRedirect from '../router-redirect';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockRouterNavigate } = vi.hoisted(() => ({
  mockRouterNavigate: vi.fn(),
}));

const { mockRouterHistoryReplace, mockRouterHistoryPush, mockRouterHistoryFlush } = vi.hoisted(() => ({
  mockRouterHistoryReplace: vi.fn(),
  mockRouterHistoryPush: vi.fn(),
  mockRouterHistoryFlush: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/main', () => ({
  router: {
    navigate: (...args: unknown[]) => mockRouterNavigate(...args),
    history: {
      replace: (...args: unknown[]) => mockRouterHistoryReplace(...args),
      push: (...args: unknown[]) => mockRouterHistoryPush(...args),
      flush: (...args: unknown[]) => mockRouterHistoryFlush(...args),
    },
  },
}));

describe('router-redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        pathname: '/start',
        search: '',
        hash: '',
        href: '/start',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validiert Redirect-Ziele ausschließlich als interne Pfade', () => {
    expect(routerRedirect.sanitizeInternalRedirectPath('/app/einsatz/42?tab=lage#karte')).toBe('/app/einsatz/42?tab=lage#karte');
    expect(routerRedirect.sanitizeInternalRedirectPath('https://example.com')).toBeUndefined();
    expect(routerRedirect.sanitizeInternalRedirectPath('//example.com')).toBeUndefined();
    expect(routerRedirect.sanitizeInternalRedirectPath('admin/dashboard')).toBeUndefined();
  });

  it('nutzt Soft-Navigation über den Router, wenn verfügbar', async () => {
    mockRouterNavigate.mockResolvedValue(undefined);

    await routerRedirect.redirectWithRouter({
      to: '/auth',
      search: { redirect: '/app/einsatz/42' },
      replace: true,
    });

    expect(mockRouterNavigate).toHaveBeenCalledWith({
      to: '/auth',
      search: { redirect: '/app/einsatz/42' },
      replace: true,
    });
    expect(window.location.href).toBe('/start');
  });

  it('erhält Query und Hash bei vollständigen Redirect-Zielen über Router-History', () => {
    routerRedirect.navigateToInternalRedirect(
      {
        history: {
          replace: mockRouterHistoryReplace,
          push: mockRouterHistoryPush,
          flush: mockRouterHistoryFlush,
        },
      },
      '/app/einsatz/42?tab=lagekarte#karte',
      { replace: true },
    );

    expect(mockRouterHistoryReplace).toHaveBeenCalledWith('/app/einsatz/42?tab=lagekarte#karte');
    expect(mockRouterHistoryPush).not.toHaveBeenCalled();
    expect(mockRouterHistoryFlush).toHaveBeenCalled();
  });

  it('fällt bei fehlendem Router kontrolliert auf window.location.href zurück', async () => {
    mockRouterNavigate.mockRejectedValueOnce(new Error('router unavailable'));

    await routerRedirect.redirectWithRouter({
      to: '/server/manage',
      search: { reason: 'token-invalid' },
      replace: true,
    });

    expect(window.location.href).toBe('/server/manage?reason=token-invalid');
  });

  it('blockiert unsichere Redirect-Ziele komplett', async () => {
    await routerRedirect.redirectWithRouter({
      to: 'https://evil.example',
      replace: true,
    });

    expect(mockRouterNavigate).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/start');
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
