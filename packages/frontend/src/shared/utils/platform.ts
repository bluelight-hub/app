/**
 * Platform Detection Utilities
 *
 * Bietet Funktionen zur Erkennung der Laufzeitumgebung (Tauri Desktop vs. Web Browser).
 */

/**
 * Prüft ob die App in Tauri Desktop Environment läuft.
 *
 * Nutzt window.__TAURI__ Präsenz als Detection-Mechanismus.
 * In Tauri Desktop Apps ist das __TAURI__ Object verfügbar,
 * in reinen Web-Environments nicht.
 *
 * @returns true wenn Tauri erkannt wurde, false sonst
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Ermittelt die aktuelle Platform (Tauri Desktop oder Web Browser).
 *
 * Verwendet isTauri() zur Detection und liefert einen
 * Platform-String für Type-Safe Switch-Cases.
 *
 * @returns 'tauri' für Desktop-App, 'web' für Browser-Environment
 */
export function getPlatform(): 'tauri' | 'web' {
  return isTauri() ? 'tauri' : 'web';
}
