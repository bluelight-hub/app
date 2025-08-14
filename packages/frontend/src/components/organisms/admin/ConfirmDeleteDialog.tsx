import { Badge, Button, Dialog, Portal, Text, VStack } from '@chakra-ui/react';
import { FiAlertTriangle } from 'react-icons/fi';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userRole: string;
  isDeleting: boolean;
}

const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case UserDtoRoleEnum.SuperAdmin:
      return 'red';
    case UserDtoRoleEnum.Admin:
      return 'orange';
    case UserDtoRoleEnum.User:
      return 'blue';
    default:
      return 'gray';
  }
};

export const ConfirmDeleteDialog = ({ isOpen, onClose, onConfirm, userName, userRole, isDeleting }: ConfirmDeleteDialogProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Benutzer löschen</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <Dialog.Body>
              <VStack align="center">
                <FiAlertTriangle size={48} color="var(--colors-orange-500)" />

                <Text textAlign="center">Möchten Sie den Benutzer wirklich löschen?</Text>

                <VStack align="center">
                  <Text fontWeight="semibold" fontSize="lg">
                    {userName}
                  </Text>
                  <Badge colorPalette={getRoleBadgeColor(userRole)}>{userRole}</Badge>
                </VStack>

                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
                Abbrechen
              </Button>
              <Button colorPalette="red" onClick={onConfirm} loading={isDeleting} disabled={isDeleting}>
                Löschen
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
