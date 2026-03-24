import { useState } from 'react';
import { PiBuilding, PiCaretDown, PiCaretUp, PiLightning, PiMetronome, PiPencil, PiSiren, PiTrash } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';

interface EintragInfo {
  id: string;
  titel: string;
  intervallMinuten: number;
  offsetMinuten: number;
  sortOrder: number;
}

interface FuehrungsrhythmusTemplateCardProps {
  id: string;
  name: string;
  beschreibung: string | null;
  eintraege: EintragInfo[];
  einsatzId: string | null;
  scope?: string;
  onActivate?: (templateId: string) => void;
  onEdit?: (templateId: string) => void;
  onDelete?: (templateId: string) => void;
  className?: string;
}

/**
 * Atom: Fuehrungsrhythmus-Template anzeigen mit aufklappbarer Eintragsliste
 * und Aktivieren-Button (Story 6.6 AC2 + Story 6.7 AC1).
 */
export function FuehrungsrhythmusTemplateCard({ id, name, beschreibung, eintraege, einsatzId, scope, onActivate, onEdit, onDelete, className }: FuehrungsrhythmusTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('rounded-panel border-2 border-border-subtle bg-surface-panel transition-colors', 'hover:border-border-strong', className)}>
      {/* Header */}
      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="flex w-full items-start justify-between gap-3 p-4" aria-expanded={isExpanded}>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <PiMetronome className="h-4 w-4 shrink-0 text-status-warning-text" />
            <h3 className="truncate font-semibold text-text-primary text-sm">{name}</h3>
            {scope && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs',
                  scope === 'GLOBAL' ? 'bg-status-info-surface text-status-info-text' : 'bg-surface-raised text-text-secondary',
                )}
              >
                {scope === 'GLOBAL' ? (
                  <>
                    <PiBuilding className="h-3 w-3" /> Global
                  </>
                ) : (
                  <>
                    <PiSiren className="h-3 w-3" /> Einsatz
                  </>
                )}
              </span>
            )}
          </div>
          {beschreibung && <p className="mt-1 line-clamp-2 text-text-muted text-xs">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-pill bg-status-warning-surface px-2.5 py-1 font-medium text-status-warning-text text-xs">
            {eintraege.length} {eintraege.length === 1 ? 'Erinnerung' : 'Erinnerungen'}
          </span>
          {isExpanded ? <PiCaretUp className="h-4 w-4 text-text-muted" /> : <PiCaretDown className="h-4 w-4 text-text-muted" />}
        </div>
      </button>

      {/* Eintraege-Liste (aufklappbar) */}
      {isExpanded && (
        <div className="border-border-subtle border-t px-4 pt-3 pb-4">
          <div className="space-y-2">
            {eintraege
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((eintrag) => (
                <div key={eintrag.id} className="flex items-center justify-between rounded-control bg-surface-raised px-3 py-2 text-sm">
                  <span className="font-medium text-text-secondary">{eintrag.titel}</span>
                  <div className="flex items-center gap-3 text-text-muted text-xs">
                    <span>alle {eintrag.intervallMinuten} Min</span>
                    {eintrag.offsetMinuten > 0 && <span className="rounded bg-surface-panel px-1.5 py-0.5">+{eintrag.offsetMinuten} Min Offset</span>}
                  </div>
                </div>
              ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center justify-end gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(id);
                }}
                className="rounded-control p-2 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary"
                aria-label={`${name} bearbeiten`}
              >
                <PiPencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="rounded-control p-2 text-text-muted transition-colors hover:bg-status-danger-surface hover:text-status-danger-text"
                aria-label={`${name} loeschen`}
              >
                <PiTrash className="h-4 w-4" />
              </button>
            )}
            <Button
              intent="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onActivate?.(id);
              }}
              disabled={!einsatzId}
              title={!einsatzId ? 'Waehle zuerst einen Einsatz' : `Fuehrungsrhythmus "${name}" aktivieren`}
            >
              <PiLightning className="mr-1.5 h-3.5 w-3.5" />
              Aktivieren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
