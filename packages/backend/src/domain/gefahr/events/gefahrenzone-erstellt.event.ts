import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { GeoJsonPolygonFeature } from '@domain/gefahr/value-objects/gefahrenzone-geometry';

/**
 * Domain Event: Neue Gefahrenzone wurde auf der Lagekarte erstellt.
 *
 * Payload enthält die initiale Geometrie, damit Read-Model-Projektoren die Zone direkt
 * rendern können, ohne sie nachzuladen. Warnstufe ist bewusst NICHT im Payload —
 * sie liegt in der Matrix-Zelle (ADR-010).
 */
export class GefahrenzoneErstelltEvent extends DomainEvent {
  constructor(
    public readonly zoneId: string,
    public readonly einsatzId: string,
    public readonly gefahrentyp: string,
    public readonly schutzobjekt: string,
    public readonly geometryType: string,
    public readonly geometry: GeoJsonPolygonFeature,
    public readonly bezeichnung: string | null,
    public readonly erstelltVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.GEFAHRENZONE.ERSTELLT;
  }
}
