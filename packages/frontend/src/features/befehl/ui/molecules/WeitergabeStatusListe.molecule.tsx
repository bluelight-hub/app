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
    badgeClasses: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  RUECKFRAGE: {
    icon: PiQuestion,
    label: 'Rückfrage',
    badgeClasses: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  NICHT_VERSTANDEN: {
    icon: PiWarningCircle,
    label: 'Nicht verstanden',
    badgeClasses: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  AUSSTEHEND: {
    icon: PiClock,
    label: 'Ausstehend',
    badgeClasses: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
      borderClass: 'border-l-2 border-yellow-400',
      label: 'Rückfrage offen',
    };
  }
  if (status === 'NICHT_VERSTANDEN') {
    return {
      borderClass: 'border-l-2 border-red-400',
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
    <li className={cn('flex items-start gap-3 rounded-md px-3 py-2', 'hover:bg-gray-50 dark:hover:bg-gray-800/50', handlungsbedarf?.borderClass)}>
      {/* Empfaenger-Icon */}
      <div className="mt-0.5 flex-shrink-0">
        <PiUser className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>

      {/* Name + Zeitstempel */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-gray-900 text-sm dark:text-gray-100">{empfaenger.name}</span>

          {/* Status Badge */}
          <span className={cn('inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs', config.badgeClasses)} title={config.label}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {config.label}
          </span>
        </div>

        {/* Zeitstempel-Zeile */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-gray-500 text-xs dark:text-gray-400">
          {zugestelltFormatiert && <span>Zugestellt: {zugestelltFormatiert}</span>}
          {quittiertFormatiert && (
            <>
              {zugestelltFormatiert && (
                <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
                  |
                </span>
              )}
              <span>Quittiert: {quittiertFormatiert}</span>
            </>
          )}
          {!zugestelltFormatiert && !quittiertFormatiert && <span className="italic text-gray-400 dark:text-gray-500">Noch nicht zugestellt</span>}
        </div>

        {/* Handlungsbedarf Label */}
        {handlungsbedarf && (
          <span
            className={cn(
              'mt-1 inline-block font-medium text-xs',
              status === 'RUECKFRAGE' && 'text-yellow-600 dark:text-yellow-400',
              status === 'NICHT_VERSTANDEN' && 'text-red-600 dark:text-red-400',
            )}
          >
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
    return <div className={cn('py-4 text-center text-gray-500 text-sm dark:text-gray-400', className)}>Keine Empfänger</div>;
  }

  const isScrollable = empfaenger.length > 5;

  return (
    <ul className={cn('flex list-none flex-col divide-y divide-gray-100 dark:divide-gray-800', isScrollable && 'max-h-64 overflow-y-auto', className)} aria-label="Weitergabestatus der Empfänger">
      {empfaenger.map((e) => (
        <EmpfaengerRow key={e.id} empfaenger={e} showHandlungsbedarf={showHandlungsbedarf} />
      ))}
    </ul>
  );
}
