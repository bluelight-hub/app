/**
 * ZustellstatusAnzeige Molecule
 *
 * Zeigt den Quittierungsfortschritt als Fortschrittsbalken mit optionalen
 * Empfaenger-Chips in der erweiterten Variante.
 *
 * Im interaktiven Modus (interactive=true) erhaelt jeder Chip ein Kontext-Menue
 * zur manuellen Status-Aenderung (Zustellen, Quittieren, Zuruecksetzen).
 */

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { format } from 'date-fns';
import { PiArrowCounterClockwise, PiCheck, PiCheckCircle, PiQuestion, PiRadio, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { BefehlEmpfaengerDto } from '@bluelight-hub/shared/client';
import { getQuittierungsfortschritt, getEmpfaengerQuittierungStatus, splitEmpfaenger } from '../../lib/befehl-utils';
import type { EmpfaengerChipStatus } from '../../lib/befehl-utils';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';

interface ZustellstatusAnzeigeProps {
  empfaenger: BefehlEmpfaengerDto[];
  variant?: 'compact' | 'expanded';
  className?: string;
  /** Aktiviert Kontext-Menues auf Empfaenger-Chips (default: false) */
  interactive?: boolean;
  /** Befehl-ID (nur bei interactive=true noetig) */
  befehlId?: string;
  /** Callback fuer Status-Aenderung (nur bei interactive=true) */
  onStatusChange?: (input: Omit<AendereEmpfaengerStatusInput, 'befehlId'> & { befehlId: string }) => void;
  /** Ob Status KORRIGIERT ist (deaktiviert Aktionen) */
  isKorrigiert?: boolean;
}

/** Icon-Zuordnung pro Empfaenger-Chip-Status */
const STATUS_ICON: Record<EmpfaengerChipStatus, React.ComponentType<{ className?: string }>> = {
  ZUGESTELLT: PiCheck,
  VERSTANDEN: PiCheckCircle,
  RUECKFRAGE: PiQuestion,
  NICHT_VERSTANDEN: PiWarningCircle,
};

/** Tooltip-Text fuer einen einzelnen Empfaenger */
function getChipTooltip(name: string, label: string, zeitpunkt: Date | undefined): string {
  if (zeitpunkt) {
    return `${name} - ${label} um ${format(zeitpunkt, 'dd.MM. HH:mm')}`;
  }
  return `${name} - ${label}`;
}

/** Bestimmt den aktuellen Status eines Empfaengers */
function getEmpfaengerCurrentStatus(e: BefehlEmpfaengerDto): 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' {
  if (e.quittiertAm) return 'QUITTIERT';
  if (e.zugestelltAm) return 'ZUGESTELLT';
  return 'ERTEILT';
}

/** Rendert einen einzelnen Empfaenger-Chip (statisch oder interaktiv) */
function EmpfaengerChip({
  empfaenger,
  interactive,
  befehlId,
  onStatusChange,
  isKorrigiert,
  isFunk,
}: {
  empfaenger: BefehlEmpfaengerDto;
  interactive: boolean;
  befehlId?: string;
  onStatusChange?: ZustellstatusAnzeigeProps['onStatusChange'];
  isKorrigiert?: boolean;
  isFunk?: boolean;
}) {
  const { status, chipBg, chipText, label, zeitpunkt } = getEmpfaengerQuittierungStatus(empfaenger);
  const empStatus = getEmpfaengerCurrentStatus(empfaenger);
  const Icon = isFunk && empStatus === 'ERTEILT' ? PiRadio : STATUS_ICON[status];
  const tooltip = isFunk && empStatus === 'ERTEILT' ? `${empfaenger.name} - Via Funk (nicht zugestellt)` : getChipTooltip(empfaenger.name, label, zeitpunkt);

  const chipClasses = cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
    isFunk && empStatus === 'ERTEILT' ? 'bg-surface-raised text-text-muted' : cn(chipBg, chipText),
    interactive && !isKorrigiert && 'cursor-pointer hover:ring-2 hover:ring-border-subtle',
  );

  if (!interactive || !befehlId || !onStatusChange || isKorrigiert) {
    return (
      <span className={chipClasses} title={tooltip}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {empfaenger.name}
      </span>
    );
  }

  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton className={chipClasses} title={tooltip}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {empfaenger.name}
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        transition
        className="z-50 w-52 rounded-lg border border-border-subtle bg-surface-panel py-1 shadow-lg transition duration-100 ease-out [--anchor-gap:4px] data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {empStatus === 'ERTEILT' && (
          <MenuItem>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-secondary text-sm data-[focus]:bg-action-secondary"
              onClick={() =>
                onStatusChange({
                  befehlId,
                  empfaengerEntityId: empfaenger.id,
                  aktion: 'ZUSTELLEN' as const,
                })
              }
            >
              <PiCheck className="h-4 w-4 text-action-primary" />
              Als zugestellt markieren
            </button>
          </MenuItem>
        )}

        {empStatus === 'ZUGESTELLT' && (
          <>
            <MenuItem>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-secondary text-sm data-[focus]:bg-action-secondary"
                onClick={() =>
                  onStatusChange({
                    befehlId,
                    empfaengerEntityId: empfaenger.id,
                    aktion: 'QUITTIEREN' as const,
                    quittierungArt: 'VERSTANDEN' as const,
                  })
                }
              >
                <PiCheckCircle className="h-4 w-4 text-status-success-text" />
                Verstanden
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-secondary text-sm data-[focus]:bg-action-secondary"
                onClick={() =>
                  onStatusChange({
                    befehlId,
                    empfaengerEntityId: empfaenger.id,
                    aktion: 'QUITTIEREN' as const,
                    quittierungArt: 'RUECKFRAGE' as const,
                  })
                }
              >
                <PiQuestion className="h-4 w-4 text-status-warning-text" />
                Rueckfrage
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-secondary text-sm data-[focus]:bg-action-secondary"
                onClick={() =>
                  onStatusChange({
                    befehlId,
                    empfaengerEntityId: empfaenger.id,
                    aktion: 'QUITTIEREN' as const,
                    quittierungArt: 'NICHT_VERSTANDEN' as const,
                  })
                }
              >
                <PiWarningCircle className="h-4 w-4 text-status-danger-text" />
                Nicht verstanden
              </button>
            </MenuItem>
            <div className="my-1 border-border-subtle border-t" />
            <MenuItem>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-muted text-sm data-[focus]:bg-action-secondary"
                onClick={() =>
                  onStatusChange({
                    befehlId,
                    empfaengerEntityId: empfaenger.id,
                    aktion: 'ZURUECKSETZEN' as const,
                    zielStatus: 'ERTEILT' as const,
                  })
                }
              >
                <PiArrowCounterClockwise className="h-4 w-4" />
                Zustellung zuruecknehmen
              </button>
            </MenuItem>
          </>
        )}

        {empStatus === 'QUITTIERT' && (
          <MenuItem>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-text-muted text-sm data-[focus]:bg-action-secondary"
              onClick={() =>
                onStatusChange({
                  befehlId,
                  empfaengerEntityId: empfaenger.id,
                  aktion: 'ZURUECKSETZEN' as const,
                  zielStatus: 'ZUGESTELLT' as const,
                })
              }
            >
              <PiArrowCounterClockwise className="h-4 w-4" />
              Quittierung zuruecknehmen
            </button>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
}

export function ZustellstatusAnzeige({ empfaenger, variant = 'compact', className, interactive = false, befehlId, onStatusChange, isKorrigiert }: ZustellstatusAnzeigeProps) {
  const { quittiert, gesamt, prozent } = getQuittierungsfortschritt(empfaenger);
  const { quittierbar, nichtQuittierbar } = splitEmpfaenger(empfaenger);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Fortschrittsbalken + Text */}
      <div className="flex items-center gap-2">
        <div
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-raised"
          role="progressbar"
          aria-valuenow={quittiert}
          aria-valuemin={0}
          aria-valuemax={gesamt}
          aria-label={`Quittierungsfortschritt: ${quittiert} von ${gesamt} Empfängern`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 motion-reduce:transition-none',
              prozent === 0 && 'bg-surface-raised',
              prozent > 0 && prozent < 100 && 'bg-status-warning-text',
              prozent === 100 && 'bg-status-success-text',
            )}
            style={{ width: `${prozent}%` }}
          />
        </div>
        <span
          className={cn('shrink-0 font-medium text-xs', prozent === 0 && 'text-text-muted', prozent > 0 && prozent < 100 && 'text-status-warning-text', prozent === 100 && 'text-status-success-text')}
        >
          {quittiert}/{gesamt} quittiert
        </span>
      </div>

      {/* Quittierbare Empfaenger-Chips (nur expanded) */}
      {variant === 'expanded' && quittierbar.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quittierbar.map((e) => (
            <EmpfaengerChip key={e.id} empfaenger={e} interactive={interactive} befehlId={befehlId} onStatusChange={onStatusChange} isKorrigiert={isKorrigiert} />
          ))}
        </div>
      )}

      {/* Nicht-quittierbare Empfaenger (via Funk) - jetzt ebenfalls interaktiv */}
      {variant === 'expanded' && nichtQuittierbar.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-text-muted text-xs">Via Funk:</span>
          {nichtQuittierbar.map((e) => (
            <EmpfaengerChip key={e.id} empfaenger={e} interactive={interactive} befehlId={befehlId} onStatusChange={onStatusChange} isKorrigiert={isKorrigiert} isFunk />
          ))}
        </div>
      )}

      {/* Compact: Nicht-quittierbare Anzahl anzeigen wenn vorhanden */}
      {variant === 'compact' && nichtQuittierbar.length > 0 && <span className="text-text-muted text-xs">+ {nichtQuittierbar.length} via Funk</span>}
    </div>
  );
}
