import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { GefahrenzoneId } from '@domain/gefahr/value-objects/gefahrenzone-id';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { GefahrenzoneErstelltEvent } from '@domain/gefahr/events/gefahrenzone-erstellt.event';
import { GefahrenzoneGeometryGeaendertEvent } from '@domain/gefahr/events/gefahrenzone-geometry-geaendert.event';
import { GefahrenzoneGeloeschtEvent } from '@domain/gefahr/events/gefahrenzone-geloescht.event';

const MAX_BEZEICHNUNG_LENGTH = 200;

/** Error-Codes für Gefahrenzone-Invarianten — stabil, werden an API/UI weitergegeben. */
export const GEFAHRENZONE_ERROR_CODES = {
  EINSATZ_ID_REQUIRED: 'GEFAHRENZONE_EINSATZ_ID_REQUIRED',
  GEFAHRENTYP_INVALID: 'GEFAHRENZONE_GEFAHRENTYP_INVALID',
  SCHUTZOBJEKT_INVALID: 'GEFAHRENZONE_SCHUTZOBJEKT_INVALID',
  GEOMETRY_TYPE_INVALID: 'GEFAHRENZONE_GEOMETRY_TYPE_INVALID',
  BEZEICHNUNG_TOO_LONG: 'GEFAHRENZONE_BEZEICHNUNG_TOO_LONG',
  ERSTELLT_VON_REQUIRED: 'GEFAHRENZONE_ERSTELLT_VON_REQUIRED',
  AKTUALISIERT_VON_REQUIRED: 'GEFAHRENZONE_AKTUALISIERT_VON_REQUIRED',
} as const;

export interface CreateGefahrenzoneProps {
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  geometryType: GefahrenzoneGeometryType;
  geometry: GefahrenzoneGeometry;
  bezeichnung?: string | null;
  erstelltVon: string;
}

export interface ReconstructGefahrenzoneProps {
  id: GefahrenzoneId;
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  geometryType: GefahrenzoneGeometryType;
  geometry: GefahrenzoneGeometry;
  bezeichnung: string | null;
  erstelltVon: string;
  aktualisiertVon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gefahrenzone Aggregate Root.
 *
 * Räumliche Verortung einer Matrix-Zelle auf der Lagekarte. Die Warnstufe liegt
 * **nicht** auf der Zone, sondern auf der referenzierten Matrix-Zelle (ADR-010).
 * Das erlaubt Mehrfach-Zonen pro Zelle und verhindert Drift zwischen Matrix und Karte.
 *
 * Invarianten:
 * 1. `gefahrentyp` und `schutzobjekt` sind **nach Erstellung nicht änderbar** — eine Umwidmung
 *    auf eine andere Matrix-Zelle erfolgt per Löschen + Neuerstellen.
 * 2. `geometry` ist immer ein gültiges GeoJSON-Feature (Polygon) — CIRCLE-Hint lebt in `geometryType`.
 * 3. `bezeichnung` ist optional, max 200 Zeichen (Panel-Label).
 */
export class Gefahrenzone extends AggregateRoot<GefahrenzoneId> {
  private readonly _einsatzId: string;
  private readonly _gefahrentyp: Gefahrentyp;
  private readonly _schutzobjekt: Schutzobjekt;
  private _geometryType: GefahrenzoneGeometryType;
  private _geometry: GefahrenzoneGeometry;
  private _bezeichnung: string | null;
  private readonly _erstelltVon: string;
  private _aktualisiertVon: string | null;

  private constructor(
    id: GefahrenzoneId,
    einsatzId: string,
    gefahrentyp: Gefahrentyp,
    schutzobjekt: Schutzobjekt,
    geometryType: GefahrenzoneGeometryType,
    geometry: GefahrenzoneGeometry,
    bezeichnung: string | null,
    erstelltVon: string,
    aktualisiertVon: string | null,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._gefahrentyp = gefahrentyp;
    this._schutzobjekt = schutzobjekt;
    this._geometryType = geometryType;
    this._geometry = geometry;
    this._bezeichnung = bezeichnung;
    this._erstelltVon = erstelltVon;
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
  get geometryType(): GefahrenzoneGeometryType {
    return this._geometryType;
  }
  get geometry(): GefahrenzoneGeometry {
    return this._geometry;
  }
  get bezeichnung(): string | null {
    return this._bezeichnung;
  }
  get erstelltVon(): string {
    return this._erstelltVon;
  }
  get aktualisiertVon(): string | null {
    return this._aktualisiertVon;
  }

  static create(props: CreateGefahrenzoneProps): Result<Gefahrenzone> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp)) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.GEFAHRENTYP_INVALID);
    }
    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt)) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.SCHUTZOBJEKT_INVALID);
    }
    if (!Object.values(GefahrenzoneGeometryType).includes(props.geometryType)) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }

    const bezeichnung = normalizeBezeichnung(props.bezeichnung);
    if (bezeichnung && bezeichnung.length > MAX_BEZEICHNUNG_LENGTH) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.BEZEICHNUNG_TOO_LONG);
    }

    const erstelltVon = props.erstelltVon?.trim() ?? '';
    if (erstelltVon.length === 0) {
      return Result.fail<Gefahrenzone>(GEFAHRENZONE_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    const idResult = GefahrenzoneId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<Gefahrenzone>(idResult.error ?? 'GEFAHRENZONE_ID_INVALID');
    }

    const zone = new Gefahrenzone(idResult.value as GefahrenzoneId, einsatzId, props.gefahrentyp, props.schutzobjekt, props.geometryType, props.geometry, bezeichnung, erstelltVon, null);

    zone.addDomainEvent(
      new GefahrenzoneErstelltEvent(zone.id.value, einsatzId, props.gefahrentyp, props.schutzobjekt, props.geometryType, props.geometry.toJSON(), bezeichnung, erstelltVon, zone.id.value),
    );

    return Result.ok(zone);
  }

  static reconstruct(props: ReconstructGefahrenzoneProps): Gefahrenzone {
    return new Gefahrenzone(
      props.id,
      props.einsatzId,
      props.gefahrentyp,
      props.schutzobjekt,
      props.geometryType,
      props.geometry,
      props.bezeichnung,
      props.erstelltVon,
      props.aktualisiertVon,
      props.createdAt,
      props.updatedAt,
    );
  }

  /** Ersetzt die Geometrie komplett; emittiert `GefahrenzoneGeometryGeaendertEvent`. */
  public updateGeometry(geometryType: GefahrenzoneGeometryType, geometry: GefahrenzoneGeometry, aktualisiertVon: string): Result<void> {
    if (!Object.values(GefahrenzoneGeometryType).includes(geometryType)) {
      return Result.fail<void>(GEFAHRENZONE_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }
    const von = aktualisiertVon?.trim() ?? '';
    if (von.length === 0) {
      return Result.fail<void>(GEFAHRENZONE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    this._geometryType = geometryType;
    this._geometry = geometry;
    this._aktualisiertVon = von;
    this.updateTimestamp();

    this.addDomainEvent(new GefahrenzoneGeometryGeaendertEvent(this.id.value, this._einsatzId, geometryType, geometry.toJSON(), von, this.id.value));

    return Result.ok<void>(undefined);
  }

  /** Aktualisiert die Panel-Bezeichnung (oder entfernt sie bei null / leer). Emittiert kein eigenes Event. */
  public updateBezeichnung(bezeichnung: string | null, aktualisiertVon: string): Result<void> {
    const normalized = normalizeBezeichnung(bezeichnung);
    if (normalized && normalized.length > MAX_BEZEICHNUNG_LENGTH) {
      return Result.fail<void>(GEFAHRENZONE_ERROR_CODES.BEZEICHNUNG_TOO_LONG);
    }
    const von = aktualisiertVon?.trim() ?? '';
    if (von.length === 0) {
      return Result.fail<void>(GEFAHRENZONE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }
    this._bezeichnung = normalized;
    this._aktualisiertVon = von;
    this.updateTimestamp();
    return Result.ok<void>(undefined);
  }

  /** Markiert die Zone als gelöscht und emittiert `GefahrenzoneGeloeschtEvent`. */
  public markDeleted(geloeschtVon: string): Result<void> {
    const von = geloeschtVon?.trim() ?? '';
    if (von.length === 0) {
      return Result.fail<void>(GEFAHRENZONE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }
    this.addDomainEvent(new GefahrenzoneGeloeschtEvent(this.id.value, this._einsatzId, von, this.id.value));
    return Result.ok<void>(undefined);
  }
}

function normalizeBezeichnung(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}
