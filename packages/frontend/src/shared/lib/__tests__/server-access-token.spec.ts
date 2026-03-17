import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateServer: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  loadServerAccessToken: vi.fn(),
}));

const mockUpdateServer = mocks.updateServer;
const mockGetItem = mocks.getItem;
const mockRemoveItem = mocks.removeItem;
const mockLoadServerAccessToken = mocks.loadServerAccessToken;

const serverState = {
  activeServerId: null as string | null,
  isHydrated: false,
  servers: [] as Array<{
    id: string;
    accessToken?: string;
  }>,
};

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {
    get state() {
      return serverState;
    },
  },
  updateServer: mocks.updateServer,
}));

vi.mock('@/features/server/stores/server-persistence', () => ({
  loadServerAccessToken: mocks.loadServerAccessToken,
  STORED_SERVER_ACCESS_TOKEN_MARKER: '__blh_server_access_token_stored__',
}));

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => ({
    getItem: mocks.getItem,
    removeItem: mocks.removeItem,
  }),
}));

import { clearLegacyServerAccessTokenShadow, clearServerAccessToken, getServerAccessToken } from '../server-access-token';

describe('server-access-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverState.activeServerId = null;
    serverState.isHydrated = false;
    serverState.servers = [];
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
    mockUpdateServer.mockResolvedValue(undefined);
    mockLoadServerAccessToken.mockResolvedValue(null);
  });

  it('lädt den Token des aktiven Servers aus der zentralen Server-Persistenz', async () => {
    serverState.activeServerId = 'server-1';
    serverState.isHydrated = true;
    serverState.servers = [{ id: 'server-1', accessToken: '__blh_server_access_token_stored__' }];
    mockLoadServerAccessToken.mockResolvedValue('active-token');

    await expect(getServerAccessToken()).resolves.toBe('active-token');
    expect(mockLoadServerAccessToken).toHaveBeenCalledWith('server-1');
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('fällt vor Hydration noch auf den Legacy-Shadow-Pfad zurück', async () => {
    mockGetItem.mockResolvedValue('legacy-token');

    await expect(getServerAccessToken()).resolves.toBe('legacy-token');
    expect(mockGetItem).toHaveBeenCalledWith('bluelight-hub-server-access-token');
  });

  it('räumt Shadow-Storage auf und entfernt den aktiven Token aus der Server-Konfiguration', async () => {
    serverState.activeServerId = 'server-1';
    serverState.isHydrated = true;
    serverState.servers = [{ id: 'server-1', accessToken: '__blh_server_access_token_stored__' }];

    await clearServerAccessToken();

    expect(mockRemoveItem).toHaveBeenCalledWith('bluelight-hub-server-access-token');
    expect(mockUpdateServer).toHaveBeenCalledWith('server-1', {
      accessToken: undefined,
    });
  });

  it('kann den Legacy-Shadow-Pfad gezielt separat bereinigen', async () => {
    await clearLegacyServerAccessTokenShadow();

    expect(mockRemoveItem).toHaveBeenCalledWith('bluelight-hub-server-access-token');
  });
});
