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
    <nav className={cn('flex items-center justify-between border-gray-200 border-t px-2 py-3 dark:border-gray-700', className)} aria-label="Tabellen-Pagination">
      <span className="text-gray-500 text-sm dark:text-gray-400">
        {rangeStart}–{rangeEnd} von {totalItems} {totalItems === 1 ? 'Befehl' : 'Befehlen'}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-medium text-sm',
            'transition-colors motion-reduce:transition-none',
            canPreviousPage ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800' : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
          )}
          aria-label="Vorherige Seite"
        >
          <PiCaretLeft className="h-4 w-4" aria-hidden="true" />
          Zurück
        </button>

        <span className="text-gray-700 text-sm dark:text-gray-300">
          Seite {currentPage} von {totalPages}
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={!canNextPage}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-medium text-sm',
            'transition-colors motion-reduce:transition-none',
            canNextPage ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800' : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
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
