/**
 * MapDetailPopup - Generischer Popup-Wrapper für Layer-Details auf der Karte
 *
 * Zeigt alle Treffer aller aktiven Provider gestapelt an.
 * Jede Provider-Sektion hat einen eigenen "Details anzeigen"-Link,
 * der das Detail-Panel mit dem jeweiligen Treffer öffnet.
 */

import { cn } from '@/shared/ui/cn';
import { PiArrowRight, PiX } from 'react-icons/pi';
import { Popup } from 'react-map-gl/maplibre';
import { getDetailProvider } from '../../detail-providers/registry';
import type { LayerFeatureInfo } from '../../detail-providers/types';

interface MapDetailPopupProps {
  /** Alle Feature-Treffer am Klick-Punkt */
  results: LayerFeatureInfo[];
  /** Klick-Koordinaten für Popup-Positionierung */
  coordinate: { lng: number; lat: number };
  /** Callback wenn "Details anzeigen" geklickt wird (mit Index des Treffers) */
  onShowDetails: (index: number) => void;
  /** Callback wenn der Popup geschlossen wird */
  onClose: () => void;
}

export function MapDetailPopup({ results, coordinate, onShowDetails, onClose }: MapDetailPopupProps) {
  if (results.length === 0) return null;

  return (
    <Popup longitude={coordinate.lng} latitude={coordinate.lat} anchor="bottom" closeButton={false} closeOnClick={false} className="lagekarte-detail-popup" maxWidth="360px" offset={12}>
      <div className="relative min-w-56">
        {/* Schließen-Button */}
        <button
          type="button"
          onClick={onClose}
          className={cn('absolute top-1 right-1 z-10 rounded p-0.5', 'text-text-muted hover:bg-surface-raised hover:text-text-secondary', 'focus-visible:shadow-focus-ring focus-visible:outline-none')}
          aria-label="Popup schließen"
        >
          <PiX className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Provider-Sektionen, getrennt durch Divider */}
        <div className="divide-y divide-border-subtle pr-5">
          {results.map((info, index) => {
            const provider = getDetailProvider(info.providerId);
            if (!provider) return null;

            return (
              <div key={info.providerId} className="py-2 first:pt-0 last:pb-0">
                {/* Provider-spezifischer Content */}
                {provider.renderPopup(info)}

                {/* Details-Link für diesen Treffer */}
                <button
                  type="button"
                  onClick={() => onShowDetails(index)}
                  className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium text-action-primary', 'hover:underline focus-visible:shadow-focus-ring focus-visible:outline-none')}
                  aria-label={`Details für ${info.title} anzeigen`}
                >
                  Details anzeigen
                  <PiArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Treffer-Zähler bei mehreren Providern */}
        {results.length > 1 && <p className="mt-1.5 text-center text-[11px] text-text-muted">{results.length} Layer mit Treffern</p>}
      </div>
    </Popup>
  );
}
