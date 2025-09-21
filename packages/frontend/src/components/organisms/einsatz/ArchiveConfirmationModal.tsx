import { Dialog } from '@/components/molecules/dialog.molecule';
import { PiArchive } from 'react-icons/pi';

interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  einsatzName: string;
  isArchiving: boolean;
}

/**
 * Modal-Komponente zur Bestätigung der Archivierung eines Einsatzes mit zweistufiger Sicherheitsabfrage.
 * Nutzt die erweiterte Dialog.Confirm-Komponente mit requireConfirmation-Feature.
 */
export const ArchiveConfirmationModal = ({ isOpen, onClose, onConfirm, einsatzName, isArchiving }: ArchiveConfirmationModalProps) => {
  return (
    <Dialog.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Einsatz archivieren"
      message={
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Sind Sie sicher, dass Sie diesen Einsatz archivieren möchten?</p>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">{einsatzName}</span>
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="font-medium text-amber-800 text-sm dark:text-amber-200">⚠️ Wichtiger Hinweis</p>
            <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
              Archivierte Einsätze können nicht wiederhergestellt werden. Diese Aktion ist permanent und kann nicht rückgängig gemacht werden.
            </p>
          </div>
        </div>
      }
      confirmLabel="Archivieren"
      cancelLabel="Abbrechen"
      variant="warning"
      isProcessing={isArchiving}
      requireConfirmation={true}
      size="xl"
    />
  );
};
