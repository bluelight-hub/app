import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Select } from '@/shared/ui/atoms/select.atom';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzDtoStatusEnum } from '@/shared';
import { PiArchive } from 'react-icons/pi';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

interface MobileFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: EinsatzDtoStatusEnum | undefined;
  sortOption: SortOption;
  showArchived: boolean;
  onStatusFilterChange: (status: EinsatzDtoStatusEnum | undefined) => void;
  onSortChange: (key: EinsatzControllerFindAllVAlphaOrderByEnum) => void;
  onArchiveToggle: () => void;
  onReset: () => void;
}

export const MobileFilterDialog = ({ isOpen, onClose, statusFilter, sortOption, showArchived, onStatusFilterChange, onSortChange, onArchiveToggle, onReset }: MobileFilterDialogProps) => {
  const sortOptions = [
    {
      key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
      label: 'Erstellungsdatum',
    },
    {
      key: EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort,
      label: 'Alarmstichwort',
    },
    {
      key: EinsatzControllerFindAllVAlphaOrderByEnum.Status,
      label: 'Status',
    },
  ];

  const handleStatusChange = (value: string) => {
    // Convert empty string to undefined, otherwise use the string value as enum
    onStatusFilterChange(value === '' ? undefined : (value as EinsatzDtoStatusEnum));
    onClose();
  };

  const handleSortChange = (key: EinsatzControllerFindAllVAlphaOrderByEnum) => {
    onSortChange(key);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="full" className="!fixed !inset-x-0 !top-auto !bottom-0 !max-h-[80vh] !rounded-t-2xl !rounded-b-none sm:hidden">
      <Dialog.Title>Filter & Sortierung</Dialog.Title>

      <Dialog.Body className="max-h-[60vh] space-y-4 overflow-y-auto">
        <div className="border-b border-border-subtle pb-4">
          <Button
            intent={!showArchived ? 'secondary' : 'primary'}
            appearance={!showArchived ? 'outline' : 'ghost'}
            size="md"
            onClick={() => {
              onArchiveToggle();
              onClose();
            }}
            className="w-full"
          >
            <PiArchive className="mr-2 h-4 w-4" />
            {showArchived ? 'Aktive Einsätze' : 'Archiv anzeigen'}
          </Button>
          {showArchived && <p className="mt-2 text-xs text-text-secondary">Zeigt nur archivierte Einsätze</p>}
        </div>

        {!showArchived && (
          <div>
            <label htmlFor="status-filter-mobile" className="mb-2 block text-sm font-medium text-text-secondary">
              Status filtern
            </label>
            <Select
              id="status-filter-mobile"
              value={statusFilter ?? ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              selectSize="md"
              fullWidth
              options={[
                { value: '', label: 'Alle Status' },
                { value: EinsatzDtoStatusEnum.Angelegt, label: 'Angelegt' },
                { value: EinsatzDtoStatusEnum.InBearbeitung, label: 'In Bearbeitung' },
                { value: EinsatzDtoStatusEnum.Abgeschlossen, label: 'Abgeschlossen' },
              ]}
            />
          </div>
        )}

        <div>
          <span className="mb-2 block text-sm font-medium text-text-secondary">Sortieren nach</span>
          <div className="space-y-2">
            {sortOptions.map(({ key, label }) => (
              <Button
                key={key}
                appearance="ghost"
                onClick={() => handleSortChange(key)}
                className={cn('w-full rounded-md px-3 py-2 text-left text-sm', sortOption.key === key ? 'bg-action-secondary text-action-primary' : 'hover:bg-action-secondary')}
              >
                {label} {sortOption.key === key && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
              </Button>
            ))}
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" onClick={handleReset} className="w-full">
          Filter zurücksetzen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
