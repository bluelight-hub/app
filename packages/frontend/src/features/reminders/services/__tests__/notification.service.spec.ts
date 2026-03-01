/**
 * Unit Tests für NotificationService
 *
 * Verifiziert die Funktionalität des Notification Service, insbesondere:
 * - Permission Handling (Tauri vs Web)
 * - Fallback Mechanismen (Tauri -> Web)
 * - Assignment Notification Logic (AC1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../notification.service';

// Mock isTauri
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(),
}));

// Mock logger
vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Tauri Notification Plugin
const mockIsPermissionGranted = vi.fn();
const mockRequestPermission = vi.fn();
const mockSendNotification = vi.fn();

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: mockIsPermissionGranted,
  requestPermission: mockRequestPermission,
  sendNotification: mockSendNotification,
}));

// Mock Notification Setup Constants
vi.mock('../notification-setup.service', () => ({
  ERINNERUNG_CHANNEL_ID: 'test-channel',
  ERINNERUNG_ACTION_TYPE_ID: 'test-action',
  BEFEHL_CHANNEL_ID: 'test-befehl-channel',
  BEFEHL_ACTION_TYPE_ID: 'test-befehl-action',
}));

// Global mocks for Web Notifications
const originalNotification = global.Notification;
const mockWebNotificationRequestPermission = vi.fn();
const mockWebNotificationConstructor = vi.fn();
const mockWebNotificationClose = vi.fn();

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let isTauriMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup imports
    const tauriCore = await import('@tauri-apps/api/core');
    isTauriMock = tauriCore.isTauri;
    isTauriMock.mockReturnValue(false); // Default: Web mode

    // Setup Web Notification API
    global.Notification = class {
      static requestPermission = mockWebNotificationRequestPermission;
      static permission: NotificationPermission = 'default';
      close = mockWebNotificationClose;
      constructor(title: string, options?: NotificationOptions) {
        mockWebNotificationConstructor(title, options);
      }
    } as any;

    notificationService = new NotificationService();
  });

  afterEach(() => {
    global.Notification = originalNotification;
  });

  describe('isSupported()', () => {
    it('should return true if Web Notifications are supported in browser', async () => {
      expect(await notificationService.isSupported()).toBe(true);
    });

    it('should return false if Web Notifications are NOT supported in browser', async () => {
      // Remove Notification from global
      delete (global as any).Notification;
      expect(await notificationService.isSupported()).toBe(false);
    });

    it('should return true if Tauri plugin is available', async () => {
      isTauriMock.mockReturnValue(true);
      mockIsPermissionGranted.mockResolvedValue(true); // Plugin check works
      expect(await notificationService.isSupported()).toBe(true);
    });
  });

  describe('checkPermission()', () => {
    it('should check Web Permission when in browser', async () => {
      (global.Notification as any).permission = 'granted';
      const status = await notificationService.checkPermission();
      expect(status).toBe('granted');
    });

    it('should check Tauri Permission when in Tauri and plugin available', async () => {
      isTauriMock.mockReturnValue(true);
      mockIsPermissionGranted.mockResolvedValue(true); // Plugin check and permission check

      const status = await notificationService.checkPermission();
      expect(status).toBe('granted');
      expect(mockIsPermissionGranted).toHaveBeenCalled();
    });
  });

  describe('requestPermission()', () => {
    it('should request Web Permission when in browser', async () => {
      mockWebNotificationRequestPermission.mockResolvedValue('granted');
      const status = await notificationService.requestPermission();
      expect(status).toBe('granted');
      expect(mockWebNotificationRequestPermission).toHaveBeenCalled();
    });

    it('should request Tauri Permission when in Tauri', async () => {
      isTauriMock.mockReturnValue(true);
      mockIsPermissionGranted.mockResolvedValue(false); // Not granted yet
      mockRequestPermission.mockResolvedValue('granted');

      const status = await notificationService.requestPermission();
      expect(status).toBe('granted');
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('send()', () => {
    it('should send Web Notification when in browser', async () => {
      (global.Notification as any).permission = 'granted';

      const result = await notificationService.send({ title: 'Test', body: 'Body' });

      expect(result.success).toBe(true);
      expect(mockWebNotificationConstructor).toHaveBeenCalledWith('Test', expect.objectContaining({ body: 'Body' }));
    });

    it('should send Tauri Notification when in Tauri', async () => {
      isTauriMock.mockReturnValue(true);
      mockIsPermissionGranted.mockResolvedValue(true); // Permission granted

      const result = await notificationService.send({ title: 'Test', body: 'Body' });

      expect(result.success).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test',
          body: 'Body',
          channelId: 'test-channel',
        }),
      );
    });

    it('should fail gracefully if permission denied', async () => {
      (global.Notification as any).permission = 'denied';

      const result = await notificationService.send({ title: 'Test' });

      expect(result.success).toBe(false);
      expect(mockWebNotificationConstructor).not.toHaveBeenCalled();
    });
  });

  describe('sendBefehlNotification()', () => {
    it('should send web notification with correct format for befehle', async () => {
      (global.Notification as any).permission = 'granted';

      const result = await notificationService.sendBefehlNotification({
        befehlId: 'befehl-123',
        einsatzId: 'einsatz-456',
        nummer: 'B2026-abc12345',
        befehlsgeber: 'Max Mustermann',
        inhalt: 'Wasser marsch an Position Alpha',
      });

      expect(result.success).toBe(true);
      expect(mockWebNotificationConstructor).toHaveBeenCalledWith(
        'Neuer Befehl #B2026-abc12345',
        expect.objectContaining({
          body: 'Von Max Mustermann: Wasser marsch an Position Alpha',
          tag: 'befehl-befehl-123',
        }),
      );
    });

    it('should truncate long inhalt to 100 characters', async () => {
      (global.Notification as any).permission = 'granted';

      const longInhalt = 'A'.repeat(200);
      await notificationService.sendBefehlNotification({
        befehlId: 'befehl-123',
        einsatzId: 'einsatz-456',
        nummer: 'B2026-abc12345',
        befehlsgeber: 'Test',
        inhalt: longInhalt,
      });

      const body = mockWebNotificationConstructor.mock.calls[0][1].body;
      // "Von Test: " + 100 chars = max body length
      expect(body).toBe(`Von Test: ${'A'.repeat(100)}`);
    });

    it('should fail gracefully if permission denied', async () => {
      (global.Notification as any).permission = 'denied';

      const result = await notificationService.sendBefehlNotification({
        befehlId: 'befehl-123',
        einsatzId: 'einsatz-456',
        nummer: 'B2026-abc12345',
        befehlsgeber: 'Test',
        inhalt: 'Test',
      });

      expect(result.success).toBe(false);
      expect(mockWebNotificationConstructor).not.toHaveBeenCalled();
    });
  });

  describe('sendAssignmentNotification() (AC1)', () => {
    it('should send notification with correct format for assignments', async () => {
      (global.Notification as any).permission = 'granted';

      const result = await notificationService.sendAssignmentNotification('Funkgerät prüfen', 'Max Mustermann', 'erinnerung-123', 'einsatz-456');

      expect(result.success).toBe(true);
      expect(mockWebNotificationConstructor).toHaveBeenCalledWith('Neue Erinnerung von Max Mustermann', expect.objectContaining({ body: 'Funkgerät prüfen' }));
    });
  });
});
