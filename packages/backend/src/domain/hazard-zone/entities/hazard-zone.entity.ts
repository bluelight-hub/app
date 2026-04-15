import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { HazardZoneId } from '@domain/hazard-zone/value-objects/hazard-zone-id';
import { type HazardZoneGeometry, type HazardZoneGeometryData, HazardZoneGeometryType, validateHazardZoneGeometry } from '@domain/hazard-zone/value-objects/hazard-zone-geometry';
import { HazardZoneCreatedEvent } from '@domain/hazard-zone/events/hazard-zone-created.event';
import { HazardZoneUpdatedEvent } from '@domain/hazard-zone/events/hazard-zone-updated.event';
import { HazardZoneDeletedEvent } from '@domain/hazard-zone/events/hazard-zone-deleted.event';

export interface CreateHazardZoneProps {
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  geometryType: HazardZoneGeometryType;
  geometry: HazardZoneGeometry;
  radiusMeters: number | null;
  label?: string | null;
  beschreibung?: string | null;
  createdBy: string;
}

export interface ReconstructHazardZoneProps {
  id: HazardZoneId;
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  geometryType: HazardZoneGeometryType;
  geometry: HazardZoneGeometry;
  radiusMeters: number | null;
  label: string | null;
  beschreibung: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHazardZoneProps {
  gefahrentyp?: Gefahrentyp;
  geometryType?: HazardZoneGeometryType;
  geometry?: HazardZoneGeometry;
  radiusMeters?: number | null;
  label?: string | null;
  beschreibung?: string | null;
  updatedBy: string;
}

/**
 * HazardZone — räumliche Gefahrenbereich auf der Lagekarte (Issue #627).
 *
 * Eine Zone ist einem Gefahrentyp aus der Gefahrenmatrix zugeordnet. Die
 * aktuelle Warnstufe wird zur Laufzeit aus den zugehörigen
 * GefahrenmatrixBewertungen ermittelt (höchste Warnstufe über alle
 * Schutzobjekte dieses Gefahrentyps im Einsatz).
 *
 * Business Rules:
 * 1. Gefahrentyp muss valider Enum-Wert sein.
 * 2. Geometrie muss Polygon ODER Kreis sein (mit Radius in Metern).
 * 3. Label max. 255 Zeichen.
 * 4. einsatzId + createdBy/updatedBy sind Pflicht.
 */
export class HazardZone extends AggregateRoot<HazardZoneId> {
  private readonly _einsatzId: string;
  private _gefahrentyp: Gefahrentyp;
  private _geometryType: HazardZoneGeometryType;
  private _geometry: HazardZoneGeometry;
  private _radiusMeters: number | null;
  private _label: string | null;
  private _beschreibung: string | null;
  private readonly _createdBy: string;
  private _updatedBy: string;

  private constructor(
    id: HazardZoneId,
    einsatzId: string,
    gefahrentyp: Gefahrentyp,
    geometryType: HazardZoneGeometryType,
    geometry: HazardZoneGeometry,
    radiusMeters: number | null,
    label: string | null,
    beschreibung: string | null,
    createdBy: string,
    updatedBy: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._gefahrentyp = gefahrentyp;
    this._geometryType = geometryType;
    this._geometry = geometry;
    this._radiusMeters = radiusMeters;
    this._label = label;
    this._beschreibung = beschreibung;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  get einsatzId(): string {
    return this._einsatzId;
  }
  get gefahrentyp(): Gefahrentyp {
    return this._gefahrentyp;
  }
  get geometryType(): HazardZoneGeometryType {
    return this._geometryType;
  }
  get geometry(): HazardZoneGeometry {
    return this._geometry;
  }
  get radiusMeters(): number | null {
    return this._radiusMeters;
  }
  get label(): string | null {
    return this._label;
  }
  get beschreibung(): string | null {
    return this._beschreibung;
  }
  get createdBy(): string {
    return this._createdBy;
  }
  get updatedBy(): string {
    return this._updatedBy;
  }

  static create(props: CreateHazardZoneProps): Result<HazardZone> {
    if (!props.einsatzId?.trim()) {
      return Result.fail<HazardZone>('HAZARD_ZONE_EINSATZ_ID_REQUIRED');
    }
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp)) {
      return Result.fail<HazardZone>('HAZARD_ZONE_GEFAHRENTYP_INVALID');
    }
    if (!props.createdBy?.trim()) {
      return Result.fail<HazardZone>('HAZARD_ZONE_CREATED_BY_REQUIRED');
    }

    const geometryData: HazardZoneGeometryData = {
      geometryType: props.geometryType,
      geometry: props.geometry,
      radiusMeters: props.radiusMeters,
    };
    const geometryError = validateHazardZoneGeometry(geometryData);
    if (geometryError) {
      return Result.fail<HazardZone>(geometryError);
    }

    const label = props.label?.trim();
    if (label && label.length > 255) {
      return Result.fail<HazardZone>('HAZARD_ZONE_LABEL_TOO_LONG');
    }

    const idResult = HazardZoneId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<HazardZone>(idResult.error ?? 'HAZARD_ZONE_ID_INVALID');
    }

    const zone = new HazardZone(
      idResult.value as HazardZoneId,
      props.einsatzId.trim(),
      props.gefahrentyp,
      props.geometryType,
      props.geometry,
      props.geometryType === HazardZoneGeometryType.CIRCLE ? props.radiusMeters : null,
      label && label.length > 0 ? label : null,
      props.beschreibung?.trim() || null,
      props.createdBy.trim(),
      props.createdBy.trim(),
    );

    zone.addDomainEvent(new HazardZoneCreatedEvent(props.einsatzId.trim(), (idResult.value as HazardZoneId).value, props.gefahrentyp, props.createdBy.trim()));

    return Result.ok(zone);
  }

  static reconstruct(props: ReconstructHazardZoneProps): HazardZone {
    return new HazardZone(
      props.id,
      props.einsatzId,
      props.gefahrentyp,
      props.geometryType,
      props.geometry,
      props.radiusMeters,
      props.label,
      props.beschreibung,
      props.createdBy,
      props.updatedBy,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Aktualisiert eine oder mehrere Eigenschaften der Zone.
   */
  public update(props: UpdateHazardZoneProps): Result<void> {
    if (!props.updatedBy?.trim()) {
      return Result.fail<void>('HAZARD_ZONE_UPDATED_BY_REQUIRED');
    }

    const nextGefahrentyp = props.gefahrentyp ?? this._gefahrentyp;
    if (!Object.values(Gefahrentyp).includes(nextGefahrentyp)) {
      return Result.fail<void>('HAZARD_ZONE_GEFAHRENTYP_INVALID');
    }

    const nextGeometryType = props.geometryType ?? this._geometryType;
    const nextGeometry = props.geometry ?? this._geometry;
    const nextRadiusMeters = props.radiusMeters !== undefined ? props.radiusMeters : this._radiusMeters;
    const geometryError = validateHazardZoneGeometry({
      geometryType: nextGeometryType,
      geometry: nextGeometry,
      radiusMeters: nextRadiusMeters,
    });
    if (geometryError) {
      return Result.fail<void>(geometryError);
    }

    if (props.label !== undefined) {
      const trimmed = props.label?.trim() ?? '';
      if (trimmed.length > 255) {
        return Result.fail<void>('HAZARD_ZONE_LABEL_TOO_LONG');
      }
      this._label = trimmed.length > 0 ? trimmed : null;
    }
    if (props.beschreibung !== undefined) {
      this._beschreibung = props.beschreibung?.trim() || null;
    }

    this._gefahrentyp = nextGefahrentyp;
    this._geometryType = nextGeometryType;
    this._geometry = nextGeometry;
    this._radiusMeters = nextGeometryType === HazardZoneGeometryType.CIRCLE ? nextRadiusMeters : null;
    this._updatedBy = props.updatedBy.trim();
    this.updateTimestamp();

    this.addDomainEvent(new HazardZoneUpdatedEvent(this._einsatzId, this.id.value, this._gefahrentyp, this._updatedBy));

    return Result.ok<void>(undefined);
  }

  /**
   * Markiert die Zone als gelöscht (emittiert Event; Persistenz erfolgt via Repository).
   */
  public markDeleted(deletedBy: string): Result<void> {
    if (!deletedBy?.trim()) {
      return Result.fail<void>('HAZARD_ZONE_DELETED_BY_REQUIRED');
    }
    this.addDomainEvent(new HazardZoneDeletedEvent(this._einsatzId, this.id.value, this._gefahrentyp, deletedBy.trim()));
    return Result.ok<void>(undefined);
  }
}
