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
        'text-action-primary hover:bg-action-secondary hover:text-action-primary',
        'focus:outline-none focus-visible:shadow-focus-ring',
        className,
      )}
      title={etbEntryText ? `ETB #${sequenceNumber ?? '?'}: ${etbEntryText}` : `Zum ETB-Eintrag #${sequenceNumber ?? '?'}`}
    >
      {/* Sequenznummer */}
      {sequenceNumber !== undefined && <span className="font-medium">#{sequenceNumber}</span>}

      {/* Text-Preview */}
      {displayText && <span className="truncate text-text-secondary">{displayText}</span>}

      {/* Link-Icon */}
      <PiArrowSquareOut className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}
