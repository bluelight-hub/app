/**
 * AlarmierungTimelineEvent
 *
 * Einzelnes Timeline-Event (Auslösung, Status-Wechsel eines Empfängers,
 * ETB-Korrektur-Eintrag). Icon + Titel + Meta.
 */

import { cn } from '@/shared/ui/cn';
import type { AlarmierungTimelineEventDto } from '@bluelight-hub/shared/client';
import { PiCheckCircle, PiCircleNotch, PiHouseLine, PiMegaphone, PiNote, PiTruck } from 'react-icons/pi';

type EventType = AlarmierungTimelineEventDto['type'];

export interface AlarmierungTimelineEventProps {
  event: AlarmierungTimelineEventDto;
}

const EVENT_META: Record<EventType, { label: string; Icon: typeof PiMegaphone; color: string }> = {
  alarmierung_ausgeloest: { label: 'Alarmierung ausgelöst', Icon: PiMegaphone, color: 'text-red-600 dark:text-red-400' },
  empfaenger_alarmiert: { label: 'Empfänger alarmiert', Icon: PiCircleNotch, color: 'text-blue-600 dark:text-blue-400' },
  empfaenger_ausgerueckt: { label: 'Ausgerückt', Icon: PiTruck, color: 'text-amber-600 dark:text-amber-400' },
  empfaenger_vor_ort: { label: 'Vor Ort', Icon: PiCheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
  empfaenger_wieder_frei: { label: 'Wieder frei', Icon: PiHouseLine, color: 'text-slate-600 dark:text-slate-400' },
  etb_eintrag: { label: 'ETB-Eintrag', Icon: PiNote, color: 'text-purple-600 dark:text-purple-400' },
};

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Extrahiert einen primitiven string aus dem generisch-typisierten `data.*`-Feld. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function AlarmierungTimelineEvent({ event }: AlarmierungTimelineEventProps) {
  const meta = EVENT_META[event.type];
  const Icon = meta.Icon;
  const nameSnapshot = asString(event.data.nameSnapshot);
  const bezeichnung = asString(event.data.bezeichnung);
  const text = asString(event.data.text);
  const absender = asString(event.data.absender);

  return (
    <li className="flex items-start gap-3 border-l-2 border-slate-200 py-2 pl-4 dark:border-slate-700">
      <span className={cn('mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700', meta.color)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{meta.label}</span>
          <time className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400" dateTime={new Date(event.occurredAt).toISOString()}>
            {formatTime(event.occurredAt)}
          </time>
        </div>
        {(nameSnapshot || bezeichnung) && <div className="truncate text-xs text-slate-600 dark:text-slate-300">{nameSnapshot ?? bezeichnung}</div>}
        {text && (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {absender && <span className="font-medium">{absender}: </span>}
            <span className="italic">{text}</span>
          </div>
        )}
      </div>
    </li>
  );
}
