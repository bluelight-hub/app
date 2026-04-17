import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useMemo, useState } from 'react';
import { PiCaretUpDown, PiCheck } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { GEFAHRENTYPEN, GEFAHRENTYP_LABELS, type GefahrentypValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export interface GefahrentypPickerProps {
  value: GefahrentypValue | null;
  onChange: (value: GefahrentypValue) => void;
  disabled?: boolean;
  'aria-label'?: string;
  /** Optional: zusätzliche Klassen für das Wrapper-Element. */
  className?: string;
}

/**
 * Combobox-Wrapper für die 13 Gefahrentypen. Liest Labels aus dem
 * `gefahrenmatrix.schema`, damit keine Stammdaten dupliziert werden.
 */
export function GefahrentypPicker({ value, onChange, disabled, className, 'aria-label': ariaLabel }: GefahrentypPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return GEFAHRENTYPEN;
    }
    const q = query.toLowerCase();
    return GEFAHRENTYPEN.filter((typ) => GEFAHRENTYP_LABELS[typ].toLowerCase().includes(q));
  }, [query]);

  return (
    <Combobox value={value} onChange={(v) => v && onChange(v)} disabled={disabled}>
      <div className={cn('relative', className)}>
        <div className="relative w-full">
          <ComboboxInput
            className={cn(
              'w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 pr-9 text-body-sm text-text-primary',
              'focus:shadow-focus focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            displayValue={(v: GefahrentypValue | null) => (v ? GEFAHRENTYP_LABELS[v] : '')}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={ariaLabel ?? 'Gefahrentyp wählen'}
            placeholder="Gefahrentyp wählen…"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2" aria-label="Liste öffnen">
            <PiCaretUpDown className="size-4 text-text-muted" aria-hidden />
          </ComboboxButton>
        </div>
        <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-panel border border-border-subtle bg-surface-panel py-1 text-body-sm shadow-panel focus:outline-none">
          {filtered.length === 0 ? (
            <div className="px-3 py-1.5 text-text-muted">Kein Treffer</div>
          ) : (
            filtered.map((typ) => (
              <ComboboxOption
                key={typ}
                value={typ}
                className={({ focus }) => cn('flex cursor-pointer items-center gap-2 px-3 py-1.5', focus ? 'bg-surface-raised text-text-primary' : 'text-text-secondary')}
              >
                {({ selected }) => (
                  <>
                    <span className={cn('flex-1', selected && 'font-medium text-text-primary')}>{GEFAHRENTYP_LABELS[typ]}</span>
                    {selected ? <PiCheck className="size-4 text-action-primary" aria-hidden /> : null}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
