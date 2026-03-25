/**
 * Notiz Delete Dialog (Story 7.4).
 *
 * AC2: Bestaetigungsdialog mit Warnung, Notiz-Details und Abbrechen/Loeschen Buttons.
 */

import type { NotizResponseDto } from '@bluelight-hub/shared/client';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useCallback } from 'react';
import { PiTrash, PiWarning } from 'react-icons/pi';

import { useDeleteNotiz } from '../../api';

interface DeleteNotizDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notiz: NotizResponseDto | null;
  einsatzId: string;
}

/**
 * Bestaetigungs-Dialog zum Loeschen einer Notiz (Soft-Delete).
 */
export function DeleteNotizDialog({ isOpen, onClose, notiz, einsatzId }: DeleteNotizDialogProps) {
  const { mutate: deleteNotiz, isPending } = useDeleteNotiz();

  const handleDelete = useCallback(() => {
    if (!notiz) return;

    deleteNotiz(
      {
        einsatzId,
        notizId: notiz.id,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }, [notiz, einsatzId, deleteNotiz, onClose]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      onClose();
    }
  }, [isPending, onClose]);

  if (!notiz) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-danger-surface p-2">
          <PiWarning className="h-5 w-5 text-status-danger-text" />
        </div>
        <Dialog.Title>Notiz '{notiz.titel}' löschen?</Dialog.Title>
      </div>

      <Dialog.Body>
        <div className="space-y-4">
          <div className="rounded-panel bg-status-warning-surface p-3">
            <p className="flex items-start gap-2 text-sm text-status-warning-text">
              <PiTrash className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Diese Aktion kann nicht rückgängig gemacht werden.</span>
            </p>
          </div>

          <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="w-24 flex-shrink-0 text-text-muted">Titel:</dt>
                <dd className="font-medium text-text-primary">{notiz.titel}</dd>
              </div>
              {notiz.kategorie && (
                <div className="flex">
                  <dt className="w-24 flex-shrink-0 text-text-muted">Kategorie:</dt>
                  <dd className="text-text-secondary">{notiz.kategorie}</dd>
                </div>
              )}
              <div className="flex">
                <dt className="w-24 flex-shrink-0 text-text-muted">Erstellt:</dt>
                <dd className="text-text-secondary">
                  {new Date(notiz.createdAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={handleDelete} loading={isPending}>
          <PiTrash className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Löschen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
