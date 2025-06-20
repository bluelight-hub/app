import { isTauri } from '@tauri-apps/api/core';

/**
 * Öffnet die Admin-Seite in einem neuen Fenster (Tauri) oder Tab (Browser)
 */
export const openAdminWindow = async () => {
  const isRunningInTauri = await isTauri();

  if (isRunningInTauri) {
    try {
      // In Tauri: Neues natives Fenster öffnen
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

      const adminWindow = new WebviewWindow('admin', {
        url: '/admin',
        title: 'Bluelight Hub - Administration',
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        center: true,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        decorations: true,
        transparent: false,
        alwaysOnTop: false,
        skipTaskbar: false,
      });

      // Event listener für Fehler
      adminWindow.once('tauri://error', (e) => {
        console.error('Fehler beim Öffnen des Admin-Fensters:', e);
      });

      // Warte bis das Fenster bereit ist
      await adminWindow.once('tauri://created', () => {
        console.log('Admin-Fenster wurde erstellt');
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Admin-Fensters:', error);
      // Fallback: Im Browser öffnen
      window.open('/admin', '_blank');
    }
  } else {
    // Im Browser: Neuen Tab öffnen
    // Browser teilen localStorage automatisch zwischen Tabs derselben Domain
    window.open('/admin', '_blank');
  }
};

/**
 * Schließt das aktuelle Fenster (nur in Tauri)
 */
export const closeCurrentWindow = async () => {
  const isRunningInTauri = await isTauri();

  if (isRunningInTauri) {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const currentWindow = getCurrentWebviewWindow();
      await currentWindow.close();
    } catch (error) {
      console.error('Fehler beim Schließen des Fensters:', error);
      window.close();
    }
  } else {
    // Im Browser können wir nur Fenster schließen, die wir selbst geöffnet haben
    window.close();
  }
};
