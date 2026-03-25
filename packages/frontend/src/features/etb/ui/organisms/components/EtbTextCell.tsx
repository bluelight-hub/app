import { useCallback, useState } from 'react';
import type { EintragDto } from '@/shared';
import { ScreenshotLightbox } from './ScreenshotLightbox';
import { safeValidateScreenshotUrl } from '@/features/etb/utils';
import { cn } from '@/shared/ui/cn';
import { PiBell, PiLink } from 'react-icons/pi';
import { setHighlightedErinnerung } from '@/features/reminders/stores';
import { Link } from '@tanstack/react-router';

interface EtbTextCellProps {
  /**
   * ETB-Eintrag
   */
  entry: EintragDto;
  /**
   * Zeigt an, ob der Eintrag gelöscht wurde (für line-through Styling)
   */
  isDeleted?: boolean;
  /**
   * Einsatz-ID fuer Navigation zu Befehl-Details
   */
  einsatzId?: string;
}

/**
 * Text-Zelle für ETB-Einträge mit Screenshot-Support
 *
 * **Features:**
 * - Zeigt ETB-Eintrag-Text an
 * - Falls metadata.screenshot.url existiert: Zeigt Thumbnail an
 * - Klick auf Thumbnail öffnet Lightbox
 * - Story 5.4 Task 6: Badge für verknüpfte Erinnerung
 *
 * **Security:**
 * - Screenshot-URL wird validiert (Whitelist: nur /uploads/lagekarte/*)
 * - Verhindert XSS via javascript:, data: URIs
 *
 * @param entry - ETB-Eintrag
 */
export function EtbTextCell({ entry, isDeleted, einsatzId }: EtbTextCellProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Check if screenshot exists in metadata
  const screenshotUrl =
    entry.metadata && typeof entry.metadata === 'object' && 'screenshot' in entry.metadata && entry.metadata.screenshot && typeof entry.metadata.screenshot === 'object'
      ? (() => {
          const { url } = entry.metadata.screenshot as { url?: unknown };
          return typeof url === 'string' ? url : null;
        })()
      : null;

  // Validate URL (XSS prevention via Whitelist) - returns null if invalid
  const validatedUrl = safeValidateScreenshotUrl(screenshotUrl);

  // Story 5.4 Task 6: Verknuepfte Erinnerung als Badge anzeigen
  const linkedErinnerung = entry.linkedErinnerung as { id: string; titel: string } | null | undefined;

  // Story 4.3: Befehl-Verlinkung - pruefen ob der Eintrag mit einem Befehl verknuepft ist
  const linkedBefehlId =
    entry.metadata && typeof entry.metadata === 'object' && 'befehlId' in entry.metadata && 'eventType' in entry.metadata
      ? (() => {
          const m = entry.metadata as { eventType?: unknown; befehlId?: unknown };
          return typeof m.eventType === 'string' && m.eventType.startsWith('Befehl') && typeof m.befehlId === 'string' ? m.befehlId : null;
        })()
      : null;

  /**
   * Story 5.4 Task 6.2: Klick auf Badge scrollt zur Erinnerung
   * Setzt die highlightedErinnerungId im Store, worauf ErinnerungCard reagiert
   */
  const handleErinnerungBadgeClick = useCallback(() => {
    if (linkedErinnerung?.id) {
      setHighlightedErinnerung(linkedErinnerung.id);
    }
  }, [linkedErinnerung?.id]);

  return (
    <div className="space-y-2">
      {/* ETB-Eintrag Text */}
      <p className={cn('text-sm leading-relaxed break-words whitespace-pre-wrap text-text-primary', isDeleted && 'text-text-muted line-through')}>{entry.text}</p>

      {/* Story 5.4 Task 6.1: Erinnerung-Badge wenn linkedErinnerung vorhanden */}
      {linkedErinnerung && (
        <button
          type="button"
          onClick={handleErinnerungBadgeClick}
          title={`Verknüpfte Erinnerung: ${linkedErinnerung.titel}`}
          className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-status-warning-surface px-2.5 py-1 text-xs font-medium text-status-warning-text transition-colors hover:bg-status-warning-surface/80 focus:outline-none focus-visible:shadow-focus-ring"
        >
          <PiBell className="h-3.5 w-3.5" aria-hidden="true" />
          Erinnerung
        </button>
      )}

      {/* Story 4.3: Befehl-Link wenn metadata.befehlId vorhanden */}
      {linkedBefehlId && einsatzId && (
        <Link
          to="/app/einsatz/$einsatzId/befehl/$befehlId"
          params={{ einsatzId, befehlId: linkedBefehlId }}
          title={`Befehl ${linkedBefehlId} anzeigen`}
          aria-label={`Befehl ${linkedBefehlId} anzeigen`}
          className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-action-secondary px-2.5 py-1 text-xs font-medium text-action-primary transition-colors hover:bg-action-secondary-hover focus:outline-none focus-visible:shadow-focus-ring"
        >
          <PiLink className="h-3.5 w-3.5" aria-hidden="true" />
          Befehl anzeigen
        </Link>
      )}

      {/* Screenshot Thumbnail */}
      {validatedUrl && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative overflow-hidden rounded-lg shadow transition-shadow hover:shadow-lg"
            aria-label="Lagekarten-Screenshot anzeigen"
          >
            <img src={validatedUrl} alt="Lagekarten-Screenshot" className="h-auto max-w-[200px] cursor-pointer rounded-lg transition-transform group-hover:scale-[1.02]" loading="lazy" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs text-white opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <span className="font-semibold">Vergrößern</span>
            </div>
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {validatedUrl && <ScreenshotLightbox isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} screenshotUrl={validatedUrl} title="Lagekarten-Screenshot" />}
    </div>
  );
}
