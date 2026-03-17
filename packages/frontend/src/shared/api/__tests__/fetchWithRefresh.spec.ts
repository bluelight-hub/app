import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirectWithRouter: vi.fn(),
  getServerAccessToken: vi.fn(),
  clearServerAccessToken: vi.fn(),
  isSetupRedirectInProgress: vi.fn(),
  setSetupRedirectInProgress: vi.fn(),
  createServerScopedAuthApi: vi.fn(),
  getBaseUrl: vi.fn(),
  fetch: vi.fn(),
}));

const mockRedirectWithRouter = mocks.redirectWithRouter;
const mockGetServerAccessToken = mocks.getServerAccessToken;
const mockClearServerAccessToken = mocks.clearServerAccessToken;
const mockIsSetupRedirectInProgress = mocks.isSetupRedirectInProgress;
const mockSetSetupRedirectInProgress = mocks.setSetupRedirectInProgress;
const mockCreateServerScopedAuthApi = mocks.createServerScopedAuthApi;
const mockGetBaseUrl = mocks.getBaseUrl;
const mockFetch = mocks.fetch;

vi.mock('@/shared/lib/navigation/router-redirect', () => ({
  redirectWithRouter: mocks.redirectWithRouter,
}));

vi.mock('@/shared/lib/server-access-token', () => ({
  getServerAccessToken: mocks.getServerAccessToken,
  clearServerAccessToken: mocks.clearServerAccessToken,
  isSetupRedirectInProgress: mocks.isSetupRedirectInProgress,
  setSetupRedirectInProgress: mocks.setSetupRedirectInProgress,
  isTokenErrorMessage: (message: string) => message === 'Server access token required' || message === 'Invalid or revoked server access token',
}));

vi.mock('@/shared/api/server-scoped-clients', () => ({
  createServerScopedAuthApi: mocks.createServerScopedAuthApi,
}));

vi.mock('@/shared/api/api', () => ({
  getBaseUrl: mocks.getBaseUrl,
}));

import { fetchWithRefresh } from '../fetchWithRefresh';

describe('fetchWithRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerAccessToken.mockResolvedValue(null);
    mockClearServerAccessToken.mockResolvedValue(undefined);
    mockRedirectWithRouter.mockResolvedValue(undefined);
    mockIsSetupRedirectInProgress.mockReturnValue(false);
    mockGetBaseUrl.mockReturnValue('https://api.example.com');
    mockCreateServerScopedAuthApi.mockReturnValue({
      authControllerRefresh: vi.fn().mockResolvedValue(undefined),
    });
    vi.stubGlobal('fetch', mockFetch);
    window.history.replaceState({}, '', '/app');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fügt Credentials und Server-Access-Token zentral hinzu', async () => {
    mockGetServerAccessToken.mockResolvedValue('server-token');
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await fetchWithRefresh('/health', {
      headers: {
        Existing: 'header',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Existing: 'header',
          'X-Server-Access-Token': 'server-token',
        }),
      }),
    );
  });

  it('bereinigt ungültige Server-Tokens und leitet zentral zu /server/manage weiter', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid or revoked server access token' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    const response = await fetchWithRefresh('/api/v-alpha/auth/check');

    expect(response.status).toBe(401);
    expect(mockClearServerAccessToken).toHaveBeenCalledTimes(1);
    expect(mockSetSetupRedirectInProgress).toHaveBeenCalledWith(true);
    expect(mockRedirectWithRouter).toHaveBeenCalledWith({
      to: '/server/manage',
      search: { reason: 'token-invalid' },
      replace: true,
    });
  });

  it('versucht bei normalen 401-Antworten genau einen zentralen Refresh und wiederholt den Request', async () => {
    const refreshSpy = vi.fn().mockResolvedValue(undefined);
    mockCreateServerScopedAuthApi.mockReturnValue({
      authControllerRefresh: refreshSpy,
    });
    mockFetch.mockResolvedValueOnce(new Response('unauthorized', { status: 401 })).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const response = await fetchWithRefresh('/api/v-alpha/system/health');

    expect(response.status).toBe(200);
    expect(mockCreateServerScopedAuthApi).toHaveBeenCalledWith('https://api.example.com', {
      fetchApi: fetch,
    });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('serialisiert parallele 401-Antworten über genau einen Refresh-Request', async () => {
    const refreshSpy = vi.fn().mockResolvedValue(undefined);
    mockCreateServerScopedAuthApi.mockReturnValue({
      authControllerRefresh: refreshSpy,
    });
    mockFetch
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const [firstResponse, secondResponse] = await Promise.all([fetchWithRefresh('/api/v-alpha/system/health'), fetchWithRefresh('/api/v-alpha/auth/check')]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('bereinigt beim zentralen SERVER_NOT_SETUP-Pfad Token und leitet zu /server/setup weiter', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'SERVER_NOT_SETUP' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    const response = await fetchWithRefresh('/api/v-alpha/system/health');

    expect(response.status).toBe(503);
    expect(mockClearServerAccessToken).toHaveBeenCalledTimes(1);
    expect(mockSetSetupRedirectInProgress).toHaveBeenCalledWith(true);
    expect(mockRedirectWithRouter).toHaveBeenCalledWith({
      to: '/server/setup',
      replace: true,
    });
  });
});
