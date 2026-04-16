/**
 * AlarmierungListItem
 *
 * Card in der Alarmierungs-Liste. Zeigt Bezeichnung, Auslösezeitpunkt,
 * Status, Empfänger-Count und markiert Nachalarmierungen.
 */

import { cn } from '@/shared/ui/cn';
import type { AlarmierungResponseDto } from '@bluelight-hub/shared/client';
import { PiArrowUUpRight, PiCaretRight, PiUsersFour } from 'react-icons/pi';
import { AlarmierungStatusBadge, type AlarmierungStatus } from '../atoms/AlarmierungStatusBadge.atom';
import { NachalarmierungBadge } from '../atoms/NachalarmierungBadge.atom';

export interface AlarmierungListItemProps {
  alarmierung: AlarmierungResponseDto;
  selected?: boolean;
  onClick?: () => void;
  /**
   * Wenn gesetzt, zeigt den „Nachalarmieren"-Button. Nur bei aktiven
   * Alarmierungen sinnvoll — die Parent-Komponente entscheidet.
   */
  onNachalarmieren?: () => void;
}

function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AlarmierungListItem({ alarmierung, selected, onClick, onNachalarmieren }: AlarmierungListItemProps) {
  const empfaengerCount = alarmierung.empfaenger.length;

  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-2 rounded border p-3 text-left transition-colors',
        selected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-900/30'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
      )}
    >
      <button type="button" onClick={onClick} aria-pressed={selected} className="flex min-w-0 flex-1 items-start gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{alarmierung.bezeichnung}</h3>
            <AlarmierungStatusBadge status={alarmierung.status as AlarmierungStatus} size="sm" />
          </div>
          {alarmierung.istNachalarmierung && (
            <div className="mt-1">
              <NachalarmierungBadge size="sm" />
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span aria-label={`Alarmiert um ${formatDateTime(alarmierung.alarmierungszeit)}`}>{formatDateTime(alarmierung.alarmierungszeit)}</span>
            <span className="inline-flex items-center gap-1" aria-label={`${empfaengerCount} Empfänger`}>
              <PiUsersFour className="h-3.5 w-3.5" aria-hidden="true" />
              {empfaengerCount}
            </span>
          </div>
        </div>
        <PiCaretRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>
      {onNachalarmieren && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNachalarmieren();
          }}
          aria-label={`Nachalarmierung zu „${alarmierung.bezeichnung}" anlegen`}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-100 focus:opacity-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
        >
          <PiArrowUUpRight className="h-3 w-3" aria-hidden="true" />
          Nachalarm
        </button>
      )}
    </div>
  );
}
