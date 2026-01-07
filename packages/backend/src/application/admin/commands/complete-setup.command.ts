import { Result } from '@domain/common/result';

/**
 * Props fuer die CompleteSetupCommand Erstellung.
 *
 * **Hinweis:** firstName/lastName wurden entfernt, da sie vom
 * UserAggregate nicht unterstuetzt werden und daher ignoriert wuerden.
 */
export interface CompleteSetupCommandProps {
  username: string;
  password: string;
}

/**
 * Command fuer den initialen Server-Setup.
 *
 * Kapselt die validierten Eingabedaten fuer den Setup-Handler.
 * Verwendet Factory Method Pattern fuer konsistente Validierung
 * und Result<T> Pattern fuer explizite Fehlerbehandlung.
 *
 * **Wichtig:** Admins haben Nutzername + Passwort.
 * Normale Nutzer haben NUR Nutzername (kein Passwort).
 *
 * **Warum ein separates Command-Objekt statt direkter DTO-Nutzung?**
 * - **Separation of Concerns:** DTO ist fuer HTTP-Validierung, Command fuer Business Logic
 * - **Immutability:** Command ist unveraenderlich nach Erstellung
 * - **Validation Layer:** Zusaetzliche Business-Validierung moeglich
 * - **Testing:** Commands koennen ohne HTTP-Context getestet werden
 *
 * @example
 * ```typescript
 * const result = CompleteSetupCommand.create({
 *   username: 'admin',
 *   password: 'SecurePassword123!',
 *   firstName: 'Max',
 *   lastName: 'Mustermann',
 * });
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   await handler.execute(command);
 * }
 * ```
 */
export class CompleteSetupCommand {
  private constructor(
    public readonly username: string,
    public readonly password: string,
  ) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<CompleteSetupCommand>
   * zurueck. Bei Validierungsfehlern wird Result.fail() zurueckgegeben.
   *
   * @param props - Die Eingabedaten aus dem DTO
   * @returns Result<CompleteSetupCommand> - Success mit Command oder Failure mit Error
   */
  static create(props: CompleteSetupCommandProps): Result<CompleteSetupCommand> {
    // Username Validierung (3-50 Zeichen, alphanumerisch + underscore)
    if (!props.username || props.username.trim().length < 3) {
      return Result.fail<CompleteSetupCommand>('Nutzername muss mindestens 3 Zeichen lang sein');
    }

    if (props.username.trim().length > 50) {
      return Result.fail<CompleteSetupCommand>('Nutzername darf maximal 50 Zeichen lang sein');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(props.username.trim())) {
      return Result.fail<CompleteSetupCommand>('Nutzername darf nur alphanumerische Zeichen und Underscores enthalten');
    }

    // Password Validierung
    if (!props.password || props.password.length < 8) {
      return Result.fail<CompleteSetupCommand>('Passwort muss mindestens 8 Zeichen lang sein');
    }

    return Result.ok(new CompleteSetupCommand(props.username.trim().toLowerCase(), props.password));
  }
}
