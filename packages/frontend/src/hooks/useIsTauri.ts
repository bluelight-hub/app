import { isTauri } from '@tauri-apps/api/core';

/**
 * Hook zur Erkennung der Tauri-Runtime
 *
 * Prüft, ob die Anwendung in der Tauri-Runtime oder im Browser läuft.
 * Wrapper um die offizielle Tauri isTauri() Funktion.
 *
 * @returns {Object} Objekt mit isTauri boolean
 * @example
 * ```tsx
 * const { isTauri } = useIsTauri();
 *
 * if (isTauri) {
 *   // Tauri-spezifischer Code
 * } else {
 *   // Browser-spezifischer Code
 * }
 * ```
 */
export function useIsTauri(): { isTauri: boolean } {
  try {
    return { isTauri: isTauri() };
  } catch (error) {
    // Fallback für den Fall, dass Tauri API nicht verfügbar ist
    console.warn('Tauri API not available, falling back to browser mode', error);
    return { isTauri: false };
  }
}
