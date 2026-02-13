import { PiClock, PiPencilSimple, PiPlay, PiTrash } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface VorlageCardProps {
  titel: string;
  minuten: number;
  beschreibung: string | null;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Story 6.3: Callback fuer "Verwenden" Button (nur anzeigen wenn gesetzt) */
  onUse?: () => void;
}

/**
 * Atom: Einzelne Vorlage anzeigen mit optionalen Aktions-Buttons (Story 6.2).
 */
export function VorlageCard({ titel, minuten, beschreibung, className, onEdit, onDelete, onUse }: VorlageCardProps) {
  return (
    <div className={cn('rounded-lg border-2 border-gray-200 bg-white p-4 transition-colors', 'hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{titel}</h3>
          {beschreibung && <p className="mt-1 line-clamp-2 text-gray-500 text-xs dark:text-gray-400">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onUse && (
            <button
              type="button"
              onClick={onUse}
              className="rounded-md bg-amber-50 p-1.5 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:hover:text-amber-300"
              aria-label="Vorlage verwenden"
            >
              <PiPlay className="h-4 w-4" />
            </button>
          )}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="Vorlage bearbeiten"
                >
                  <PiPencilSimple className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  aria-label="Vorlage löschen"
                >
                  <PiTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30">
            <PiClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-700 text-xs dark:text-amber-300">{minuten} Min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
