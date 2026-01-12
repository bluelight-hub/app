import { Result } from '@domain/common/result';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';

/**
 * Props fuer die CreateAccessTokenCommand Erstellung.
 */
export interface CreateAccessTokenCommandProps {
  /** Name des Access-Tokens (3-50 Zeichen) */
  name: string;
  /** ID des Users, der das Token erstellt */
  createdById: string;
}

/**
 * Command zum Erstellen eines neuen Access-Tokens.
 *
 * Validiert Input vor Weiterverarbeitung an den Handler.
 * Verwendet Factory Method Pattern fuer konsistente Validierung
 * und Result<T> Pattern fuer explizite Fehlerbehandlung.
 *
 * **Warum Command Pattern:**
 * - Separation of Concerns: DTO ist fuer HTTP-Validierung, Command fuer Business Logic
 * - Immutability: Command ist unveraenderlich nach Erstellung
 * - Validation Layer: Business-Validierung erfolgt hier
 * - Testing: Commands koennen ohne HTTP-Context getestet werden
 *
 * @example
 * ```typescript
 * const result = CreateAccessTokenCommand.create({
 *   name: 'CI/CD Pipeline Token',
 *   createdById: 'user_123',
 * });
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   await handler.execute(command);
 * }
 * ```
 */
export class CreateAccessTokenCommand {
  /** Minimum erlaubte Namenlaenge */
  private static readonly MIN_NAME_LENGTH = 3;
  /** Maximum erlaubte Namenlaenge */
  private static readonly MAX_NAME_LENGTH = 50;

  private constructor(
    public readonly name: string,
    public readonly createdById: string,
  ) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<CreateAccessTokenCommand>
   * zurueck. Bei Validierungsfehlern wird Result.fail() zurueckgegeben.
   *
   * **Business Rules:**
   * - name muss mindestens 3 Zeichen lang sein (nach trim)
   * - name darf maximal 50 Zeichen lang sein (nach trim)
   * - name darf nicht leer oder nur Whitespace sein
   *
   * @param props - Die Eingabedaten
   * @returns Result<CreateAccessTokenCommand> - Success mit Command oder Failure mit Error Code
   */
  static create(props: CreateAccessTokenCommandProps): Result<CreateAccessTokenCommand> {
    // Trim name for validation
    const trimmedName = props.name?.trim() ?? '';

    // Validate name is not empty
    if (!trimmedName) {
      return Result.fail<CreateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    }

    // Validate minimum name length (3 characters)
    if (trimmedName.length < CreateAccessTokenCommand.MIN_NAME_LENGTH) {
      return Result.fail<CreateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    }

    // Validate maximum name length (50 characters)
    if (trimmedName.length > CreateAccessTokenCommand.MAX_NAME_LENGTH) {
      return Result.fail<CreateAccessTokenCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    }

    return Result.ok(new CreateAccessTokenCommand(trimmedName, props.createdById));
  }
}
