import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }));
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { isTauri } from '@tauri-apps/api/core';
import { logger } from '@/shared/lib/logger';
import { registerServiceWorker } from '../register-service-worker';

const isTauriMock = vi.mocked(isTauri);

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('überspringt Registrierung in Tauri-Runtime', async () => {
    isTauriMock.mockReturnValue(true);
    const registerSpy = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy, ready: Promise.resolve({ scope: '/' }) },
      configurable: true,
    });

    const result = await registerServiceWorker();

    expect(result).toBeNull();
    expect(registerSpy).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('skip service worker'));
  });

  it('registriert /sw.js im Browser und liefert die Registration', async () => {
    isTauriMock.mockReturnValue(false);
    const registration = { scope: '/' } as unknown as ServiceWorkerRegistration;
    const registerSpy = vi.fn().mockResolvedValue(registration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy, ready: Promise.resolve(registration) },
      configurable: true,
    });

    const result = await registerServiceWorker();

    expect(registerSpy).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(result).toBe(registration);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('service worker ready'), expect.objectContaining({ scope: '/' }));
  });

  it('loggt als Warning und liefert null ohne Service-Worker-Support', async () => {
    isTauriMock.mockReturnValue(false);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    const result = await registerServiceWorker();

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not supported'));
  });

  it('gibt bei fehlgeschlagener Registrierung warn + null zurück', async () => {
    isTauriMock.mockReturnValue(false);
    const error = new Error('register failed');
    const registerSpy = vi.fn().mockRejectedValue(error);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy, ready: Promise.resolve({ scope: '/' }) },
      configurable: true,
    });

    const result = await registerServiceWorker();

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('registration failed'), expect.objectContaining({ error }));
  });
});
