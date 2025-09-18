import { Button } from '@/components/atoms/button.atom';
import { CloseButton } from '@/components/atoms/close-button.atom';
import { Dialog } from '@/components/molecules/dialog.molecule';
import { useState } from 'react';
import { PiArchive, PiWarning } from 'react-icons/pi';

interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  einsatzName: string;
  isArchiving: boolean;
}

/**
 * Modal-Komponente zur Bestätigung der Archivierung eines Einsatzes mit zweistufiger Sicherheitsabfrage.
 * Verwendet ein Checkbox-System zur Bestätigung, dass die Aktion verstanden wurde.
 */
export const ArchiveConfirmationModal = ({ isOpen, onClose, onConfirm, einsatzName, isArchiving }: ArchiveConfirmationModalProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setIsConfirmed(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="relative">
        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiArchive className="h-5 w-5" />
            <span>Einsatz archivieren</span>
          </div>
        </Dialog.Title>

        <Dialog.Body>
          <div className="flex flex-col space-y-4">
            <div className="flex items-start space-x-3">
              <PiWarning className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-500" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">Sind Sie sicher, dass Sie diesen Einsatz archivieren möchten?</p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{einsatzName}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="font-medium text-amber-800 text-sm dark:text-amber-200">⚠️ Wichtiger Hinweis</p>
              <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
                Archivierte Einsätze können nicht wiederhergestellt werden. Diese Aktion ist permanent und kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <div className="border-t pt-4 dark:border-gray-700">
              <label className="flex cursor-pointer items-start space-x-3">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  disabled={isArchiving}
                />
                <span className="select-none text-gray-700 text-sm dark:text-gray-300">
                  Ich verstehe, dass diese Aktion nicht rückgängig gemacht werden kann und der Einsatz permanent archiviert wird.
                </span>
              </label>
            </div>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <CloseButton onClick={handleClose} disabled={isArchiving} label="Abbrechen" />
          <Button intent="danger" onClick={handleConfirm} loading={isArchiving} disabled={!isConfirmed || isArchiving}>
            <PiArchive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
        </Dialog.Footer>
      </div>
    </Dialog>
  );
};
