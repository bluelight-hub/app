import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlarmierungApi } from '@bluelight-hub/shared/client';
import { clearApiCache, getApi, getBaseUrl } from '../api';
import { serverStore } from '@/features/server/stores/server.store';
import type { ServerConfig } from '@/features/server/types/server-config';
import { logger } from '@/shared/lib/logger';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('getBaseUrl', () => {
  beforeEach(() => {
    clearApiCache();
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
    vi.clearAllMocks();
  });

  it('loggt denselben aktiven Server nur einmal', () => {
    const localServer: ServerConfig = {
      id: 'server-1',
      name: 'Lokal',
      url: 'https://localhost:3091/',
      isDefault: true,
      createdAt: '2026-03-17T10:00:00.000Z',
      lastUsedAt: '2026-03-17T10:00:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [localServer],
      activeServerId: localServer.id,
      isHydrated: true,
    }));

    expect(getBaseUrl()).toBe('https://localhost:3091');
    expect(getBaseUrl()).toBe('https://localhost:3091');

    expect(vi.mocked(logger.trace)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.trace)).toHaveBeenCalledWith('Using active server URL', {
      url: 'https://localhost:3091',
      serverName: 'Lokal',
    });
  });

  it('loggt erneut wenn der aktive Server wechselt', () => {
    const localServer: ServerConfig = {
      id: 'server-1',
      name: 'Lokal',
      url: 'https://localhost:3091',
      isDefault: true,
      createdAt: '2026-03-17T10:00:00.000Z',
      lastUsedAt: '2026-03-17T10:00:00.000Z',
    };
    const stagingServer: ServerConfig = {
      id: 'server-2',
      name: 'Staging',
      url: 'https://localhost:3092',
      isDefault: false,
      createdAt: '2026-03-17T10:05:00.000Z',
      lastUsedAt: '2026-03-17T10:05:00.000Z',
    };

    serverStore.setState((state) => ({
      ...state,
      servers: [localServer, stagingServer],
      activeServerId: localServer.id,
      isHydrated: true,
    }));

    expect(getBaseUrl()).toBe('https://localhost:3091');

    serverStore.setState((state) => ({
      ...state,
      activeServerId: stagingServer.id,
    }));

    expect(getBaseUrl()).toBe('https://localhost:3092');

    expect(vi.mocked(logger.trace)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logger.trace)).toHaveBeenNthCalledWith(1, 'Using active server URL', {
      url: 'https://localhost:3091',
      serverName: 'Lokal',
    });
    expect(vi.mocked(logger.trace)).toHaveBeenNthCalledWith(2, 'Using active server URL', {
      url: 'https://localhost:3092',
      serverName: 'Staging',
    });
  });
});

describe('BackendApi', () => {
  beforeEach(() => {
    clearApiCache();
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });
    vi.clearAllMocks();
  });

  it('stellt eine AlarmierungApi-Instanz über alarmierung() bereit (Issue #408)', () => {
    const api = getApi();
    const alarmierungApi = api.alarmierung();

    expect(alarmierungApi).toBeDefined();
    expect(alarmierungApi).toBeInstanceOf(AlarmierungApi);

    // Getter liefert die gecachte Instanz bei erneutem Aufruf (kein Neu-Instanziieren).
    expect(api.alarmierung()).toBe(alarmierungApi);
  });
});
