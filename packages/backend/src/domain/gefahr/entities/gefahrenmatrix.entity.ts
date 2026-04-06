import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { GefahrId } from '@domain/gefahr/value-objects/gefahr-id';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';

export interface CreateBewertungProps {
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  warnstufe: Warnstufe;
  beschreibung?: string;
  gemeldetVon?: string;
  aktualisiertVon: string;
}

export interface ReconstructBewertungProps {
  id: GefahrId;
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  warnstufe: Warnstufe;
  beschreibung: string | null;
  gemeldetVon: string | null;
  aktualisiertVon: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gefahrenmatrix-Bewertung: Eine Zelle in der Matrix (Gefahrentyp x Schutzobjekt).
 *
 * Jede Bewertung repräsentiert die Einschätzung einer Gefahr für ein bestimmtes Schutzobjekt.
 * Pro Einsatz gibt es maximal 65 Bewertungen (13 Gefahrentypen × 5 Schutzobjekte).
 *
 * Business Rules:
 * 1. Gefahrentyp und Schutzobjekt müssen valide Enum-Werte sein
 * 2. Warnstufe KEINE entfernt die Bewertung effektiv (kein Eintrag nötig)
 * 3. Nur eine Bewertung pro (einsatzId, gefahrentyp, schutzobjekt)
 */
export class GefahrenmatrixBewertung extends AggregateRoot<GefahrId> {
  private readonly _einsatzId: string;
  private readonly _gefahrentyp: Gefahrentyp;
  private readonly _schutzobjekt: Schutzobjekt;
  private _warnstufe: Warnstufe;
  private _beschreibung: string | null;
  private _gemeldetVon: string | null;
  private _aktualisiertVon: string;

  private constructor(
    id: GefahrId,
    einsatzId: string,
    gefahrentyp: Gefahrentyp,
    schutzobjekt: Schutzobjekt,
    warnstufe: Warnstufe,
    beschreibung: string | null,
    gemeldetVon: string | null,
    aktualisiertVon: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._gefahrentyp = gefahrentyp;
    this._schutzobjekt = schutzobjekt;
    this._warnstufe = warnstufe;
    this._beschreibung = beschreibung;
    this._gemeldetVon = gemeldetVon;
    this._aktualisiertVon = aktualisiertVon;
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get gefahrentyp(): Gefahrentyp {
    return this._gefahrentyp;
  }
  get schutzobjekt(): Schutzobjekt {
    return this._schutzobjekt;
  }
  get warnstufe(): Warnstufe {
    return this._warnstufe;
  }
  get beschreibung(): string | null {
    return this._beschreibung;
  }
  get gemeldetVon(): string | null {
    return this._gemeldetVon;
  }
  get aktualisiertVon(): string {
    return this._aktualisiertVon;
  }

  static create(props: CreateBewertungProps): Result<GefahrenmatrixBewertung> {
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_GEFAHRENTYP_INVALID');
    }
    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_SCHUTZOBJEKT_INVALID');
    }
    if (!Object.values(Warnstufe).includes(props.warnstufe)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_WARNSTUFE_INVALID');
    }

    const idResult = GefahrId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<GefahrenmatrixBewertung>(idResult.error ?? 'GEFAHR_ID_INVALID');
    }

    const bewertung = new GefahrenmatrixBewertung(
      idResult.value as GefahrId,
      props.einsatzId,
      props.gefahrentyp,
      props.schutzobjekt,
      props.warnstufe,
      props.beschreibung?.trim() || null,
      props.gemeldetVon?.trim() || null,
      props.aktualisiertVon,
    );

    bewertung.addDomainEvent(
      new GefahrenmatrixAktualisiertEvent(props.einsatzId, props.gefahrentyp, props.schutzobjekt, props.warnstufe, props.aktualisiertVon, (idResult.value as GefahrId).toString()),
    );

    return Result.ok(bewertung);
  }

  static reconstruct(props: ReconstructBewertungProps): GefahrenmatrixBewertung {
    return new GefahrenmatrixBewertung(
      props.id,
      props.einsatzId,
      props.gefahrentyp,
      props.schutzobjekt,
      props.warnstufe,
      props.beschreibung,
      props.gemeldetVon,
      props.aktualisiertVon,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Aktualisiert die Warnstufe dieser Bewertung.
   */
  public updateWarnstufe(warnstufe: Warnstufe, aktualisiertVon: string): Result<void> {
    if (!Object.values(Warnstufe).includes(warnstufe)) {
      return Result.fail<void>('GEFAHR_WARNSTUFE_INVALID');
    }

    this._warnstufe = warnstufe;
    this._aktualisiertVon = aktualisiertVon;
    this.updateTimestamp();

    this.addDomainEvent(new GefahrenmatrixAktualisiertEvent(this._einsatzId, this._gefahrentyp, this._schutzobjekt, warnstufe, aktualisiertVon, this.id.toString()));

    return Result.ok<void>(undefined);
  }

  /**
   * Aktualisiert die Beschreibung.
   */
  public updateBeschreibung(beschreibung: string | null): void {
    this._beschreibung = beschreibung?.trim() || null;
    this.updateTimestamp();
  }
}
