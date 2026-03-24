import type { StammPersonDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Text } from '@/shared/ui/atoms/text.atom';
import { PiWarning } from 'react-icons/pi';
interface ArchiveStammPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  person: StammPersonDto | null;
  isArchiving: boolean;
} /** * Bestätigungs-Dialog zum Archivieren einer Stamm-Person. */
export const ArchiveStammPersonDialog = ({ isOpen, onClose, onConfirm, person, isArchiving }: ArchiveStammPersonDialogProps) => {
  const handleClose = () => {
    if (!isArchiving) {
      onClose();
    }
  };
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {' '}
      <Dialog.Title>Person archivieren</Dialog.Title>{' '}
      <Dialog.Body>
        {' '}
        <div className="flex items-start gap-4">
          {' '}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-warning-surface text-status-warning-text">
            {' '}
            <PiWarning className="h-5 w-5" />{' '}
          </div>{' '}
          <div>
            {' '}
            <Text className="mb-2">
              {' '}
              Möchten Sie die Person{' '}
              <strong>
                {' '}
                {person?.vorname} {person?.nachname}{' '}
              </strong>{' '}
              ({person?.personalnummer}) wirklich archivieren?{' '}
            </Text>{' '}
            <Text size="sm" color="muted">
              {' '}
              Archivierte Personen werden in der Standard-Ansicht ausgeblendet. Die Person kann später wiederhergestellt werden.{' '}
            </Text>{' '}
          </div>{' '}
        </div>{' '}
      </Dialog.Body>{' '}
      <Dialog.Footer>
        {' '}
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isArchiving}>
          {' '}
          Abbrechen{' '}
        </Button>{' '}
        <Button intent="danger" onClick={onConfirm} loading={isArchiving} disabled={isArchiving}>
          {' '}
          Person archivieren{' '}
        </Button>{' '}
      </Dialog.Footer>{' '}
    </Dialog>
  );
};
