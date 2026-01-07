import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { InviteCodeCreatedEvent } from '@domain/events/invite-code-created.event';
import { InviteCodeUsedEvent } from '@domain/events/invite-code-used.event';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';

/**
 * Props für die InviteCode Erstellung.
 */
export interface CreateInviteCodeProps {
  /** Ablaufdatum des Codes (muss in der Zukunft liegen) */
  expiresAt: Date;
  /** Maximale Anzahl der erlaubten Nutzungen (1-100) */
  maxUses: number;
  /** ID des Admins, der den Code erstellt */
  createdById: string;
  /** Optionales Label zur Identifizierung (max 100 Zeichen) */
  label?: string;
}

/**
 * Props für die Rekonstruktion aus der Datenbank.
 */
export interface ReconstructInviteCodeProps {
  id: InviteCodeId;
  code: InviteCodeValue;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  createdById: string;
  label: string | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * InviteCode Aggregate Root für die Nutzer-Einladung.
 *
 * Repräsentiert einen Einladungs-Code der von Admins generiert wird,
 * um neuen Nutzern die Registrierung zu ermöglichen.
 *
 * **Business Rules (Invarianten):**
 * 1. expiresAt muss mindestens 1 Minute in der Zukunft liegen
 * 2. maxUses muss zwischen 1 und 100 liegen
 * 3. label ist optional und darf maximal 100 Zeichen haben
 * 4. usedCount kann nie größer als maxUses werden
 * 5. Revoked Codes können nicht mehr verwendet werden
 * 6. Abgelaufene Codes (expiresAt < now) sind nicht mehr gültig
 *
 * **Event Flow:**
 * - create() → InviteCodeCreatedEvent
 *
 * @example
 * ```typescript
 * // Code erstellen
 * const result = InviteCode.create({
 *   expiresAt: new Date('2025-12-31'),
 *   maxUses: 10,
 *   createdById: 'user_123',
 *   label: 'Onboarding Januar',
 * });
 *
 * if (result.isSuccess) {
 *   const invite = result.value!;
 *   console.log(invite.code.toString()); // "ABC12345"
 *   console.log(invite.isValid()); // true
 * }
 *
 * // Code einlösen
 * const useResult = invite.use();
 * console.log(invite.usedCount); // 1
 * ```
 */
export class InviteCode extends AggregateRoot<InviteCodeId> {
  /** Maximale Länge des optionalen Labels */
  private static readonly MAX_LABEL_LENGTH = 100;
  /** Mindestzeit in der Zukunft für expiresAt (1 Minute in Millisekunden) */
  private static readonly MIN_EXPIRY_OFFSET_MS = 60 * 1000;
  /** Minimum erlaubte Nutzungen */
  private static readonly MIN_USES = 1;
  /** Maximum erlaubte Nutzungen */
  private static readonly MAX_USES = 100;

  /** Der generierte 8-stellige Invite-Code */
  private readonly _code: InviteCodeValue;

  /** Ablaufdatum des Codes */
  private readonly _expiresAt: Date;

  /** Maximale Anzahl erlaubter Nutzungen */
  private readonly _maxUses: number;

  /** Aktuelle Anzahl der Nutzungen */
  private _usedCount: number;

  /** ID des Erstellers (Admin) */
  private readonly _createdById: string;

  /** Optionales Label zur Identifizierung */
  private _label: string | null;

  /** Ob der Code widerrufen wurde */
  private _isRevoked: boolean;

  /** Zeitpunkt des Widerrufs */
  private _revokedAt: Date | null;

  /**
   * Private Constructor erzwingt Factory Method Nutzung.
   */
  private constructor(
    id: InviteCodeId,
    code: InviteCodeValue,
    expiresAt: Date,
    maxUses: number,
    usedCount: number,
    createdById: string,
    label: string | null,
    isRevoked: boolean,
    revokedAt: Date | null,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._code = code;
    this._expiresAt = expiresAt;
    this._maxUses = maxUses;
    this._usedCount = usedCount;
    this._createdById = createdById;
    this._label = label;
    this._isRevoked = isRevoked;
    this._revokedAt = revokedAt;
  }

  // ============================================================
  // Readonly Getters
  // ============================================================

  /**
   * Readonly getter für den Invite-Code.
   */
  get code(): InviteCodeValue {
    return this._code;
  }

  /**
   * Readonly getter für das Ablaufdatum.
   */
  get expiresAt(): Date {
    return this._expiresAt;
  }

  /**
   * Readonly getter für maximale Nutzungen.
   */
  get maxUses(): number {
    return this._maxUses;
  }

  /**
   * Readonly getter für aktuelle Nutzungen.
   */
  get usedCount(): number {
    return this._usedCount;
  }

  /**
   * Readonly getter für die Ersteller-ID.
   */
  get createdById(): string {
    return this._createdById;
  }

  /**
   * Readonly getter für das Label.
   */
  get label(): string | null {
    return this._label;
  }

  /**
   * Readonly getter für den Widerruf-Status.
   */
  get isRevoked(): boolean {
    return this._isRevoked;
  }

  /**
   * Readonly getter für den Widerruf-Zeitpunkt.
   */
  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  // ============================================================
  // Factory Methods
  // ============================================================

  /**
   * Factory Method zur Erstellung eines neuen InviteCodes.
   *
   * **Business Rules:**
   * - expiresAt muss mindestens 1 Minute in der Zukunft liegen
   * - maxUses muss zwischen 1 und 100 liegen
   * - label ist optional und darf maximal 100 Zeichen haben
   * - Code wird automatisch generiert (8-stellig, alphanumerisch)
   * - Initial: usedCount = 0, isRevoked = false
   *
   * @param props - CreateInviteCodeProps
   * @returns Result<InviteCode> - Success mit Code oder Failure mit Error
   */
  static create(props: CreateInviteCodeProps): Result<InviteCode> {
    // Validate expiresAt (mindestens 1 Minute in der Zukunft)
    const now = new Date();
    const minExpiry = new Date(now.getTime() + InviteCode.MIN_EXPIRY_OFFSET_MS);
    if (props.expiresAt < minExpiry) {
      return Result.fail<InviteCode>('INVITE_CODE_EXPIRY_TOO_SOON');
    }

    // Validate maxUses (1-100)
    if (props.maxUses < InviteCode.MIN_USES || props.maxUses > InviteCode.MAX_USES) {
      return Result.fail<InviteCode>('INVITE_CODE_MAX_USES_INVALID');
    }

    // Validate label length if provided
    if (props.label !== undefined && props.label.length > InviteCode.MAX_LABEL_LENGTH) {
      return Result.fail<InviteCode>('INVITE_CODE_LABEL_TOO_LONG');
    }

    // Generate InviteCodeId
    const idResult = InviteCodeId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<InviteCode>(idResult.error ?? 'Failed to create InviteCodeId');
    }

    // Generate InviteCodeValue (8-stelliger Code)
    const codeResult = InviteCodeValue.generate();
    if (codeResult.isFailure || !codeResult.value) {
      return Result.fail<InviteCode>(codeResult.error ?? 'Failed to generate InviteCode');
    }

    const inviteCode = new InviteCode(
      idResult.value,
      codeResult.value,
      props.expiresAt,
      props.maxUses,
      0, // usedCount = 0
      props.createdById,
      props.label ?? null,
      false, // isRevoked = false
      null, // revokedAt = null
    );

    // Emit Domain Event (mit maskiertem Code für Audit)
    inviteCode.addDomainEvent(new InviteCodeCreatedEvent(idResult.value, codeResult.value.toMasked(), props.expiresAt, props.maxUses, props.createdById, props.label ?? null));

    return Result.ok<InviteCode>(inviteCode);
  }

  /**
   * Factory Method zur Rekonstruktion aus der Datenbank.
   * Überspringt Validation da Daten bereits validiert wurden.
   *
   * @param props - ReconstructInviteCodeProps mit allen Feldern
   * @returns InviteCode Instanz
   */
  static reconstruct(props: ReconstructInviteCodeProps): InviteCode {
    return new InviteCode(props.id, props.code, props.expiresAt, props.maxUses, props.usedCount, props.createdById, props.label, props.isRevoked, props.revokedAt, props.createdAt, props.updatedAt);
  }

  // ============================================================
  // Business Methods
  // ============================================================

  /**
   * Prüft ob der Code aktuell gültig ist.
   *
   * Ein Code ist gültig wenn:
   * - Er nicht widerrufen wurde
   * - Er nicht abgelaufen ist
   * - Er noch nicht maximal verwendet wurde
   *
   * @returns true wenn Code gültig, false sonst
   */
  public isValid(): boolean {
    if (this._isRevoked) {
      return false;
    }

    if (this._expiresAt < new Date()) {
      return false;
    }

    if (this._usedCount >= this._maxUses) {
      return false;
    }

    return true;
  }

  /**
   * Business Method: Verwendet den Code für eine Registrierung.
   *
   * **Business Rules:**
   * - Code muss gültig sein (isValid() === true)
   * - usedCount wird um 1 erhöht
   *
   * @returns Result<void> - Success oder Failure wenn Code ungültig
   */
  public use(): Result<void> {
    if (!this.isValid()) {
      return Result.fail<void>('INVITE_CODE_INVALID');
    }

    this._usedCount += 1;
    this.updateTimestamp();

    // Emit Domain Event
    this.addDomainEvent(new InviteCodeUsedEvent(this.id.value, this._code.value, new Date(), this._usedCount));

    return Result.ok<void>(undefined);
  }

  /**
   * Business Method: Widerruft den Code.
   *
   * **Business Rules:**
   * - Idempotent: Mehrfacher Aufruf ist erlaubt
   * - Nach Widerruf: Code ist permanent ungültig
   *
   * @returns Result<void> - Immer Success (idempotent)
   */
  public revoke(): Result<void> {
    if (this._isRevoked) {
      return Result.ok<void>(undefined);
    }

    this._isRevoked = true;
    this._revokedAt = new Date();
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }

  /**
   * Business Method: Aktualisiert das Label.
   *
   * @param label - Neues Label (null um Label zu entfernen)
   * @returns Result<void> - Success oder Failure bei Validation-Fehler
   */
  public updateLabel(label: string | null): Result<void> {
    if (label !== null && label.length > InviteCode.MAX_LABEL_LENGTH) {
      return Result.fail<void>('INVITE_CODE_LABEL_TOO_LONG');
    }

    this._label = label;
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }

  /**
   * Gibt die verbleibende Anzahl an Nutzungen zurück.
   */
  public remainingUses(): number {
    return Math.max(0, this._maxUses - this._usedCount);
  }
}
