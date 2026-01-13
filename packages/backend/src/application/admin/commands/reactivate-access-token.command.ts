import { Result } from '@domain/common/result';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';

/**
 * Props fuer die ReactivateAccessTokenCommand Erstellung.
 */
export interface ReactivateAccessTokenCommandProps {
  /** ID des zu reaktivierenden Tokens (mindestens 24 Zeichen) */
  tokenId: string;
  /** ID des Users, der das Token reaktiviert */
  requestedById: string;
}

/**
 * Command zum Reaktivieren eines widerrufenen Access-Tokens.
 *
 * Validiert Input vor Weiterverarbeitung an den Handler.
 * Verwendet Factory Method Pattern fuer konsistente Validierung
 * und Result<T> Pattern fuer explizite Fehlerbehandlung.
 *
 * **Warum Command Pattern:**
 * - Separation of Concerns: Controller validiert HTTP, Command validiert Business Logic
 * - Immutability: Command ist unveraenderlich nach Erstellung
 * - Testing: Commands koennen ohne HTTP-Context getestet werden
 *
 * @example
 * ```typescript
 * const result = ReactivateAccessTokenCommand.create({
 *   tokenId: 'blh_abc123def456ghi789jkl012',
 *   requestedById: 'user_123',
 * });
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   await handler.execute(command);
 * }
 * ```
 */
export class ReactivateAccessTokenCommand {
  /** Minimum erlaubte Token-ID Laenge (cuid2 = 24 Zeichen) */
  private static readonly MIN_TOKEN_ID_LENGTH = 24;
  /** Minimum erlaubte User-ID Laenge */
  private static readonly MIN_USER_ID_LENGTH = 8;

  private constructor(
    public readonly tokenId: string,
    public readonly requestedById: string,
  ) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<ReactivateAccessTokenCommand>
   * zurueck. Bei Validierungsfehlern wird Result.fail() zurueckgegeben.
   *
   * **Business Rules:**
   * - tokenId muss mindestens 24 Zeichen lang sein (nach trim)
   * - requestedById muss mindestens 8 Zeichen lang sein (nach trim)
   *
   * @param props - Die Eingabedaten
   * @returns Result<ReactivateAccessTokenCommand> - Success mit Command oder Failure mit Error Code
   */
  static create(props: ReactivateAccessTokenCommandProps): Result<ReactivateAccessTokenCommand> {
    // Trim values for validation
    const trimmedTokenId = props.tokenId?.trim() ?? '';
    const trimmedRequestedById = props.requestedById?.trim() ?? '';

    // Validate tokenId is not empty
    if (!trimmedTokenId) {
      return Result.fail<ReactivateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // Validate minimum tokenId length (24 characters for cuid2)
    if (trimmedTokenId.length < ReactivateAccessTokenCommand.MIN_TOKEN_ID_LENGTH) {
      return Result.fail<ReactivateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // Validate requestedById is not empty
    if (!trimmedRequestedById) {
      return Result.fail<ReactivateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    }

    // Validate minimum requestedById length
    if (trimmedRequestedById.length < ReactivateAccessTokenCommand.MIN_USER_ID_LENGTH) {
      return Result.fail<ReactivateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    }

    return Result.ok(new ReactivateAccessTokenCommand(trimmedTokenId, trimmedRequestedById));
  }
}
