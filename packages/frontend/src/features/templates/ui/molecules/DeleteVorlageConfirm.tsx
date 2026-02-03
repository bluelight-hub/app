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
        <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
          <PiWarning className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <Dialog.Title>Vorlage löschen</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-3">
          <p className="text-gray-700 text-sm dark:text-gray-300">
            Soll die Vorlage <span className="font-semibold">"{vorlage?.titel}"</span> wirklich gelöscht werden?
          </p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Bereits erstellte Erinnerungen bleiben unverändert.</p>

          {apiErrorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage}</div>}
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
