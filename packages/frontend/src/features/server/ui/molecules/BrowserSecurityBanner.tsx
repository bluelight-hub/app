/**
 * Browser Security Banner Component
 *
 * Zeigt eine Sicherheitswarnung an, wenn die App im Browser statt als Tauri Desktop-App läuft.
 * Warnt Benutzer, dass Server-Daten im Browser unverschlüsselt gespeichert werden.
 */

import { PiWarningFill, PiX } from 'react-icons/pi';
import { useIsTauri } from '@/shared/hooks/useIsTauri';
import { useBrowserWarningDismissed } from '../../hooks/use-browser-warning-dismissed';
import { cn } from '@/shared/ui/cn';

/**
 * Props für die BrowserSecurityBanner Komponente.
 */
export interface BrowserSecurityBannerProps {
  /** Optionale zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Sicherheitswarnung für Browser-Nutzung.
 *
 * Wird nur im Browser angezeigt, nicht in der Tauri Desktop-App.
 * Kann vom Benutzer für die aktuelle Session dismissed werden.
 *
 * @example
 * ```tsx
 * // Im Root Layout oder App Component
 * <BrowserSecurityBanner />
 * ```
 */
export const BrowserSecurityBanner: React.FC<BrowserSecurityBannerProps> = ({ className }) => {
  const { isTauri: isTauriApp } = useIsTauri();
  const { isDismissed, dismiss } = useBrowserWarningDismissed();

  // In Tauri Desktop-App: Nichts anzeigen (AC5)
  if (isTauriApp) {
    return null;
  }

  // Wenn bereits dismissed: Nichts anzeigen
  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 shadow-slate-950/5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/35 dark:shadow-transparent',
        className,
      )}
      role="alert"
      aria-live="polite"
      aria-labelledby="browser-security-warning-text"
    >
      <div className="flex items-start gap-3">
        <PiWarningFill className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p id="browser-security-warning-text" className="flex-1 text-amber-900 text-sm dark:text-amber-100">
          Im Browser werden Server-Daten unverschlüsselt gespeichert. Für maximale Sicherheit nutze die Desktop-App.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-100"
          aria-label="Browser-Sicherheitswarnung für diese Sitzung ausblenden"
        >
          <PiX className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
