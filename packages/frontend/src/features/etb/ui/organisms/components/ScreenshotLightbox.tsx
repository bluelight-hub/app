import { Button } from '@/shared/ui/atoms/button.atom';
import { validateScreenshotUrl } from '@/features/etb/utils';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useCallback, useMemo } from 'react';
import { PiDownload, PiX } from 'react-icons/pi';

interface ScreenshotLightboxProps {
  /**
   * Ob die Lightbox geöffnet ist
   */
  isOpen: boolean;
  /**
   * Callback wenn Lightbox geschlossen wird
   */
  onClose: () => void;
  /**
   * Screenshot-URL
   */
  screenshotUrl: string;
  /**
   * Screenshot-Titel (optional)
   */
  title?: string;
}

/**
 * Lightbox-Modal für Screenshot-Vorschau
 *
 * **Features:**
 * - Vollbild-Anzeige des Screenshots
 * - Download-Button
 * - Keyboard-Navigation (ESC zum Schließen)
 * - Accessible (ARIA-Labels)
 *
 * **Security:**
 * - URL wird vor Rendering validiert (Whitelist: nur /uploads/lagekarte/*)
 * - Verhindert XSS via javascript:, data: URIs
 *
 * @param isOpen - Ob Lightbox geöffnet ist
 * @param onClose - Callback zum Schließen
 * @param screenshotUrl - Screenshot-URL
 * @param title - Optionaler Titel
 */
export function ScreenshotLightbox({ isOpen, onClose, screenshotUrl, title = 'Lagekarten-Screenshot' }: ScreenshotLightboxProps) {
  /**
   * Validate URL (XSS-Prevention via Whitelist)
   */
  const validatedUrl = useMemo(() => {
    try {
      return validateScreenshotUrl(screenshotUrl);
    } catch (error) {
      console.error('Invalid screenshot URL:', error);
      return null;
    }
  }, [screenshotUrl]);

  /**
   * Download-Handler
   */
  const handleDownload = useCallback(() => {
    if (!validatedUrl) {
      console.error('Cannot download: Invalid screenshot URL');
      return;
    }
    const link = document.createElement('a');
    link.href = validatedUrl;
    link.download = validatedUrl.split('/').pop() || 'screenshot.png';
    link.click();
  }, [validatedUrl]);

  // Wenn URL ungültig ist, zeige nichts an
  if (!validatedUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative flex max-h-[90vh] max-w-[95vw] flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
            <DialogTitle className="font-semibold text-gray-900 text-lg dark:text-white">{title}</DialogTitle>
            <div className="flex gap-2">
              <Button type="button" onClick={handleDownload} intent="secondary" appearance="outline" size="sm" className="gap-2" aria-label="Screenshot herunterladen">
                <PiDownload size={18} aria-hidden="true" />
                <span className="hidden md:inline">Download</span>
              </Button>
              <Button type="button" onClick={onClose} intent="secondary" appearance="ghost" size="sm" aria-label="Lightbox schließen">
                <PiX size={20} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Screenshot Image */}
          <div className="flex-1 overflow-auto p-4">
            <img src={validatedUrl} alt={title} className="mx-auto h-auto max-w-full rounded-lg shadow-lg" loading="lazy" />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
