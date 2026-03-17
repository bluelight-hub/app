import type { AuthContextSummary as AuthContextSummaryModel } from '@/features/auth/utils';
import { cn } from '@/shared/ui/cn';

interface AuthContextSummaryProps {
  username: string;
  authContext: AuthContextSummaryModel;
  serverName?: string | null;
  className?: string;
}

interface SummaryItem {
  label: string;
  value: string;
}

export function AuthContextSummary({ username, authContext, serverName, className }: AuthContextSummaryProps) {
  const summaryItems: SummaryItem[] = [
    { label: 'Konto', value: username },
    { label: 'Aktive Rolle', value: authContext.roleLabel },
    { label: 'Berechtigungsstufe', value: authContext.permissionLevelLabel },
    { label: 'Aktiver Server', value: serverName ?? 'Kein aktiver Server' },
  ];

  return (
    <section
      aria-labelledby="auth-context-summary-heading"
      aria-describedby="auth-context-summary-description"
      className={cn('rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-700 dark:bg-gray-800', className)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-medium text-gray-500 text-xs uppercase tracking-[0.18em] dark:text-gray-400">Bestätigter Zugangskontext</p>
          <h2 id="auth-context-summary-heading" className="font-semibold text-gray-900 text-xl dark:text-white">
            Konto-, Rollen- und Berechtigungskontext bestätigt
          </h2>
          <p id="auth-context-summary-description" className="text-gray-600 text-sm dark:text-gray-300">
            {authContext.permissionHint}
          </p>
        </div>

        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/60">
              <dt className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">{item.label}</dt>
              <dd className="mt-2 font-semibold text-base text-gray-900 dark:text-white">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">Primäraktion</p>
            <p className="mt-2 font-semibold text-base text-gray-900 dark:text-white">{authContext.primaryActionLabel}</p>
            <p className="mt-2 text-gray-600 text-sm dark:text-gray-300">{authContext.nextActionLabel}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">{authContext.restrictedActionLabel ? 'Begrenzte Folgeaktion' : 'Statushinweis'}</p>
            <p className="mt-2 font-semibold text-base text-gray-900 dark:text-white">{authContext.restrictedActionLabel ?? 'Sie können direkt im Einsatz-Dashboard weiterarbeiten'}</p>
            <p className="mt-2 text-gray-600 text-sm dark:text-gray-300">{authContext.restrictedActionHint ?? 'Die nächste sinnvolle Aktion bleibt im aktuellen Dashboard-Kontext erreichbar.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
