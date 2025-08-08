import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toaster } from '@/components/ui/toaster.instance';

/**
 * Optionen für das Öffnen des Admin-Fensters
 */
export interface OpenAdminOptions {
  width?: number;
  height?: number;
}

/**
 * Service für Window-Management in Tauri und Browser
 *
 * Verwaltet das Öffnen von Fenstern in Tauri (separates Fenster)
 * und im Browser (neuer Tab).
 */
class WindowService {
  private readonly ADMIN_WINDOW_LABEL = 'admin';
  private readonly DEFAULT_WIDTH = 1000;
  private readonly DEFAULT_HEIGHT = 700;

  /**
   * Öffnet das Admin-Dashboard in einem neuen Fenster (Tauri) oder Tab (Browser)
   *
   * @param opts Optionale Fenster-Einstellungen (Breite, Höhe)
   * @returns Promise<void>
   */
  async openAdmin(opts?: OpenAdminOptions): Promise<void> {
    try {
      if (isTauri()) {
        await this.openAdminInTauri(opts);
      } else {
        this.openAdminInBrowser();
      }
    } catch (error) {
      console.error('Fehler beim Öffnen des Admin-Fensters:', error);
      toaster.create({
        title: 'Fehler',
        description: 'Das Admin-Fenster konnte nicht geöffnet werden.',
        type: 'error',
      });
    }
  }

  /**
   * Fokussiert das Admin-Fenster, falls es existiert
   */
  async focusAdmin(): Promise<void> {
    if (!isTauri()) {
      console.warn('focusAdmin ist nur in Tauri verfügbar');
      return;
    }

    const adminWindow = await WebviewWindow.getByLabel(this.ADMIN_WINDOW_LABEL);
    if (adminWindow) {
      await adminWindow.setFocus();
      await adminWindow.unminimize();
    }
  }

  /**
   * Schließt das Admin-Fenster, falls es existiert
   */
  async closeAdmin(): Promise<void> {
    if (!isTauri()) {
      console.warn('closeAdmin ist nur in Tauri verfügbar');
      return;
    }

    const adminWindow = await WebviewWindow.getByLabel(this.ADMIN_WINDOW_LABEL);
    if (adminWindow) {
      await adminWindow.close();
    }
  }

  /**
   * Prüft, ob das Admin-Fenster geöffnet ist
   */
  async isAdminOpen(): Promise<boolean> {
    if (!isTauri()) {
      return false;
    }

    const adminWindow = await WebviewWindow.getByLabel(this.ADMIN_WINDOW_LABEL);
    return adminWindow !== null;
  }

  /**
   * Öffnet Admin-Dashboard in Tauri WebviewWindow
   */
  private async openAdminInTauri(opts?: OpenAdminOptions): Promise<void> {
    // Prüfe ob Admin-Fenster bereits existiert
    const existingWindow = await WebviewWindow.getByLabel(this.ADMIN_WINDOW_LABEL);

    if (existingWindow) {
      // Fenster existiert bereits - fokussiere es
      await existingWindow.setFocus();
      await existingWindow.unminimize();
      return;
    }

    // Erstelle neues Admin-Fenster
    // Navigiere direkt zu /admin/login - diese Seite kann die Auth prüfen
    // und bei Bedarf weiterleiten, ohne dass die Index-Route dazwischenfunkt
    const adminUrl = `${window.location.origin}/admin/login`;
    console.log('Öffne Admin-Fenster mit URL:', adminUrl);

    const adminWindow = new WebviewWindow(this.ADMIN_WINDOW_LABEL, {
      url: adminUrl,
      title: 'BlueLight Hub - Admin Dashboard',
      width: opts?.width ?? this.DEFAULT_WIDTH,
      height: opts?.height ?? this.DEFAULT_HEIGHT,
      resizable: true,
      center: true,
      decorations: true,
      alwaysOnTop: false,
      skipTaskbar: false,
    });

    // Warte bis Fenster erstellt wurde
    await adminWindow.once('tauri://created', () => {
      console.log('Admin-Fenster erfolgreich erstellt');
    });

    // Error Handler für Fenster-Ereignisse
    await adminWindow.once('tauri://error', (error) => {
      console.error('Fehler beim Erstellen des Admin-Fensters:', error);
      toaster.create({
        title: 'Fehler',
        description: 'Das Admin-Fenster konnte nicht erstellt werden.',
        type: 'error',
      });
    });
  }

  /**
   * Öffnet Admin-Dashboard in neuem Browser-Tab
   */
  private openAdminInBrowser(): void {
    const adminUrl = '/admin/login';
    const windowFeatures = 'noopener,noreferrer';

    const newWindow = window.open(adminUrl, '_blank', windowFeatures);

    if (!newWindow) {
      // Popup-Blocker oder andere Einschränkung
      console.warn(
        'Fenster konnte nicht geöffnet werden - möglicherweise durch Popup-Blocker verhindert',
      );
      toaster.create({
        title: 'Hinweis',
        description:
          'Bitte erlauben Sie Pop-ups für diese Seite, um das Admin-Dashboard zu öffnen.',
        type: 'warning',
      });

      // Fallback: Navigation in aktuellem Tab
      window.location.href = adminUrl;
    }
  }
}

// Singleton-Instanz exportieren
export const windowService = new WindowService();

// Convenience-Funktionen exportieren
export const openAdmin = (opts?: OpenAdminOptions) => windowService.openAdmin(opts);
export const focusAdmin = () => windowService.focusAdmin();
export const closeAdmin = () => windowService.closeAdmin();
export const isAdminOpen = () => windowService.isAdminOpen();
