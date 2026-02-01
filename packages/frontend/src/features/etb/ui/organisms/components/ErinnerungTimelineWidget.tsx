import { useErinnerungTimeline } from '@/features/etb/api';
import { getEventConfig } from '@/features/reminders/constants';
import { cn } from '@/shared/ui/cn';
import type { ErinnerungTimelineEventDto } from '@/shared';
import { format, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { PiCircleNotch, PiListMagnifyingGlass } from 'react-icons/pi';

/**
 * Formatiert den Zeitstempel im deutschen Format
 *
 * @param dateInput - ISO-String oder Date-Objekt
 * @returns Formatierter Zeitstempel oder Fallback bei ungueltigem Datum
 */
function formatTimestamp(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '–';

  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;

  if (!isValid(date)) return '–';

  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
}

/**
 * Extrahiert zusaetzliche Informationen aus den Metadaten
 */
function getMetadataDetails(eventType: string, metadata: object | null | undefined): string | null {
  if (!metadata) return null;

  const meta = metadata as Record<string, unknown>;

  // Snoozed: Zeige die Snooze-Dauer
  if (eventType === 'ErinnerungSnoozed' && meta.snoozeDurationMinutes) {
    const minutes = meta.snoozeDurationMinutes as number;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours} Std. ${remainingMinutes} Min.` : `${hours} Std.`;
    }
    return `${minutes} Min.`;
  }

  // Erledigt: Zeige die Notiz
  if (eventType === 'ErinnerungErledigt' && meta.notiz) {
    return meta.notiz as string;
  }

  // Eskaliert/Intensiviert: Zeige Eskalationsstufe
  if ((eventType === 'ErinnerungEskaliert' || eventType === 'ErinnerungIntensiviert') && meta.escalationLevel) {
    return `Stufe ${meta.escalationLevel}`;
  }

  return null;
}

interface TimelineEventItemProps {
  event: ErinnerungTimelineEventDto;
  isLast: boolean;
  onEntryClick?: (entryId: string) => void;
}

/**
 * Einzelnes Timeline-Event Item
 */
function TimelineEventItem({ event, isLast, onEntryClick }: TimelineEventItemProps) {
  const config = getEventConfig(event.eventType);
  const Icon = config.icon;
  const metadataDetails = getMetadataDetails(event.eventType, event.metadata);

  const handleClick = () => {
    if (onEntryClick) {
      onEntryClick(event.id);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Vertikale Linie (ausser beim letzten Element) */}
      {!isLast && <div className="absolute top-8 -bottom-6 left-4 w-0.5 bg-gray-200 dark:bg-gray-700" />}

      {/* Icon */}
      <div className={cn('z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.textColor)} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Event Label und User */}
            <p className="font-medium text-gray-900 text-sm dark:text-gray-100">
              {config.label}
              <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">von {event.createdBy.displayName || event.createdBy.username}</span>
            </p>

            {/* Timestamp */}
            <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">{formatTimestamp(event.timestamp)}</p>

            {/* Text (gekuerzt) */}
            {event.text && <p className="mt-1 line-clamp-2 text-gray-600 text-sm dark:text-gray-300">{event.text}</p>}

            {/* Metadata Details */}
            {metadataDetails && (
              <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                <span className="font-medium">{event.eventType === 'ErinnerungSnoozed' ? 'Dauer:' : event.eventType === 'ErinnerungErledigt' ? 'Notiz:' : ''}</span>
                {metadataDetails}
              </p>
            )}
          </div>

          {/* Link zum ETB-Eintrag */}
          {onEntryClick && (
            <button
              type="button"
              onClick={handleClick}
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Zum ETB-Eintrag springen"
              aria-label={`Zum ETB-Eintrag #${event.sequenceNumber} springen`}
            >
              <PiListMagnifyingGlass className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErinnerungTimelineWidgetProps {
  /**
   * ETB-ID fuer die Timeline-Abfrage
   */
  etbId: string;

  /**
   * Erinnerungs-ID fuer die Timeline-Abfrage
   */
  erinnerungId: string;

  /**
   * Callback wenn auf einen ETB-Eintrag geklickt wird
   * Wird mit der Entry-ID aufgerufen
   */
  onEntryClick?: (entryId: string) => void;

  /**
   * Zusaetzliche CSS-Klassen
   */
  className?: string;
}

/**
 * Erinnerung Timeline Widget
 *
 * **Story 5.5:** Zeigt die chronologische Historie aller Events
 * einer Erinnerung in einer vertikalen Timeline an.
 *
 * **Features:**
 * - Vertikale Timeline mit Icons pro Event-Typ
 * - Farbcodierung nach Event-Typ
 * - Zeitstempel im deutschen Format
 * - User-Anzeige (displayName oder username)
 * - Spezielle Anzeige fuer Snoozed (Dauer) und Erledigt (Notiz)
 * - Klick-Handler fuer Navigation zum ETB-Eintrag
 * - Loading/Error/Empty States
 *
 * @param props - Widget-Props
 *
 * @example
 * ```tsx
 * <ErinnerungTimelineWidget
 *   etbId="etb-123"
 *   erinnerungId="erin-456"
 *   onEntryClick={(entryId) => scrollToEntry(entryId)}
 * />
 * ```
 */
export function ErinnerungTimelineWidget({ etbId, erinnerungId, onEntryClick, className }: ErinnerungTimelineWidgetProps) {
  const { data: timeline, isLoading, error } = useErinnerungTimeline({ etbId, erinnerungId });

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-4 font-medium text-gray-900 text-sm dark:text-gray-100">Erinnerungsverlauf</h4>
        <div className="flex items-center justify-center py-8">
          <PiCircleNotch className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-4 font-medium text-gray-900 text-sm dark:text-gray-100">Erinnerungsverlauf</h4>
        <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Timeline konnte nicht geladen werden.</p>
      </div>
    );
  }

  // Empty State
  if (!timeline || timeline.events.length === 0) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-4 font-medium text-gray-900 text-sm dark:text-gray-100">Erinnerungsverlauf</h4>
        <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Keine Timeline-Events vorhanden.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
      {/* Header mit Titel */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-medium text-gray-900 text-sm dark:text-gray-100">Erinnerungsverlauf</h4>
        <span className="text-gray-500 text-xs dark:text-gray-400">
          {timeline.totalCount} {timeline.totalCount === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      {/* Erinnerung Titel */}
      <p className="mb-4 truncate font-medium text-gray-700 text-xs dark:text-gray-300" title={timeline.titel}>
        {timeline.titel}
      </p>

      {/* Timeline */}
      <div className="relative">
        {timeline.events.map((event, index) => (
          <TimelineEventItem key={event.id} event={event} isLast={index === timeline.events.length - 1} onEntryClick={onEntryClick} />
        ))}
      </div>
    </div>
  );
}
