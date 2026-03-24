import { PiShieldWarning } from 'react-icons/pi';
import type { FC } from 'react';
interface InsecureModeBannerProps {
  /** Callback wenn der Migrations-Button geklickt wird */ onMigrateClick: () => void;
} /** * InsecureModeBanner Atom * * Zeigt einen Warnhinweis an, dass der Server im unsicheren Modus laeuft. * Bietet einen Button um zur Migration zu SECURE_MODE zu navigieren. * * **Story 4.6 - AC1:** * Visueller Indikator im Admin-Bereich wenn INSECURE Mode aktiv ist. * * @example * ```tsx * <InsecureModeBanner onMigrateClick={() => setMigrationModalOpen(true)} /> * ``` */
export const InsecureModeBanner: FC<InsecureModeBannerProps> = ({ onMigrateClick }) => {
  return (
    <div className="rounded-panel bg-status-warning-surface p-4" role="alert" aria-live="polite">
      {' '}
      <div className="flex items-start gap-3">
        {' '}
        <PiShieldWarning className="h-6 w-6 flex-shrink-0 text-status-warning-text" aria-hidden="true" />{' '}
        <div className="flex-1">
          {' '}
          <h3 className="font-medium text-status-warning-text text-sm">Unsicherer Modus aktiv</h3>{' '}
          <p className="mt-1 text-status-warning-text text-sm">Dieser Server laeuft im unsicheren Modus. Tokens sind nicht erforderlich.</p>{' '}
          <button
            type="button"
            onClick={onMigrateClick}
            className="mt-3 inline-flex items-center rounded-control bg-action-primary px-3 py-2 font-semibold text-sm text-text-inverse shadow-sm hover:bg-action-primary-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            {' '}
            Zu SECURE_MODE wechseln{' '}
          </button>{' '}
        </div>{' '}
      </div>{' '}
    </div>
  );
};
