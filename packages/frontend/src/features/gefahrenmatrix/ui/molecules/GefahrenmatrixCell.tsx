import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { cn } from '@/shared/ui/cn';
import { WARNSTUFEN, WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';

const CELL_BG: Record<WarnstufeValue, string> = {
  KEINE: 'hover:bg-surface-raised/50',
  NIEDRIG: 'bg-green-100 dark:bg-green-950/50',
  MITTEL: 'bg-yellow-100 dark:bg-yellow-950/50',
  HOCH: 'bg-orange-100 dark:bg-orange-950/50',
  AKUT: 'bg-red-200 dark:bg-red-950/60',
};

interface GefahrenmatrixCellProps {
  warnstufe: WarnstufeValue;
  onChange: (warnstufe: WarnstufeValue) => void;
}

/**
 * Einzelne Zelle der Gefahrenmatrix mit Warnstufen-Dropdown.
 */
export function GefahrenmatrixCell({ warnstufe, onChange }: GefahrenmatrixCellProps) {
  return (
    <td className={cn('border border-border-subtle p-0 text-center', CELL_BG[warnstufe])}>
      <Listbox value={warnstufe} onChange={onChange}>
        <ListboxButton
          className="flex h-full w-full cursor-pointer items-center justify-center px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          title={`Warnstufe: ${WARNSTUFE_LABELS[warnstufe]} – Klicken zum Ändern`}
        >
          {warnstufe === 'KEINE' ? '–' : WARNSTUFE_LABELS[warnstufe]}
        </ListboxButton>
        <ListboxOptions anchor="bottom" className="z-50 w-32 rounded-panel border border-border-subtle bg-surface-panel shadow-lg">
          {WARNSTUFEN.map((stufe) => (
            <ListboxOption key={stufe} value={stufe} className={cn('cursor-pointer px-3 py-1.5 text-sm text-text-primary', 'data-[focus]:bg-surface-raised', stufe === warnstufe && 'font-semibold')}>
              {WARNSTUFE_LABELS[stufe]}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </td>
  );
}
