import { Dialog } from '@/components/molecules/dialog.molecule';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';

interface ConfirmDeleteDialogExampleProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userRole: UserDtoRoleEnum;
  isDeleting: boolean;
}

/**
 * Beispiel für die Migration von ConfirmDeleteDialog zu Dialog.Confirm
 *
 * Diese vereinfachte Version zeigt, wie die neue Dialog.Confirm Variante
 * genutzt werden kann, um Boilerplate-Code zu reduzieren
 */
export const ConfirmDeleteDialogExample = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userRole,
  isDeleting
}: ConfirmDeleteDialogExampleProps) => {
  return (
    <Dialog.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Benutzer löschen"
      message={
        <div className="space-y-2">
          <p>Möchten Sie den folgenden Benutzer wirklich löschen?</p>
          <div className="font-semibold">{userName}</div>
          <div className="text-sm text-gray-500">Rolle: {userRole}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
      }
      variant="danger"
      confirmLabel="Löschen"
      cancelLabel="Abbrechen"
      isProcessing={isDeleting}
    />
  );
};