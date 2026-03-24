import { Label } from '@/shared/ui/atoms/label.atom';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiCaretDown, PiCheck } from 'react-icons/pi';
export type InviteStatusFilter = 'all' | 'active' | 'used' | 'expired' | 'revoked';
interface InviteFiltersProps {
  /** Aktuell ausgewählter Filter */ selectedStatus: InviteStatusFilter /** Callback wenn Filter geändert wird */;
  onChange: (status: InviteStatusFilter) => void;
}
const STATUS_FILTER_OPTIONS: Array<{ value: InviteStatusFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'used', label: 'Verwendet' },
  { value: 'expired', label: 'Abgelaufen' },
  { value: 'revoked', label: 'Widerrufen' },
]; /** * Filter-Dropdown für Invite-Code Status. * * Verwendet Headless UI Listbox für barrierefreie Auswahl. * Ermöglicht Filterung der Invite-Code-Liste nach Status. * * @example * ```tsx * const [status, setStatus] = useState<InviteStatusFilter>('all'); * <InviteFilters selectedStatus={status} onChange={setStatus} /> * ``` */
export function InviteFilters({ selectedStatus, onChange }: InviteFiltersProps) {
  const selectedOption = STATUS_FILTER_OPTIONS.find((opt) => opt.value === selectedStatus) ?? STATUS_FILTER_OPTIONS[0];
  return (
    <div className="flex items-center gap-2">
      {' '}
      <Label htmlFor="status-filter" className="text-text-secondary text-sm">
        {' '}
        Status:{' '}
      </Label>{' '}
      <Listbox as="div" value={selectedStatus} onChange={onChange}>
        {' '}
        <div className="relative">
          {' '}
          <ListboxButton
            id="status-filter"
            className="relative w-40 cursor-pointer rounded-control border border-border-subtle bg-surface-panel py-2 pr-10 pl-3 text-left text-sm text-text-primary focus:outline-none focus-visible:shadow-focus-ring"
          >
            {' '}
            <span className="block truncate">{selectedOption.label}</span>{' '}
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              {' '}
              <PiCaretDown className="h-5 w-5 text-text-muted" aria-hidden="true" />{' '}
            </span>{' '}
          </ListboxButton>{' '}
          <ListboxOptions
            transition
            className="absolute z-10 mt-1 max-h-60 w-40 overflow-auto rounded-control border border-border-subtle bg-surface-panel py-1 shadow-lg transition duration-100 ease-in focus:outline-none data-[closed]:opacity-0"
          >
            {' '}
            {STATUS_FILTER_OPTIONS.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className={({ focus }) => `relative cursor-pointer select-none py-2 pr-4 pl-10 text-sm ${focus ? 'bg-action-secondary text-text-primary' : 'text-text-primary'}`}
              >
                {' '}
                {({ selected }) => (
                  <>
                    {' '}
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option.label}</span>{' '}
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-action-primary">
                        {' '}
                        <PiCheck className="h-5 w-5" aria-hidden="true" />{' '}
                      </span>
                    ) : null}{' '}
                  </>
                )}{' '}
              </ListboxOption>
            ))}{' '}
          </ListboxOptions>{' '}
        </div>{' '}
      </Listbox>{' '}
    </div>
  );
}
