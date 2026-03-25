import { useCallback, useState } from 'react';
import { PiTrash, PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useDeleteVorlage } from '../../api';

interface DeleteVorlageConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: {
    id: string;
    titel: string;
  } | null;
}

/**
 * Bestätigungsdialog zum Löschen einer Vorlage (Story 6.2 AC2).
 */
export function DeleteVorlageConfirm({ isOpen, onClose, vorlage }: DeleteVorlageConfirmProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const { mutate: deleteVorlage, isPending } = useDeleteVorlage();

  const handleDelete = useCallback(() => {
    if (!vorlage) return;
    setApiErrorMessage(null);

    deleteVorlage(
      { id: vorlage.id },
      {
        onSuccess: () => {
          toast.success('Vorlage gelöscht');
          setTimeout(() => {
            onClose();
          }, 0);
        },
        onError: (error) => {
          setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Löschen der Vorlage');
        },
      },
    );
  }, [vorlage, deleteVorlage, onClose]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      onClose();
    }
  }, [isPending, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-danger-surface p-2">
          <PiWarning className="h-5 w-5 text-status-danger-text" />
        </div>
        <Dialog.Title>Vorlage löschen</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Soll die Vorlage <span className="font-semibold">"{vorlage?.titel}"</span> wirklich gelöscht werden?
          </p>
          <p className="text-xs text-text-muted">Bereits erstellte Erinnerungen bleiben unverändert.</p>

          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
        </div>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="danger" loading={isPending} disabled={isPending} onClick={handleDelete}>
          <PiTrash className="mr-1 h-4 w-4" />
          Löschen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
