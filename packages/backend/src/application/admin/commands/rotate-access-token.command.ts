import { Result } from '@domain/common/result';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';

/**
 * Props fuer die RotateAccessTokenCommand Erstellung.
 */
export interface RotateAccessTokenCommandProps {
  /** ID des zu rotierenden Tokens (mindestens 24 Zeichen) */
  tokenId: string;
  /** Optionaler neuer Name fuer das rotierte Token (3-50 Zeichen) */
  newName?: string;
  /** ID des Users, der die Rotation anfordert */
  requestedById: string;
}

/**
 * Response DTO fuer erfolgreiche Token-Rotation.
 *
 * Enthaelt das neue Raw-Token das NUR EINMAL sichtbar ist
 * sowie Metadaten ueber das rotierte Token.
 */
export interface RotateAccessTokenResult {
  /** Das neue Raw-Token (EINMALIG sichtbar!) */
  token: string;
  /** Name des neuen Tokens */
  name: string | null;
  /** Token-Prefix fuer Identifikation (erste 12 Zeichen) */
  prefix: string;
  /** Erstellungszeitpunkt des neuen Tokens (ISO-Format) */
  createdAt: string;
  /** ID des alten Tokens von dem rotiert wurde */
  rotatedFromId: string;
}

/**
 * Command zum Rotieren eines Access-Tokens.
 *
 * Bei einer Token-Rotation wird das alte Token widerrufen und ein neues
 * Token mit denselben Berechtigungen erstellt. Das neue Token verweist
 * auf das alte Token via `rotatedFromId` fuer vollstaendige Audit-Trail-
 * Nachverfolgbarkeit.
 *
 * **Business Rules:**
 * - tokenId muss mindestens 24 Zeichen lang sein (cuid2 Format)
 * - newName ist optional (3-50 Zeichen wenn angegeben)
 * - requestedById muss mindestens 8 Zeichen lang sein
 * - Token muss aktiv sein (nicht revoked, nicht expired)
 *
 * **Warum Rotation statt Update:**
 * - Security Best Practice: Alte Tokens sollten nie wiederverwendet werden
 * - Audit Trail: Vollstaendige Historie von Token-Lebenszyklen
 * - Zero-Downtime: Neues Token sofort nutzbar, altes sofort ungueltig
 *
 * @example
 * ```typescript
 * const result = RotateAccessTokenCommand.create({
 *   tokenId: 'blh_abc123def456ghi789jkl012',
 *   newName: 'CI/CD Token (rotated)',
 *   requestedById: 'user_123',
 * });
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   const rotationResult = await handler.execute(command);
 *   console.log(rotationResult.value.token); // Neues Token (nur hier sichtbar!)
 * }
 * ```
 */
export class RotateAccessTokenCommand {
  /** Minimum erlaubte Token-ID Laenge (cuid2 = 24 Zeichen) */
  private static readonly MIN_TOKEN_ID_LENGTH = 24;
  /** Minimum erlaubte Namenlaenge */
  private static readonly MIN_NAME_LENGTH = 3;
  /** Maximum erlaubte Namenlaenge */
  private static readonly MAX_NAME_LENGTH = 50;
  /** Minimum erlaubte User-ID Laenge */
  private static readonly MIN_USER_ID_LENGTH = 8;

  private constructor(
    public readonly tokenId: string,
    public readonly newName: string | undefined,
    public readonly requestedById: string,
  ) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<RotateAccessTokenCommand>
   * zurueck. Bei Validierungsfehlern wird Result.fail() zurueckgegeben.
   *
   * **Validation Rules:**
   * - tokenId: nicht leer, mindestens 24 Zeichen
   * - newName (optional): wenn angegeben, 3-50 Zeichen (nach trim)
   * - requestedById: nicht leer, mindestens 8 Zeichen
   *
   * @param props - Die Eingabedaten
   * @returns Result<RotateAccessTokenCommand> - Success mit Command oder Failure mit Error Code
   */
  static create(props: RotateAccessTokenCommandProps): Result<RotateAccessTokenCommand> {
    // Trim values for validation
    const trimmedTokenId = props.tokenId?.trim() ?? '';
    const trimmedRequestedById = props.requestedById?.trim() ?? '';
    const trimmedNewName = props.newName?.trim();

    // ════════════════════════════════════════════════════════════════════════
    // 1. Validate tokenId
    // ════════════════════════════════════════════════════════════════════════
    if (!trimmedTokenId) {
      return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    }

    if (trimmedTokenId.length < RotateAccessTokenCommand.MIN_TOKEN_ID_LENGTH) {
      return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Validate newName (optional, but if provided must be 3-50 chars)
    // ════════════════════════════════════════════════════════════════════════
    if (trimmedNewName !== undefined && trimmedNewName !== '') {
      if (trimmedNewName.length < RotateAccessTokenCommand.MIN_NAME_LENGTH) {
        return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
      }

      if (trimmedNewName.length > RotateAccessTokenCommand.MAX_NAME_LENGTH) {
        return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Validate requestedById
    // ════════════════════════════════════════════════════════════════════════
    if (!trimmedRequestedById) {
      return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    }

    if (trimmedRequestedById.length < RotateAccessTokenCommand.MIN_USER_ID_LENGTH) {
      return Result.fail<RotateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    }

    // Create command with trimmed and validated values
    // Note: Empty string newName is treated as undefined (keep old name)
    const finalNewName = trimmedNewName === '' ? undefined : trimmedNewName;

    return Result.ok(new RotateAccessTokenCommand(trimmedTokenId, finalNewName, trimmedRequestedById));
  }
}
