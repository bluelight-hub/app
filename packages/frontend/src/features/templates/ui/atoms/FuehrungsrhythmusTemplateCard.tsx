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
    <div className={cn('rounded-lg border-2 border-gray-200 bg-white transition-colors', 'hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600', className)}>
      {/* Header */}
      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="flex w-full items-start justify-between gap-3 p-4" aria-expanded={isExpanded}>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <PiMetronome className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{name}</h3>
            {scope && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs',
                  scope === 'GLOBAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
          {beschreibung && <p className="mt-1 line-clamp-2 text-gray-500 text-xs dark:text-gray-400">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
            {eintraege.length} {eintraege.length === 1 ? 'Erinnerung' : 'Erinnerungen'}
          </span>
          {isExpanded ? <PiCaretUp className="h-4 w-4 text-gray-400" /> : <PiCaretDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Eintraege-Liste (aufklappbar) */}
      {isExpanded && (
        <div className="border-gray-200 border-t px-4 pb-4 pt-3 dark:border-gray-700">
          <div className="space-y-2">
            {eintraege
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((eintrag) => (
                <div key={eintrag.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{eintrag.titel}</span>
                  <div className="flex items-center gap-3 text-gray-500 text-xs dark:text-gray-400">
                    <span>alle {eintrag.intervallMinuten} Min</span>
                    {eintrag.offsetMinuten > 0 && <span className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-700">+{eintrag.offsetMinuten} Min Offset</span>}
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
                className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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
