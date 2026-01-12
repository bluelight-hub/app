import { Result } from '@domain/common/result';

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
}

/**
 * Query zum Auflisten von Server-Access-Tokens mit Pagination.
 *
 * Verwendet das Result Pattern für Validierung der Query-Parameter.
 *
 * **Defaults:**
 * - page: 1
 * - limit: 20
 *
 * **Sortierung:**
 * - Tokens werden nach createdAt DESC sortiert (neueste zuerst)
 *
 * @example
 * ```typescript
 * // Alle Tokens, neueste zuerst
 * const query = GetTokenListQuery.create({
 *   requestedById: 'admin_123',
 * });
 *
 * // Mit Pagination
 * const query = GetTokenListQuery.create({
 *   page: 2,
 *   limit: 10,
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

  private constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly requestedById: string,
  ) {}

  /**
   * Factory Method zur Erstellung einer validierten GetTokenListQuery.
   *
   * **Validierung:**
   * - requestedById: Pflichtfeld, nicht-leerer String
   * - page: >= 1
   * - limit: 1-100
   *
   * @param props - GetTokenListQueryProps
   * @returns Result<GetTokenListQuery> - Success mit Query oder Failure mit Error
   */
  static create(props: GetTokenListQueryProps): Result<GetTokenListQuery> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Validate requestedById (Pflichtfeld)
    // ════════════════════════════════════════════════════════════════════════
    if (!props.requestedById || props.requestedById.trim().length === 0) {
      return Result.fail<GetTokenListQuery>('QUERY_REQUESTED_BY_REQUIRED');
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

    return Result.ok<GetTokenListQuery>(new GetTokenListQuery(page, limit, props.requestedById.trim()));
  }
}
