import { FiAlertTriangle } from 'react-icons/fi';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import { Dialog } from '@/components/molecules/dialog.molecule';
import { Button } from '@/components/atoms/button.atom';
import { Badge } from '@/components/atoms/badge.atom';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userRole: string;
  isDeleting: boolean;
}

const getRoleBadgeVariant = (role: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (role) {
    case UserDtoRoleEnum.SuperAdmin:
      return 'error';
    case UserDtoRoleEnum.Admin:
      return 'warning';
    case UserDtoRoleEnum.User:
      return 'info';
    default:
      return 'default';
  }
};

export const ConfirmDeleteDialog = ({ isOpen, onClose, onConfirm, userName, userRole, isDeleting }: ConfirmDeleteDialogProps) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="relative">
        <Dialog.CloseButton onClose={onClose} />

        <Dialog.Title>Benutzer löschen</Dialog.Title>

        <Dialog.Body>
          <div className="flex flex-col items-center space-y-4 text-center">
            <FiAlertTriangle className="h-12 w-12 text-orange-500" />

            <p className="text-gray-700 dark:text-gray-300">Möchten Sie den Benutzer wirklich löschen?</p>

            <div className="flex flex-col items-center space-y-2">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{userName}</p>
              <Badge variant={getRoleBadgeVariant(userRole)}>{userRole}</Badge>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting} disabled={isDeleting}>
            Löschen
          </Button>
        </Dialog.Footer>
      </div>
    </Dialog>
  );
};
