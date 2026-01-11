import { useCallback, useState } from 'react';

/**
 * Storage-Key für den Browser-Sicherheitswarnung-Dismiss-Status.
 * Wird in sessionStorage gespeichert, um nur für die aktuelle Session zu gelten.
 */
const STORAGE_KEY = 'browser-security-warning-dismissed';

/**
 * Module-scope Memory-Fallback für Private Browsing Modus.
 *
 * In Safari/Firefox Private Browsing wirft sessionStorage SecurityError
 * oder QuotaExceededError auch beim LESEN. Dieser Fallback stellt sicher,
 * dass die Warnung nicht bei jeder Navigation erneut erscheint.
 */
let memoryFallback = false;

/**
 * Reset-Funktion für Tests - setzt den Memory-Fallback zurück.
 * NUR für Test-Zwecke exportiert.
 * @internal
 */
export function _resetMemoryFallbackForTesting(): void {
  memoryFallback = false;
}

/**
 * Rückgabewert des useBrowserWarningDismissed Hooks.
 */
export interface UseBrowserWarningDismissedResult {
  /** Ob die Warnung in dieser Session bereits dismissed wurde */
  isDismissed: boolean;
  /** Funktion um die Warnung zu dismissieren (persistiert in sessionStorage) */
  dismiss: () => void;
}

/**
 * React Hook um den Dismiss-Status der Browser-Sicherheitswarnung zu verwalten.
 *
 * Verwendet sessionStorage um den Status nur für die aktuelle Session zu speichern.
 * Bei Browser-Schließen wird der Status zurückgesetzt, sodass die Warnung
 * bei jedem neuen Besuch wieder angezeigt wird.
 *
 * Behandelt SSR-Umgebungen (window undefined) und Storage-Fehler graceful.
 *
 * @returns isDismissed - true wenn Warnung dismissed wurde
 * @returns dismiss - Funktion zum Dismissieren der Warnung
 *
 * @example
 * ```typescript
 * function BrowserSecurityWarning() {
 *   const { isDismissed, dismiss } = useBrowserWarningDismissed();
 *
 *   if (isDismissed) {
 *     return null;
 *   }
 *
 *   return (
 *     <div className="alert alert-warning">
 *       <p>Diese Anwendung sollte als Desktop-App verwendet werden.</p>
 *       <button onClick={dismiss}>Verstanden</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBrowserWarningDismissed(): UseBrowserWarningDismissedResult {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      // SSR-Safety: window ist in SSR-Umgebungen nicht verfügbar
      if (typeof window === 'undefined') {
        return false;
      }
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Private Browsing (Safari/Firefox): sessionStorage wirft SecurityError
      // oder QuotaExceededError auch beim Lesen. Nutze Memory-Fallback um
      // zu verhindern dass die Warnung bei jeder Navigation erneut erscheint.
      return memoryFallback;
    }
  });

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Private Browsing: sessionStorage nicht verfügbar,
      // setze Memory-Fallback für nachfolgende Hook-Instanzen
      memoryFallback = true;
    }
    setIsDismissed(true);
  }, []);

  return { isDismissed, dismiss };
}
