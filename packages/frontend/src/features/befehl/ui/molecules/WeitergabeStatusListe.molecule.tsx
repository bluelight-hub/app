/**
 * WeitergabeStatusListe Molecule
 *
 * Zeigt pro Empfaenger den Zustell- und Quittierungsstatus als vertikale Liste.
 * Wird im Befehl-Inspector-Panel verwendet, um den detaillierten Weitergabestatus
 * aller Empfaenger auf einen Blick darzustellen.
 *
 * - Kompakt bei <= 5 Empfaengern, scrollbar bei > 5
 * - Status-Badges mit Icon + Text + Farbe (WCAG AA konform)
 * - Optionale Handlungsbedarf-Markierung bei offenen Rueckfragen/Nicht-Verstanden
 */

import { format } from 'date-fns';
import { PiCheckCircle, PiClock, PiQuestion, PiUser, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { BefehlEmpfaengerDto, BefehlEmpfaengerDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';

interface WeitergabeStatusListeProps {
  empfaenger: BefehlEmpfaengerDto[];
  /** Zeigt Handlungsbedarf-Markierung bei offenen Rueckfragen/Nicht-Verstanden */
  showHandlungsbedarf?: boolean;
  className?: string;
}

/** Abgeleiteter Status eines Empfaengers fuer die Anzeige */
type EmpfaengerDisplayStatus = BefehlEmpfaengerDtoQuittierungArtEnum | 'AUSSTEHEND';

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeClasses: string;
}

/** Konfiguration fuer jeden moeglichen Status */
const STATUS_CONFIG: Record<EmpfaengerDisplayStatus, StatusConfig> = {
  VERSTANDEN: {
    icon: PiCheckCircle,
    label: 'Verstanden',
    badgeClasses: 'bg-status-success-surface text-status-success-text',
  },
  RUECKFRAGE: {
    icon: PiQuestion,
    label: 'Rückfrage',
    badgeClasses: 'bg-status-warning-surface text-status-warning-text',
  },
  NICHT_VERSTANDEN: {
    icon: PiWarningCircle,
    label: 'Nicht verstanden',
    badgeClasses: 'bg-status-danger-surface text-status-danger-text',
  },
  AUSSTEHEND: {
    icon: PiClock,
    label: 'Ausstehend',
    badgeClasses: 'bg-surface-raised text-text-muted',
  },
};

/** Bestimmt den Anzeige-Status eines Empfaengers */
function getDisplayStatus(empfaenger: BefehlEmpfaengerDto): EmpfaengerDisplayStatus {
  if (empfaenger.quittiertAm && empfaenger.quittierungArt) {
    return empfaenger.quittierungArt;
  }
  return 'AUSSTEHEND';
}

/** Formatiert einen Zeitstempel fuer die Anzeige (dd.MM. HH:mm) */
function formatZeitpunkt(date: Date | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return format(date, 'dd.MM. HH:mm');
}

/** Bestimmt Handlungsbedarf-Informationen fuer einen Empfaenger */
function getHandlungsbedarfInfo(status: EmpfaengerDisplayStatus): {
  borderClass: string;
  label: string;
} | null {
  if (status === 'RUECKFRAGE') {
    return {
      borderClass: 'border-l-2 border-status-warning-border',
      label: 'Rückfrage offen',
    };
  }
  if (status === 'NICHT_VERSTANDEN') {
    return {
      borderClass: 'border-l-2 border-status-danger-border',
      label: 'Handlungsbedarf',
    };
  }
  return null;
}

/** Einzelne Empfaenger-Zeile mit Status-Badge und Zeitstempeln */
function EmpfaengerRow({ empfaenger, showHandlungsbedarf }: { empfaenger: BefehlEmpfaengerDto; showHandlungsbedarf: boolean }) {
  const status = getDisplayStatus(empfaenger);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const zugestelltFormatiert = formatZeitpunkt(empfaenger.zugestelltAm);
  const quittiertFormatiert = formatZeitpunkt(empfaenger.quittiertAm);

  const handlungsbedarf = showHandlungsbedarf ? getHandlungsbedarfInfo(status) : null;

  return (
    <li className={cn('flex items-start gap-3 rounded-md px-3 py-2 hover:bg-action-secondary', handlungsbedarf?.borderClass)}>
      {/* Empfaenger-Icon */}
      <div className="mt-0.5 flex-shrink-0">
        <PiUser className="h-4 w-4 text-text-muted" aria-hidden="true" />
      </div>

      {/* Name + Zeitstempel */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-text-primary text-sm">{empfaenger.name}</span>

          {/* Status Badge */}
          <span className={cn('inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs', config.badgeClasses)} title={config.label}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {config.label}
          </span>
        </div>

        {/* Zeitstempel-Zeile */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-text-muted text-xs">
          {zugestelltFormatiert && <span>Zugestellt: {zugestelltFormatiert}</span>}
          {quittiertFormatiert && (
            <>
              {zugestelltFormatiert && (
                <span className="text-border-subtle" aria-hidden="true">
                  |
                </span>
              )}
              <span>Quittiert: {quittiertFormatiert}</span>
            </>
          )}
          {!zugestelltFormatiert && !quittiertFormatiert && <span className="italic text-text-muted">Noch nicht zugestellt</span>}
        </div>

        {/* Handlungsbedarf Label */}
        {handlungsbedarf && (
          <span className={cn('mt-1 inline-block font-medium text-xs', status === 'RUECKFRAGE' && 'text-status-warning-text', status === 'NICHT_VERSTANDEN' && 'text-status-danger-text')}>
            {handlungsbedarf.label}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Vertikale Liste aller Empfaenger mit Zustell- und Quittierungsstatus.
 *
 * - Kompakt bei <= 5 Empfaengern, scrollbar (max-h-64) bei > 5
 * - Status-Badges: VERSTANDEN (gruen), RUECKFRAGE (gelb), NICHT_VERSTANDEN (rot), AUSSTEHEND (grau)
 * - Optionale Handlungsbedarf-Markierung bei RUECKFRAGE und NICHT_VERSTANDEN
 */
export function WeitergabeStatusListe({ empfaenger, showHandlungsbedarf = false, className }: WeitergabeStatusListeProps) {
  if (empfaenger.length === 0) {
    return <div className={cn('py-4 text-center text-text-muted text-sm', className)}>Keine Empfänger</div>;
  }

  const isScrollable = empfaenger.length > 5;

  return (
    <ul className={cn('flex list-none flex-col divide-y divide-border-subtle', isScrollable && 'max-h-64 overflow-y-auto', className)} aria-label="Weitergabestatus der Empfänger">
      {empfaenger.map((e) => (
        <EmpfaengerRow key={e.id} empfaenger={e} showHandlungsbedarf={showHandlungsbedarf} />
      ))}
    </ul>
  );
}
