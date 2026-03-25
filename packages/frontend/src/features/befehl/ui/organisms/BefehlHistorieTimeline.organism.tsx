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
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-status-success-text ring-8 ring-surface-panel">
        <PiCheck className="h-4 w-4 text-text-inverse" aria-hidden="true" />
      </span>
    );
  }

  if (status === StatusEnum.Aktuell) {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-primary opacity-75 motion-reduce:animate-none" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-action-primary ring-8 ring-surface-panel">
          <PiClock className="h-4 w-4 text-text-inverse" aria-hidden="true" />
        </span>
      </span>
    );
  }

  // AUSSTEHEND
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border-subtle bg-surface-panel ring-8 ring-surface-panel">
      <PiDotsThree className="h-4 w-4 text-text-muted" aria-hidden="true" />
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
              {i !== 2 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border-subtle" aria-hidden="true" />}
              <div className="relative flex space-x-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-raised" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-surface-raised" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-raised" />
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
      <div className="rounded-lg border border-status-danger-border bg-status-danger-surface p-4 text-center" data-testid="historie-error">
        <p className="text-sm text-status-danger-text">Historie konnte nicht geladen werden</p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium text-status-danger-text underline hover:text-action-primary">
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!timeline || timeline.events.length === 0) {
    return (
      <p className="text-center text-sm text-text-muted" data-testid="historie-leer">
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
                {!isLast && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border-subtle" aria-hidden="true" />}
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
                      <p className={cn('text-sm font-medium', event.status === StatusEnum.Ausstehend ? 'text-text-muted' : 'text-text-primary')}>
                        {event.beschreibung}
                        {event.akteur && <span className="ml-1 font-normal text-text-muted">durch {event.akteur}</span>}
                      </p>
                      {isExpanded && event.details && <p className="mt-1 text-sm text-text-muted">{event.details}</p>}
                      {isExpanded && event.korrekturBefehlNummer && (
                        <p className="mt-1 text-sm text-text-muted">
                          Korrektur: <span className="font-mono">{event.korrekturBefehlNummer}</span>
                        </p>
                      )}
                    </div>
                    {zeitpunktDate && (
                      <div className="shrink-0 text-right text-sm whitespace-nowrap text-text-muted">
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
