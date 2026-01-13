import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { ServerAccessTokenCreatedEvent } from '@domain/events/server-access-token-created.event';
import { ServerAccessTokenReactivatedEvent } from '@domain/events/server-access-token-reactivated.event';
import { ServerAccessTokenRevokedEvent } from '@domain/events/server-access-token-revoked.event';
import { ServerAccessTokenUsedEvent } from '@domain/events/server-access-token-used.event';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import type { TokenHash } from '@domain/value-objects/token-hash';

/**
 * Token-Status Typen.
 * - active: Token ist gueltig und kann verwendet werden
 * - revoked: Token wurde widerrufen
 * - expired: Token ist abgelaufen
 */
export type TokenStatus = 'active' | 'revoked' | 'expired';

/**
 * Laenge des Token-Prefix fuer Anzeige/Logging.
 * Format: blh_ + 8 Zeichen = 12 Zeichen.
 * Domain-Konstante fuer getDisplayPrefix().
 */
const TOKEN_PREFIX_DISPLAY_LENGTH = 12;

/**
 * Props für die ServerAccessToken Erstellung.
 */
export interface CreateServerAccessTokenProps {
  tokenHash: TokenHash;
  name?: string;
  expiresAt?: Date;
  /** ID des ursprünglichen Tokens, falls dieses Token durch Rotation erstellt wurde */
  rotatedFromId?: AccessTokenId;
}

/**
 * Props für die Rekonstruktion aus der Datenbank.
 */
export interface ReconstructServerAccessTokenProps {
  id: AccessTokenId;
  tokenHash: TokenHash;
  name: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  /** ID des ursprünglichen Tokens, falls dieses Token durch Rotation erstellt wurde */
  rotatedFromId: AccessTokenId | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ServerAccessToken Aggregate Root für API-Authentifizierung.
 *
 * Repräsentiert ein Server-Access-Token für die API-Authentifizierung.
 * Dieses Token wird verwendet um externe Systeme (z.B. HiOrg-Server)
 * gegen die BlueLight Hub API zu authentifizieren.
 *
 * **Business Rules (Invarianten):**
 * 1. Token Hash muss valides bcrypt-Format haben (via TokenHash Value Object)
 * 2. Token kann nur einmal revoked werden (idempotent)
 * 3. Revoked Tokens können nicht wieder aktiviert werden
 * 4. lastUsedAt wird bei jeder Nutzung aktualisiert
 * 5. Abgelaufene Tokens (expiresAt < now) sind nicht mehr gültig
 *
 * **Security Considerations:**
 * - Token Hash wird NIEMALS vollständig geloggt (TokenHash.toString() maskiert)
 * - Das Klartext-Token existiert nur bei der Erstellung und wird nicht gespeichert
 * - bcrypt Cost Factor >= 10 (NFR-S1 Security Requirement)
 *
 * **Event Flow:**
 * - create() → ServerAccessTokenCreatedEvent
 * - recordUsage() → ServerAccessTokenUsedEvent
 * - revoke() → ServerAccessTokenRevokedEvent
 *
 * @example
 * ```typescript
 * // Token erstellen
 * const tokenHash = TokenHash.create('$2a$10$...').value!;
 * const result = ServerAccessToken.create({
 *   tokenHash,
 *   name: 'HiOrg Integration',
 *   expiresAt: new Date('2025-12-31'),
 * });
 *
 * if (result.isSuccess) {
 *   const token = result.value!;
 *   console.log(token.id.toString()); // "blh_ckpf2xrkc0001zyp8jq8qzx9f"
 *   console.log(token.isValid()); // true
 * }
 *
 * // Token-Nutzung erfassen
 * token.recordUsage();
 *
 * // Token widerrufen
 * token.revoke();
 * console.log(token.isValid()); // false
 * ```
 */
export class ServerAccessToken extends AggregateRoot<AccessTokenId> {
  /**
   * Maximale Länge des optionalen Token-Namens.
   * Konsistent mit Prisma-Schema: @db.VarChar(100)
   */
  private static readonly MAX_NAME_LENGTH = 100;

  /** bcrypt Token Hash (validiert via TokenHash Value Object) */
  private readonly _tokenHash: TokenHash;

  /** Optionaler Name für das Token (z.B. "HiOrg Integration") */
  private _name: string | null;

  /** Zeitpunkt der letzten Nutzung (null wenn nie genutzt) */
  private _lastUsedAt: Date | null;

  /** Ablaufdatum des Tokens (null = kein Ablauf) */
  private readonly _expiresAt: Date | null;

  /** Ob das Token widerrufen wurde */
  private _isRevoked: boolean;

  /** Zeitpunkt des Widerrufs (null wenn nicht widerrufen) */
  private _revokedAt: Date | null;

  /** ID des ursprünglichen Tokens, falls dieses Token durch Rotation erstellt wurde */
  private readonly _rotatedFromId: AccessTokenId | null;

  /**
   * Private Constructor erzwingt Factory Method Nutzung.
   * Verhindert direkte Instanziierung ohne Validation.
   */
  private constructor(
    id: AccessTokenId,
    tokenHash: TokenHash,
    name: string | null,
    lastUsedAt: Date | null,
    expiresAt: Date | null,
    isRevoked: boolean,
    revokedAt: Date | null,
    rotatedFromId: AccessTokenId | null,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._tokenHash = tokenHash;
    this._name = name;
    this._lastUsedAt = lastUsedAt;
    this._expiresAt = expiresAt;
    this._isRevoked = isRevoked;
    this._revokedAt = revokedAt;
    this._rotatedFromId = rotatedFromId;
  }

  // ============================================================
  // Readonly Getters
  // ============================================================

  /**
   * Readonly getter für Token Hash.
   * WICHTIG: Niemals vollständig loggen - nutze tokenHash.toMaskedString()
   */
  get tokenHash(): TokenHash {
    return this._tokenHash;
  }

  /**
   * Readonly getter für Token Name.
   * @returns Token Name oder null wenn nicht gesetzt
   */
  get name(): string | null {
    return this._name;
  }

  /**
   * Readonly getter für letzten Nutzungszeitpunkt.
   * @returns Zeitpunkt der letzten Nutzung oder null wenn nie genutzt
   */
  get lastUsedAt(): Date | null {
    return this._lastUsedAt;
  }

  /**
   * Readonly getter für Ablaufdatum.
   * @returns Ablaufdatum oder null wenn kein Ablauf gesetzt
   */
  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  /**
   * Readonly getter für Widerrufs-Status.
   * @returns true wenn Token widerrufen wurde
   */
  get isRevoked(): boolean {
    return this._isRevoked;
  }

  /**
   * Readonly getter für Widerrufs-Zeitpunkt.
   * @returns Zeitpunkt des Widerrufs oder null wenn nicht widerrufen
   */
  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  /**
   * Readonly getter für die ID des ursprünglichen Tokens bei Rotation.
   * @returns AccessTokenId des ursprünglichen Tokens oder null wenn nicht rotiert
   */
  get rotatedFromId(): AccessTokenId | null {
    return this._rotatedFromId;
  }

  /**
   * Prüft ob dieses Token durch Rotation eines anderen Tokens erstellt wurde.
   * @returns true wenn dieses Token durch Rotation erstellt wurde
   */
  public wasRotated(): boolean {
    return this._rotatedFromId !== null;
  }

  /**
   * Ermittelt den aktuellen Status des Tokens.
   *
   * **Status-Logik:**
   * - revoked: Token wurde widerrufen (hoechste Prioritaet)
   * - expired: Token ist abgelaufen (expiresAt < now)
   * - active: Token ist gueltig und kann verwendet werden
   *
   * @returns TokenStatus - 'active' | 'revoked' | 'expired'
   */
  public getStatus(): TokenStatus {
    if (this._isRevoked) {
      return 'revoked';
    }
    if (this._expiresAt && this._expiresAt < new Date()) {
      return 'expired';
    }
    return 'active';
  }

  /**
   * Gibt den Anzeige-Prefix des Tokens zurueck.
   * Format: blh_ + erste 8 Zeichen = 12 Zeichen total.
   *
   * Wird fuer Logging und UI-Anzeige verwendet, um das Token
   * identifizierbar zu machen ohne den vollstaendigen Wert zu zeigen.
   *
   * @returns String mit den ersten 12 Zeichen der Token-ID
   */
  public getDisplayPrefix(): string {
    return this.id.toString().substring(0, TOKEN_PREFIX_DISPLAY_LENGTH);
  }

  // ============================================================
  // Factory Methods
  // ============================================================

  /**
   * Factory Method zur Erstellung eines neuen ServerAccessTokens.
   * Verwendet Result<T> Pattern zur expliziten Fehlerbehandlung.
   *
   * **Business Rules:**
   * - tokenHash ist required und muss valides bcrypt-Format haben
   * - name ist optional (max 100 Zeichen)
   * - expiresAt ist optional (null = kein Ablauf)
   * - rotatedFromId ist optional (gesetzt wenn Token durch Rotation erstellt wurde)
   * - Initial: lastUsedAt = null, isRevoked = false, revokedAt = null
   *
   * @param props - CreateServerAccessTokenProps mit tokenHash, name?, expiresAt?, rotatedFromId?
   * @returns Result<ServerAccessToken> - Success mit Token oder Failure mit Error
   */
  static create(props: CreateServerAccessTokenProps): Result<ServerAccessToken> {
    // Validate name length if provided
    if (props.name !== undefined && props.name.length > ServerAccessToken.MAX_NAME_LENGTH) {
      return Result.fail<ServerAccessToken>(`Token Name darf maximal ${ServerAccessToken.MAX_NAME_LENGTH} Zeichen haben (ist: ${props.name.length})`);
    }

    // Generate AccessTokenId
    const idResult = AccessTokenId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<ServerAccessToken>(idResult.error ?? 'Failed to create AccessTokenId');
    }

    const token = new ServerAccessToken(
      idResult.value,
      props.tokenHash,
      props.name ?? null,
      null, // lastUsedAt = null (nie genutzt)
      props.expiresAt ?? null,
      false, // isRevoked = false
      null, // revokedAt = null
      props.rotatedFromId ?? null, // rotatedFromId (null wenn nicht rotiert)
    );

    // Emit Domain Event
    token.addDomainEvent(new ServerAccessTokenCreatedEvent(idResult.value, props.name ?? null, props.expiresAt ?? null));

    return Result.ok<ServerAccessToken>(token);
  }

  /**
   * Factory Method zur Rekonstruktion aus der Datenbank.
   * Überspringt Validation da Daten bereits validiert wurden.
   *
   * **Verwendung:**
   * - Nur vom Repository beim Laden aus der Datenbank
   * - Keine Business Validation (Daten sind bereits persistent)
   * - Keine Domain Events (keine State-Änderung)
   *
   * @param props - ReconstructServerAccessTokenProps mit allen Feldern
   * @returns ServerAccessToken Instanz
   */
  static reconstruct(props: ReconstructServerAccessTokenProps): ServerAccessToken {
    return new ServerAccessToken(props.id, props.tokenHash, props.name, props.lastUsedAt, props.expiresAt, props.isRevoked, props.revokedAt, props.rotatedFromId, props.createdAt, props.updatedAt);
  }

  // ============================================================
  // Business Methods
  // ============================================================

  /**
   * Prüft ob das Token aktuell gültig ist.
   *
   * Ein Token ist gültig wenn:
   * - Es nicht widerrufen wurde (isRevoked = false)
   * - Es nicht abgelaufen ist (expiresAt > now oder expiresAt = null)
   *
   * @returns true wenn Token gültig, false sonst
   */
  public isValid(): boolean {
    // Widerrufene Tokens sind ungültig
    if (this._isRevoked) {
      return false;
    }

    // Prüfe Ablaufdatum
    if (this._expiresAt !== null && this._expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Business Method: Erfasst eine Token-Nutzung.
   * Aktualisiert lastUsedAt auf den aktuellen Zeitpunkt.
   *
   * **Business Rules:**
   * - lastUsedAt wird auf new Date() gesetzt
   * - updatedAt wird aktualisiert
   * - Keine Validation erforderlich
   *
   * **Warum kein Result<void>:**
   * - Diese Operation kann nicht fehlschlagen
   * - Reine State-Mutation ohne Business-Regel-Verletzung
   */
  public recordUsage(): void {
    const usedAt = new Date();
    this._lastUsedAt = usedAt;
    this.updateTimestamp();

    // Emit Domain Event
    this.addDomainEvent(new ServerAccessTokenUsedEvent(this._id, usedAt));
  }

  /**
   * Business Method: Widerruft das Token.
   * Setzt isRevoked = true und revokedAt = now.
   *
   * **Business Rules:**
   * - Idempotent: Mehrfacher Aufruf ist erlaubt (kein Fehler)
   * - Bei bereits widerrufenem Token: No-Op (kein Event)
   * - Nach Widerruf: Token ist permanent ungültig
   *
   * @returns Result<void> - Immer Success (idempotent)
   */
  public revoke(): Result<void> {
    // Idempotent: Bereits widerrufen → No-Op
    if (this._isRevoked) {
      return Result.ok<void>(undefined);
    }

    const revokedAt = new Date();
    this._isRevoked = true;
    this._revokedAt = revokedAt;
    this.updateTimestamp();

    // Emit Domain Event
    this.addDomainEvent(new ServerAccessTokenRevokedEvent(this._id, revokedAt));

    return Result.ok<void>(undefined);
  }

  /**
   * Business Method: Reaktiviert ein widerrufenes Token.
   * Setzt isRevoked = false und revokedAt = null.
   *
   * **Business Rules:**
   * - Idempotent: Mehrfacher Aufruf ist erlaubt (kein Fehler)
   * - Bei bereits aktivem Token: No-Op (kein Event)
   * - Nach Reaktivierung: Token ist wieder gültig (sofern nicht abgelaufen)
   *
   * @returns Result<void> - Immer Success (idempotent)
   */
  public reactivate(): Result<void> {
    // Idempotent: Bereits aktiv → No-Op
    if (!this._isRevoked) {
      return Result.ok<void>(undefined);
    }

    const reactivatedAt = new Date();
    this._isRevoked = false;
    this._revokedAt = null;
    this.updateTimestamp();

    // Emit Domain Event
    this.addDomainEvent(new ServerAccessTokenReactivatedEvent(this._id, reactivatedAt));

    return Result.ok<void>(undefined);
  }

  /**
   * Business Method: Aktualisiert den Token-Namen.
   *
   * @param name - Neuer Name (null um Namen zu entfernen)
   * @returns Result<void> - Success oder Failure bei Validation-Fehler
   */
  public updateName(name: string | null): Result<void> {
    if (name !== null && name.length > ServerAccessToken.MAX_NAME_LENGTH) {
      return Result.fail<void>(`Token Name darf maximal ${ServerAccessToken.MAX_NAME_LENGTH} Zeichen haben (ist: ${name.length})`);
    }

    this._name = name;
    this.updateTimestamp();

    return Result.ok<void>(undefined);
  }
}
