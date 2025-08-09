import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { windowService } from './windowService';
import { toaster } from '@/components/ui/toaster.instance';

import { logger } from '@/utils/logger';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: vi.fn().mockImplementation((label, options) => ({
    label,
    options,
    once: vi.fn(),
    setFocus: vi.fn(),
    unminimize: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@/components/ui/toaster.instance', () => ({
  toaster: {
    create: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe('WindowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.open
    delete (window as any).open;
    window.open = vi.fn();
    // Reset window.location
    delete (window as any).location;
    window.location = { href: '', origin: 'http://localhost' } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('openAdmin', () => {
    it('should open admin window in Tauri environment', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(null);

      const mockWindow = {
        once: vi.fn().mockImplementation((event, callback) => {
          if (event === 'tauri://created') {
            callback();
          }
          return Promise.resolve();
        }),
      };

      WebviewWindow.mockImplementation(() => mockWindow as any);

      await windowService.openAdmin({ width: 1200, height: 800 });

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(WebviewWindow).toHaveBeenCalledWith(
        'admin',
        expect.objectContaining({
          url: expect.stringContaining('/admin/login'),
          title: 'BlueLight Hub - Admin Dashboard',
          width: 1200,
          height: 800,
          resizable: true,
          center: true,
        }),
      );
    });

    it('should focus existing admin window in Tauri if already open', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);

      const existingWindow = {
        setFocus: vi.fn().mockResolvedValue(undefined),
        unminimize: vi.fn().mockResolvedValue(undefined),
      };

      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(existingWindow);

      await windowService.openAdmin();

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(existingWindow.setFocus).toHaveBeenCalled();
      expect(existingWindow.unminimize).toHaveBeenCalled();
      expect(WebviewWindow).not.toHaveBeenCalled();
    });

    it('should open admin in new browser tab when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      const mockWindow = { focus: vi.fn() };
      window.open = vi.fn().mockReturnValue(mockWindow);

      await windowService.openAdmin();

      expect(window.open).toHaveBeenCalledWith('/admin/login', '_blank', 'noopener,noreferrer');
    });

    it('should fallback to location.href when popup is blocked', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      window.open = vi.fn().mockReturnValue(null);
      await windowService.openAdmin();

      expect(window.open).toHaveBeenCalled();
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Hinweis',
          type: 'warning',
        }),
      );
      expect(window.location.href).toBe('/admin/login');
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'Fenster konnte nicht geöffnet werden - möglicherweise durch Popup-Blocker verhindert',
      );
    });

    it('should handle errors gracefully', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockImplementation(() => {
        throw new Error('Test error');
      });

      await windowService.openAdmin();

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'Fehler beim Öffnen des Admin-Fensters:',
        expect.any(Error),
      );
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler',
          type: 'error',
        }),
      );
    });
  });

  describe('focusAdmin', () => {
    it('should focus admin window in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);

      const adminWindow = {
        setFocus: vi.fn().mockResolvedValue(undefined),
        unminimize: vi.fn().mockResolvedValue(undefined),
      };

      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(adminWindow);

      await windowService.focusAdmin();

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(adminWindow.setFocus).toHaveBeenCalled();
      expect(adminWindow.unminimize).toHaveBeenCalled();
    });

    it('should warn when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      await windowService.focusAdmin();

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('focusAdmin ist nur in Tauri verfügbar');
    });
  });

  describe('closeAdmin', () => {
    it('should close admin window in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);

      const adminWindow = {
        close: vi.fn().mockResolvedValue(undefined),
      };

      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(adminWindow);

      await windowService.closeAdmin();

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(adminWindow.close).toHaveBeenCalled();
    });
  });

  describe('isAdminOpen', () => {
    it('should return true when admin window exists in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      WebviewWindow.getByLabel = vi.fn().mockResolvedValue({ label: 'admin' });

      const result = await windowService.isAdminOpen();

      expect(result).toBe(true);
      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
    });

    it('should return false when admin window does not exist', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(null);

      const result = await windowService.isAdminOpen();

      expect(result).toBe(false);
    });

    it('should return false when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      const result = await windowService.isAdminOpen();

      expect(result).toBe(false);
    });
  });
});
