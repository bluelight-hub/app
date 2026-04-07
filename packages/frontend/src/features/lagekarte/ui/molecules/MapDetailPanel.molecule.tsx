/**
 * MapDetailPanel - Generisches Side-Panel für Layer-Detail-Ansichten
 *
 * Zeigt Details eines Treffers mit Vor/Zurück-Navigation zwischen
 * mehreren Treffern am selben Klick-Punkt.
 */

import { cn } from '@/shared/ui/cn';
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { getDetailProvider } from '../../detail-providers/registry';
import type { LayerFeatureInfo } from '../../detail-providers/types';

interface MapDetailPanelProps {
  /** Alle Feature-Treffer am Klick-Punkt */
  results: LayerFeatureInfo[];
  /** Index des aktuell angezeigten Treffers */
  panelIndex: number;
  /** Ist das Panel geöffnet? */
  isOpen: boolean;
  /** Callback wenn das Panel geschlossen wird */
  onClose: () => void;
  /** Callback zum Navigieren zu einem anderen Treffer */
  onNavigate: (index: number) => void;
}

export function MapDetailPanel({ results, panelIndex, isOpen, onClose, onNavigate }: MapDetailPanelProps) {
  const info = results[panelIndex] ?? null;
  const provider = info ? getDetailProvider(info.providerId) : null;
  const total = results.length;

  if (!info || !provider) return null;

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title={info.title} size="md">
      {/* Navigation zwischen Treffern */}
      {total > 1 && (
        <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
          <button
            type="button"
            onClick={() => onNavigate(panelIndex - 1)}
            disabled={panelIndex === 0}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-sm text-action-primary',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none',
            )}
            aria-label="Vorheriger Treffer"
          >
            <PiCaretLeft className="h-4 w-4" aria-hidden="true" />
            Zurück
          </button>

          <span className="text-sm font-medium text-text-secondary" aria-live="polite">
            {panelIndex + 1} von {total}
          </span>

          <button
            type="button"
            onClick={() => onNavigate(panelIndex + 1)}
            disabled={panelIndex === total - 1}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-sm text-action-primary',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none',
            )}
            aria-label="Nächster Treffer"
          >
            Weiter
            <PiCaretRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {provider.renderPanel(info)}
    </Dialog.SlideIn>
  );
}
