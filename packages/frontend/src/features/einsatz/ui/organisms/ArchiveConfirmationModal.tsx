import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

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
            <p className="font-medium text-text-primary">Sind Sie sicher, dass Sie diesen Einsatz archivieren möchten?</p>
            <p className="mt-2 text-text-secondary">
              <span className="font-semibold">{einsatzName}</span>
            </p>
          </div>
          <div className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3">
            <p className="font-medium text-body-sm text-status-warning-text">⚠️ Wichtiger Hinweis</p>
            <p className="mt-1 text-body-sm text-status-warning-text">
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
