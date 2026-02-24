import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { EinsatzRolle } from '@domain/value-objects/einsatz-rolle';

/**
 * EinsatzRollenzuweisung Entity — Befehlsspezifische Rollenzuweisung pro User pro Einsatz.
 *
 * Story 5.2 AC2: Rollen werden per User UND per Einsatz zugewiesen (nicht global).
 *
 * WICHTIG: Kein eigenes Aggregate Root — wird atomar via UpdateEinsatzRollenCommand verwaltet.
 */
export class EinsatzRollenzuweisung {
  private readonly _id: string;
  private readonly _einsatzId: string;
  private readonly _userId: string;
  private readonly _rolle: EinsatzRolle;
  private readonly _zugewiesenAm: Date;

  protected constructor(id: string, einsatzId: string, userId: string, rolle: EinsatzRolle, zugewiesenAm: Date) {
    this._id = id;
    this._einsatzId = einsatzId;
    this._userId = userId;
    this._rolle = rolle;
    this._zugewiesenAm = zugewiesenAm;
  }

  /**
   * Erstellt eine neue EinsatzRollenzuweisung mit Validierung.
   */
  public static create(einsatzId: string, userId: string, rolle: EinsatzRolle): Result<EinsatzRollenzuweisung> {
    if (!einsatzId || einsatzId.trim().length === 0) {
      return Result.fail<EinsatzRollenzuweisung>('einsatzId darf nicht leer sein');
    }
    if (!userId || userId.trim().length === 0) {
      return Result.fail<EinsatzRollenzuweisung>('userId darf nicht leer sein');
    }

    const id = createId();
    return Result.ok<EinsatzRollenzuweisung>(new EinsatzRollenzuweisung(id, einsatzId, userId, rolle, new Date()));
  }

  /**
   * Rekonstruiert eine EinsatzRollenzuweisung aus DB-Daten.
   */
  public static reconstitute(id: string, einsatzId: string, userId: string, rolle: EinsatzRolle, zugewiesenAm: Date): EinsatzRollenzuweisung {
    return new EinsatzRollenzuweisung(id, einsatzId, userId, rolle, zugewiesenAm);
  }

  get id(): string {
    return this._id;
  }

  get einsatzId(): string {
    return this._einsatzId;
  }

  get userId(): string {
    return this._userId;
  }

  get rolle(): EinsatzRolle {
    return this._rolle;
  }

  get zugewiesenAm(): Date {
    return this._zugewiesenAm;
  }

  /**
   * ID-based Equality Check.
   */
  public equals(other?: EinsatzRollenzuweisung): boolean {
    if (other == null) return false;
    if (other === this) return true;
    return this._id === other._id;
  }
}
