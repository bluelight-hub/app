/**
 * FunkspruchBubble
 *
 * Chat-artige Darstellung eines Funkspruch-ETB-Eintrags (Default-Modus
 * des Funkprotokolls). Farbakzent links entsprechend der Priorität.
 */

import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import type { EintragDto } from '@/shared';
import type { FunkPrioritaetFilter } from '../../stores/funkprotokoll-filter.store';
import { PRIORITAET_STYLES } from '../../utils/priority-color';
import { FunkKontextBadge } from './FunkKontextBadge.molecule';

export interface FunkspruchBubbleProps {
  eintrag: EintragDto & { kontext: { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetFilter } };
  /** Nachgeschlagener Kanal (aus Kanalplan-Query) — kann fehlen, wenn Kanal gelöscht wurde. */
  kanal?: Pick<FunkkanalResponseDto, 'id' | 'name'>;
  onKanalClick?: (kanalId: string) => void;
}

const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export function FunkspruchBubble({ eintrag, kanal, onKanalClick }: FunkspruchBubbleProps) {
  const style = PRIORITAET_STYLES[eintrag.kontext.funkPrioritaet];

  return (
    <article className={cn('rounded border bg-white p-3 shadow-sm dark:bg-slate-900', 'border-l-4', style.border, eintrag.kontext.funkPrioritaet === 'notfall' && 'animate-pulse')}>
      <header className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {eintrag.absender ?? 'Unbekannt'} → {eintrag.empfaenger ?? '—'}
        </span>
        <time dateTime={new Date(eintrag.ereignisZeitpunkt).toISOString()}>{formatTime(eintrag.ereignisZeitpunkt)}</time>
        <FunkKontextBadge kanal={kanal} prioritaet={eintrag.kontext.funkPrioritaet} onClick={kanal ? () => onKanalClick?.(kanal.id) : undefined} className="ml-auto" />
      </header>
      <p className="mt-2 text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{eintrag.text}</p>
    </article>
  );
}
