import { PiTrash } from 'react-icons/pi';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';

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
      <Checkbox
        id="etb-filter-show-deleted"
        checked={showDeleted}
        onChange={onShowDeletedChange}
        labelClassName="flex items-center gap-1.5 text-sm text-text-secondary"
        label={
          <>
            <PiTrash className="h-4 w-4" />
            Gelöschte Einträge anzeigen
          </>
        }
      />
    </div>
  );
}
