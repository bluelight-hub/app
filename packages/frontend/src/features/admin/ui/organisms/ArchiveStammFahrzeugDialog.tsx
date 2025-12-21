import type { StammFahrzeugDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';
import { PiWarning } from 'react-icons/pi';

interface ArchiveStammFahrzeugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fahrzeug: StammFahrzeugDto | null;
  isArchiving: boolean;
}

/**
 * Bestätigungs-Dialog zum Archivieren eines Stamm-Fahrzeugs.
 */
export const ArchiveStammFahrzeugDialog = ({ isOpen, onClose, onConfirm, fahrzeug, isArchiving }: ArchiveStammFahrzeugDialogProps) => {
  const handleClose = () => {
    if (!isArchiving) {
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Fahrzeug archivieren</Dialog.Title>

      <Dialog.Body>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <PiWarning className="h-5 w-5" />
          </div>
          <div>
            <Text className="mb-2">
              Möchten Sie das Fahrzeug <strong>{fahrzeug?.rufname}</strong> ({fahrzeug?.funkrufname}) wirklich archivieren?
            </Text>
            <Text size="sm" color="muted">
              Archivierte Fahrzeuge werden in der Standard-Ansicht ausgeblendet. Diese Aktion kann nicht rückgängig gemacht werden.
            </Text>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isArchiving}>
          Abbrechen
        </Button>
        <Button intent="danger" onClick={onConfirm} loading={isArchiving} disabled={isArchiving}>
          Fahrzeug archivieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
