import { Result } from '@domain/common/result';
import { INVITE_ERROR_CODES } from '../errors/invite-error.codes';

/**
 * Props für die CreateInviteCommand Erstellung.
 */
export interface CreateInviteCommandProps {
  /** Ablaufdatum des Invite-Codes (muss mindestens 1 Minute in der Zukunft liegen) */
  expiresAt: Date;
  /** Maximale Anzahl Einlösungen (1-100, default: 1) */
  maxUses?: number;
  /** Optionale Beschreibung/Label (max 100 Zeichen) */
  label?: string;
  /** ID des Admins, der den Code erstellt */
  createdById: string;
}

/**
 * Command zum Erstellen eines neuen Invite-Codes.
 *
 * Validiert Input vor Weiterverarbeitung an den Handler.
 * Verwendet Factory Method Pattern für konsistente Validierung
 * und Result<T> Pattern für explizite Fehlerbehandlung.
 *
 * **Warum Command Pattern:**
 * - Separation of Concerns: DTO ist für HTTP-Validierung, Command für Business Logic
 * - Immutability: Command ist unveränderlich nach Erstellung
 * - Validation Layer: Business-Validierung erfolgt hier
 * - Testing: Commands können ohne HTTP-Context getestet werden
 *
 * @example
 * ```typescript
 * const result = CreateInviteCommand.create({
 *   expiresAt: new Date('2026-01-10'),
 *   maxUses: 5,
 *   label: 'Einsatzkräfte Team Nord',
 *   createdById: 'user_123',
 * });
 *
 * if (result.isSuccess) {
 *   const command = result.value!;
 *   await handler.execute(command);
 * }
 * ```
 */
export class CreateInviteCommand {
  /** Minimum erlaubte Nutzungen */
  private static readonly MIN_USES = 1;
  /** Maximum erlaubte Nutzungen */
  private static readonly MAX_USES = 100;
  /** Maximale Label-Länge */
  private static readonly MAX_LABEL_LENGTH = 100;
  /** Minimum Ablaufzeit in Millisekunden (1 Minute, konsistent mit Domain Layer) */
  private static readonly MIN_EXPIRY_OFFSET_MS = 60 * 1000;

  private constructor(
    public readonly expiresAt: Date,
    public readonly maxUses: number,
    public readonly label: string | undefined,
    public readonly createdById: string,
  ) {}

  /**
   * Factory Method zur Erstellung eines validierten Commands.
   *
   * Validiert die Eingabedaten und gibt Result<CreateInviteCommand>
   * zurück. Bei Validierungsfehlern wird Result.fail() zurückgegeben.
   *
   * **Business Rules:**
   * - expiresAt muss mindestens 1 Minute in der Zukunft liegen (konsistent mit Domain)
   * - maxUses muss zwischen 1 und 100 liegen (default: 1)
   * - label ist optional und darf maximal 100 Zeichen haben
   *
   * @param props - Die Eingabedaten
   * @returns Result<CreateInviteCommand> - Success mit Command oder Failure mit Error Code
   */
  static create(props: CreateInviteCommandProps): Result<CreateInviteCommand> {
    // Validate expiresAt (muss mindestens 1 Minute in der Zukunft liegen, wie im Domain Layer)
    const now = new Date();
    const minExpiry = new Date(now.getTime() + CreateInviteCommand.MIN_EXPIRY_OFFSET_MS);
    if (props.expiresAt < minExpiry) {
      return Result.fail<CreateInviteCommand>(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    }

    // Validate maxUses (1-100, default: 1)
    const maxUses = props.maxUses ?? 1;
    if (maxUses < CreateInviteCommand.MIN_USES || maxUses > CreateInviteCommand.MAX_USES) {
      return Result.fail<CreateInviteCommand>(INVITE_ERROR_CODES.MAX_USES_INVALID);
    }

    // Validate label length if provided
    if (props.label && props.label.length > CreateInviteCommand.MAX_LABEL_LENGTH) {
      return Result.fail<CreateInviteCommand>(INVITE_ERROR_CODES.LABEL_TOO_LONG);
    }

    return Result.ok(new CreateInviteCommand(props.expiresAt, maxUses, props.label?.trim() || undefined, props.createdById));
  }
}
