/**
 * AkutBroadcastDialog (Issue #627, G4)
 *
 * Bestätigungs-Dialog beim Hochstufen auf `AKUT`. Einzige Modal-Stelle im
 * gesamten #627-Feature. Nutzt Headless-UI-`Dialog` (Focus-Trap, Portal,
 * Esc-Handling kommen frei mit).
 *
 * Der Dialog selbst feuert keine Mutation — er liefert nur `confirm` /
 * `cancel` an den Caller (`useAkutConfirm`). Damit bleibt die Datenfluss-
 * Logik klar und der Dialog testbar.
 */

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { GEFAHRENTYP_LABELS, SCHUTZOBJEKT_LABELS, type GefahrentypValue, type SchutzobjektValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export interface AkutBroadcastDialogProps {
  isOpen: boolean;
  gefahrentyp: GefahrentypValue | null;
  schutzobjekt: SchutzobjektValue | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AkutBroadcastDialog({ isOpen, gefahrentyp, schutzobjekt, onConfirm, onCancel }: AkutBroadcastDialogProps) {
  const typLabel = gefahrentyp ? GEFAHRENTYP_LABELS[gefahrentyp] : '—';
  const objLabel = schutzobjekt ? SCHUTZOBJEKT_LABELS[schutzobjekt] : '—';

  return (
    <Dialog open={isOpen} onClose={onCancel} className="relative z-50" data-akut-dialog>
      <DialogBackdrop className="fixed inset-0 bg-black/40" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-panel border border-status-danger-border bg-surface-panel p-panel shadow-panel">
          <DialogTitle className="text-title-sm font-semibold text-status-danger-text">AKUT-Warnstufe senden?</DialogTitle>
          <p className="mt-3 text-body-sm text-text-primary">
            Du bist dabei, einen AKUT-Broadcast für <strong>{typLabel}</strong> – <strong>{objLabel}</strong> an alle Einsatzteilnehmer zu senden. Das löst bei allen Empfängern Toast + Sound aus.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-control px-3 py-1.5 text-body-sm text-text-secondary hover:bg-surface-raised focus:shadow-focus focus:outline-none"
              data-akut-cancel
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-control bg-warnstufe-akut-fill px-3 py-1.5 text-body-sm font-semibold text-text-inverse hover:opacity-90 focus:shadow-focus focus:outline-none"
              autoFocus
              data-akut-confirm
            >
              AKUT senden
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
