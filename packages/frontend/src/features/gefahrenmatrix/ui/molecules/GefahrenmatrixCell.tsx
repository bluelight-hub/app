import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { cn } from '@/shared/ui/cn';
import { WARNSTUFEN, WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';
import { OrphanWarningIndicator } from '../atoms/OrphanWarningIndicator';
import { ZoneCountBadge } from '../atoms/ZoneCountBadge';

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
  readonly?: boolean;
  fullscreen?: boolean;
  /** Anzahl der Gefahrenzonen für diese Matrix-Zelle (Issue #627, G3). */
  zoneCount?: number;
  /** Badge-Klick-Handler (Navigate zur Lagekarte mit Fokus). */
  onZoneBadgeClick?: () => void;
  /**
   * Deep-Link-Ziel: wenn `true`, wird die Zelle gescrollt und gepulst.
   * Wird vom Matrix-Grid aus dem `focus=cell:*`-Search-Param gesetzt.
   */
  isFocusTarget?: boolean;
  /**
   * Wird zusätzlich zu `onChange` beim Klick auf die Zelle aufgerufen
   * (Issue #627, G4, Split-View-Focus-Roundtrip). Triggert der Split-Mode
   * ein `setFocus({ kind: 'cell', ... })`, ohne die Listbox zu blockieren.
   */
  onCellActivate?: () => void;
}

/**
 * Einzelne Zelle der Gefahrenmatrix mit Warnstufen-Dropdown.
 * Im Readonly-Modus wird nur der Text ohne Dropdown angezeigt.
 *
 * G3: Zeigt in der oberen rechten Ecke einen `ZoneCountBadge` (wenn
 * `zoneCount > 0`) oder einen `OrphanWarningIndicator` (wenn
 * `warnstufe !== 'KEINE'` und `zoneCount === 0`). Badge gewinnt, wenn
 * beide Bedingungen zuträfen.
 */
export function GefahrenmatrixCell({ warnstufe, onChange, readonly = false, fullscreen = false, zoneCount = 0, onZoneBadgeClick, isFocusTarget = false, onCellActivate }: GefahrenmatrixCellProps) {
  const showBadge = zoneCount > 0;
  const showOrphan = !showBadge && warnstufe !== 'KEINE';
  const focusRingClass = isFocusTarget ? 'animate-gefahrenmatrix-cell-pulse' : undefined;

  const indicators =
    showBadge || showOrphan ? (
      <span className="pointer-events-auto absolute top-0.5 right-0.5 inline-flex">
        {showBadge ? <ZoneCountBadge count={zoneCount} onClick={() => onZoneBadgeClick?.()} /> : <OrphanWarningIndicator warnstufe={warnstufe} />}
      </span>
    ) : null;

  const focusAttrs = isFocusTarget ? { 'data-focus-target': true } : {};

  if (readonly) {
    return (
      <td className={cn('relative border border-border-subtle p-0 text-center', CELL_BG[warnstufe], focusRingClass)} data-matrix-cell {...focusAttrs}>
        <span className={cn('flex items-center justify-center', fullscreen ? 'px-3 py-3 text-sm font-medium' : 'px-2 py-1.5 text-xs')}>
          {warnstufe === 'KEINE' ? '–' : WARNSTUFE_LABELS[warnstufe]}
        </span>
        {indicators}
      </td>
    );
  }

  return (
    <td
      className={cn('relative border border-border-subtle p-0 text-center', CELL_BG[warnstufe], focusRingClass)}
      data-matrix-cell
      {...focusAttrs}
      onMouseDownCapture={onCellActivate ? () => onCellActivate() : undefined}
    >
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
      {indicators}
    </td>
  );
}
