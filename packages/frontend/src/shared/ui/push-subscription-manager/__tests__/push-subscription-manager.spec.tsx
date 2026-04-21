import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }));
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/features/reminders/services', () => ({
  notificationService: {
    checkPermission: vi.fn(),
  },
}));

const { pushSubscriptionRegisterMock } = vi.hoisted(() => ({
  pushSubscriptionRegisterMock: vi.fn(),
}));

vi.mock('@/shared/api/api', () => ({
  getApi: () => ({
    pushNotifications: () => ({
      pushSubscriptionControllerRegisterV1: pushSubscriptionRegisterMock,
    }),
  }),
}));

import { isTauri } from '@tauri-apps/api/core';
import { notificationService } from '@/features/reminders/services';
import { PushSubscriptionManager } from '../push-subscription-manager';
import { logger } from '@/shared/lib/logger';

const isTauriMock = vi.mocked(isTauri);
const checkPermissionMock = vi.mocked(notificationService.checkPermission);

const VAPID_KEY = 'BLKxyrN6ao3PUCpHb-BOmSbnJQu0AV7eDRog9J4J92d17YKBAJcl-Yv2XNwPhgyBdyQMG1ZLV-Q-dFsmd_rXW9w';

type ServiceWorkerRegistrationStub = {
  pushManager?: { subscribe: ReturnType<typeof vi.fn> } | undefined;
};

function stubServiceWorker(registration: ServiceWorkerRegistrationStub | null): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: registration ? { ready: Promise.resolve(registration) } : undefined,
    configurable: true,
  });
}

describe('PushSubscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rendert null in Tauri-Runtime und ruft keine Push-API', async () => {
    isTauriMock.mockReturnValue(true);

    const { container } = render(<PushSubscriptionManager />);

    await Promise.resolve();

    expect(container).toBeEmptyDOMElement();
    expect(checkPermissionMock).not.toHaveBeenCalled();
    expect(pushSubscriptionRegisterMock).not.toHaveBeenCalled();
  });

  it('rendert null ohne VAPID-Key und überspringt die Subscription', async () => {
    isTauriMock.mockReturnValue(false);
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');

    const { container } = render(<PushSubscriptionManager />);

    await Promise.resolve();

    expect(container).toBeEmptyDOMElement();
    expect(pushSubscriptionRegisterMock).not.toHaveBeenCalled();
  });

  it('abonniert und sendet die Subscription über den generierten Shared-Client', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');

    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }),
    };
    const subscribeMock = vi.fn().mockResolvedValue(subscription);
    stubServiceWorker({ pushManager: { subscribe: subscribeMock } });
    pushSubscriptionRegisterMock.mockResolvedValue(undefined);

    render(<PushSubscriptionManager />);

    await waitFor(() => {
      expect(pushSubscriptionRegisterMock).toHaveBeenCalledWith({
        createPushSubscriptionDto: {
          endpoint: 'https://push.example/abc',
          keys: { p256dh: 'p', auth: 'a' },
        },
      });
    });
    expect(subscribeMock).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
  });

  it('schweigt bei denied Permission (kein subscribe, kein Toast)', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('denied');
    const subscribeMock = vi.fn();
    stubServiceWorker({ pushManager: { subscribe: subscribeMock } });

    render(<PushSubscriptionManager />);

    await waitFor(() => expect(checkPermissionMock).toHaveBeenCalled());
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(pushSubscriptionRegisterMock).not.toHaveBeenCalled();
  });

  it('warnt, wenn PushManager im Browser nicht verfügbar ist, und sendet keine Registration', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    stubServiceWorker({});

    render(<PushSubscriptionManager />);

    await waitFor(() => expect(logger.warn).toHaveBeenCalledWith('[push] PushManager not supported by browser'));
    expect(pushSubscriptionRegisterMock).not.toHaveBeenCalled();
  });

  it('loggt HTTP-Fehler als warn (Zero-Toast-Policy)', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/xyz', keys: { p256dh: 'p', auth: 'a' } }),
    };
    stubServiceWorker({ pushManager: { subscribe: vi.fn().mockResolvedValue(subscription) } });
    pushSubscriptionRegisterMock.mockRejectedValue(new Error('Too Many Requests'));

    render(<PushSubscriptionManager />);

    await waitFor(() => {
      expect(logger.warn).toHaveBeenCalledWith(
        '[push] subscription registration failed',
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });
  });

  it('ist idempotent: führt die Registrierung pro Mount nur einmal aus', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/once', keys: { p256dh: 'p', auth: 'a' } }),
    };
    stubServiceWorker({ pushManager: { subscribe: vi.fn().mockResolvedValue(subscription) } });
    pushSubscriptionRegisterMock.mockResolvedValue(undefined);

    const { rerender } = render(<PushSubscriptionManager />);
    await waitFor(() => expect(pushSubscriptionRegisterMock).toHaveBeenCalledTimes(1));

    rerender(<PushSubscriptionManager />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pushSubscriptionRegisterMock).toHaveBeenCalledTimes(1);
  });
});
