import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/utils/logger';
import { closeAdminWindow, focusAdminWindow, isAdminWindowOpen, isInAdminWindow, openAdminWindow } from './windowService';

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
  getCurrentWebviewWindow: vi.fn(),
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
    delete (window as { open?: unknown }).open;
    window.open = vi.fn();
    // Reset window.location
    delete (window as { location?: unknown }).location;
    window.location = { href: '', origin: 'http://localhost' } as Location;
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

      WebviewWindow.mockImplementation(() => mockWindow as unknown as ReturnType<typeof WebviewWindow>);

      await openAdminWindow({ width: 1200, height: 800 });

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(WebviewWindow).toHaveBeenCalledWith(
        'admin',
        expect.objectContaining({
          url: expect.stringContaining('/admin-login'),
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

      await openAdminWindow();

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

      await openAdminWindow();

      expect(window.open).toHaveBeenCalledWith('/admin-login', '_blank');
    });

    it('should fallback to location.href when popup is blocked', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      window.open = vi.fn().mockReturnValue(null);
      await openAdminWindow();

      expect(window.open).toHaveBeenCalled();
      expect(window.location.href).toBe('/admin-login');
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('Fenster konnte nicht geöffnet werden - möglicherweise durch Popup-Blocker verhindert');
    });

    it('should handle errors gracefully', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockImplementation(() => {
        throw new Error('Test error');
      });

      await openAdminWindow();

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith('Fehler beim Öffnen des Admin-Fensters:', expect.any(Error));
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

      await focusAdminWindow();

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
      expect(adminWindow.setFocus).toHaveBeenCalled();
      expect(adminWindow.unminimize).toHaveBeenCalled();
    });

    it('should warn when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      await focusAdminWindow();

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

      await closeAdminWindow();

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

      const result = await isAdminWindowOpen();

      expect(result).toBe(true);
      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith('admin');
    });

    it('should return false when admin window does not exist', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { WebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      WebviewWindow.getByLabel = vi.fn().mockResolvedValue(null);

      const result = await isAdminWindowOpen();

      expect(result).toBe(false);
    });

    it('should return false when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      const result = await isAdminWindowOpen();

      expect(result).toBe(false);
    });
  });

  describe('isInAdminWindow', () => {
    it('should return true when current window is admin window', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { getCurrentWebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      getCurrentWebviewWindow.mockReturnValue({ label: 'admin' } as unknown as ReturnType<typeof getCurrentWebviewWindow>);

      const result = await isInAdminWindow();

      expect(result).toBe(true);
      expect(getCurrentWebviewWindow).toHaveBeenCalled();
    });

    it('should return false when current window is not admin window', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { getCurrentWebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      getCurrentWebviewWindow.mockReturnValue({ label: 'main' } as unknown as ReturnType<typeof getCurrentWebviewWindow>);

      const result = await isInAdminWindow();

      expect(result).toBe(false);
      expect(getCurrentWebviewWindow).toHaveBeenCalled();
    });

    it('should return false when not in Tauri', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      isTauri.mockReturnValue(false);

      const result = await isInAdminWindow();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const { isTauri } = vi.mocked(await import('@tauri-apps/api/core'));
      const { getCurrentWebviewWindow } = vi.mocked(await import('@tauri-apps/api/webviewWindow'));

      isTauri.mockReturnValue(true);
      getCurrentWebviewWindow.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await isInAdminWindow();

      expect(result).toBe(false);
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith('Fehler beim Prüfen des aktuellen Fensters:', expect.any(Error));
    });
  });
});
