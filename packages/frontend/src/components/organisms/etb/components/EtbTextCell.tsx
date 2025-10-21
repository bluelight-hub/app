import { useState } from 'react';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { ScreenshotLightbox } from './ScreenshotLightbox';

interface EtbTextCellProps {
  /**
   * ETB-Eintrag
   */
  entry: EtbEintragDto;
}

/**
 * Text-Zelle für ETB-Einträge mit Screenshot-Support
 *
 * **Features:**
 * - Zeigt ETB-Eintrag-Text an
 * - Falls metadata.screenshot.url existiert: Zeigt Thumbnail an
 * - Klick auf Thumbnail öffnet Lightbox
 *
 * **Security:**
 * - Screenshot-URL wird sanitized (encodeURI)
 *
 * @param entry - ETB-Eintrag
 */
export function EtbTextCell({ entry }: EtbTextCellProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Check if screenshot exists in metadata
  const hasScreenshot = entry.metadata && typeof entry.metadata === 'object' && 'screenshot' in entry.metadata;
  const screenshotUrl = hasScreenshot ? (entry.metadata as any).screenshot?.url : null;

  // Sanitize URL (XSS prevention)
  const sanitizedUrl = screenshotUrl ? encodeURI(screenshotUrl) : null;

  return (
    <div className="space-y-2">
      {/* ETB-Eintrag Text */}
      <p className="whitespace-pre-wrap break-words text-gray-900 text-sm leading-relaxed dark:text-gray-100">{entry.text}</p>

      {/* Screenshot Thumbnail */}
      {sanitizedUrl && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative overflow-hidden rounded-lg shadow transition-shadow hover:shadow-lg"
            aria-label="Lagekarten-Screenshot anzeigen"
          >
            <img src={sanitizedUrl} alt="Lagekarten-Screenshot" className="h-auto max-w-[200px] cursor-pointer rounded-lg transition-transform group-hover:scale-[1.02]" loading="lazy" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white text-xs opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <span className="font-semibold">Vergrößern</span>
            </div>
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {sanitizedUrl && <ScreenshotLightbox isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} screenshotUrl={screenshotUrl} title="Lagekarten-Screenshot" />}
    </div>
  );
}
