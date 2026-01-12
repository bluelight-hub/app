/**
 * URL Utility Funktionen für Server-Feature
 *
 * Issue 8 Fix: Zentralisierte URL-Hilfsfunktionen statt Duplikation
 *
 * @module features/server/utils/url
 */

/**
 * Extrahiert den Host aus einer URL.
 *
 * Gibt null zurück wenn die URL ungültig ist, um Type Safety zu gewährleisten
 * und Aufrufer zur expliziten Fehlerbehandlung zu zwingen.
 *
 * @param url - Die zu parsende URL
 * @returns Der Host-Teil der URL oder null bei ungültiger URL
 *
 * @example
 * ```ts
 * getHostSafe('https://api.example.com/v1') // 'api.example.com'
 * getHostSafe('invalid-url') // null
 *
 * // Verwendung mit Fallback:
 * getHostSafe(url) ?? 'Unbekannt'
 * ```
 */
export function getHostSafe(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
