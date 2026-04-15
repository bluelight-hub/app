/**
 * FunkspruchCompactRow
 *
 * Eine Zeile im "Kompakt"-Modus des Funkprotokolls. Liefert die klassische
 * „Leitstellen-Zeile" `[HH:mm:ss] KANAL ABSENDER → EMPFAENGER: Text`.
 */

import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import type { EintragDto } from '@/shared';
import { PiBroadcast, PiSiren, PiWarning } from 'react-icons/pi';
import type { FunkPrioritaetFilter } from '../../stores/funkprotokoll-filter.store';
import { PRIORITAET_STYLES } from '../../utils/priority-color';

export interface FunkspruchCompactRowProps {
  eintrag: EintragDto & { kontext: { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetFilter } };
  kanal?: Pick<FunkkanalResponseDto, 'id' | 'name'>;
}

const ICON_BY_PRIO = {
  routine: PiBroadcast,
  prioritaet: PiWarning,
  notfall: PiSiren,
} as const;

const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export function FunkspruchCompactRow({ eintrag, kanal }: FunkspruchCompactRowProps) {
  const prio = eintrag.kontext.funkPrioritaet;
  const Icon = ICON_BY_PRIO[prio];
  const style = PRIORITAET_STYLES[prio];

  return (
    <div className={cn('flex items-baseline gap-2 border-b border-slate-100 py-1 font-mono text-xs dark:border-slate-800', prio === 'notfall' && 'animate-pulse')} role="listitem">
      <Icon className={cn('size-3.5', style.text)} aria-hidden />
      <time dateTime={new Date(eintrag.ereignisZeitpunkt).toISOString()} className="text-slate-500">
        [{formatTime(eintrag.ereignisZeitpunkt)}]
      </time>
      <span className="font-semibold text-slate-700 dark:text-slate-200">{kanal?.name ?? '—'}</span>
      <span className="text-slate-500">
        {eintrag.absender ?? 'Unbekannt'} → {eintrag.empfaenger ?? '—'}
      </span>
      <span className={cn('flex-1 truncate', style.text)}>{eintrag.text}</span>
    </div>
  );
}
