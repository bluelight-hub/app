/**
 * Browser Security Banner Component
 *
 * Zeigt eine Sicherheitswarnung an, wenn die App im Browser statt als Tauri Desktop-App läuft.
 * Warnt Benutzer, dass Server-Daten im Browser unverschlüsselt gespeichert werden.
 */

import { PiWarningFill, PiX } from 'react-icons/pi';
import { isTauri } from '@/shared/utils/platform';
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
  const { isDismissed, dismiss } = useBrowserWarningDismissed();

  // In Tauri Desktop-App: Nichts anzeigen (AC5)
  if (isTauri()) {
    return null;
  }

  // Wenn bereits dismissed: Nichts anzeigen
  if (isDismissed) {
    return null;
  }

  return (
    <div className={cn('sticky top-0 z-50 border-yellow-200 border-b bg-yellow-50 px-4 py-3', className)} role="alert" aria-live="polite" aria-labelledby="browser-security-warning-text">
      <div className="flex items-center gap-3">
        <PiWarningFill className="h-5 w-5 flex-shrink-0 text-yellow-600" aria-hidden="true" />
        <p id="browser-security-warning-text" className="flex-1 text-sm text-yellow-800">
          Im Browser werden Server-Daten unverschlüsselt gespeichert. Für maximale Sicherheit nutze die Desktop-App.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 rounded p-1 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-label="Browser-Sicherheitswarnung dauerhaft ausblenden"
        >
          <PiX className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
