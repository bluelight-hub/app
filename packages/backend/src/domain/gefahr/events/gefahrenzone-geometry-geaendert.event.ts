import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { GeoJsonPolygonFeature } from '@domain/gefahr/value-objects/gefahrenzone-geometry';

/**
 * Domain Event: Geometrie einer bestehenden Gefahrenzone wurde geändert.
 *
 * Ändert ausschließlich die räumliche Ausdehnung. Matrix-Referenz (gefahrentyp, schutzobjekt)
 * bleibt konstant — dafür müsste die Zone gelöscht und neu erstellt werden.
 */
export class GefahrenzoneGeometryGeaendertEvent extends DomainEvent {
  constructor(
    public readonly zoneId: string,
    public readonly einsatzId: string,
    public readonly geometryType: string,
    public readonly geometry: GeoJsonPolygonFeature,
    public readonly aktualisiertVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.GEFAHRENZONE.GEOMETRY_GEAENDERT;
  }
}
