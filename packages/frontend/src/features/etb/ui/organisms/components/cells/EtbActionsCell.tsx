import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { PiBell, PiPencil, PiTrash } from 'react-icons/pi';
import type React from 'react';

interface EtbActionsCellProps {
  /** Callback zum Bearbeiten des Eintrags */
  onEdit?: () => void;
  /** Callback zum Loeschen des Eintrags */
  onDelete?: () => void;
  /** Callback zum Erstellen einer Erinnerung aus diesem ETB-Eintrag (Story 5.4) */
  onCreateErinnerung?: () => void;
  isLoading?: boolean;
  isDeleted?: boolean;
}

export const EtbActionsCell: React.FC<EtbActionsCellProps> = ({ onEdit, onDelete, onCreateErinnerung, isLoading = false, isDeleted = false }) => {
  // Für gelöschte Einträge keine Actions anzeigen
  if (isDeleted) {
    return (
      <div className="flex justify-center gap-1">
        <span className="text-xs text-text-muted italic">Gelöscht</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-1">
      {onEdit && (
        <IconButton appearance="minimal" size="sm" onClick={onEdit} disabled={isLoading} className="text-text-muted hover:text-action-primary" aria-label="Bearbeiten" title="Bearbeiten">
          <PiPencil />
        </IconButton>
      )}
      {onDelete && (
        <IconButton appearance="minimal" size="sm" onClick={onDelete} disabled={isLoading} className="text-text-muted hover:text-status-danger-text" aria-label="Loeschen" title="Loeschen">
          <PiTrash />
        </IconButton>
      )}
      {onCreateErinnerung && (
        <IconButton size="sm" appearance="minimal" onClick={onCreateErinnerung} className="text-text-secondary hover:text-status-warning-text" aria-label="Erinnerung erstellen">
          <PiBell />
        </IconButton>
      )}
    </div>
  );
};
