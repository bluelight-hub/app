interface EtbResultsCountProps {
  filteredCount: number;
  totalCount: number;
  hasGlobalFilter: boolean;
  hasNextPage?: boolean;
}

/**
 * ETB Ergebnis-Zähler
 */
export function EtbResultsCount({ filteredCount, totalCount, hasGlobalFilter, hasNextPage }: EtbResultsCountProps) {
  return (
    <div className="text-sm text-text-muted">
      {hasGlobalFilter && filteredCount !== totalCount ? `${filteredCount} von ${totalCount} Einträgen` : `${totalCount} Einträge`}
      {hasNextPage && ' (weitere werden beim Scrollen geladen)'}
    </div>
  );
}
