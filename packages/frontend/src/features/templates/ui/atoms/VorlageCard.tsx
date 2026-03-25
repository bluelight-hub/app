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
    <div className={cn('rounded-panel border-2 border-border-subtle bg-surface-panel p-4 transition-colors', 'hover:border-border-strong', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">{titel}</h3>
          {beschreibung && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onUse && (
            <button
              type="button"
              onClick={onUse}
              className="rounded-control bg-status-warning-surface p-1.5 text-status-warning-text transition-colors hover:bg-action-secondary hover:text-text-primary"
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
                  className="rounded-control p-1.5 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary"
                  aria-label="Vorlage bearbeiten"
                >
                  <PiPencilSimple className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-control p-1.5 text-text-muted transition-colors hover:bg-status-danger-surface hover:text-status-danger-text"
                  aria-label="Vorlage löschen"
                >
                  <PiTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-pill bg-status-warning-surface px-2.5 py-1">
            <PiClock className="h-3.5 w-3.5 text-status-warning-text" />
            <span className="text-xs font-medium text-status-warning-text">{minuten} Min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
