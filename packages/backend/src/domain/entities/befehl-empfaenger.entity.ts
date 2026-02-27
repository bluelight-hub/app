import { createId } from '@paralleldrive/cuid2';
import type { UserId } from '@domain/value-objects/user-id';
import { Result } from '@domain/common/result';
import { anonymisiereString } from '@domain/common/anonymisierung';

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
  private _name: string;
  private _empfaengerId: UserId | undefined;
  private _zugestelltAm: Date | undefined;
  private _quittiertAm: Date | undefined;
  private _quittierungArt: QuittierungArt | undefined;
  private _quittierungKommentar: string | undefined;
  private readonly _createdAt: Date;

  protected constructor(
    id: string,
    name: string,
    empfaengerId: UserId | undefined,
    zugestelltAm?: Date,
    quittiertAm?: Date,
    quittierungArt?: QuittierungArt,
    quittierungKommentar?: string,
    createdAt?: Date,
  ) {
    this._id = id;
    this._name = name;
    this._empfaengerId = empfaengerId;
    this._zugestelltAm = zugestelltAm;
    this._quittiertAm = quittiertAm;
    this._quittierungArt = quittierungArt;
    this._quittierungKommentar = quittierungKommentar;
    this._createdAt = createdAt ?? new Date();
  }

  /**
   * Erstellt einen neuen BefehlEmpfaenger.
   */
  public static create(name: string, empfaengerId?: UserId): BefehlEmpfaenger {
    const id = createId();
    return new BefehlEmpfaenger(id, name, empfaengerId);
  }

  /**
   * Rekonstruiert einen BefehlEmpfaenger aus DB-Daten.
   */
  public static reconstitute(
    id: string,
    name: string,
    empfaengerId: UserId | undefined,
    zugestelltAm?: Date,
    quittiertAm?: Date,
    quittierungArt?: QuittierungArt,
    quittierungKommentar?: string,
    createdAt?: Date,
  ): BefehlEmpfaenger {
    return new BefehlEmpfaenger(id, name, empfaengerId, zugestelltAm, quittiertAm, quittierungArt, quittierungKommentar, createdAt);
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get empfaengerId(): UserId | undefined {
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

  get quittierungKommentar(): string | undefined {
    return this._quittierungKommentar;
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

  /** Ob dieser Empfänger quittierbar ist (nur wenn mit einem User verknüpft). */
  get istQuittierbar(): boolean {
    return this._empfaengerId !== undefined;
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
  public quittieren(art: QuittierungArt, quittiertAm?: Date, kommentar?: string): Result<void> {
    if (!this._zugestelltAm) {
      return Result.fail<void>('Empfänger wurde noch nicht zugestellt');
    }

    this._quittiertAm = quittiertAm ?? new Date();
    this._quittierungArt = art;
    this._quittierungKommentar = kommentar;

    return Result.ok<void>(undefined);
  }

  /**
   * Setzt den Empfänger-Status auf ERTEILT zurück.
   * Reset: zugestelltAm, quittiertAm, quittierungArt, quittierungKommentar → undefined
   */
  public zuruecksetzenAufErteilt(): void {
    this._zugestelltAm = undefined;
    this._quittiertAm = undefined;
    this._quittierungArt = undefined;
    this._quittierungKommentar = undefined;
  }

  /**
   * Setzt den Empfänger-Status auf ZUGESTELLT zurück.
   * Reset: quittiertAm, quittierungArt, quittierungKommentar → undefined
   * zugestelltAm bleibt erhalten.
   */
  public zuruecksetzenAufZugestellt(): void {
    this._quittiertAm = undefined;
    this._quittierungArt = undefined;
    this._quittierungKommentar = undefined;
  }

  /**
   * DSGVO-konforme irreversible Anonymisierung.
   * Ersetzt Name mit gesalzenem Hash und entfernt User-Referenz.
   *
   * @param salt Per-Einsatz Salt fuer echte Anonymisierung (nicht gespeichert)
   * @remarks Story 5.5 AC2 — Review-Fix C2, M3, M5
   */
  public anonymisiere(salt: string): Result<void> {
    this._name = anonymisiereString(this._name, salt);
    this._empfaengerId = undefined;
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
