/**
 * RollenKarte Komponente für die Anzeige einer besetzten Rolle.
 *
 * **Story 6.1c - Rollen-Übersicht (AC1, AC2):**
 * Zeigt eine besetzte Führungsrolle mit Person und Freigabe-Action.
 */

import { cn } from '@/shared/ui/cn';
import { PiCheck, PiUserMinus, PiShieldCheck } from 'react-icons/pi';
import type { RollenBesetzungListItemDto } from '@bluelight-hub/shared/client';

interface RollenKarteProps {
  /** Rollen-Besetzung Daten aus der API */
  besetzung: RollenBesetzungListItemDto;
  /** Click Handler für Freigabe (AC3b) */
  onFreigeben?: () => void;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Skeleton Loading State für RollenKarte.
 */
export function RollenKarteSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-2 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 h-6 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

/**
 * RollenKarte zeigt eine besetzte Führungsrolle mit:
 * - Rollenname (prominent)
 * - Personenname mit Check-Icon
 * - Freigeben-Button
 */
export function RollenKarte({ besetzung, onFreigeben, className }: RollenKarteProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm transition-all',
        // Besetzte Rolle = grüne Markierung (AC2)
        'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20',
        className,
      )}
    >
      {/* Header: Rollenname + Qualifikations-Icon */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{besetzung.rollenName}</h4>
        <PiShieldCheck className="h-4 w-4 text-green-600" title="Besetzt" />
      </div>

      {/* Person mit Check (AC1) */}
      <div className="mt-2 flex items-center gap-2">
        <PiCheck className="h-4 w-4 text-green-600" />
        <span className="text-gray-700 text-sm dark:text-gray-300">{besetzung.personName}</span>
      </div>

      {/* Freigeben Action (AC3b) */}
      {onFreigeben && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onFreigeben}
            className="flex items-center gap-1 rounded px-2 py-1 text-red-600 text-xs hover:bg-red-100 dark:hover:bg-red-900/30"
            aria-label={`Rolle ${besetzung.rollenName} freigeben`}
          >
            <PiUserMinus className="h-3 w-3" />
            Freigeben
          </button>
        </div>
      )}
    </div>
  );
}
