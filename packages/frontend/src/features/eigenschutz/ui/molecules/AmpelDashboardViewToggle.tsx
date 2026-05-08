import { PiListBullets, PiSquaresFour } from 'react-icons/pi';
import { useId } from 'react';
import { cn } from '@/shared/ui/cn';
import type { EigenschutzDashboardView } from '../../stores/eigenschutz-dashboard-view.store';

export interface AmpelDashboardViewToggleProps {
  readonly effectiveView: EigenschutzDashboardView;
  readonly storedView: EigenschutzDashboardView;
  readonly focusAvailable: boolean;
  readonly onViewChange: (view: EigenschutzDashboardView) => void;
  readonly className?: string;
}

export function AmpelDashboardViewToggle({ effectiveView, focusAvailable, onViewChange, className }: AmpelDashboardViewToggleProps) {
  const focusUnavailableTooltipId = useId();
  const overview = (
    <button
      type="button"
      aria-pressed={effectiveView === 'cards'}
      onClick={() => onViewChange('cards')}
      className={buttonClassName(effectiveView === 'cards')}
      data-testid="ampel-dashboard-view-cards"
    >
      <PiSquaresFour aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Überblick</span>
    </button>
  );

  const focus = (
    <button
      type="button"
      aria-pressed={effectiveView === 'focus'}
      aria-disabled={!focusAvailable}
      aria-describedby={focusAvailable ? undefined : focusUnavailableTooltipId}
      onClick={() => {
        if (focusAvailable) onViewChange('focus');
      }}
      className={buttonClassName(effectiveView === 'focus', !focusAvailable)}
      data-testid="ampel-dashboard-view-focus"
    >
      <PiListBullets aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Fokus</span>
    </button>
  );

  return (
    <div className={cn('inline-flex rounded-control border border-border-subtle bg-surface-panel p-1', className)} role="toolbar" aria-label="Dashboard-Ansicht wechseln">
      {overview}
      <span className="group/tooltip relative inline-flex">
        {focus}
        {!focusAvailable ? (
          <span
            id={focusUnavailableTooltipId}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-control bg-surface-inverse px-2 py-1 text-xs font-medium whitespace-nowrap text-text-inverse opacity-0 shadow-md transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 motion-reduce:transition-none"
          >
            Fokus-Ansicht benötigt ≥ 1024 px
          </span>
        ) : null}
      </span>
    </div>
  );
}

function buttonClassName(active: boolean, unavailable = false): string {
  return cn(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none',
    'focus-visible:shadow-focus-ring focus-visible:outline-none',
    unavailable && 'cursor-not-allowed opacity-55',
    active ? 'bg-action-secondary text-action-primary shadow-sm' : 'text-text-muted hover:bg-action-secondary hover:text-text-secondary',
  );
}
