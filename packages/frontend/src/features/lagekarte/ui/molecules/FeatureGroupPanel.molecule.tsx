/**
 * FeatureGroupPanel — Verwaltung von Feature-Gruppen
 *
 * Wird im DrawStylePanel-Bereich angezeigt wenn Features selektiert sind.
 * Ermöglicht das Erstellen und Auflösen von Gruppen.
 */

import { useState } from 'react';
import { cn } from '@/shared/ui/cn';
import type { FeatureGroup } from '../../stores/draw.store';

export interface FeatureGroupPanelProps {
  /** Anzahl selektierter Features */
  selectionCount: number;
  /** Gruppen der aktuell selektierten Features */
  groupsForSelection: FeatureGroup[];
  /** Alle Gruppen */
  allGroups: FeatureGroup[];
  /** Neue Gruppe erstellen */
  onCreateGroup: (name: string) => void;
  /** Gruppe auflösen */
  onDissolveGroup: (groupId: string) => void;
  /** Gruppe selektieren */
  onSelectGroup: (groupId: string) => void;
  /** Panel-Sichtbarkeit */
  isVisible: boolean;
}

export function FeatureGroupPanel({ selectionCount, groupsForSelection, allGroups, onCreateGroup, onDissolveGroup, onSelectGroup, isVisible }: FeatureGroupPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  if (!isVisible) return null;

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim());
    setNewGroupName('');
    setIsCreating(false);
  };

  return (
    <div className="absolute top-4 left-16 z-10 w-56 rounded-lg border border-border-subtle bg-surface-panel shadow-lg">
      <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
        Gruppen {selectionCount > 1 && <span className="text-text-muted">({selectionCount} ausgewählt)</span>}
      </div>

      <div className="max-h-48 overflow-y-auto p-2">
        {/* Bestehende Gruppen */}
        {allGroups.length > 0 && (
          <div className="space-y-1">
            {allGroups.map((group) => {
              const isInSelection = groupsForSelection.some((g) => g.id === group.id);
              return (
                <div key={group.id} className={cn('flex items-center justify-between rounded px-2 py-1 text-xs', isInSelection ? 'bg-action-secondary/50' : '')}>
                  <button type="button" onClick={() => onSelectGroup(group.id)} className="truncate text-text-primary hover:text-action-primary" title={`${group.featureIds.length} Objekte`}>
                    {group.name}
                    <span className="ml-1 text-text-muted">({group.featureIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDissolveGroup(group.id)}
                    className="ml-2 shrink-0 text-text-muted hover:text-red-500"
                    title="Gruppe auflösen"
                    aria-label={`Gruppe ${group.name} auflösen`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {allGroups.length === 0 && !isCreating && <p className="px-2 py-1 text-xs text-text-muted">Keine Gruppen vorhanden</p>}

        {/* Neue Gruppe erstellen */}
        {isCreating ? (
          <div className="mt-2 flex gap-1">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Gruppenname…"
              className="bg-surface-secondary min-w-0 flex-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-action-primary focus:outline-none"
              autoFocus
            />
            <button type="button" onClick={handleCreate} className="shrink-0 rounded bg-action-primary px-2 py-1 text-xs text-white hover:bg-action-primary/90">
              OK
            </button>
          </div>
        ) : (
          selectionCount >= 2 && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-2 w-full rounded border border-dashed border-border-subtle px-2 py-1 text-xs text-text-muted hover:border-action-primary hover:text-action-primary"
            >
              + Gruppe erstellen
            </button>
          )
        )}
      </div>
    </div>
  );
}
