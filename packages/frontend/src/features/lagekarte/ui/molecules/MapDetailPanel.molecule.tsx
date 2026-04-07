/**
 * MapDetailPanel - Generisches Side-Panel für Layer-Detail-Ansichten
 *
 * Nutzt Dialog.SlideIn als Wrapper und rendert den Provider-spezifischen
 * Panel-Content. Wird geöffnet wenn der User "Details anzeigen" im Popup klickt.
 */

import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { getDetailProvider } from '../../detail-providers/registry';
import type { LayerFeatureInfo } from '../../detail-providers/types';

interface MapDetailPanelProps {
  /** Feature-Informationen für den Panel-Inhalt */
  info: LayerFeatureInfo | null;
  /** Ist das Panel geöffnet? */
  isOpen: boolean;
  /** Callback wenn das Panel geschlossen wird */
  onClose: () => void;
}

export function MapDetailPanel({ info, isOpen, onClose }: MapDetailPanelProps) {
  const provider = info ? getDetailProvider(info.providerId) : null;

  if (!info || !provider) return null;

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title={info.title} size="md">
      {provider.renderPanel(info)}
    </Dialog.SlideIn>
  );
}
