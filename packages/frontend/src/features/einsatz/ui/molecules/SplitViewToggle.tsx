/**
 * SplitViewToggle (Issue #627, G4)
 *
 * Toggle-Button „Verknüpfte Ansicht" für beide Routen (Lagekarte + Matrix).
 * - Label sichtbar ab `lg` (Tailwind); darunter Icon + Tooltip via `title`.
 * - `<xl` (< 1280 px): disabled mit erklärendem Tooltip.
 * - Tastatur-Shortcut `cmd+shift+g` wird separat registriert (siehe
 *   `useSplitViewHotkey`).
 */

import { useStore } from '@tanstack/react-store';
import { PiColumns, PiSidebar } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { splitViewActions, splitViewStore } from '../../stores/split-view.store';
import { useSplitViewResponsive } from '../../hooks/use-split-view-responsive';

export interface SplitViewToggleProps {
  className?: string;
}

export function SplitViewToggle({ className }: SplitViewToggleProps) {
  const isActive = useStore(splitViewStore, (s) => s.isActive);
  const { isAllowed } = useSplitViewResponsive();

  const disabled = !isAllowed;
  const label = isActive ? 'Verknüpfte Ansicht ausschalten' : 'Verknüpfte Ansicht';
  const title = disabled
    ? 'Verknüpfte Ansicht benötigt mindestens 1280 px Breite'
    : isActive
      ? 'Verknüpfte Ansicht ausschalten (Cmd/Ctrl + Shift + G)'
      : 'Matrix und Karte nebeneinander anzeigen (Cmd/Ctrl + Shift + G)';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={label}
      aria-keyshortcuts="Meta+Shift+G Control+Shift+G"
      title={title}
      disabled={disabled}
      onClick={() => splitViewActions.toggle()}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-control border px-2 text-body-sm font-medium transition-colors focus:shadow-focus focus:outline-none',
        isActive ? 'border-action-primary bg-action-primary text-text-inverse hover:bg-action-primary-hover' : 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-raised',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-surface-panel',
        className,
      )}
      data-split-view-toggle
      data-active={isActive || undefined}
    >
      {isActive ? <PiSidebar className="size-4" aria-hidden /> : <PiColumns className="size-4" aria-hidden />}
      <span className="hidden lg:inline">Verknüpfte Ansicht</span>
    </button>
  );
}
