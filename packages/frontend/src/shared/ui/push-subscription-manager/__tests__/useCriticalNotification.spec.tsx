import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));
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
  sendCriticalNotification: vi.fn(),
}));

import { toast } from 'sonner';
import { isTauri } from '@tauri-apps/api/core';
import { notificationService, sendCriticalNotification } from '@/features/reminders/services';
import { useCriticalNotification } from '../useCriticalNotification';
import { eventIdLru } from '../event-id-lru';

const isTauriMock = vi.mocked(isTauri);
const checkPermissionMock = vi.mocked(notificationService.checkPermission);
const sendCriticalMock = vi.mocked(sendCriticalNotification);

describe('useCriticalNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventIdLru.clear();
  });

  afterEach(() => {
    eventIdLru.clear();
  });

  it('dispatcht in Tauri-Runtime via sendCriticalNotification ohne Service-Worker', async () => {
    isTauriMock.mockReturnValue(true);
    sendCriticalMock.mockResolvedValue({ success: true });

    const showNotification = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'Alarm', body: 'Test', eventId: 'evt-tauri-1' });
    });

    expect(sendCriticalMock).toHaveBeenCalledWith({ title: 'Alarm', body: 'Test', eventId: 'evt-tauri-1', url: undefined });
    expect(showNotification).not.toHaveBeenCalled();
    expect(checkPermissionMock).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ruft im Browser bei granted den Service-Worker showNotification mit tag=eventId auf', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'PSA', body: 'Hochstufung', eventId: 'evt-web-1', url: '/app/psa' });
    });

    expect(showNotification).toHaveBeenCalledWith(
      'PSA',
      expect.objectContaining({
        body: 'Hochstufung',
        data: { eventId: 'evt-web-1', url: '/app/psa' },
        tag: 'evt-web-1',
      }),
    );
    expect(sendCriticalMock).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('fällt bei denied auf Sonner-Toast mit action zurück und requested keine Permission', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('denied');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification: vi.fn() }) },
      configurable: true,
    });

    const requestSpy = vi.fn();
    Object.defineProperty(window, 'Notification', {
      value: { requestPermission: requestSpy, permission: 'denied' },
      configurable: true,
    });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'Alarm', body: 'Kein OS-Dialog', eventId: 'evt-denied-1', url: '/deep' });
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Alarm',
      expect.objectContaining({
        description: 'Kein OS-Dialog',
        duration: Number.POSITIVE_INFINITY,
        action: expect.objectContaining({ label: 'Öffnen' }),
      }),
    );
    expect(requestSpy).not.toHaveBeenCalled();
    expect(sendCriticalMock).not.toHaveBeenCalled();
  });

  it('wählt toast.warning bzw. toast.info entsprechend der priority', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('denied');

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'Warn', body: 'x', eventId: 'evt-warn', priority: 'warning' });
      await result.current({ title: 'Info', body: 'y', eventId: 'evt-info', priority: 'info' });
    });

    expect(toast.warning).toHaveBeenCalledWith('Warn', expect.objectContaining({ description: 'x' }));
    expect(toast.info).toHaveBeenCalledWith('Info', expect.objectContaining({ description: 'y' }));
  });

  it('dedupliziert dieselbe eventId im page-scoped LRU', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'Same', body: 'Erste Zustellung', eventId: 'evt-dup' });
      await result.current({ title: 'Same', body: 'Zweite Zustellung', eventId: 'evt-dup' });
    });

    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('serialisiert priority nicht in die Web-Push-Payload', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'P', body: 'Q', eventId: 'evt-priority', priority: 'warning' });
    });

    const [, options] = showNotification.mock.calls[0];
    expect(options.data).toEqual({ eventId: 'evt-priority', url: undefined });
    expect(options).not.toHaveProperty('priority');
  });

  it('fällt beim showNotification-Fehler zurück auf Native Notification', async () => {
    isTauriMock.mockReturnValue(false);
    checkPermissionMock.mockResolvedValue('granted');
    const showNotification = vi.fn().mockRejectedValue(new Error('SW err'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification }) },
      configurable: true,
    });
    sendCriticalMock.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCriticalNotification());

    await act(async () => {
      await result.current({ title: 'P', body: 'Q', eventId: 'evt-fallback' });
    });

    expect(sendCriticalMock).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt-fallback' }));
  });
});
