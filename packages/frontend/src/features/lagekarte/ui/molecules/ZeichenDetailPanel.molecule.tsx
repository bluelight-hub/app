/**
 * ZeichenDetailPanel - Nicht-modales Slide-In Panel für taktische Zeichen
 *
 * Wrapper um ZeichenDetailContent: Lädt Zeichen aus dem Query-Cache,
 * stellt Mutations (Update, Remove) bereit.
 * Nutzt absolute Positionierung statt Dialog.SlideIn, damit die Karte
 * weiterhin bedienbar bleibt.
 */

import { useCallback } from 'react';
import { PiX } from 'react-icons/pi';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { useUpdateZeichen, useRemoveZeichen } from '@/features/taktische-zeichen';
import { cn } from '@/shared/ui/cn';
import { ZeichenDetailContent } from './ZeichenDetailContent';

interface ZeichenDetailPanelProps {
  /** Das anzuzeigende Zeichen (undefined = Panel geschlossen) */
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

  const title = zeichen?.label || zeichen?.zeichenDefinition.grundzeichen || 'Zeichen';

  return (
    <div
      className={cn(
        'absolute top-0 right-0 z-20 flex h-full w-80 flex-col border-l border-border-subtle bg-surface-panel shadow-xl transition-transform duration-300 ease-out',
        isOpen && zeichen ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-hidden={!isOpen || !zeichen}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-text-primary">{title}</h2>
        <button
          type="button"
          aria-label="Detail-Panel schließen"
          onClick={onClose}
          className="rounded p-1 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
        >
          <PiX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollbarer Inhalt */}
      <div className="flex-1 overflow-y-auto p-3">
        {zeichen && <ZeichenDetailContent zeichen={zeichen} onUpdateLabel={handleUpdateLabel} onUpdateNotiz={handleUpdateNotiz} onRemove={handleRemove} isRemoving={isRemoving} />}
      </div>
    </div>
  );
}
