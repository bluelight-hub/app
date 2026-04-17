/**
 * useAkutConfirm (Issue #627, G4)
 *
 * Zentraler Hook für die AKUT-Hochstufe: wrappt Warnstufen-Änderungen so,
 * dass die Mutation nur nach Bestätigung durch `AkutBroadcastDialog` feuert.
 * Einzige Modal-Stelle im gesamten #627-Feature.
 *
 * Nutzung:
 * ```tsx
 * const { requestChange, dialog } = useAkutConfirm({
 *   onCommit: ({ gefahrentyp, schutzobjekt, warnstufe }) => updateMutation.mutate({...}),
 * });
 * // vor jedem Mutation-Aufruf:
 * requestChange({ previous, next, gefahrentyp, schutzobjekt });
 * // ... und `{dialog}` irgendwo im Render-Tree einbauen.
 * ```
 */

import { useCallback, useMemo, useState } from 'react';
import type { GefahrentypValue, SchutzobjektValue, WarnstufeValue } from '../schemas/gefahrenmatrix.schema';
import { AkutBroadcastDialog } from '@/features/gefahrenzone/ui/organisms/AkutBroadcastDialog';

export interface AkutConfirmRequest {
  gefahrentyp: GefahrentypValue;
  schutzobjekt: SchutzobjektValue;
  previous: WarnstufeValue;
  next: WarnstufeValue;
}

export interface UseAkutConfirmOptions {
  /**
   * Wird aufgerufen, wenn die Warnstufen-Aenderung freigegeben ist —
   * entweder weil `next !== 'AKUT'` oder weil der Dialog bestätigt wurde.
   */
  onCommit: (payload: { gefahrentyp: GefahrentypValue; schutzobjekt: SchutzobjektValue; warnstufe: WarnstufeValue }) => void;
  /** Optional: wird aufgerufen, wenn der Dialog abgebrochen wird. */
  onCancel?: (payload: AkutConfirmRequest) => void;
}

export interface UseAkutConfirmReturn {
  /** Startet einen Aenderungs-Flow; öffnet Dialog nur beim Hochstufen auf AKUT. */
  requestChange: (request: AkutConfirmRequest) => void;
  /** Render-Knoten — muss vom Caller in den JSX-Tree gehängt werden. */
  dialog: React.ReactNode;
  /** Ob gerade ein Dialog offen ist (für Test-/Debug-Zwecke). */
  isOpen: boolean;
}

/**
 * Entscheidet, ob eine Warnstufen-Aenderung confirm-pflichtig ist.
 * Regel: Hochstufen von niedriger Stufe auf AKUT erfordert Bestätigung.
 * Wechsel AKUT → etwas anderes oder AKUT → AKUT (No-Op) nicht.
 */
function requiresConfirmation(previous: WarnstufeValue, next: WarnstufeValue): boolean {
  return next === 'AKUT' && previous !== 'AKUT';
}

export function useAkutConfirm({ onCommit, onCancel }: UseAkutConfirmOptions): UseAkutConfirmReturn {
  const [pending, setPending] = useState<AkutConfirmRequest | null>(null);

  const requestChange = useCallback(
    (request: AkutConfirmRequest) => {
      if (requiresConfirmation(request.previous, request.next)) {
        setPending(request);
        return;
      }
      onCommit({ gefahrentyp: request.gefahrentyp, schutzobjekt: request.schutzobjekt, warnstufe: request.next });
    },
    [onCommit],
  );

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    onCommit({ gefahrentyp: pending.gefahrentyp, schutzobjekt: pending.schutzobjekt, warnstufe: pending.next });
    setPending(null);
  }, [pending, onCommit]);

  const handleCancel = useCallback(() => {
    if (!pending) return;
    onCancel?.(pending);
    setPending(null);
  }, [pending, onCancel]);

  const dialog = useMemo(
    () => <AkutBroadcastDialog isOpen={pending !== null} gefahrentyp={pending?.gefahrentyp ?? null} schutzobjekt={pending?.schutzobjekt ?? null} onConfirm={handleConfirm} onCancel={handleCancel} />,
    [pending, handleConfirm, handleCancel],
  );

  return { requestChange, dialog, isOpen: pending !== null };
}
