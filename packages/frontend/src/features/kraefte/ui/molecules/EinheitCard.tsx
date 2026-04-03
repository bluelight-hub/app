/**
 * Card-Komponente für eine einzelne taktische Einheit im Baum.
 *
 * Zeigt Name, Typ-Badge, Status-Badge, Stärke (ist/soll),
 * Führer-Name und Auftrag. Unterstützt Einklappen von Kindeinheiten
 * und bietet Actions für Bearbeitung, Status-Änderung und Löschen.
 */

import { useCallback, useState } from 'react';

import { PiCaretDown, PiCaretRight, PiPencilSimple, PiPlus, PiTrash, PiTruck, PiUserCircle, PiUsers } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';

import type { EinsatzFahrzeugDto } from '@/shared';
import type { EinheitTreeNode } from '@/features/kraefte/utils/einheiten-tree.utils';

import { EinheitStatusBadge } from './EinheitStatusBadge';
import { EinheitTypBadge } from './EinheitTypBadge';

/** Status-Optionen für das Dropdown */
const STATUS_OPTIONS = [
  { value: 'AUFGESTELLT', label: 'Aufgestellt' },
  { value: 'EINSATZBEREIT', label: 'Einsatzbereit' },
  { value: 'IM_EINSATZ', label: 'Im Einsatz' },
  { value: 'IN_RESERVE', label: 'In Reserve' },
  { value: 'AUFGELOEST', label: 'Aufgelöst' },
] as const;

interface EinheitCardProps {
  /** Der Baum-Knoten mit Einheit-Daten und Kindern */
  node: EinheitTreeNode;
  /** Einrückungstiefe im Baum */
  depth: number;
  /** Handler für Bearbeitung */
  onEdit: (einheitId: string) => void;
  /** Handler für Löschen */
  onDelete: (einheitId: string) => void;
  /** Handler für Status-Änderung */
  onStatusChange: (einheitId: string, status: string) => void;
  /** Handler für "Kind-Einheit hinzufügen" */
  onAddChild: (parentId: string) => void;
  /** Handler für "Personen zuweisen" */
  onAssignPersonen: (einheitId: string) => void;
  /** Handler für "Fahrzeuge zuweisen" */
  onAssignFahrzeuge: (einheitId: string) => void;
  /** Alle Fahrzeuge des Einsatzes (für Badges, Filterung nach einheitId intern) */
  fahrzeugeByEinheit: Map<string, EinsatzFahrzeugDto[]>;
}

/**
 * Karte für eine taktische Einheit mit Baum-Darstellung.
 *
 * Unterstützt beliebige Verschachtelungstiefe durch rekursives Rendering
 * der children. Die Einrückung erfolgt über dynamische padding-left Berechnung.
 */
export function EinheitCard({ node, depth, onEdit, onDelete, onStatusChange, onAddChild, onAssignPersonen, onAssignFahrzeuge, fahrzeugeByEinheit }: EinheitCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const hasChildren = node.children.length > 0;
  const einheit = node;

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    onEdit(einheit.id);
  }, [onEdit, einheit.id]);

  const handleDelete = useCallback(() => {
    onDelete(einheit.id);
  }, [onDelete, einheit.id]);

  const handleAddChild = useCallback(() => {
    onAddChild(einheit.id);
  }, [onAddChild, einheit.id]);

  const handleAssignPersonen = useCallback(() => {
    onAssignPersonen(einheit.id);
  }, [onAssignPersonen, einheit.id]);

  const handleAssignFahrzeuge = useCallback(() => {
    onAssignFahrzeuge(einheit.id);
  }, [onAssignFahrzeuge, einheit.id]);

  /** Fahrzeuge dieser Einheit */
  const einheitFahrzeuge = fahrzeugeByEinheit.get(einheit.id) ?? [];

  const handleStatusSelect = useCallback(
    (status: string) => {
      onStatusChange(einheit.id, status);
      setShowStatusMenu(false);
    },
    [onStatusChange, einheit.id],
  );

  const handleToggleStatusMenu = useCallback(() => {
    setShowStatusMenu((prev) => !prev);
  }, []);

  // Dynamische Einrückung: 24px pro Ebene
  const paddingLeft = depth * 24;

  return (
    <div>
      <div className="rounded-panel border border-border-subtle bg-surface-panel shadow-panel transition-colors hover:border-border-strong" style={{ marginLeft: `${paddingLeft}px` }}>
        <div className="flex items-center gap-3 p-4">
          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-control text-text-muted transition-colors',
              hasChildren ? 'hover:bg-action-secondary hover:text-text-primary' : 'invisible',
            )}
            aria-label={isCollapsed ? 'Einheiten aufklappen' : 'Einheiten einklappen'}
            aria-expanded={!isCollapsed}
            disabled={!hasChildren}
          >
            {isCollapsed ? <PiCaretRight className="h-4 w-4" /> : <PiCaretDown className="h-4 w-4" />}
          </button>

          {/* Einheit Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-text-primary">{einheit.name}</h3>
              <EinheitTypBadge typ={einheit.typ} />
              <EinheitStatusBadge status={einheit.status} />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              {/* Stärke ist/soll als visueller Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised px-2 py-0.5 font-medium">
                <PiUsers className="h-3.5 w-3.5" />
                <span
                  className={
                    einheit.istStaerke >= einheit.sollStaerke && einheit.sollStaerke > 0 ? 'text-status-success-text' : einheit.istStaerke > 0 ? 'text-status-warning-text' : 'text-text-muted'
                  }
                >
                  {einheit.istStaerke ?? 0}
                </span>
                <span className="text-text-muted">/</span>
                <span className="text-text-secondary">{einheit.sollStaerke}</span>
              </span>

              {/* Einheitenführer Name */}
              {einheit.einheitenfuehrerName && (
                <span className="inline-flex items-center gap-1">
                  <PiUserCircle className="h-3.5 w-3.5" />
                  {einheit.einheitenfuehrerName}
                </span>
              )}

              {/* Auftrag */}
              {einheit.auftrag && (
                <span className="truncate text-text-secondary" title={String(einheit.auftrag)}>
                  Auftrag: {String(einheit.auftrag)}
                </span>
              )}

              {/* Fahrzeug-Badges */}
              {einheitFahrzeuge.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <PiTruck className="h-3.5 w-3.5" />
                  {einheitFahrzeuge.slice(0, 3).map((f) => (
                    <span key={f.id} className="rounded-pill bg-surface-raised px-1.5 py-0.5 text-xs font-medium text-text-secondary">
                      {f.funkrufname}
                    </span>
                  ))}
                  {einheitFahrzeuge.length > 3 && <span className="text-xs text-text-muted">+{einheitFahrzeuge.length - 3}</span>}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-1">
            {/* Kind hinzufügen */}
            <Button intent="secondary" appearance="ghost" size="icon" onClick={handleAddChild} title="Untereinheit hinzufügen" aria-label="Untereinheit hinzufügen">
              <PiPlus className="h-4 w-4" />
            </Button>

            {/* Personen zuweisen */}
            <Button intent="info" appearance="ghost" size="icon" onClick={handleAssignPersonen} title="Personen zuweisen" aria-label="Personen zuweisen">
              <PiUsers className="h-4 w-4" />
            </Button>

            {/* Fahrzeuge zuweisen */}
            <Button intent="secondary" appearance="ghost" size="icon" onClick={handleAssignFahrzeuge} title="Fahrzeuge zuweisen" aria-label={`Fahrzeuge für ${einheit.name} zuweisen`}>
              <PiTruck className="h-4 w-4" />
            </Button>

            {/* Status ändern */}
            <div className="relative">
              <Button
                intent="secondary"
                appearance="ghost"
                size="icon"
                onClick={handleToggleStatusMenu}
                title="Status ändern"
                aria-label="Status ändern"
                aria-haspopup="true"
                aria-expanded={showStatusMenu}
              >
                <EinheitStatusBadge status={einheit.status} />
              </Button>

              {showStatusMenu && (
                <>
                  {/* Backdrop zum Schließen */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStatusMenu(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowStatusMenu(false);
                    }}
                    role="presentation"
                  />
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-panel border border-border-subtle bg-surface-panel py-1 shadow-panel">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleStatusSelect(option.value)}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-raised',
                          option.value === einheit.status ? 'font-medium text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        <EinheitStatusBadge status={option.value} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bearbeiten */}
            <Button intent="secondary" appearance="ghost" size="icon" onClick={handleEdit} title="Einheit bearbeiten" aria-label="Einheit bearbeiten">
              <PiPencilSimple className="h-4 w-4" />
            </Button>

            {/* Löschen */}
            <Button intent="danger" appearance="ghost" size="icon" onClick={handleDelete} title="Einheit löschen" aria-label="Einheit löschen">
              <PiTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kinder rekursiv rendern */}
      {hasChildren && !isCollapsed && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <EinheitCard
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onAddChild={onAddChild}
              onAssignPersonen={onAssignPersonen}
              onAssignFahrzeuge={onAssignFahrzeuge}
              fahrzeugeByEinheit={fahrzeugeByEinheit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
