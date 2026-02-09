import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import type { UserId } from '@domain/value-objects/user-id';
import { KategorieErstelltEvent } from '@domain/kategorie/events/kategorie-erstellt.event';
import { KategorieGeloeschtEvent } from '@domain/kategorie/events/kategorie-geloescht.event';

/**
 * Props fuer die Erstellung einer neuen Kategorie.
 */
export interface CreateKategorieProps {
  einsatzId: string;
  name: string;
  farbe: string;
  erstelltVon: UserId;
}

/**
 * Props fuer die Rekonstruktion einer Kategorie aus der Datenbank.
 */
export interface ReconstructKategorieProps {
  id: KategorieId;
  einsatzId: string;
  name: KategorieName;
  farbe: KategorieFarbe;
  erstelltVon: UserId;
  createdAt: Date;
  updatedAt: Date;
  geloeschtAm: Date | null;
  geloeschtVon: UserId | null;
}

/**
 * Kategorie Aggregate Root.
 * Kapselt Business Rules fuer Kategorien im Einsatz-Kontext (Story 8.1).
 * Kategorien sind farbcodierte Labels zur Organisation von Notizen.
 */
export class Kategorie extends AggregateRoot<KategorieId> {
  private readonly _einsatzId: string;
  private readonly _name: KategorieName;
  private readonly _farbe: KategorieFarbe;
  private readonly _erstelltVon: UserId;
  private _geloeschtAm: Date | null;
  private _geloeschtVon: UserId | null;

  private constructor(
    id: KategorieId,
    einsatzId: string,
    name: KategorieName,
    farbe: KategorieFarbe,
    erstelltVon: UserId,
    createdAt?: Date,
    updatedAt?: Date,
    geloeschtAm: Date | null = null,
    geloeschtVon: UserId | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._name = name;
    this._farbe = farbe;
    this._erstelltVon = erstelltVon;
    this._geloeschtAm = geloeschtAm;
    this._geloeschtVon = geloeschtVon;
  }

  // Getters
  get einsatzId(): string {
    return this._einsatzId;
  }
  get name(): KategorieName {
    return this._name;
  }
  get farbe(): KategorieFarbe {
    return this._farbe;
  }
  get erstelltVon(): UserId {
    return this._erstelltVon;
  }
  get geloeschtAm(): Date | null {
    return this._geloeschtAm;
  }
  get geloeschtVon(): UserId | null {
    return this._geloeschtVon;
  }

  /**
   * Factory Method: Neue Kategorie erstellen.
   */
  static create(props: CreateKategorieProps): Result<Kategorie> {
    // Validiere Name
    const nameResult = KategorieName.create(props.name);
    if (nameResult.isFailure || !nameResult.value) {
      return Result.fail<Kategorie>(nameResult.error ?? 'KATEGORIE_NAME_INVALID');
    }

    // Validiere Farbe
    const farbeResult = KategorieFarbe.create(props.farbe);
    if (farbeResult.isFailure || !farbeResult.value) {
      return Result.fail<Kategorie>(farbeResult.error ?? 'KATEGORIE_FARBE_INVALID');
    }

    // Generiere ID
    const idResult = KategorieId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Kategorie>(idResult.error ?? 'KATEGORIE_ID_INVALID');
    }

    const kategorie = new Kategorie(idResult.value as KategorieId, props.einsatzId, nameResult.value, farbeResult.value, props.erstelltVon);

    // Emit Domain Event
    kategorie.addDomainEvent(
      new KategorieErstelltEvent(idResult.value as KategorieId, props.einsatzId, nameResult.value.value, farbeResult.value.value, props.erstelltVon, (idResult.value as KategorieId).toString()),
    );

    return Result.ok<Kategorie>(kategorie);
  }

  /**
   * Reconstruct: Kategorie aus der Datenbank rekonstruieren.
   */
  static reconstruct(props: ReconstructKategorieProps): Kategorie {
    return new Kategorie(props.id, props.einsatzId, props.name, props.farbe, props.erstelltVon, props.createdAt, props.updatedAt, props.geloeschtAm, props.geloeschtVon);
  }

  /**
   * Soft-Delete: Markiert die Kategorie als geloescht (Story 8.2).
   * Idempotenz: Bereits geloeschte Kategorien geben Failure zurueck.
   */
  public softDelete(geloeschtVon: UserId): Result<void> {
    if (this._geloeschtAm !== null) {
      return Result.fail<void>('KATEGORIE_ALREADY_DELETED');
    }

    this._geloeschtAm = new Date();
    this._geloeschtVon = geloeschtVon;

    // Kein updateTimestamp() — Soft-Delete hat separates geloeschtAm Feld

    this.addDomainEvent(new KategorieGeloeschtEvent(this.id, this._einsatzId, this._name.value, geloeschtVon, this.id.toString()));

    return Result.ok<void>(undefined);
  }
}
