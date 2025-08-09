import { isTauri } from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';

/**
 * Hook zur Erkennung der Tauri-Runtime
 *
 * Prüft, ob die Anwendung in der Tauri-Runtime oder im Browser läuft.
 * Wrapper um die offizielle Tauri isTauri() Funktion.
 *
 * @returns {{ isTauri: boolean }} Objekt mit isTauri boolean
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
    logger.debug(error, 'Tauri API not available, falling back to browser mode');
    return { isTauri: false };
  }
}
