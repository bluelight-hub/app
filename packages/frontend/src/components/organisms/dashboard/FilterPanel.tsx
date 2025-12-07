import { cn } from '@/shared/utils/cn';
import { Button } from '@atoms/button.atom';
import { Select } from '@atoms/select.atom';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { PiArchive } from 'react-icons/pi';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

interface FilterPanelProps {
  statusFilter: EinsatzResponseDtoStatusEnum | undefined;
  sortOption: SortOption;
  showArchived: boolean;
  onStatusFilterChange: (status: EinsatzResponseDtoStatusEnum | undefined) => void;
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
    <div className={cn('w-64 flex-shrink-0 overflow-y-auto border-gray-200 border-r bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
      <h3 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Filter & Sortierung</h3>

      <div className="space-y-4">
        {!showArchived && (
          <div>
            <label htmlFor="status-filter" className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Status filtern
            </label>
            <Select
              id="status-filter"
              value={statusFilter || ''}
              onChange={(e) => onStatusFilterChange((e.target.value as EinsatzResponseDtoStatusEnum) || undefined)}
              selectSize="sm"
              fullWidth
              options={[
                { value: '', label: 'Alle Status' },
                { value: EinsatzResponseDtoStatusEnum.Angelegt, label: 'Angelegt' },
                { value: EinsatzResponseDtoStatusEnum.InBearbeitung, label: 'In Bearbeitung' },
                { value: EinsatzResponseDtoStatusEnum.Abgeschlossen, label: 'Abgeschlossen' },
              ]}
            />
          </div>
        )}

        <div className="border-gray-200 border-t pt-4 dark:border-gray-700">
          <Button intent={!showArchived ? 'secondary' : 'primary'} appearance={!showArchived ? 'outline' : 'ghost'} size="sm" onClick={onArchiveToggle} className="w-full">
            <PiArchive className="mr-2 h-4 w-4" />
            {showArchived ? 'Aktive Einsätze' : 'Archiv anzeigen'}
          </Button>
          {showArchived && <p className="mt-2 text-gray-600 text-xs dark:text-gray-400">Zeigt nur archivierte Einsätze</p>}
        </div>

        <div>
          <span className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">Sortieren nach</span>
          <div className="space-y-2">
            {sortOptions.map(({ key, label }) => (
              <Button
                key={key}
                appearance="ghost"
                onClick={() => onSortChange(key)}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm',
                  sortOption.key === key ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
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
