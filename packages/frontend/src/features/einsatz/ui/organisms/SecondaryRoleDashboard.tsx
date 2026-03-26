import type { MeineEinsatzRolleDtoRolleEnum } from '@bluelight-hub/shared/client';
import { useEinsatzDetails } from '@/features/einsatz';
import { useUnquittierteBefehleCount } from '@/features/befehl';
import { useMeineBefehle } from '@/features/befehl/api/use-meine-befehle';
import { useCurrentUser } from '@/features/auth';
import { useEtbInfinite } from '@/features/etb/api';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { cn } from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo } from 'react';
import { PiClipboard, PiFileText, PiInfo, PiMapPin, PiSiren, PiWarning } from 'react-icons/pi';

/** Menschenlesbare Rollen-Labels */
const ROLLE_LABELS: Record<string, string> = {
  EMPFAENGER: 'Empfänger',
  BEOBACHTER: 'Beobachter',
};

interface SecondaryRoleDashboardProps {
  einsatzId: string;
  rolle: MeineEinsatzRolleDtoRolleEnum | null | undefined;
}

/**
 * Reduziertes Dashboard fuer sekundaere Rollen (EMPFAENGER, BEOBACHTER).
 *
 * Story 5.5 AC1: Zeigt nur freigegebene Inhalte und Aktionen.
 * Story 5.5 AC2: Aktuelle Sicht im selben Einsatzkontext.
 *
 * - Rollen-Banner mit erklaerung
 * - Befehle-Karte (Unquittierte fuer EMPFAENGER)
 * - Einsatz-Status (Alarmstichwort, Einsatzort, Status)
 * - Letzte ETB-Eintraege (read-only, max 5)
 */
export function SecondaryRoleDashboard({ einsatzId, rolle }: SecondaryRoleDashboardProps) {
  const { einsatz, isLoading: isEinsatzLoading, error: einsatzError } = useEinsatzDetails(einsatzId);
  const { user } = useCurrentUser();
  const unquittiertCount = useUnquittierteBefehleCount(einsatzId);
  const isEmpfaenger = rolle === 'EMPFAENGER';

  // Eigene Befehle laden (nur fuer EMPFAENGER relevant)
  const { data: meineBefehle = [] } = useMeineBefehle(einsatzId, isEmpfaenger ? user?.id : undefined);

  // Letzte 5 ETB-Eintraege
  const { data: etbData } = useEtbInfinite({
    einsatzId,
    limit: 5,
    sortBy: 'sequenceNumber',
    sortOrder: 'desc',
    includeDeleted: false,
  });

  const recentEntries = useMemo(() => {
    if (!etbData?.pages) return [];
    return etbData.pages.flatMap((page) => page.data?.eintraege || []).slice(0, 5);
  }, [etbData]);

  const rolleLabel = ROLLE_LABELS[rolle ?? ''] ?? rolle ?? 'Unbekannt';

  if (isEinsatzLoading) {
    return <LoadingState title="Einsatz wird geladen" />;
  }

  if (einsatzError || !einsatz) {
    return <ErrorState title="Fehler" description="Einsatzdaten konnten nicht geladen werden." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Rollen-Banner */}
      <div className="flex items-start gap-3 rounded-panel border border-status-info-border bg-status-info-surface p-4" role="status" aria-live="polite">
        <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-info-text" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-medium text-status-info-text">
            Sie sind als <span className="font-semibold">{rolleLabel}</span> im Einsatz aktiv.
          </p>
          <p className="mt-1 text-body-sm text-status-info-text">Sie sehen eine reduzierte Ansicht mit den fuer Ihre Rolle freigegebenen Informationen.</p>
        </div>
      </div>

      {/* Einsatz-Status Karte */}
      <div className="rounded-panel border border-border-subtle bg-surface-panel p-5 shadow-panel">
        <div className="flex items-center gap-2">
          <PiSiren className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <h2 className="text-title-sm font-semibold text-text-primary">Einsatzlage</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-body-sm text-text-secondary">Alarmstichwort</dt>
            <dd className="mt-1 font-medium text-text-primary">{einsatz.alarmstichwort || '—'}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">Einsatzort</dt>
            <dd className="mt-1 flex items-center gap-1 font-medium text-text-primary">
              <PiMapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              {einsatz.einsatzort || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">Status</dt>
            <dd className="mt-1 font-medium text-text-primary">{einsatz.status}</dd>
          </div>
          {einsatz.alarmierungszeit && (
            <div>
              <dt className="text-body-sm text-text-secondary">Alarmzeit</dt>
              <dd className="mt-1 font-medium text-text-primary">{format(new Date(einsatz.alarmierungszeit), 'dd.MM.yyyy HH:mm', { locale: de })}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Befehle Karte */}
      <div className="rounded-panel border border-border-subtle bg-surface-panel p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiFileText className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h2 className="text-title-sm font-semibold text-text-primary">Befehle</h2>
          </div>
          <Link
            to="/app/einsatz/$einsatzId/führung/befehle"
            params={{ einsatzId }}
            className="hover:bg-surface-hover inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-body-sm text-action-primary"
          >
            Alle anzeigen
          </Link>
        </div>

        {isEmpfaenger && unquittiertCount > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-status-warning-border bg-status-warning-surface px-4 py-3">
            <PiWarning className="h-5 w-5 flex-shrink-0 text-status-warning-text" aria-hidden="true" />
            <div>
              <p className="text-body-sm font-medium text-status-warning-text">
                {unquittiertCount} {unquittiertCount === 1 ? 'Befehl' : 'Befehle'} warten auf Ihre Quittierung
              </p>
              <Link
                to="/app/einsatz/$einsatzId/führung/befehle"
                params={{ einsatzId }}
                className="mt-1 inline-block text-body-sm font-medium text-status-warning-text underline hover:text-action-primary"
              >
                Jetzt quittieren
              </Link>
            </div>
          </div>
        )}

        {isEmpfaenger && meineBefehle.length > 0 && (
          <div className="mt-4">
            <p className="text-body-sm text-text-secondary">
              {meineBefehle.length} {meineBefehle.length === 1 ? 'Befehl' : 'Befehle'} an Sie gerichtet
            </p>
          </div>
        )}

        {!isEmpfaenger && <p className="mt-4 text-body-sm text-text-secondary">Als Beobachter können Sie alle Befehle einsehen, aber keine Aktionen ausführen.</p>}
      </div>

      {/* Letzte ETB-Eintraege */}
      <div className="rounded-panel border border-border-subtle bg-surface-panel p-5 shadow-panel">
        <div className="flex items-center gap-2">
          <PiClipboard className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <h2 className="text-title-sm font-semibold text-text-primary">Letzte ETB-Eintraege</h2>
        </div>

        {recentEntries.length === 0 ? (
          <p className="mt-4 text-body-sm text-text-secondary">Noch keine Eintraege vorhanden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border-subtle">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-body-sm text-text-primary', entry.isDeleted && 'line-through opacity-50')}>{entry.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-body-sm text-text-secondary">
                      <span className="bg-surface-secondary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-text-secondary">{entry.kategorie}</span>
                      {entry.absender && <span>von {entry.absender}</span>}
                    </div>
                  </div>
                  <time className="flex-shrink-0 text-body-sm text-text-muted" dateTime={entry.timestamp}>
                    {format(new Date(entry.timestamp), 'HH:mm', { locale: de })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-border-subtle pt-3">
          <Link to="/app/einsatz/$einsatzId/führung/etb" params={{ einsatzId }} className="inline-flex items-center gap-1 text-body-sm text-action-primary hover:underline">
            Vollstaendiges ETB anzeigen (Lesemodus)
          </Link>
        </div>
      </div>
    </div>
  );
}
