import { Result } from '@domain/common/result';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';

/**
 * Props fuer die MigrateToSecureModeCommand Erstellung.
 */
export interface MigrateToSecureModeCommandProps {
  /**
   * Optionaler Name fuer das Initial-Token (3-50 Zeichen).
   * Falls nicht angegeben, wird DEFAULT_TOKEN_NAME verwendet.
   * Dieses Token wird bei der Migration erstellt und ermoeglicht
   * den Zugriff auf den Server nach dem Wechsel zu SECURE Mode.
   */
  tokenName?: string;
}

/**
 * Command zur Migration von INSECURE zu SECURE Mode.
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
 * **Verwendung:**
 * 1. Server muss im INSECURE Mode sein (wird im Handler geprueft)
 * 2. Bei Migration wird ein Initial-Token erstellt
 * 3. Server wechselt zu SECURE Mode (insecureMode = false)
 * 4. Das Initial-Token wird zurueckgegeben (einmalig!)
 *
 * @example
 * ```typescript
 * // Mit benutzerdefiniertem Namen
 * const result = MigrateToSecureModeCommand.create({
 *   tokenName: 'Admin Initial Token',
 * });
 *
 * // Mit Default-Namen
 * const result = MigrateToSecureModeCommand.create({});
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   const response = await handler.execute(command);
 *   // response enthaelt das einmalig sichtbare Token
 * }
 * ```
 */
export class MigrateToSecureModeCommand {
  /** Minimum erlaubte Namenlaenge */
  private static readonly MIN_NAME_LENGTH = 3;
  /** Maximum erlaubte Namenlaenge */
  private static readonly MAX_NAME_LENGTH = 50;
  /** Default-Name fuer das Initial-Token */
  public static readonly DEFAULT_TOKEN_NAME = 'Primary Access Token';

  private constructor(public readonly tokenName: string) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<MigrateToSecureModeCommand>
   * zurueck. Bei Validierungsfehlern wird Result.fail() zurueckgegeben.
   *
   * **Business Rules:**
   * - Wenn tokenName angegeben: muss 3-50 Zeichen lang sein (nach trim)
   * - Wenn tokenName nicht angegeben oder leer: DEFAULT_TOKEN_NAME wird verwendet
   *
   * @param props - Die Eingabedaten (optional)
   * @returns Result<MigrateToSecureModeCommand> - Success mit Command oder Failure mit Error Code
   */
  static create(props: MigrateToSecureModeCommandProps = {}): Result<MigrateToSecureModeCommand> {
    // Trim tokenName for validation (use default if empty/undefined)
    const trimmedName = props.tokenName?.trim();

    // Use default name if not provided or empty
    const finalName = trimmedName || MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME;

    // Validate minimum name length (3 characters)
    if (finalName.length < MigrateToSecureModeCommand.MIN_NAME_LENGTH) {
      return Result.fail<MigrateToSecureModeCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    }

    // Validate maximum name length (50 characters)
    if (finalName.length > MigrateToSecureModeCommand.MAX_NAME_LENGTH) {
      return Result.fail<MigrateToSecureModeCommand>(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    }

    return Result.ok(new MigrateToSecureModeCommand(finalName));
  }
}
