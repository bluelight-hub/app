/**
 * Platform Detection Utilities
 *
 * Bietet Funktionen zur Erkennung der Laufzeitumgebung (Tauri Desktop vs. Web Browser).
 *
 * HINWEIS: Für Tauri-Erkennung in Komponenten verwende den Hook `useIsTauri`
 * aus `@/shared/hooks/useIsTauri`, der die offizielle Tauri API verwendet.
 */

import { isTauri } from '@tauri-apps/api/core';

/**
 * Ermittelt die aktuelle Platform (Tauri Desktop oder Web Browser).
 *
 * Verwendet die offizielle isTauri() Funktion aus @tauri-apps/api/core
 * und liefert einen Platform-String für Type-Safe Switch-Cases.
 *
 * @returns 'tauri' für Desktop-App, 'web' für Browser-Environment
 */
export function getPlatform(): 'tauri' | 'web' {
  return isTauri() ? 'tauri' : 'web';
}
