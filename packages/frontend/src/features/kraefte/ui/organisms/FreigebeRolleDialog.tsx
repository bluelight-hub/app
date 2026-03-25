/**
 * FreigebeRolleDialog fuer die Bestaetigung der Rollen-Freigabe.
 *
 * **Story 6.1c - Rollen-Freigabe (AC3b):**
 * Zeigt Bestaetigungs-Dialog mit Rollenname + Person.
 * Hinweis auf ETB-Dokumentation wird angezeigt.
 */

import { useCallback, useState } from 'react';

import type { RollenBesetzungListItemDto } from '@/shared';
import { PiWarning } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useFreigebeRolle } from '../../api';

interface FreigebeRolleDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Einsatz ID */
  einsatzId: string;
  /** Die freizugebende Rollenbesetzung */
  besetzung: RollenBesetzungListItemDto | null;
}

/**
 * Extrahiert Error Code aus API-Fehler und liefert benutzerfreundliche Nachricht.
 *
 * Mappt bekannte Error Codes auf deutsche Fehlermeldungen:
 * - BEREITS_FREIGEGEBEN -> "Rolle wurde bereits freigegeben"
 * - ROLLEN_BESETZUNG_NOT_FOUND -> "Rollenbesetzung nicht gefunden"
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('bereits_freigegeben') || message.includes('already')) {
      return 'Rolle wurde bereits freigegeben';
    }
    if (message.includes('not_found') || message.includes('nicht gefunden')) {
      return 'Rollenbesetzung nicht gefunden';
    }
  }
  return 'Fehler beim Freigeben der Rolle';
}

/**
 * Dialog zur Bestaetigung der Rollen-Freigabe.
 *
 * Zeigt den Rollennamen und die aktuell zugewiesene Person an.
 * Nach Bestaetigung wird die Mutation ausgefuehrt und der Dialog geschlossen.
 * Bei Fehlern wird eine entsprechende Meldung angezeigt.
 */
export function FreigebeRolleDialog({ isOpen, onClose, einsatzId, besetzung }: FreigebeRolleDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: freigebeRolle, isPending } = useFreigebeRolle(einsatzId);

  const handleFreigeben = useCallback(() => {
    if (!besetzung) return;

    setErrorMessage(null);
    freigebeRolle(besetzung.id, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        setErrorMessage(getErrorMessage(error));
      },
    });
  }, [besetzung, freigebeRolle, onClose]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setErrorMessage(null);
      onClose();
    }
  }, [isPending, onClose]);

  if (!besetzung) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      {/* Header mit Icon */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-danger-surface p-2">
          <PiWarning className="h-5 w-5 text-status-danger-text" />
        </div>
        <Dialog.Title>Rolle freigeben</Dialog.Title>
      </div>

      <Dialog.Body>
        {/* Bestaetigungs-Text */}
        <p className="text-sm text-text-secondary">
          Moechten Sie die Rolle <strong>{besetzung.rollenName}</strong> von <strong>{besetzung.personName}</strong> wirklich freigeben?
        </p>
        <p className="mt-2 text-xs text-text-muted">Die Freigabe wird im ETB dokumentiert.</p>

        {/* Error Message */}
        {errorMessage && <div className="mt-4 rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{errorMessage}</div>}
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={handleFreigeben} loading={isPending} disabled={isPending}>
          Freigeben
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
