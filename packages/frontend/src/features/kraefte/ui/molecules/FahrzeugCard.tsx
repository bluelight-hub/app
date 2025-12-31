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
 */

import { cn } from '@/shared/ui/cn';
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom';
import { isFmsStatus, type FmsStatus } from '@/features/einsatz/constants/fms-status.constants';
import type { EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';
import { PiTruck, PiUsers } from 'react-icons/pi';

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
 * Skeleton Loading State für FahrzeugCard.
 * Kann auch direkt importiert werden für Listen-Skeletons.
 */
export function FahrzeugCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800', 'animate-pulse', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

/**
 * FahrzeugCard zeigt ein einzelnes Fahrzeug mit:
 * - Funkrufname (prominent)
 * - FMS-Status Badge (farbcodiert)
 * - Besatzungsanzahl (wenn vorhanden)
 */
export function FahrzeugCard({ fahrzeug, onClick, isLoading, className }: FahrzeugCardProps) {
  if (isLoading) {
    return <FahrzeugCardSkeleton className={className} />;
  }

  // AC4: Frontend berechnet Personenanzahl aus besatzung Array
  const personenCount = fahrzeug.besatzung?.length ?? 0;

  // Runtime-Validierung des FMS-Status mit Fallback auf 0 (Nicht einsatzbereit)
  const validFmsStatus: FmsStatus = isFmsStatus(fahrzeug.fmsStatus) ? fahrzeug.fmsStatus : 0;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role="button" wird dynamisch gesetzt wenn onClick vorhanden ist
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        'dark:border-gray-700 dark:bg-gray-800',
        onClick && 'cursor-pointer transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-600',
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
          <PiTruck className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{fahrzeug.funkrufname}</h3>
        </div>

        {/* FMS-Status Badge */}
        <FmsStatusBadge status={validFmsStatus} />
      </div>

      {/* AC4: Besatzungs-Preview */}
      {personenCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-gray-600 text-sm dark:text-gray-400">
          <PiUsers className="h-4 w-4" />
          <span>
            {personenCount} {personenCount === 1 ? 'Person' : 'Personen'}
          </span>
        </div>
      )}
    </div>
  );
}
