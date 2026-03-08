/**
 * BefehlHistorieTimeline Organism
 *
 * Vertikale Timeline im Paket-Tracking-Style fuer die Befehlshistorie.
 * Zeigt Events mit Status-abhaengigen Dots (abgeschlossen/aktuell/ausstehend).
 */

import { cn } from '@/shared/ui/cn';
import { BefehlHistorieEventDtoStatusEnum as StatusEnum } from '@bluelight-hub/shared/client';
import type { BefehlHistorieEventDto } from '@bluelight-hub/shared/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { PiCheck, PiClock, PiDotsThree } from 'react-icons/pi';
import { useBefehlHistorie } from '../../api/use-befehl-historie';

interface BefehlHistorieTimelineProps {
  befehlId: string;
}

function getHistorieEventKeyBase(event: BefehlHistorieEventDto): string {
  return [event.typ, event.status, event.zeitpunkt ?? 'kein-zeitpunkt', event.beschreibung, event.akteur ?? 'kein-akteur', event.korrekturBefehlNummer ?? 'keine-korrektur'].join('|');
}

function TimelineDot({ status }: { status: BefehlHistorieEventDto['status'] }) {
  if (status === StatusEnum.Abgeschlossen) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 ring-8 ring-white dark:ring-gray-800">
        <PiCheck className="h-4 w-4 text-white" aria-hidden="true" />
      </span>
    );
  }

  if (status === StatusEnum.Aktuell) {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 ring-8 ring-white dark:ring-gray-800">
          <PiClock className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
      </span>
    );
  }

  // AUSSTEHEND
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white ring-8 ring-white dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-800">
      <PiDotsThree className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flow-root" data-testid="historie-loading">
      <ul className="-mb-8">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="relative pb-8">
              {i !== 2 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />}
              <div className="relative flex space-x-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BefehlHistorieTimeline({ befehlId }: BefehlHistorieTimelineProps) {
  const { data: timeline, isLoading, isError, refetch } = useBefehlHistorie(befehlId);
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20" data-testid="historie-error">
        <p className="text-red-600 text-sm dark:text-red-400">Historie konnte nicht geladen werden</p>
        <button type="button" onClick={() => refetch()} className="mt-2 font-medium text-red-700 text-sm underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-200">
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!timeline || timeline.events.length === 0) {
    return (
      <p className="text-center text-gray-500 text-sm dark:text-gray-400" data-testid="historie-leer">
        Keine Historie vorhanden
      </p>
    );
  }

  const events = timeline.events;
  const eventKeyCounts = new Map<string, number>();

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => {
          const isExpanded = expandedEventIdx === eventIdx;
          const isLast = eventIdx === events.length - 1;
          const zeitpunktDate = event.zeitpunkt ? new Date(event.zeitpunkt) : null;
          const eventKeyBase = getHistorieEventKeyBase(event);
          const occurrence = (eventKeyCounts.get(eventKeyBase) ?? 0) + 1;
          eventKeyCounts.set(eventKeyBase, occurrence);

          return (
            <li key={`${eventKeyBase}|${occurrence}`}>
              <div className="relative pb-8">
                {!isLast && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />}
                <button
                  type="button"
                  className="relative flex w-full space-x-3 text-left"
                  onClick={() => setExpandedEventIdx(isExpanded ? null : eventIdx)}
                  aria-label={`${event.beschreibung}${zeitpunktDate ? `, ${format(zeitpunktDate, 'dd.MM.yyyy HH:mm')}` : ''}`}
                  aria-expanded={isExpanded}
                >
                  <div>
                    <TimelineDot status={event.status} />
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4">
                    <div>
                      <p className={cn('font-medium text-sm', event.status === StatusEnum.Ausstehend ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100')}>
                        {event.beschreibung}
                        {event.akteur && <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">durch {event.akteur}</span>}
                      </p>
                      {isExpanded && event.details && <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{event.details}</p>}
                      {isExpanded && event.korrekturBefehlNummer && (
                        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
                          Korrektur: <span className="font-mono">{event.korrekturBefehlNummer}</span>
                        </p>
                      )}
                    </div>
                    {zeitpunktDate && (
                      <div className="shrink-0 whitespace-nowrap text-right text-gray-500 text-sm dark:text-gray-400">
                        <time dateTime={zeitpunktDate.toISOString()}>{format(zeitpunktDate, 'dd.MM.yyyy HH:mm')}</time>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
