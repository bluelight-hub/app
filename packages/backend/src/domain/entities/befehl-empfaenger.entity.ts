import { createId } from '@paralleldrive/cuid2';
import type { UserId } from '@domain/value-objects/user-id';
import { Result } from '@domain/common/result';

/**
 * QuittierungArt Enum — Art der Quittierung eines Befehls durch einen Empfänger.
 */
export type QuittierungArt = 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';

/**
 * BefehlEmpfaenger Child Entity.
 *
 * Repräsentiert einen einzelnen Empfänger eines Befehls mit individuellem
 * Zustellungs- und Quittierungsstatus.
 *
 * WICHTIG: Kein eigenes Repository — wird über Befehl Aggregate persistiert.
 */
export class BefehlEmpfaenger {
  private readonly _id: string;
  private readonly _empfaengerId: UserId;
  private _zugestelltAm: Date | undefined;
  private _quittiertAm: Date | undefined;
  private _quittierungArt: QuittierungArt | undefined;
  private readonly _createdAt: Date;

  protected constructor(id: string, empfaengerId: UserId, zugestelltAm?: Date, quittiertAm?: Date, quittierungArt?: QuittierungArt, createdAt?: Date) {
    this._id = id;
    this._empfaengerId = empfaengerId;
    this._zugestelltAm = zugestelltAm;
    this._quittiertAm = quittiertAm;
    this._quittierungArt = quittierungArt;
    this._createdAt = createdAt ?? new Date();
  }

  /**
   * Erstellt einen neuen BefehlEmpfaenger.
   */
  public static create(empfaengerId: UserId): BefehlEmpfaenger {
    const id = createId();
    return new BefehlEmpfaenger(id, empfaengerId);
  }

  /**
   * Rekonstruiert einen BefehlEmpfaenger aus DB-Daten.
   */
  public static reconstitute(id: string, empfaengerId: UserId, zugestelltAm?: Date, quittiertAm?: Date, quittierungArt?: QuittierungArt, createdAt?: Date): BefehlEmpfaenger {
    return new BefehlEmpfaenger(id, empfaengerId, zugestelltAm, quittiertAm, quittierungArt, createdAt);
  }

  get id(): string {
    return this._id;
  }

  get empfaengerId(): UserId {
    return this._empfaengerId;
  }

  get zugestelltAm(): Date | undefined {
    return this._zugestelltAm;
  }

  get quittiertAm(): Date | undefined {
    return this._quittiertAm;
  }

  get quittierungArt(): QuittierungArt | undefined {
    return this._quittierungArt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /** Ob der Befehl an diesen Empfänger zugestellt wurde. */
  get istZugestellt(): boolean {
    return this._zugestelltAm !== undefined;
  }

  /** Ob dieser Empfänger den Befehl quittiert hat. */
  get istQuittiert(): boolean {
    return this._quittiertAm !== undefined;
  }

  /**
   * Markiert den Befehl als zugestellt an diesen Empfänger.
   */
  public markAlsZugestellt(zugestelltAm?: Date): void {
    this._zugestelltAm = zugestelltAm ?? new Date();
  }

  /**
   * Quittiert den Befehl durch diesen Empfänger.
   * Validiert dass der Befehl zugestellt wurde (DDD: Entity schützt ihre Invarianten).
   */
  public quittieren(art: QuittierungArt, quittiertAm?: Date): Result<void> {
    if (!this._zugestelltAm) {
      return Result.fail<void>('Empfänger wurde noch nicht zugestellt');
    }

    this._quittiertAm = quittiertAm ?? new Date();
    this._quittierungArt = art;

    return Result.ok<void>(undefined);
  }

  /**
   * ID-based Equality Check.
   */
  public equals(other?: BefehlEmpfaenger): boolean {
    if (other == null) return false;
    if (other === this) return true;
    return this._id === other._id;
  }
}
