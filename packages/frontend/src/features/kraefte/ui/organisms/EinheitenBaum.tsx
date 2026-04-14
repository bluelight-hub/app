/**
 * Baum-Ansicht aller taktischen Einheiten eines Einsatzes.
 *
 * Nimmt die flache Einheiten-Liste entgegen, baut intern den Baum
 * mit buildEinheitenTree und rendert rekursiv EinheitCard-Komponenten.
 */

import { useMemo } from 'react';

import { PiTreeStructure } from 'react-icons/pi';

import type { EinsatzEinheitDto, EinsatzFahrzeugDto } from '@/shared';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { buildEinheitenTree } from '@/features/kraefte/utils/einheiten-tree.utils';

import { EinheitCard } from '../molecules/EinheitCard';

interface EinheitenBaumProps {
  /** Flache Liste aller Einheiten des Einsatzes */
  einheiten: EinsatzEinheitDto[];
  /** Handler für Bearbeitung einer Einheit */
  onEdit: (einheitId: string) => void;
  /** Handler für Löschen einer Einheit */
  onDelete: (einheitId: string) => void;
  /** Handler für Status-Änderung einer Einheit */
  onStatusChange: (einheitId: string, status: string) => void;
  /** Handler für "Kind-Einheit hinzufügen" */
  onAddChild: (parentId: string) => void;
  /** Handler für "Personen zuweisen" */
  onAssignPersonen: (einheitId: string) => void;
  /** Handler für "Fahrzeuge zuweisen" */
  onAssignFahrzeuge: (einheitId: string) => void;
  /** Fahrzeuge gruppiert nach Einheit-ID */
  fahrzeugeByEinheit: Map<string, EinsatzFahrzeugDto[]>;
  /** Handler für "Zeichen verwalten" */
  onManageZeichen: (einheitId: string) => void;
  /** Zeichen nach Einheit-ID indexiert */
  zeichenByEinheit: Map<string, TaktischesZeichenResponseDto>;
}

/**
 * Baum-Container der alle Einheiten hierarchisch darstellt.
 *
 * Baut intern den Baum aus der flachen Liste und zeigt einen
 * Empty-State wenn keine Einheiten vorhanden sind.
 */
export function EinheitenBaum({
  einheiten,
  onEdit,
  onDelete,
  onStatusChange,
  onAddChild,
  onAssignPersonen,
  onAssignFahrzeuge,
  fahrzeugeByEinheit,
  onManageZeichen,
  zeichenByEinheit,
}: EinheitenBaumProps) {
  /** Baum aus flacher Liste aufbauen */
  const tree = useMemo(() => buildEinheitenTree(einheiten), [einheiten]);

  // Empty State
  if (tree.length === 0) {
    return (
      <div className="rounded-panel border border-border-subtle bg-surface-panel px-6 py-12 text-center shadow-panel">
        <PiTreeStructure className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <p className="mb-2 font-medium text-text-primary">Noch keine Einheiten erstellt</p>
        <p className="text-sm text-text-muted">Erstellen Sie die erste taktische Einheit für diesen Einsatz</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <EinheitCard
          key={node.id}
          node={node}
          depth={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onAddChild={onAddChild}
          onAssignPersonen={onAssignPersonen}
          onAssignFahrzeuge={onAssignFahrzeuge}
          fahrzeugeByEinheit={fahrzeugeByEinheit}
          onManageZeichen={onManageZeichen}
          zeichenByEinheit={zeichenByEinheit}
        />
      ))}
    </div>
  );
}
