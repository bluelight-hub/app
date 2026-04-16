/**
 * AlarmierungTimeline
 *
 * Chronologische Liste aller Alarmierungs-Events eines Einsatzes.
 * Default-Filter: aktuelles Einsatz-Fenster (ab Einsatz-Start). Über einen
 * einfachen Chip-Filter lassen sich Event-Typen ein-/ausblenden.
 */

import type { AlarmierungTimelineEventDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';
import { useMemo, useState } from 'react';
import { useAlarmierungTimeline } from '../../api/queries';
import { AlarmierungTimelineEvent } from '../molecules/AlarmierungTimelineEvent.molecule';

type EventType = AlarmierungTimelineEventDto['type'];

const FILTER_CHIPS: Array<{ type: EventType; label: string }> = [
  { type: 'alarmierung_ausgeloest', label: 'Auslösung' },
  { type: 'empfaenger_alarmiert', label: 'Alarmiert' },
  { type: 'empfaenger_ausgerueckt', label: 'Ausgerückt' },
  { type: 'empfaenger_vor_ort', label: 'Vor Ort' },
  { type: 'empfaenger_wieder_frei', label: 'Wieder frei' },
  { type: 'etb_eintrag', label: 'ETB' },
];

export interface AlarmierungTimelineProps {
  einsatzId: string;
  className?: string;
}

export function AlarmierungTimeline({ einsatzId, className }: AlarmierungTimelineProps) {
  const { data, isLoading, isError } = useAlarmierungTimeline({ einsatzId });
  const [excluded, setExcluded] = useState<Set<EventType>>(new Set());

  const events = useMemo(() => {
    const raw = data?.data ?? [];
    const filtered = raw.filter((e) => !excluded.has(e.type));
    // Backend liefert bereits chronologisch — wir stellen sicher: neueste zuerst.
    return [...filtered].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [data, excluded]);

  const toggle = (type: EventType) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Timeline-Filter">
        {FILTER_CHIPS.map((chip) => {
          const active = !excluded.has(chip.type);
          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => toggle(chip.type)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                  : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-slate-500">Timeline wird geladen…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Timeline konnte nicht geladen werden.</p>}
        {!isLoading && !isError && events.length === 0 && <p className="p-4 text-sm text-slate-500">Keine Ereignisse im aktuellen Filter.</p>}
        {events.length > 0 && (
          <ol className="space-y-0">
            {events.map((event, idx) => (
              <AlarmierungTimelineEvent key={`${event.type}-${new Date(event.occurredAt).getTime()}-${idx}`} event={event} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
