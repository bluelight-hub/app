import { Button } from '@atoms/button.atom';
import { Select } from '@atoms/select.atom';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Dialog, DialogPanel } from '@headlessui/react';
import { PiArchive, PiX } from 'react-icons/pi';
import { cn } from '@/utils/cn';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

interface MobileFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: EinsatzResponseDtoStatusEnum | undefined;
  sortOption: SortOption;
  showArchived: boolean;
  onStatusFilterChange: (status: EinsatzResponseDtoStatusEnum | undefined) => void;
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
    onStatusFilterChange((value as EinsatzResponseDtoStatusEnum) || undefined);
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
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 sm:hidden">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-end">
        <DialogPanel className="max-h-[80vh] w-full rounded-t-2xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
            <Dialog.Title className="font-medium text-gray-900 text-lg dark:text-white">Filter & Sortierung</Dialog.Title>
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
              <PiX className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
            <div className="border-gray-200 border-b pb-4 dark:border-gray-700">
              <Button
                variant={!showArchived ? 'secondary' : 'ghost'}
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
              {showArchived && <p className="mt-2 text-gray-600 text-xs dark:text-gray-400">Zeigt nur archivierte Einsätze</p>}
            </div>

            {!showArchived && (
              <div>
                <label htmlFor="status-filter-mobile" className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Status filtern
                </label>
                <Select
                  id="status-filter-mobile"
                  value={statusFilter || ''}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  selectSize="md"
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

            <div>
              <span className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">Sortieren nach</span>
              <div className="space-y-2">
                {sortOptions.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    onClick={() => handleSortChange(key)}
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

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Filter zurücksetzen
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
