/**
 * RollenKarte Komponente für die Anzeige einer besetzten Rolle.
 *
 * **Story 6.1c - Rollen-Übersicht (AC1, AC2):**
 * Zeigt eine besetzte Führungsrolle mit Person und Freigabe-Action.
 *
 * **Story 6.2 - Mode-Aware (Code Review Action Item 1+2):**
 * Liest DashboardMode via Context für Mode-spezifische Styles.
 * Fullscreen: Größere Schrift (min. 32px für AC1)
 * Compact: Touch-Targets min. 44x44px (AC2)
 */

import { cn } from '@/shared/ui/cn';
import { PiCheck, PiUserMinus, PiShieldCheck } from 'react-icons/pi';
import type { RollenBesetzungListItemDto } from '@/shared';
import { useDashboardMode, type DashboardMode } from '../../contexts';

interface RollenKarteProps {
  /** Rollen-Besetzung Daten aus der API */
  besetzung: RollenBesetzungListItemDto;
  /** Click Handler für Freigabe (AC3b) */
  onFreigeben?: () => void;
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
  rollenName: {
    standard: 'font-semibold text-text-primary',
    fullscreen: 'font-bold text-lg lg:text-xl text-text-primary',
    compact: 'font-medium text-sm text-text-primary',
  }[mode],
  personName: {
    standard: 'text-text-secondary text-sm',
    fullscreen: 'text-text-secondary text-base lg:text-lg',
    compact: 'text-text-secondary text-xs',
  }[mode],
  icon: {
    standard: 'h-4 w-4',
    fullscreen: 'h-5 w-5 lg:h-6 lg:w-6',
    compact: 'h-3 w-3',
  }[mode],
  button: {
    standard: 'px-2 py-1 text-xs',
    fullscreen: 'px-4 py-3 text-base min-h-[56px]',
    compact: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]', // AC2: Touch-Target min. 44x44px
  }[mode],
  buttonIcon: {
    standard: 'h-3 w-3',
    fullscreen: 'h-5 w-5',
    compact: 'h-4 w-4',
  }[mode],
});

/**
 * Skeleton Loading State für RollenKarte.
 * Story 6.2: Mode-aware Skeleton.
 */
export function RollenKarteSkeleton({ className }: { className?: string }) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn('animate-pulse border-border-subtle bg-surface-panel', classes.container, className)}>
      <div className="flex items-center justify-between">
        <div className={cn('rounded bg-surface-raised', mode === 'fullscreen' ? 'h-6 w-24' : mode === 'compact' ? 'h-4 w-16' : 'h-5 w-20')} />
        <div className={cn('rounded bg-surface-raised', classes.icon)} />
      </div>
      <div className={cn('mt-2 rounded bg-surface-raised', mode === 'fullscreen' ? 'h-5 w-40' : mode === 'compact' ? 'h-3 w-24' : 'h-4 w-32')} />
      <div className={cn('mt-3 rounded bg-surface-raised', mode === 'fullscreen' ? 'h-10 w-28' : mode === 'compact' ? 'h-8 w-24' : 'h-6 w-20')} />
    </div>
  );
}

/**
 * RollenKarte zeigt eine besetzte Führungsrolle mit:
 * - Rollenname (prominent)
 * - Personenname mit Check-Icon
 * - Freigeben-Button
 *
 * Story 6.2: Mode-aware via useDashboardMode() Context.
 */
export function RollenKarte({ besetzung, onFreigeben, className }: RollenKarteProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div
      className={cn(
        'transition-all',
        classes.container,
        // Besetzte Rolle = grüne Markierung (AC2)
        'border-status-success-border bg-status-success-surface',
        className,
      )}
    >
      {/* Header: Rollenname + Qualifikations-Icon */}
      <div className="flex items-center justify-between">
        <h4 className={classes.rollenName}>{besetzung.rollenName}</h4>
        <PiShieldCheck className={cn(classes.icon, 'text-status-success-text')} title="Besetzt" />
      </div>

      {/* Person mit Check (AC1) */}
      <div className={cn('flex items-center gap-2', mode === 'fullscreen' ? 'mt-3' : 'mt-2')}>
        <PiCheck className={cn(classes.icon, 'text-status-success-text')} />
        <span className={classes.personName}>{besetzung.personName}</span>
      </div>

      {/* Freigeben Action (AC3b) - Story 6.2: Mode-aware Touch-Targets */}
      {onFreigeben && (
        <div className={mode === 'fullscreen' ? 'mt-4' : 'mt-3'}>
          <button
            type="button"
            onClick={onFreigeben}
            className={cn('flex items-center gap-1 rounded-control text-status-danger-text hover:bg-status-danger-surface focus:outline-none focus-visible:shadow-focus-ring', classes.button)}
            aria-label={`Rolle ${besetzung.rollenName} freigeben`}
          >
            <PiUserMinus className={classes.buttonIcon} />
            Freigeben
          </button>
        </div>
      )}
    </div>
  );
}
