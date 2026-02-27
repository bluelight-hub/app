/**
 * BefehlCompactCard Molecule
 *
 * Vereinfachte Befehlskarte fuer die Mobile-Ansicht (<768px) der Zone B.
 * Zeigt nur das Wesentliche: Prio-Dot + Nummer + Zeit, Auftrag (1 Zeile),
 * Fortschrittsbar + Count.
 */

import { format } from 'date-fns';
import { cn } from '@/shared/ui/cn';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { getBefehlKritikalitaet } from '../../lib/befehl-priority';
import { getQuittierungsfortschritt } from '../../lib/befehl-utils';
import { AlarmDot } from '../atoms/AlarmDot.atom';

interface BefehlCompactCardProps {
  befehl: BefehlDto;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function BefehlCompactCard({ befehl, onClick, selected, className }: BefehlCompactCardProps) {
  const kritikalitaet = getBefehlKritikalitaet(befehl);
  const fortschritt = getQuittierungsfortschritt(befehl.empfaenger);
  const erteiltAmDate = befehl.erteiltAm instanceof Date ? befehl.erteiltAm : new Date(befehl.erteiltAm);
  const isKorrigiert = befehl.status === 'KORRIGIERT';

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer rounded-lg border p-3 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        selected && 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20',
        !selected && isKorrigiert && 'border-gray-200 opacity-60 dark:border-gray-700',
        !selected && !isKorrigiert && kritikalitaet === 'KRITISCH' && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20',
        !selected && !isKorrigiert && kritikalitaet === 'WARNUNG' && 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20',
        !selected &&
          !isKorrigiert &&
          kritikalitaet === 'NORMAL' &&
          fortschritt.quittiert === fortschritt.gesamt &&
          fortschritt.gesamt > 0 &&
          'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
        !selected &&
          !isKorrigiert &&
          kritikalitaet === 'NORMAL' &&
          (fortschritt.quittiert < fortschritt.gesamt || fortschritt.gesamt === 0) &&
          'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50',
        className,
      )}
      aria-label={`Befehl ${befehl.nummer}: ${befehl.auftrag}`}
    >
      {/* Zeile 1: Prio-Dot + Nummer + Zeit */}
      <div className="flex items-center gap-2">
        {kritikalitaet === 'KRITISCH' && <AlarmDot className="flex-shrink-0" />}
        {kritikalitaet === 'WARNUNG' && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-yellow-400" aria-hidden="true" />}
        {kritikalitaet === 'NORMAL' && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />}
        <span className="font-bold font-mono text-gray-900 text-sm dark:text-gray-100">{befehl.nummer}</span>
        <time dateTime={erteiltAmDate.toISOString()} className="ml-auto text-gray-500 text-xs dark:text-gray-400">
          {format(erteiltAmDate, 'dd.MM. HH:mm')}
        </time>
      </div>

      {/* Zeile 2: Auftrag (1 Zeile) */}
      <p className="mt-1 truncate text-gray-700 text-sm dark:text-gray-300">{befehl.auftrag}</p>

      {/* Zeile 3: Fortschrittsbar + Count */}
      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              fortschritt.prozent === 0 && 'bg-gray-200 dark:bg-gray-700',
              fortschritt.prozent > 0 && fortschritt.prozent < 100 && 'bg-yellow-400 dark:bg-yellow-500',
              fortschritt.prozent === 100 && 'bg-green-500 dark:bg-green-400',
            )}
            style={{ width: `${fortschritt.prozent}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-gray-500 text-xs dark:text-gray-400">
          {fortschritt.quittiert}/{fortschritt.gesamt}
        </span>
      </div>
    </article>
  );
}
