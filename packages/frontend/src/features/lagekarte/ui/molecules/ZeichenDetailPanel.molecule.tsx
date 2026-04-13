/**
 * ZeichenDetailPanel - Slide-In Panel für taktische Zeichen
 *
 * Wrapper um ZeichenDetailContent: Lädt Zeichen aus dem Query-Cache,
 * stellt Mutations (Update, Remove) bereit, steuert Dialog.SlideIn.
 */

import { useCallback } from 'react';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { useUpdateZeichen, useRemoveZeichen } from '@/features/taktische-zeichen';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { ZeichenDetailContent } from './ZeichenDetailContent';

interface ZeichenDetailPanelProps {
  /** Das anzuzeigende Zeichen (null = Panel geschlossen) */
  zeichen: TaktischesZeichenResponseDto | undefined;
  /** Einsatz-ID für Mutations */
  einsatzId: string;
  /** Ist das Panel geöffnet? */
  isOpen: boolean;
  /** Callback zum Schließen */
  onClose: () => void;
}

export function ZeichenDetailPanel({ zeichen, einsatzId, isOpen, onClose }: ZeichenDetailPanelProps) {
  const { mutate: updateZeichen } = useUpdateZeichen(einsatzId);
  const { mutate: removeZeichen, isPending: isRemoving } = useRemoveZeichen(einsatzId);

  const handleUpdateLabel = useCallback(
    (label: string) => {
      if (!zeichen) return;
      updateZeichen({ zeichenId: zeichen.id, dto: { label: label || undefined } });
    },
    [zeichen, updateZeichen],
  );

  const handleUpdateNotiz = useCallback(
    (notiz: string) => {
      if (!zeichen) return;
      updateZeichen({ zeichenId: zeichen.id, dto: { notiz: notiz || undefined } });
    },
    [zeichen, updateZeichen],
  );

  const handleRemove = useCallback(() => {
    if (!zeichen) return;
    removeZeichen(zeichen.id, { onSuccess: onClose });
  }, [zeichen, removeZeichen, onClose]);

  if (!zeichen) return null;

  const title = zeichen.label || zeichen.zeichenDefinition.grundzeichen;

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title={title} size="md">
      <ZeichenDetailContent zeichen={zeichen} onUpdateLabel={handleUpdateLabel} onUpdateNotiz={handleUpdateNotiz} onRemove={handleRemove} isRemoving={isRemoving} />
    </Dialog.SlideIn>
  );
}
