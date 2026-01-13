import { PiShieldWarning } from 'react-icons/pi';
import type { FC } from 'react';

interface InsecureModeBannerProps {
  /** Callback wenn der Migrations-Button geklickt wird */
  onMigrateClick: () => void;
}

/**
 * InsecureModeBanner Atom
 *
 * Zeigt einen Warnhinweis an, dass der Server im unsicheren Modus laeuft.
 * Bietet einen Button um zur Migration zu SECURE_MODE zu navigieren.
 *
 * **Story 4.6 - AC1:**
 * Visueller Indikator im Admin-Bereich wenn INSECURE Mode aktiv ist.
 *
 * @example
 * ```tsx
 * <InsecureModeBanner onMigrateClick={() => setMigrationModalOpen(true)} />
 * ```
 */
export const InsecureModeBanner: FC<InsecureModeBannerProps> = ({ onMigrateClick }) => {
  return (
    <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20" role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <PiShieldWarning className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-800 text-sm dark:text-amber-200">Unsicherer Modus aktiv</h3>
          <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">Dieser Server laeuft im unsicheren Modus. Tokens sind nicht erforderlich.</p>
          <button
            type="button"
            onClick={onMigrateClick}
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-2 font-semibold text-sm text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 focus-visible:outline-offset-2"
          >
            Zu SECURE_MODE wechseln
          </button>
        </div>
      </div>
    </div>
  );
};
