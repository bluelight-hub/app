/**
 * Kompakte Karte für das Fahrzeug-Grid (Statustableau-Stil).
 *
 * Zeigt Funkrufname, FMS-Status (direkt änderbar), Besatzungsanzahl
 * und Einheit-Zuweisung. Klick auf die Karte öffnet das Detail-Panel.
 */

import { useCallback, useRef, useState } from 'react';

import { cn } from '@/shared/ui/cn';
import { FmsStatusBadge } from '@/features/einsatz/ui/atoms/FmsStatusBadge.atom';
import { isFmsStatus, getStatusBorderLeftClass, getStatusClasses, FMS_STATUS_OPTIONS, type FmsStatus } from '@/features/einsatz/constants/fms-status.constants';
import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import type { EinsatzFahrzeugDto } from '@/shared';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { PiTruck, PiUsers, PiTreeStructure } from 'react-icons/pi';

interface FahrzeugGridCardProps {
  /** Fahrzeug-Daten */
  fahrzeug: EinsatzFahrzeugDto;
  /** Verknüpftes taktisches Zeichen */
  zeichen?: TaktischesZeichenResponseDto | null;
  /** Name der zugewiesenen Einheit */
  einheitName?: string | null;
  /** Callback bei Klick auf die Karte (öffnet Detail-Panel) */
  onSelect: (fahrzeugId: string) => void;
  /** Callback bei FMS-Status-Änderung */
  onStatusChange: (fahrzeugId: string, newStatus: FmsStatus) => void;
}

export function FahrzeugGridCard({ fahrzeug, zeichen, einheitName, onSelect, onStatusChange }: FahrzeugGridCardProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validFmsStatus: FmsStatus = isFmsStatus(fahrzeug.fmsStatus) ? fahrzeug.fmsStatus : 0;
  const besatzungCount = fahrzeug.besatzung?.length ?? 0;
  const borderColor = getStatusBorderLeftClass(validFmsStatus);

  const handleCardClick = useCallback(() => {
    if (!showStatusDropdown) {
      onSelect(fahrzeug.id);
    }
  }, [onSelect, fahrzeug.id, showStatusDropdown]);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !showStatusDropdown) {
        e.preventDefault();
        onSelect(fahrzeug.id);
      }
    },
    [onSelect, fahrzeug.id, showStatusDropdown],
  );

  const handleStatusBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusDropdown((prev) => !prev);
  }, []);

  const handleStatusChange = useCallback(
    (newStatus: FmsStatus) => {
      onStatusChange(fahrzeug.id, newStatus);
      setShowStatusDropdown(false);
    },
    [onStatusChange, fahrzeug.id],
  );

  const handleCloseDropdown = useCallback(() => {
    setShowStatusDropdown(false);
  }, []);

  return (
    <div
      className={cn(
        'rounded-panel border border-l-[3px] border-border-subtle bg-surface-panel p-3 shadow-panel',
        'cursor-pointer transition-colors hover:border-border-strong hover:shadow-md',
        borderColor,
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Fahrzeug ${fahrzeug.funkrufname}, FMS ${validFmsStatus}`}
    >
      {/* Zeile 1: TZ/Icon + Funkrufname + FMS-Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {zeichen ? <ZeichenPreview definition={zeichen.zeichenDefinition as unknown as ZeichenDefinition} size="sm" /> : <PiTruck className="h-5 w-5 flex-shrink-0 text-text-muted" />}
          <h3 className="truncate text-sm font-semibold text-text-primary">{fahrzeug.funkrufname}</h3>
        </div>

        {/* FMS-Badge (klickbar für Status-Änderung) */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleStatusBadgeClick}
            className="rounded-full focus-visible:shadow-focus-ring focus-visible:outline-none"
            aria-label={`FMS-Status ändern, aktuell FMS ${validFmsStatus}`}
            aria-haspopup="listbox"
            aria-expanded={showStatusDropdown}
          >
            <FmsStatusBadge status={validFmsStatus} className="cursor-pointer hover:opacity-80" />
          </button>

          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={handleCloseDropdown} onKeyDown={(e) => e.key === 'Escape' && handleCloseDropdown()} role="presentation" />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-panel border border-border-subtle bg-surface-panel py-1 shadow-panel" onClick={(e) => e.stopPropagation()}>
                {FMS_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:brightness-90 active:brightness-80',
                      getStatusClasses(status),
                      status === validFmsStatus ? 'font-medium' : 'font-normal',
                    )}
                  >
                    <FmsStatusBadge status={status} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zeile 2: Besatzung + Einheit */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {besatzungCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <PiUsers className="h-3.5 w-3.5" />
            {besatzungCount} {besatzungCount === 1 ? 'Person' : 'Pers.'}
          </span>
        )}

        {einheitName && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-status-info-surface px-1.5 py-0.5 text-xs font-medium text-status-info-text">
            <PiTreeStructure className="h-3 w-3" />
            {einheitName}
          </span>
        )}
      </div>
    </div>
  );
}

/** Skeleton-Variante für Loading-State */
export function FahrzeugGridCardSkeleton() {
  return (
    <div className="animate-pulse rounded-panel border border-l-[3px] border-border-subtle border-l-surface-raised bg-surface-panel p-3 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-surface-raised" />
          <div className="h-4 w-24 rounded bg-surface-raised" />
        </div>
        <div className="h-5 w-14 rounded-full bg-surface-raised" />
      </div>
      <div className="mt-2 flex gap-2">
        <div className="h-3 w-16 rounded bg-surface-raised" />
      </div>
    </div>
  );
}
