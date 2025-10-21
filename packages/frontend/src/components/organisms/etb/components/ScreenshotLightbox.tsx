import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@/components/atoms/button.atom';
import { PiDownload, PiX } from 'react-icons/pi';
import { useCallback } from 'react';

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
 * - URL wird vor Rendering sanitized (encodeURI)
 *
 * @param isOpen - Ob Lightbox geöffnet ist
 * @param onClose - Callback zum Schließen
 * @param screenshotUrl - Screenshot-URL
 * @param title - Optionaler Titel
 */
export function ScreenshotLightbox({ isOpen, onClose, screenshotUrl, title = 'Lagekarten-Screenshot' }: ScreenshotLightboxProps) {
  /**
   * Sanitize URL (XSS-Prevention)
   */
  const sanitizedUrl = encodeURI(screenshotUrl);

  /**
   * Download-Handler
   */
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = sanitizedUrl;
    link.download = screenshotUrl.split('/').pop() || 'screenshot.png';
    link.click();
  }, [sanitizedUrl, screenshotUrl]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative flex max-h-[90vh] max-w-[95vw] flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">{title}</DialogTitle>
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
            <img src={sanitizedUrl} alt={title} className="mx-auto h-auto max-w-full rounded-lg shadow-lg" loading="lazy" />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
