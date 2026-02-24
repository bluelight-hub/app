/**
 * ZustellstatusAnzeige Molecule
 *
 * Zeigt den Quittierungsfortschritt als Fortschrittsbalken mit optionalen
 * Empfaenger-Chips in der erweiterten Variante.
 *
 * Unterscheidet zwischen quittierbare Empfaenger (mit User-Link, koennen in-app
 * quittieren) und nicht-quittierbare Empfaenger (nur namentlich, via Funk).
 */

import { format } from 'date-fns';
import { PiCheck, PiCheckCircle, PiQuestion, PiRadio, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { BefehlEmpfaengerDto } from '@bluelight-hub/shared/client';
import { getQuittierungsfortschritt, getEmpfaengerQuittierungStatus, splitEmpfaenger } from '../../lib/befehl-utils';
import type { EmpfaengerChipStatus } from '../../lib/befehl-utils';

interface ZustellstatusAnzeigeProps {
  empfaenger: BefehlEmpfaengerDto[];
  variant?: 'compact' | 'expanded';
  className?: string;
}

/** Icon-Zuordnung pro Empfaenger-Chip-Status */
const STATUS_ICON: Record<EmpfaengerChipStatus, React.ComponentType<{ className?: string }>> = {
  ZUGESTELLT: PiCheck,
  VERSTANDEN: PiCheckCircle,
  RUECKFRAGE: PiQuestion,
  NICHT_VERSTANDEN: PiWarningCircle,
};

/** Tooltip-Text fuer einen einzelnen Empfaenger */
function getChipTooltip(name: string, label: string, zeitpunkt: Date | undefined): string {
  if (zeitpunkt) {
    return `${name} - ${label} um ${format(zeitpunkt, 'dd.MM. HH:mm')}`;
  }
  return `${name} - ${label}`;
}

export function ZustellstatusAnzeige({ empfaenger, variant = 'compact', className }: ZustellstatusAnzeigeProps) {
  const { quittiert, gesamt, prozent } = getQuittierungsfortschritt(empfaenger);
  const { quittierbar, nichtQuittierbar } = splitEmpfaenger(empfaenger);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Fortschrittsbalken + Text (basiert nur auf quittierbare Empfaenger) */}
      <div className="flex items-center gap-2">
        <div
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={quittiert}
          aria-valuemin={0}
          aria-valuemax={gesamt}
          aria-label={`Quittierungsfortschritt: ${quittiert} von ${gesamt} Empfängern`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 motion-reduce:transition-none',
              prozent === 0 && 'bg-gray-200 dark:bg-gray-700',
              prozent > 0 && prozent < 100 && 'bg-yellow-400 dark:bg-yellow-500',
              prozent === 100 && 'bg-green-500 dark:bg-green-400',
            )}
            style={{ width: `${prozent}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 text-xs font-medium',
            prozent === 0 && 'text-gray-500 dark:text-gray-400',
            prozent > 0 && prozent < 100 && 'text-yellow-700 dark:text-yellow-300',
            prozent === 100 && 'text-green-700 dark:text-green-300',
          )}
        >
          {quittiert}/{gesamt} quittiert
        </span>
      </div>

      {/* Quittierbare Empfaenger-Chips (nur expanded) */}
      {variant === 'expanded' && quittierbar.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quittierbar.map((e) => {
            const { status, chipBg, chipText, label, zeitpunkt } = getEmpfaengerQuittierungStatus(e);
            const Icon = STATUS_ICON[status];
            const tooltip = getChipTooltip(e.name, label, zeitpunkt);

            return (
              <span key={e.id} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', chipBg, chipText)} title={tooltip}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {e.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Nicht-quittierbare Empfaenger (via Funk) */}
      {variant === 'expanded' && nichtQuittierbar.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">Via Funk:</span>
          {nichtQuittierbar.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              title={`${e.name} - Via Funk (keine In-App-Quittierung)`}
            >
              <PiRadio className="h-3.5 w-3.5" aria-hidden="true" />
              {e.name}
            </span>
          ))}
        </div>
      )}

      {/* Compact: Nicht-quittierbare Anzahl anzeigen wenn vorhanden */}
      {variant === 'compact' && nichtQuittierbar.length > 0 && <span className="text-xs text-gray-400 dark:text-gray-500">+ {nichtQuittierbar.length} via Funk</span>}
    </div>
  );
}
