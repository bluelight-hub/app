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
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        selected && 'border-action-primary bg-action-secondary',
        !selected && isKorrigiert && 'border-border-subtle opacity-60',
        !selected && !isKorrigiert && kritikalitaet === 'KRITISCH' && 'border-status-danger-border bg-status-danger-surface',
        !selected && !isKorrigiert && kritikalitaet === 'WARNUNG' && 'border-status-warning-border bg-status-warning-surface',
        !selected && !isKorrigiert && kritikalitaet === 'NORMAL' && fortschritt.quittiert === fortschritt.gesamt && fortschritt.gesamt > 0 && 'border-status-success-border bg-status-success-surface',
        !selected &&
          !isKorrigiert &&
          kritikalitaet === 'NORMAL' &&
          (fortschritt.quittiert < fortschritt.gesamt || fortschritt.gesamt === 0) &&
          'border-border-subtle hover:border-border-strong hover:bg-action-secondary',
        className,
      )}
      aria-label={`Befehl ${befehl.nummer}: ${befehl.auftrag}`}
    >
      {/* Zeile 1: Prio-Dot + Nummer + Zeit */}
      <div className="flex items-center gap-2">
        {kritikalitaet === 'KRITISCH' && <AlarmDot className="flex-shrink-0" />}
        {kritikalitaet === 'WARNUNG' && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-status-warning-text" aria-hidden="true" />}
        {kritikalitaet === 'NORMAL' && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-border-strong" aria-hidden="true" />}
        <span className="font-bold font-mono text-text-primary text-sm">{befehl.nummer}</span>
        <time dateTime={erteiltAmDate.toISOString()} className="ml-auto text-text-muted text-xs">
          {format(erteiltAmDate, 'dd.MM. HH:mm')}
        </time>
      </div>

      {/* Zeile 2: Auftrag (1 Zeile) */}
      <p className="mt-1 truncate text-text-secondary text-sm">{befehl.auftrag}</p>

      {/* Zeile 3: Fortschrittsbar + Count */}
      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              fortschritt.prozent === 0 && 'bg-surface-raised',
              fortschritt.prozent > 0 && fortschritt.prozent < 100 && 'bg-status-warning-text',
              fortschritt.prozent === 100 && 'bg-status-success-text',
            )}
            style={{ width: `${fortschritt.prozent}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-text-muted text-xs">
          {fortschritt.quittiert}/{fortschritt.gesamt}
        </span>
      </div>
    </article>
  );
}
