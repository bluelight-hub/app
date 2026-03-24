import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FmsStatusDropdown } from '@/features/einsatz';
import type { EinsatzFahrzeugDto, BesatzungMemberDto } from '@/shared';
import { isFmsStatus, type FmsStatus } from '@/features/einsatz';
import { PiTruck, PiUserPlus, PiUsers } from 'react-icons/pi';
import type { ReactNode } from 'react';

/**
 * Formatiert die Besatzungs-Liste für kompakte Darstellung.
 *
 * Zeigt max. 3 Namen im Format "Vorname N." (erster Buchstabe Nachname).
 * Wenn mehr als 3: "...+X weitere" mit Tooltip aller verbleibenden Namen.
 *
 * @param besatzung - Array von BesatzungMemberDto
 * @returns React Node mit formatierten Namen
 */
function formatBesatzung(besatzung: BesatzungMemberDto[]): ReactNode {
  const MAX_DISPLAY = 3;
  const displayed = besatzung.slice(0, MAX_DISPLAY);
  const remaining = besatzung.length - MAX_DISPLAY;

  const names = displayed.map((p) => `${p.vorname} ${p.nachname.charAt(0)}.`);

  if (remaining > 0) {
    const hiddenNames = besatzung
      .slice(MAX_DISPLAY)
      .map((p) => `${p.vorname} ${p.nachname}`)
      .join(', ');
    return (
      <>
        {names.join(', ')},{' '}
        <span className="cursor-help" title={hiddenNames}>
          ...+{remaining} weitere
        </span>
      </>
    );
  }

  return names.join(', ');
}

interface EinsatzResourceWidgetProps {
  /** Array of EinsatzFahrzeugDto objects */
  fahrzeuge: EinsatzFahrzeugDto[];
  /** Callback when FMS-Status changes */
  onStatusChange: (fahrzeugId: string, newStatus: FmsStatus) => void;
  /** Optional className for styling */
  className?: string;
  /** Callback to add new resource */
  onAddResource?: () => void;
}

export function EinsatzResourceWidget({ fahrzeuge, onStatusChange, className, onAddResource }: EinsatzResourceWidgetProps) {
  const totalFahrzeuge = fahrzeuge.length;
  const activeFahrzeuge = fahrzeuge.filter((f) => f.fmsStatus >= 3 && f.fmsStatus <= 4).length;

  return (
    <div className={cn('rounded-panel bg-surface-panel p-6 shadow-sm', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-text-primary text-lg">Eingesetzte Fahrzeuge</h3>
        {onAddResource && (
          <Button appearance="ghost" size="sm" onClick={onAddResource}>
            <PiUserPlus className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="font-bold text-2xl text-text-primary">{totalFahrzeuge}</p>
          <p className="text-text-muted text-xs">Fahrzeuge</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-text-primary">{activeFahrzeuge}</p>
          <p className="text-text-muted text-xs">Aktiv</p>
        </div>
      </div>

      {/* Fahrzeug List */}
      <div className="space-y-2">
        {fahrzeuge.map((fahrzeug) => (
          <div key={fahrzeug.id} className="flex items-center justify-between gap-3 rounded-panel bg-surface-raised p-3 transition-colors hover:bg-action-secondary">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PiTruck className="h-5 w-5 shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-primary text-sm">{fahrzeug.funkrufname}</p>
                {fahrzeug.kennzeichen && <p className="truncate text-text-muted text-xs">{fahrzeug.kennzeichen}</p>}
                {fahrzeug.besatzung && fahrzeug.besatzung.length > 0 && <div className="text-text-muted text-xs">{formatBesatzung(fahrzeug.besatzung)}</div>}
              </div>
            </div>
            <div className="shrink-0">
              <FmsStatusDropdown value={isFmsStatus(fahrzeug.fmsStatus) ? fahrzeug.fmsStatus : 1} onChange={(newStatus) => onStatusChange(fahrzeug.id, newStatus)} className="w-48" />
            </div>
          </div>
        ))}

        {fahrzeuge.length === 0 && (
          <div className="py-8 text-center text-text-muted">
            <PiUsers className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Noch keine Fahrzeuge zugeordnet</p>
            {onAddResource && (
              <Button appearance="outline" size="sm" className="mt-4" onClick={onAddResource}>
                <PiUserPlus className="mr-2 h-4 w-4" />
                Erstes Fahrzeug hinzufügen
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
