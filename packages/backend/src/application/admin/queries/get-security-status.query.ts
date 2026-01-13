import { Result } from '@domain/common/result';

/**
 * Props fuer die GetSecurityStatusQuery Erstellung.
 */
export interface GetSecurityStatusQueryProps {
  /**
   * ID des anfragenden Admins (fuer Audit-Trail).
   * Minimale Laenge: 8 Zeichen (z.B. cuid2, uuid).
   */
  requestedById: string;
}

/**
 * Query zum Abrufen des Security-Status des Servers.
 *
 * Verwendet das Result Pattern fuer Validierung der Query-Parameter.
 *
 * **Use Cases (Story 4.6):**
 * - AC1: INSECURE Mode Status pruefen
 * - AC5: Setup-Completion Status pruefen
 * - AC6: Active Token Count fuer Migration-Entscheidung
 *
 * @example
 * ```typescript
 * const queryResult = GetSecurityStatusQuery.create({
 *   requestedById: 'admin_123',
 * });
 *
 * if (queryResult.isSuccess) {
 *   const statusResult = await handler.execute(queryResult.value);
 *   if (statusResult.isSuccess) {
 *     console.log(`INSECURE Mode: ${statusResult.value.insecureMode}`);
 *   }
 * }
 * ```
 */
export class GetSecurityStatusQuery {
  /**
   * Minimale Laenge fuer requestedById (z.B. cuid2, uuid Format).
   */
  private static readonly MIN_REQUESTED_BY_LENGTH = 8;

  private constructor(public readonly requestedById: string) {}

  /**
   * Factory Method zur Erstellung einer validierten GetSecurityStatusQuery.
   *
   * **Validierung:**
   * - requestedById: Pflichtfeld, nicht-leerer String (min. 8 Zeichen)
   *
   * @param props - GetSecurityStatusQueryProps
   * @returns Result<GetSecurityStatusQuery> - Success mit Query oder Failure mit Error
   */
  static create(props: GetSecurityStatusQueryProps): Result<GetSecurityStatusQuery> {
    // ════════════════════════════════════════════════════════════════════════
    // Validate requestedById (Pflichtfeld)
    // Trim + minimale Laengenpruefung fuer sinnvolle ID
    // ════════════════════════════════════════════════════════════════════════
    const trimmedRequestedById = props.requestedById?.trim() ?? '';

    if (trimmedRequestedById.length === 0) {
      return Result.fail<GetSecurityStatusQuery>('QUERY_REQUESTED_BY_REQUIRED');
    }

    // Minimale Laenge fuer sinnvolle ID (z.B. cuid2, uuid, etc.)
    if (trimmedRequestedById.length < GetSecurityStatusQuery.MIN_REQUESTED_BY_LENGTH) {
      return Result.fail<GetSecurityStatusQuery>('QUERY_REQUESTED_BY_TOO_SHORT');
    }

    return Result.ok<GetSecurityStatusQuery>(new GetSecurityStatusQuery(trimmedRequestedById));
  }
}
