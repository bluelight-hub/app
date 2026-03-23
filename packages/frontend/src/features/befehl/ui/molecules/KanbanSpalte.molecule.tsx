/**
 * KanbanSpalte Molecule
 *
 * Stellt eine einzelne Kanban-Spalte mit Header (Label + Count) und Karten-Liste dar.
 * KORRIGIERT-Befehle werden gedimmt mit "Korrigiert"-Badge angezeigt.
 */

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/shared/ui/cn';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';
import type { KanbanBefehl } from '../../hooks/use-kanban-gruppierung';
import { sortByPriority } from '../../lib/befehl-priority';
import { BefehlKarte } from './BefehlKarte.molecule';

/** Konfiguration einer Kanban-Spalte */
export interface KanbanSpalteConfig {
  label: string;
  headerBg: string;
  headerText: string;
}

interface KanbanSpalteProps {
  config: KanbanSpalteConfig;
  befehle: KanbanBefehl<BefehlDto>[];
  einsatzId: string;
  className?: string;
  /** Callback fuer Empfaenger-Status-Aenderung */
  onStatusChange?: (input: AendereEmpfaengerStatusInput) => void;
  /** RBAC: Darf der aktuelle User Empfaenger-Status verwalten? */
  canManageStatus?: boolean;
  /** Callback fuer Befehl-Auswahl (Detail-Panel oeffnen) */
  onBefehlSelect?: (befehlId: string) => void;
  /** Callback fuer Quittierung */
  onQuittieren?: (befehlId: string) => void;
  /** ID des aktuellen Users (fuer Quittierungs-Anzeige) */
  currentUserId?: string;
  /** RBAC: Darf der aktuelle User quittieren? */
  canQuittieren?: boolean;
}

/** Einzelne Kanban-Spalte mit Header und Karten-Liste (kritische Befehle oben) */
export function KanbanSpalte({ config, befehle, einsatzId, className, onStatusChange, canManageStatus, onBefehlSelect, onQuittieren, currentUserId, canQuittieren }: KanbanSpalteProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  /** Befehle nach Prioritaet sortiert (kritischste zuerst) */
  const sortierteBefehle = useMemo(() => {
    const sortiert = sortByPriority(
      befehle.map((kb) => kb.befehl),
      now,
    );
    const befehlMap = new Map(befehle.map((kb) => [kb.befehl.id, kb]));
    return sortiert.map((b) => befehlMap.get(b.id)).filter((kb): kb is KanbanBefehl<BefehlDto> => kb != null);
  }, [befehle, now]);

  return (
    <section
      aria-label={`${config.label} – ${befehle.length} Befehl${befehle.length !== 1 ? 'e' : ''}`}
      className={cn('flex flex-col rounded-lg border border-gray-200 dark:border-gray-700', className)}
    >
      {/* Spalten-Header mit Count-Badge */}
      <div className={cn('flex items-center justify-between rounded-t-lg px-3 py-2', config.headerBg)}>
        <h3 className={cn('font-semibold text-sm', config.headerText)}>{config.label}</h3>
        <span className={cn('rounded-full bg-white/80 px-2 py-0.5 font-bold text-xs dark:bg-black/20', config.headerText)}>{befehle.length}</span>
      </div>

      {/* Karten-Liste (nach Prioritaet sortiert) */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {sortierteBefehle.length === 0 && <p className="py-4 text-center text-gray-400 text-sm dark:text-gray-500">Keine Befehle</p>}
        {sortierteBefehle.map(({ befehl, istKorrigiert }) => (
          <div key={befehl.id} id={`befehl-row-${befehl.id}`} className={cn(istKorrigiert && 'opacity-60')}>
            <BefehlKarte
              nummer={befehl.nummer}
              auftrag={befehl.auftrag}
              status={befehl.status}
              empfaenger={befehl.empfaenger}
              erteiltAm={befehl.erteiltAm}
              kommentare={befehl.kommentare}
              einsatzId={einsatzId}
              befehlId={befehl.id}
              zeitvorgabe={befehl.zeitvorgabe}
              onStatusChange={onStatusChange}
              canManageStatus={canManageStatus}
              onClick={onBefehlSelect ? () => onBefehlSelect(befehl.id) : undefined}
              onQuittieren={onQuittieren}
              currentUserId={currentUserId}
              canQuittieren={canQuittieren}
            />
            {istKorrigiert && (
              <span className="mt-1 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-400">Korrigiert</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
