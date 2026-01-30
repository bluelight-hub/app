import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { PiPencil, PiTrash, PiCheck, PiX, PiBell } from 'react-icons/pi';
import type React from 'react';

interface EtbActionsCellProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  /** Callback zum Erstellen einer Erinnerung aus diesem ETB-Eintrag (Story 5.4) */
  onCreateErinnerung?: () => void;
  isLoading?: boolean;
  isDeleted?: boolean;
}

export const EtbActionsCell: React.FC<EtbActionsCellProps> = ({ isEditing, onEdit, onSave, onCancel, onDelete, onCreateErinnerung, isLoading = false, isDeleted = false }) => {
  if (isEditing) {
    return (
      <div className="flex justify-center gap-1">
        <IconButton size="sm" appearance="minimal" intent="success" onClick={onSave} disabled={isLoading} aria-label="Speichern">
          <PiCheck />
        </IconButton>
        <IconButton size="sm" appearance="minimal" intent="danger" onClick={onCancel} disabled={isLoading} aria-label="Abbrechen">
          <PiX />
        </IconButton>
      </div>
    );
  }

  // Für gelöschte Einträge keine Actions anzeigen
  if (isDeleted) {
    return (
      <div className="flex justify-center gap-1">
        <span className="text-gray-400 text-xs italic">Gelöscht</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-1">
      <IconButton appearance="minimal" size="sm" onClick={onEdit} className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400" aria-label="Bearbeiten">
        <PiPencil />
      </IconButton>
      {onCreateErinnerung && (
        <IconButton
          size="sm"
          appearance="minimal"
          onClick={onCreateErinnerung}
          className="text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400"
          aria-label="Erinnerung erstellen"
        >
          <PiBell />
        </IconButton>
      )}
      {onDelete && (
        <IconButton size="sm" appearance="minimal" intent="danger" onClick={onDelete} aria-label="Löschen">
          <PiTrash />
        </IconButton>
      )}
    </div>
  );
};
