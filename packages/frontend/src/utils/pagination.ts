/**
 * Utility-Funktionen für Pagination
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface PaginatedData<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginiert ein Array von Daten
 * @param data Das zu paginierende Array
 * @param currentPage Die aktuelle Seite (1-basiert)
 * @param pageSize Die Anzahl der Elemente pro Seite
 * @returns Die paginierten Daten mit Meta-Informationen
 */
export function paginate<T>(data: T[], currentPage: number, pageSize: number): PaginatedData<T> {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Stelle sicher, dass currentPage in gültigen Bereich ist
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const items = data.slice(startIndex, endIndex);

  return {
    items,
    totalItems,
    currentPage: validCurrentPage,
    pageSize,
    totalPages,
    hasNextPage: validCurrentPage < totalPages,
    hasPreviousPage: validCurrentPage > 1,
  };
}

/**
 * Berechnet die Seitennavigation (z.B. für Seitenzahlen-Anzeige)
 * @param currentPage Die aktuelle Seite
 * @param totalPages Die Gesamtzahl der Seiten
 * @param maxPages Die maximale Anzahl der anzuzeigenden Seitenzahlen
 * @returns Ein Array mit den anzuzeigenden Seitenzahlen
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxPages: number = 5,
): (number | '...')[] {
  if (totalPages <= maxPages) {
    // Alle Seiten anzeigen
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const halfMax = Math.floor(maxPages / 2);

  // Immer erste Seite anzeigen
  pages.push(1);

  // Start- und Endseite für mittleren Bereich berechnen
  let start = Math.max(2, currentPage - halfMax);
  let end = Math.min(totalPages - 1, currentPage + halfMax);

  // Anpassung wenn am Anfang oder Ende
  if (currentPage <= halfMax + 1) {
    end = maxPages - 1;
  } else if (currentPage >= totalPages - halfMax) {
    start = totalPages - maxPages + 2;
  }

  // Ellipsis am Anfang
  if (start > 2) {
    pages.push('...');
  }

  // Mittlere Seiten
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Ellipsis am Ende
  if (end < totalPages - 1) {
    pages.push('...');
  }

  // Immer letzte Seite anzeigen
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Validiert eine Seitenzahl
 * @param page Die zu validierende Seitenzahl
 * @param totalPages Die Gesamtzahl der Seiten
 * @returns Die validierte Seitenzahl
 */
export function validatePageNumber(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, totalPages || 1));
}

/**
 * Berechnet den Start- und End-Index für die Pagination
 * @param currentPage Die aktuelle Seite
 * @param pageSize Die Anzahl der Elemente pro Seite
 * @returns Start- und End-Index
 */
export function calculatePageBounds(
  currentPage: number,
  pageSize: number,
): { startIndex: number; endIndex: number } {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return { startIndex, endIndex };
}

/**
 * Hook-ähnliche Funktion für Pagination-State-Management
 * (kann in einem Custom Hook verwendet werden)
 */
export function createPaginationState(
  totalItems: number,
  initialPage: number = 1,
  initialPageSize: number = 20,
): {
  state: PaginationState;
  goToPage: (page: number) => PaginationState;
  nextPage: () => PaginationState;
  previousPage: () => PaginationState;
  changePageSize: (pageSize: number) => PaginationState;
} {
  const totalPages = Math.ceil(totalItems / initialPageSize);
  const state: PaginationState = {
    currentPage: validatePageNumber(initialPage, totalPages),
    pageSize: initialPageSize,
    totalItems,
  };

  const goToPage = (page: number): PaginationState => {
    const newTotalPages = Math.ceil(state.totalItems / state.pageSize);
    return {
      ...state,
      currentPage: validatePageNumber(page, newTotalPages),
    };
  };

  const nextPage = (): PaginationState => {
    const newTotalPages = Math.ceil(state.totalItems / state.pageSize);
    return goToPage(Math.min(state.currentPage + 1, newTotalPages));
  };

  const previousPage = (): PaginationState => {
    return goToPage(Math.max(state.currentPage - 1, 1));
  };

  const changePageSize = (pageSize: number): PaginationState => {
    const newTotalPages = Math.ceil(state.totalItems / pageSize);
    return {
      ...state,
      pageSize,
      currentPage: validatePageNumber(state.currentPage, newTotalPages),
    };
  };

  return {
    state,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
  };
}
