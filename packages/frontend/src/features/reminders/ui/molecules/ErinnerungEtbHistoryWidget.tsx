/**
 * Erinnerung ETB History Widget
 *
 * Zeigt die ETB-Historie einer Erinnerung (alle verknüpften ETB-Einträge).
 * Collapsible wenn mehr als 3 Einträge vorhanden.
 *
 * **Story 5.7:** Bidirektionale Verknüpfung - Erinnerung zu ETB Navigation
 */

import { cn } from '@/shared/ui/cn';
import type { EtbEntryPreviewDto } from '@/shared';
import { format, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useState } from 'react';
import { PiCaretDown, PiCaretUp, PiCircleNotch, PiListMagnifyingGlass } from 'react-icons/pi';
import { useErinnerungEtbHistory } from '../../api';
import { getEventConfig } from '../../constants';

/**
 * Formatiert den Zeitstempel im deutschen Format
 */
function formatTimestamp(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '–';

  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;

  if (!isValid(date)) return '–';

  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
}

/** Anzahl der Einträge die initial angezeigt werden */
const INITIAL_VISIBLE_COUNT = 3;

interface EtbHistoryEntryItemProps {
  entry: EtbEntryPreviewDto;
  onEntryClick: (entryId: string) => void;
}

/**
 * Einzelner ETB-History Eintrag
 */
function EtbHistoryEntryItem({ entry, onEntryClick }: EtbHistoryEntryItemProps) {
  const config = getEventConfig(entry.eventType);
  const Icon = config.icon;

  const handleClick = () => {
    onEntryClick(entry.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
      )}
    >
      {/* Icon */}
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
        <Icon className={cn('h-3.5 w-3.5', config.textColor)} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Sequenznummer */}
          <span className="font-medium text-gray-900 text-xs dark:text-gray-100">#{entry.sequenceNumber}</span>
          {/* Event Label */}
          <span className={cn('text-xs', config.textColor)}>{config.label}</span>
        </div>
        {/* Text (gekürzt) */}
        <p className="mt-0.5 line-clamp-1 text-gray-600 text-xs dark:text-gray-400">{entry.text}</p>
      </div>

      {/* Timestamp + Navigation Icon */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-gray-400 text-xs dark:text-gray-500">{formatTimestamp(entry.timestamp)}</span>
        <PiListMagnifyingGlass className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500" />
      </div>
    </button>
  );
}

export interface ErinnerungEtbHistoryWidgetProps {
  /**
   * Erinnerungs-ID für die ETB-History Abfrage
   */
  erinnerungId: string | null;

  /**
   * Einsatz-ID für den API-Aufruf
   */
  einsatzId: string;

  /**
   * Callback wenn auf einen ETB-Eintrag geklickt wird.
   * Wird mit der Entry-ID aufgerufen.
   */
  onEntryClick: (entryId: string) => void;

  /**
   * Zusätzliche CSS-Klassen
   */
  className?: string;
}

/**
 * Erinnerung ETB History Widget
 *
 * **Story 5.7:** Zeigt alle mit einer Erinnerung verknüpften ETB-Einträge
 * in einer kompakten Liste an. Collapsible wenn mehr als 3 Einträge.
 *
 * **Features:**
 * - Event-Icons und Farben analog zu Timeline
 * - Klick-Handler für Navigation zum ETB-Eintrag
 * - Collapsible wenn > 3 Einträge
 * - Loading/Error/Empty States
 *
 * @param props - Widget-Props
 *
 * @example
 * ```tsx
 * <ErinnerungEtbHistoryWidget
 *   erinnerungId="erin-123"
 *   einsatzId="abc-456"
 *   onEntryClick={(entryId) => highlightAndScrollToEntry(entryId)}
 * />
 * ```
 */
export function ErinnerungEtbHistoryWidget({ erinnerungId, einsatzId, onEntryClick, className }: ErinnerungEtbHistoryWidgetProps) {
  const { data: history, isLoading, error } = useErinnerungEtbHistory({ erinnerungId, einsatzId });
  const [isExpanded, setIsExpanded] = useState(false);

  // AC5: Keine Anzeige wenn keine erinnerungId
  if (!erinnerungId) {
    return null;
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-3 font-medium text-gray-900 text-sm dark:text-gray-100">ETB-Verknüpfungen</h4>
        <div className="flex items-center justify-center py-4">
          <PiCircleNotch className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-3 font-medium text-gray-900 text-sm dark:text-gray-100">ETB-Verknüpfungen</h4>
        <p className="py-2 text-center text-gray-500 text-xs dark:text-gray-400">Konnte nicht geladen werden.</p>
      </div>
    );
  }

  // Empty State
  if (!history || history.entries.length === 0) {
    return (
      <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
        <h4 className="mb-3 font-medium text-gray-900 text-sm dark:text-gray-100">ETB-Verknüpfungen</h4>
        <p className="py-2 text-center text-gray-500 text-xs dark:text-gray-400">Keine ETB-Einträge vorhanden.</p>
      </div>
    );
  }

  const entries = history.entries;
  const hasMoreThanInitial = entries.length > INITIAL_VISIBLE_COUNT;
  const visibleEntries = isExpanded ? entries : entries.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = entries.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className={cn('rounded-lg bg-white p-4 dark:bg-gray-950', className)}>
      {/* Header mit Titel und Count */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-medium text-gray-900 text-sm dark:text-gray-100">ETB-Verknüpfungen</h4>
        <span className="text-gray-500 text-xs dark:text-gray-400">
          {history.totalCount} {history.totalCount === 1 ? 'Eintrag' : 'Einträge'}
        </span>
      </div>

      {/* Entry List */}
      <div className="-mx-3 space-y-1">
        {visibleEntries.map((entry) => (
          <EtbHistoryEntryItem key={entry.id} entry={entry} onEntryClick={onEntryClick} />
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {hasMoreThanInitial && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs transition-colors',
            'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          )}
        >
          {isExpanded ? (
            <>
              <PiCaretUp className="h-4 w-4" />
              <span>Weniger anzeigen</span>
            </>
          ) : (
            <>
              <PiCaretDown className="h-4 w-4" />
              <span>{hiddenCount} weitere anzeigen</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
