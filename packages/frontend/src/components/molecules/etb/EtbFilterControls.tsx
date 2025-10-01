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
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
        />
        <span className="flex items-center gap-1.5 text-gray-700 text-sm dark:text-gray-300">
          <PiTrash className="h-4 w-4" />
          Gelöschte Einträge anzeigen
        </span>
      </label>
    </div>
  );
}
