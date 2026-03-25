/**
 * FahrzeugCard Komponente für die Fahrzeug-Status-Anzeige.
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * Zeigt einzelnes Fahrzeug mit FMS-Status und Besatzungsanzahl.
 *
 * **AC1 - Design:**
 * - Funkrufname prominent angezeigt
 * - FMS-Status als farbcodiertes Badge (via FmsStatusBadge)
 * - Besatzungsanzahl (AC4)
 *
 * **Story 6.2 - Mode-Aware (Code Review Action Item 3):**
 * Liest DashboardMode via Context für Mode-spezifische Styles.
 * Fullscreen: Größere Schrift (min. 24px für Fahrzeugnamen - AC1)
 * Compact: Touch-Targets min. 44x44px (AC2)
 */

import { cn } from '@/shared/ui/cn';
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom';
import { isFmsStatus, type FmsStatus } from '@/features/einsatz/constants/fms-status.constants';
import type { EinsatzFahrzeugDto } from '@/shared';
import { PiTruck, PiUsers } from 'react-icons/pi';
import { useDashboardMode, type DashboardMode } from '../../contexts';

interface FahrzeugCardProps {
  /** Fahrzeug-Daten aus der API */
  fahrzeug: EinsatzFahrzeugDto;
  /** Click Handler für Detail-Dialog (Story 6.1d) */
  onClick?: () => void;
  /** Loading State */
  isLoading?: boolean;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Story 6.2 - Mode-spezifische Style-Klassen.
 */
const getModeClasses = (mode: DashboardMode) => ({
  container: {
    standard: 'rounded-lg border p-4 shadow-sm',
    fullscreen: 'rounded-lg border p-4 lg:p-4 shadow-sm',
    compact: 'rounded border p-2',
  }[mode],
  funkrufname: {
    standard: 'font-semibold text-text-primary',
    fullscreen: 'font-bold text-xl lg:text-2xl text-text-primary', // AC1: min. 24px
    compact: 'font-medium text-sm text-text-primary',
  }[mode],
  truckIcon: {
    standard: 'h-5 w-5',
    fullscreen: 'h-6 w-6 lg:h-7 lg:w-7',
    compact: 'h-4 w-4',
  }[mode],
  besatzungText: {
    standard: 'text-text-muted text-sm',
    fullscreen: 'text-text-muted text-base lg:text-lg',
    compact: 'text-text-muted text-xs',
  }[mode],
  usersIcon: {
    standard: 'h-4 w-4',
    fullscreen: 'h-5 w-5',
    compact: 'h-3 w-3',
  }[mode],
  besatzungWrapper: {
    standard: 'mt-3',
    fullscreen: 'mt-4',
    compact: 'mt-2',
  }[mode],
});

/**
 * Skeleton Loading State für FahrzeugCard.
 * Story 6.2: Mode-aware Skeleton.
 */
export function FahrzeugCardSkeleton({ className }: { className?: string }) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn('border-border-subtle bg-surface-panel', 'animate-pulse', classes.container, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn('rounded bg-surface-raised', classes.truckIcon)} />
          <div className={cn('rounded bg-surface-raised', mode === 'fullscreen' ? 'h-6 w-32' : mode === 'compact' ? 'h-3 w-20' : 'h-4 w-24')} />
        </div>
        <div className={cn('rounded-full bg-surface-raised', mode === 'fullscreen' ? 'h-8 w-20' : mode === 'compact' ? 'h-5 w-12' : 'h-6 w-16')} />
      </div>
    </div>
  );
}

/**
 * FahrzeugCard zeigt ein einzelnes Fahrzeug mit:
 * - Funkrufname (prominent)
 * - FMS-Status Badge (farbcodiert)
 * - Besatzungsanzahl (wenn vorhanden)
 *
 * Story 6.2: Mode-aware via useDashboardMode() Context.
 */
export function FahrzeugCard({ fahrzeug, onClick, isLoading, className }: FahrzeugCardProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  if (isLoading) {
    return <FahrzeugCardSkeleton className={className} />;
  }

  // AC4: Frontend berechnet Personenanzahl aus besatzung Array
  const personenCount = fahrzeug.besatzung?.length ?? 0;

  // Runtime-Validierung des FMS-Status mit Fallback auf 0 (Nicht einsatzbereit)
  const validFmsStatus: FmsStatus = isFmsStatus(fahrzeug.fmsStatus) ? fahrzeug.fmsStatus : 0;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role="button" wird dynamisch gesetzt wenn onClick vorhanden ist
    <div
      className={cn(
        'border-border-subtle bg-surface-panel',
        classes.container,
        onClick && 'cursor-pointer transition-all hover:border-border-strong hover:shadow-md',
        // AC2: Touch-Targets min. 44x44px in Compact-Mode (Card ist klickbar)
        onClick && mode === 'compact' && 'min-h-[44px]',
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Fahrzeug-Info */}
        <div className="flex items-center gap-2">
          <PiTruck className={cn('text-text-muted', classes.truckIcon)} />
          <h3 className={classes.funkrufname}>{fahrzeug.funkrufname}</h3>
        </div>

        {/* FMS-Status Badge - Story 6.2: Mode-spezifische Größe via className */}
        <FmsStatusBadge status={validFmsStatus} className={cn(mode === 'fullscreen' && 'px-3 py-1 text-sm', mode === 'compact' && 'px-1.5 py-0.5 text-[10px]')} />
      </div>

      {/* AC4: Besatzungs-Preview */}
      {personenCount > 0 && (
        <div className={cn('flex items-center gap-2', classes.besatzungWrapper, classes.besatzungText)}>
          <PiUsers className={classes.usersIcon} />
          <span>
            {personenCount} {personenCount === 1 ? 'Person' : 'Personen'}
          </span>
        </div>
      )}
    </div>
  );
}
