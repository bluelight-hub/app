/**
 * MapDetailPopup - Generischer Popup-Wrapper für Layer-Details auf der Karte
 *
 * Nutzt react-map-gl's native Popup-Komponente, die sich automatisch
 * mit der Karte bewegt. Rendert den Provider-spezifischen Popup-Content
 * und einen "Details anzeigen"-Link.
 */

import { cn } from '@/shared/ui/cn';
import { PiArrowRight, PiX } from 'react-icons/pi';
import { Popup } from 'react-map-gl/maplibre';
import { getDetailProvider } from '../../detail-providers/registry';
import type { LayerFeatureInfo } from '../../detail-providers/types';

interface MapDetailPopupProps {
  /** Feature-Informationen für den Popup-Inhalt */
  info: LayerFeatureInfo;
  /** Callback wenn "Details anzeigen" geklickt wird */
  onShowDetails: () => void;
  /** Callback wenn der Popup geschlossen wird */
  onClose: () => void;
}

export function MapDetailPopup({ info, onShowDetails, onClose }: MapDetailPopupProps) {
  const provider = getDetailProvider(info.providerId);
  if (!provider) return null;

  return (
    <Popup longitude={info.coordinate.lng} latitude={info.coordinate.lat} anchor="bottom" closeButton={false} closeOnClick={false} className="lagekarte-detail-popup" maxWidth="320px" offset={12}>
      <div className="relative min-w-48">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={cn('absolute top-1 right-1 z-10 rounded p-0.5', 'text-text-muted hover:bg-surface-raised hover:text-text-secondary', 'focus-visible:shadow-focus-ring focus-visible:outline-none')}
          aria-label="Popup schließen"
        >
          <PiX className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Provider-spezifischer Content */}
        <div className="pr-5">{provider.renderPopup(info)}</div>

        {/* Details-Link */}
        <button
          type="button"
          onClick={onShowDetails}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-border-subtle px-3 py-1.5',
            'text-xs font-medium text-action-primary',
            'transition-colors hover:bg-action-secondary',
            'focus-visible:shadow-focus-ring focus-visible:outline-none',
          )}
        >
          Details anzeigen
          <PiArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </Popup>
  );
}
