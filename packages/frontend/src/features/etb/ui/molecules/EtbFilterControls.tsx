import { PiTrash } from 'react-icons/pi';

interface EtbFilterControlsProps {
  showDeleted: boolean;
  onShowDeletedChange: (show: boolean) => void;
}

/**
 * ETB Filter-Controls (z.B. gelöschte Einträge anzeigen)
 */
export function EtbFilterControls({ showDeleted, onShowDeletedChange }: EtbFilterControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => onShowDeletedChange(e.target.checked)}
          className="h-4 w-4 rounded border-border-subtle bg-surface-panel text-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
        />
        <span className="flex items-center gap-1.5 text-text-secondary text-sm">
          <PiTrash className="h-4 w-4" />
          Gelöschte Einträge anzeigen
        </span>
      </label>
    </div>
  );
}
