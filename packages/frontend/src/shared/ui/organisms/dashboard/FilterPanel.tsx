import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzDtoStatusEnum } from '@/shared';
import { PiArchive } from 'react-icons/pi';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

interface FilterPanelProps {
  statusFilter: EinsatzDtoStatusEnum | undefined;
  sortOption: SortOption;
  showArchived: boolean;
  onStatusFilterChange: (status: EinsatzDtoStatusEnum | undefined) => void;
  onSortChange: (key: EinsatzControllerFindAllVAlphaOrderByEnum) => void;
  onArchiveToggle: () => void;
  className?: string;
}

export const FilterPanel = ({ statusFilter, sortOption, showArchived, onStatusFilterChange, onSortChange, onArchiveToggle, className }: FilterPanelProps) => {
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

  return (
    <div className={cn('w-64 flex-shrink-0 overflow-y-auto border-border-subtle border-r bg-surface-panel p-4', className)}>
      <h3 className="mb-4 font-medium text-lg text-text-primary">Filter & Sortierung</h3>

      <div className="space-y-4">
        {!showArchived && (
          <div>
            <label htmlFor="status-filter" className="mb-2 block font-medium text-sm text-text-secondary">
              Status filtern
            </label>
            <Select
              id="status-filter"
              value={statusFilter || ''}
              onChange={(e) => onStatusFilterChange((e.target.value as EinsatzDtoStatusEnum) || undefined)}
              selectSize="sm"
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

        <div className="border-border-subtle border-t pt-4">
          <Button intent={!showArchived ? 'secondary' : 'primary'} appearance={!showArchived ? 'outline' : 'ghost'} size="sm" onClick={onArchiveToggle} className="w-full">
            <PiArchive className="mr-2 h-4 w-4" />
            {showArchived ? 'Aktive Einsätze' : 'Archiv anzeigen'}
          </Button>
          {showArchived && <p className="mt-2 text-text-secondary text-xs">Zeigt nur archivierte Einsätze</p>}
        </div>

        <div>
          <span className="mb-2 block font-medium text-sm text-text-secondary">Sortieren nach</span>
          <div className="space-y-2">
            {sortOptions.map(({ key, label }) => (
              <Button
                key={key}
                appearance="ghost"
                onClick={() => onSortChange(key)}
                className={cn('w-full rounded-md px-3 py-2 text-left text-sm', sortOption.key === key ? 'bg-action-secondary text-action-primary' : 'hover:bg-action-secondary')}
              >
                {label} {sortOption.key === key && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
