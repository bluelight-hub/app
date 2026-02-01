/**
 * Erinnerung ETB Link
 *
 * Link-Komponente für Navigation von Erinnerung zu verknüpftem ETB-Eintrag.
 * Zeigt Sequenznummer und Text-Preview, ermöglicht Klick zur Navigation.
 *
 * **Story 5.7:** Bidirektionale Verknüpfung - Erinnerung zu ETB Navigation
 */

import { cn } from '@/shared/ui/cn';
import { PiArrowSquareOut } from 'react-icons/pi';

export interface ErinnerungEtbLinkProps {
  /**
   * ID des verknüpften ETB-Eintrags.
   * Wenn null, wird die Komponente nicht gerendert.
   */
  etbEntryId: string | null;
  /**
   * Optional: Text-Preview des ETB-Eintrags
   */
  etbEntryText?: string;
  /**
   * Optional: Sequenznummer des ETB-Eintrags
   */
  sequenceNumber?: number;
  /**
   * Callback wenn auf den Link geklickt wird.
   * Typischerweise navigiert dies zum ETB-Eintrag.
   */
  onClick: () => void;
  /**
   * Zusätzliche CSS-Klassen
   */
  className?: string;
}

/**
 * Link-Komponente für ETB-Eintrag Navigation
 *
 * Zeigt einen klickbaren Link zu einem verknüpften ETB-Eintrag.
 * Wird nur gerendert wenn etbEntryId vorhanden ist.
 *
 * @example
 * ```tsx
 * <ErinnerungEtbLink
 *   etbEntryId="entry-123"
 *   sequenceNumber={42}
 *   etbEntryText="Erinnerung erstellt"
 *   onClick={() => scrollToEntry('entry-123')}
 * />
 * ```
 */
export function ErinnerungEtbLink({ etbEntryId, etbEntryText, sequenceNumber, onClick, className }: ErinnerungEtbLinkProps) {
  // Nicht rendern wenn keine ETB-Eintrag-ID vorhanden
  if (!etbEntryId) {
    return null;
  }

  // Truncate Text wenn zu lang
  const displayText = etbEntryText ? (etbEntryText.length > 30 ? `${etbEntryText.slice(0, 30)}...` : etbEntryText) : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
        'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
        'dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        className,
      )}
      title={etbEntryText ? `ETB #${sequenceNumber ?? '?'}: ${etbEntryText}` : `Zum ETB-Eintrag #${sequenceNumber ?? '?'}`}
    >
      {/* Sequenznummer */}
      {sequenceNumber !== undefined && <span className="font-medium">#{sequenceNumber}</span>}

      {/* Text-Preview */}
      {displayText && <span className="truncate text-gray-600 dark:text-gray-400">{displayText}</span>}

      {/* Link-Icon */}
      <PiArrowSquareOut className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}
