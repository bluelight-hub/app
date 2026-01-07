import { Result } from '@domain/common/result';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';

/**
 * Erlaubte Felder für die Sortierung von InviteCodes.
 */
export type InviteCodeSortField = 'createdAt' | 'expiresAt' | 'useCount';

/**
 * Erlaubte Sortierrichtungen.
 */
export type InviteCodeSortDirection = 'asc' | 'desc';

/**
 * Filter-Optionen für ListInvitesQuery.
 */
export interface ListInvitesFilters {
  /** Filtert nach berechnetem Status */
  status?: InviteCodeStatus;
  /** Filtert nach dem Ersteller des Codes */
  createdById?: string;
}

/**
 * Sortier-Optionen für ListInvitesQuery.
 */
export interface ListInvitesSort {
  /** Feld nach dem sortiert werden soll */
  field: InviteCodeSortField;
  /** Sortierrichtung */
  direction: InviteCodeSortDirection;
}

/**
 * Pagination-Optionen für ListInvitesQuery.
 */
export interface ListInvitesPagination {
  /** Seitennummer (1-basiert) */
  page: number;
  /** Anzahl der Einträge pro Seite */
  pageSize: number;
}

/**
 * Props für die Query-Erstellung.
 */
export interface ListInvitesQueryProps {
  /** Filter-Optionen (optional) */
  filters?: ListInvitesFilters;
  /** Sortier-Optionen (optional, default: createdAt desc) */
  sort?: ListInvitesSort;
  /** Pagination-Optionen (optional, default: page 1, pageSize 20) */
  pagination?: ListInvitesPagination;
  /** ID des anfragenden Admins (für Audit-Trail) */
  requestedById: string;
}

/**
 * Query zum Auflisten von Invite-Codes mit Pagination, Filterung und Sortierung.
 *
 * Verwendet das Result Pattern für Validierung der Query-Parameter.
 *
 * **Erlaubte Sort-Felder:** 'createdAt', 'expiresAt', 'useCount'
 * **Erlaubte Status:** alle InviteCodeStatus Werte
 *
 * **Defaults:**
 * - filters: keine Filterung
 * - sort: { field: 'createdAt', direction: 'desc' }
 * - pagination: { page: 1, pageSize: 20 }
 *
 * @example
 * ```typescript
 * // Alle aktiven Codes, neueste zuerst
 * const query = ListInvitesQuery.create({
 *   filters: { status: InviteCodeStatus.ACTIVE },
 *   requestedById: 'admin_123',
 * });
 *
 * // Mit Pagination
 * const query = ListInvitesQuery.create({
 *   pagination: { page: 2, pageSize: 10 },
 *   requestedById: 'admin_123',
 * });
 * ```
 */
export class ListInvitesQuery {
  /** Erlaubte Sortier-Felder */
  private static readonly ALLOWED_SORT_FIELDS: ReadonlySet<InviteCodeSortField> = new Set(['createdAt', 'expiresAt', 'useCount']);

  /** Erlaubte Sortier-Richtungen */
  private static readonly ALLOWED_SORT_DIRECTIONS: ReadonlySet<InviteCodeSortDirection> = new Set(['asc', 'desc']);

  /** Erlaubte Status-Werte */
  private static readonly ALLOWED_STATUS_VALUES: ReadonlySet<InviteCodeStatus> = new Set(Object.values(InviteCodeStatus));

  /** Minimale Seitennummer */
  private static readonly MIN_PAGE = 1;

  /** Minimale Seitengröße */
  private static readonly MIN_PAGE_SIZE = 1;

  /** Maximale Seitengröße */
  private static readonly MAX_PAGE_SIZE = 100;

  /** Default Seitengröße */
  private static readonly DEFAULT_PAGE_SIZE = 20;

  private constructor(
    public readonly filters: ListInvitesFilters | undefined,
    public readonly sort: ListInvitesSort,
    public readonly pagination: ListInvitesPagination,
    public readonly requestedById: string,
  ) {}

  /**
   * Factory Method zur Erstellung einer validierten ListInvitesQuery.
   *
   * **Validierung:**
   * - requestedById: Pflichtfeld, nicht-leerer String
   * - filters.status: Muss gültiger InviteCodeStatus sein
   * - sort.field: Muss erlaubtes Sortierfeld sein
   * - sort.direction: Muss 'asc' oder 'desc' sein
   * - pagination.page: >= 1
   * - pagination.pageSize: 1-100
   *
   * @param props - ListInvitesQueryProps
   * @returns Result<ListInvitesQuery> - Success mit Query oder Failure mit Error
   */
  static create(props: ListInvitesQueryProps): Result<ListInvitesQuery> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Validate requestedById (Pflichtfeld)
    // ════════════════════════════════════════════════════════════════════════
    if (!props.requestedById || props.requestedById.trim().length === 0) {
      return Result.fail<ListInvitesQuery>('QUERY_REQUESTED_BY_REQUIRED');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Validate filters (optional)
    // ════════════════════════════════════════════════════════════════════════
    if (props.filters?.status !== undefined) {
      if (!ListInvitesQuery.ALLOWED_STATUS_VALUES.has(props.filters.status)) {
        return Result.fail<ListInvitesQuery>(`QUERY_INVALID_STATUS: ${props.filters.status}. Allowed: ${Array.from(ListInvitesQuery.ALLOWED_STATUS_VALUES).join(', ')}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Validate and default sort options
    // ════════════════════════════════════════════════════════════════════════
    let sort: ListInvitesSort = { field: 'createdAt', direction: 'desc' };

    if (props.sort !== undefined) {
      if (!ListInvitesQuery.ALLOWED_SORT_FIELDS.has(props.sort.field)) {
        return Result.fail<ListInvitesQuery>(`QUERY_INVALID_SORT_FIELD: ${props.sort.field}. Allowed: ${Array.from(ListInvitesQuery.ALLOWED_SORT_FIELDS).join(', ')}`);
      }

      if (!ListInvitesQuery.ALLOWED_SORT_DIRECTIONS.has(props.sort.direction)) {
        return Result.fail<ListInvitesQuery>(`QUERY_INVALID_SORT_DIRECTION: ${props.sort.direction}. Allowed: asc, desc`);
      }

      sort = props.sort;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Validate and default pagination options
    // ════════════════════════════════════════════════════════════════════════
    let pagination: ListInvitesPagination = {
      page: ListInvitesQuery.MIN_PAGE,
      pageSize: ListInvitesQuery.DEFAULT_PAGE_SIZE,
    };

    if (props.pagination !== undefined) {
      if (props.pagination.page < ListInvitesQuery.MIN_PAGE) {
        return Result.fail<ListInvitesQuery>(`QUERY_INVALID_PAGE: ${props.pagination.page}. Must be >= ${ListInvitesQuery.MIN_PAGE}`);
      }

      if (props.pagination.pageSize < ListInvitesQuery.MIN_PAGE_SIZE || props.pagination.pageSize > ListInvitesQuery.MAX_PAGE_SIZE) {
        return Result.fail<ListInvitesQuery>(`QUERY_INVALID_PAGE_SIZE: ${props.pagination.pageSize}. Must be ${ListInvitesQuery.MIN_PAGE_SIZE}-${ListInvitesQuery.MAX_PAGE_SIZE}`);
      }

      pagination = props.pagination;
    }

    return Result.ok<ListInvitesQuery>(new ListInvitesQuery(props.filters, sort, pagination, props.requestedById.trim()));
  }
}
