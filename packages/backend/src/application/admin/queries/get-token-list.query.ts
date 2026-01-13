import { Result } from '@domain/common/result';

/**
 * Erlaubte Sortierfelder fuer Token-Liste.
 */
export type TokenSortBy = 'createdAt' | 'lastUsedAt' | 'name';

/**
 * Sortierrichtung (aufsteigend/absteigend).
 */
export type TokenSortOrder = 'asc' | 'desc';

/**
 * Props für die GetTokenListQuery Erstellung.
 */
export interface GetTokenListQueryProps {
  /** Seitennummer (1-basiert, default: 1) */
  page?: number;
  /** Anzahl der Einträge pro Seite (default: 20) */
  limit?: number;
  /** ID des anfragenden Admins (für Audit-Trail) */
  requestedById: string;
  /** Sortierfeld (default: createdAt) */
  sortBy?: TokenSortBy;
  /** Sortierrichtung (default: desc) */
  sortOrder?: TokenSortOrder;
  /** Filter: Tokens die länger als X Tage nicht verwendet wurden (inkl. nie verwendet) */
  inactiveDays?: number;
}

/**
 * Query zum Auflisten von Server-Access-Tokens mit Pagination, Sortierung und Filter.
 *
 * Verwendet das Result Pattern für Validierung der Query-Parameter.
 *
 * **Defaults:**
 * - page: 1
 * - limit: 20
 * - sortBy: 'createdAt'
 * - sortOrder: 'desc'
 *
 * **Sortierung:**
 * - Tokens werden standardmäßig nach createdAt DESC sortiert (neueste zuerst)
 * - Sortierfeld kann auf 'createdAt', 'lastUsedAt' oder 'name' gesetzt werden
 *
 * **Inaktivitäts-Filter (inactiveDays):**
 * - Filtert Tokens, die länger als X Tage nicht verwendet wurden
 * - Inkludiert auch Tokens die NIE verwendet wurden (lastUsedAt IS NULL)
 *
 * @example
 * ```typescript
 * // Alle Tokens, neueste zuerst
 * const query = GetTokenListQuery.create({
 *   requestedById: 'admin_123',
 * });
 *
 * // Mit Pagination und Sortierung nach Namen
 * const query = GetTokenListQuery.create({
 *   page: 2,
 *   limit: 10,
 *   sortBy: 'name',
 *   sortOrder: 'asc',
 *   requestedById: 'admin_123',
 * });
 *
 * // Inaktive Tokens (> 30 Tage nicht verwendet)
 * const query = GetTokenListQuery.create({
 *   inactiveDays: 30,
 *   requestedById: 'admin_123',
 * });
 * ```
 */
export class GetTokenListQuery {
  /** Minimale Seitennummer */
  private static readonly MIN_PAGE = 1;

  /** Minimale Seitengröße */
  private static readonly MIN_LIMIT = 1;

  /** Maximale Seitengröße */
  private static readonly MAX_LIMIT = 100;

  /** Default Seitengröße */
  private static readonly DEFAULT_LIMIT = 20;

  /** Default Sortierfeld */
  private static readonly DEFAULT_SORT_BY: TokenSortBy = 'createdAt';

  /** Default Sortierrichtung */
  private static readonly DEFAULT_SORT_ORDER: TokenSortOrder = 'desc';

  /** Erlaubte Sortierfelder */
  private static readonly VALID_SORT_BY: TokenSortBy[] = ['createdAt', 'lastUsedAt', 'name'];

  /** Erlaubte Sortierrichtungen */
  private static readonly VALID_SORT_ORDER: TokenSortOrder[] = ['asc', 'desc'];

  /** Minimale Inaktivitätstage */
  private static readonly MIN_INACTIVE_DAYS = 1;

  private constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly requestedById: string,
    public readonly sortBy: TokenSortBy,
    public readonly sortOrder: TokenSortOrder,
    public readonly inactiveDays: number | null,
  ) {}

  /**
   * Factory Method zur Erstellung einer validierten GetTokenListQuery.
   *
   * **Validierung:**
   * - requestedById: Pflichtfeld, nicht-leerer String (min. 8 Zeichen)
   * - page: >= 1
   * - limit: 1-100
   * - sortBy: 'createdAt' | 'lastUsedAt' | 'name' (default: 'createdAt')
   * - sortOrder: 'asc' | 'desc' (default: 'desc')
   * - inactiveDays: >= 1 oder undefined/null (Filter fuer inaktive Tokens)
   *
   * @param props - GetTokenListQueryProps
   * @returns Result<GetTokenListQuery> - Success mit Query oder Failure mit Error
   */
  static create(props: GetTokenListQueryProps): Result<GetTokenListQuery> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Validate requestedById (Pflichtfeld)
    // Trim + minimale Laengenpruefung fuer sinnvolle ID
    // ════════════════════════════════════════════════════════════════════════
    const trimmedRequestedById = props.requestedById?.trim() ?? '';
    if (trimmedRequestedById.length === 0) {
      return Result.fail<GetTokenListQuery>('QUERY_REQUESTED_BY_REQUIRED');
    }
    // Minimale Laenge fuer sinnvolle ID (z.B. cuid2, uuid, etc.)
    if (trimmedRequestedById.length < 8) {
      return Result.fail<GetTokenListQuery>('QUERY_REQUESTED_BY_TOO_SHORT');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Validate and default page
    // ════════════════════════════════════════════════════════════════════════
    const page = props.page ?? GetTokenListQuery.MIN_PAGE;
    if (page < GetTokenListQuery.MIN_PAGE) {
      return Result.fail<GetTokenListQuery>(`QUERY_INVALID_PAGE: ${page}. Must be >= ${GetTokenListQuery.MIN_PAGE}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Validate and default limit
    // ════════════════════════════════════════════════════════════════════════
    const limit = props.limit ?? GetTokenListQuery.DEFAULT_LIMIT;
    if (limit < GetTokenListQuery.MIN_LIMIT || limit > GetTokenListQuery.MAX_LIMIT) {
      return Result.fail<GetTokenListQuery>(`QUERY_INVALID_LIMIT: ${limit}. Must be ${GetTokenListQuery.MIN_LIMIT}-${GetTokenListQuery.MAX_LIMIT}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Validate and default sortBy
    // ════════════════════════════════════════════════════════════════════════
    const sortBy = props.sortBy ?? GetTokenListQuery.DEFAULT_SORT_BY;
    if (!GetTokenListQuery.VALID_SORT_BY.includes(sortBy)) {
      return Result.fail<GetTokenListQuery>(`QUERY_INVALID_SORT_BY: ${sortBy}. Must be one of: ${GetTokenListQuery.VALID_SORT_BY.join(', ')}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. Validate and default sortOrder
    // ════════════════════════════════════════════════════════════════════════
    const sortOrder = props.sortOrder ?? GetTokenListQuery.DEFAULT_SORT_ORDER;
    if (!GetTokenListQuery.VALID_SORT_ORDER.includes(sortOrder)) {
      return Result.fail<GetTokenListQuery>(`QUERY_INVALID_SORT_ORDER: ${sortOrder}. Must be one of: ${GetTokenListQuery.VALID_SORT_ORDER.join(', ')}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. Validate inactiveDays (optional filter)
    // ════════════════════════════════════════════════════════════════════════
    const inactiveDays = props.inactiveDays ?? null;
    if (inactiveDays !== null) {
      if (!Number.isInteger(inactiveDays) || inactiveDays < GetTokenListQuery.MIN_INACTIVE_DAYS) {
        return Result.fail<GetTokenListQuery>(`QUERY_INVALID_INACTIVE_DAYS: ${inactiveDays}. Must be an integer >= ${GetTokenListQuery.MIN_INACTIVE_DAYS}`);
      }
    }

    return Result.ok<GetTokenListQuery>(new GetTokenListQuery(page, limit, trimmedRequestedById, sortBy, sortOrder, inactiveDays));
  }
}
