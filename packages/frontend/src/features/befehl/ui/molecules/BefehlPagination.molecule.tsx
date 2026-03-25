/**
 * BefehlPagination Molecule
 *
 * Pagination-Steuerung fuer die Befehl-Tabelle mit Seiten-Navigation
 * und Anzeige der aktuellen Position.
 */

import { PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface BefehlPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
  className?: string;
}

export function BefehlPagination({ currentPage, totalPages, totalItems, pageSize, onPreviousPage, onNextPage, canPreviousPage, canNextPage, className }: BefehlPaginationProps) {
  if (totalPages <= 1) return null;

  const itemsOnPage = Math.min(pageSize, totalItems - (currentPage - 1) * pageSize);
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = rangeStart + itemsOnPage - 1;

  return (
    <nav className={cn('flex items-center justify-between border-t border-border-subtle px-2 py-3', className)} aria-label="Tabellen-Pagination">
      <span className="text-sm text-text-muted">
        {rangeStart}–{rangeEnd} von {totalItems} {totalItems === 1 ? 'Befehl' : 'Befehlen'}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium',
            'transition-colors motion-reduce:transition-none',
            canPreviousPage ? 'text-text-secondary hover:bg-action-secondary' : 'cursor-not-allowed text-text-muted',
          )}
          aria-label="Vorherige Seite"
        >
          <PiCaretLeft className="h-4 w-4" aria-hidden="true" />
          Zurück
        </button>

        <span className="text-sm text-text-secondary">
          Seite {currentPage} von {totalPages}
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={!canNextPage}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium',
            'transition-colors motion-reduce:transition-none',
            canNextPage ? 'text-text-secondary hover:bg-action-secondary' : 'cursor-not-allowed text-text-muted',
          )}
          aria-label="Nächste Seite"
        >
          Weiter
          <PiCaretRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
