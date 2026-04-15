// @ts-nocheck
import { HazardZone } from '../hazard-zone.entity';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { HazardZoneGeometryType, type HazardZoneGeometry } from '../../value-objects/hazard-zone-geometry';

const validPolygonGeometry: HazardZoneGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [7.0, 50.0],
      [7.1, 50.0],
      [7.1, 50.1],
      [7.0, 50.1],
      [7.0, 50.0],
    ],
  ],
};

const validCircleGeometry: HazardZoneGeometry = {
  type: 'Point',
  coordinates: [7.0, 50.0],
};

describe('HazardZone', () => {
  const validPolygonProps = {
    einsatzId: 'test-einsatz-id',
    gefahrentyp: Gefahrentyp.BRAND,
    geometryType: HazardZoneGeometryType.POLYGON,
    geometry: validPolygonGeometry,
    radiusMeters: null,
    createdBy: 'test-user-id',
  };

  const validCircleProps = {
    einsatzId: 'test-einsatz-id',
    gefahrentyp: Gefahrentyp.CHEMISCHE_STOFFE,
    geometryType: HazardZoneGeometryType.CIRCLE,
    geometry: validCircleGeometry,
    radiusMeters: 150,
    createdBy: 'test-user-id',
  };

  describe('create', () => {
    it('erstellt eine Polygon-Zone mit gültigen Props', () => {
      const result = HazardZone.create(validPolygonProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.gefahrentyp).toBe(Gefahrentyp.BRAND);
      expect(result.value!.geometryType).toBe(HazardZoneGeometryType.POLYGON);
      expect(result.value!.radiusMeters).toBeNull();
    });

    it('erstellt eine Kreis-Zone mit Radius', () => {
      const result = HazardZone.create(validCircleProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.geometryType).toBe(HazardZoneGeometryType.CIRCLE);
      expect(result.value!.radiusMeters).toBe(150);
    });

    it('emittiert HazardZoneCreatedEvent', () => {
      const result = HazardZone.create(validPolygonProps);

      expect(result.isSuccess).toBe(true);
      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('HazardZoneCreatedEvent');
    });

    it('schlägt fehl ohne einsatzId', () => {
      const result = HazardZone.create({ ...validPolygonProps, einsatzId: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_EINSATZ_ID_REQUIRED');
    });

    it('schlägt fehl bei ungültigem Gefahrentyp', () => {
      const result = HazardZone.create({ ...validPolygonProps, gefahrentyp: 'INVALID' as Gefahrentyp });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_GEFAHRENTYP_INVALID');
    });

    it('schlägt fehl bei nicht-geschlossenem Polygon', () => {
      const result = HazardZone.create({
        ...validPolygonProps,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [7.0, 50.0],
              [7.1, 50.0],
              [7.1, 50.1],
              [7.0, 50.1],
            ],
          ],
        },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_POLYGON_NOT_CLOSED');
    });

    it('schlägt fehl wenn Kreis keinen Radius hat', () => {
      const result = HazardZone.create({ ...validCircleProps, radiusMeters: null });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_RADIUS_INVALID');
    });

    it('schlägt fehl wenn Polygon einen Radius gesetzt hat', () => {
      const result = HazardZone.create({ ...validPolygonProps, radiusMeters: 100 });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_RADIUS_NOT_ALLOWED');
    });
  });

  describe('update', () => {
    it('aktualisiert Label und emittiert UpdatedEvent', () => {
      const zone = HazardZone.create(validPolygonProps).value!;
      zone.clearDomainEvents();

      const result = zone.update({ label: 'Brandherd Halle 3', updatedBy: 'other-user' });

      expect(result.isSuccess).toBe(true);
      expect(zone.label).toBe('Brandherd Halle 3');
      expect(zone.updatedBy).toBe('other-user');
      const events = zone.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('HazardZoneUpdatedEvent');
    });

    it('schlägt fehl wenn updatedBy fehlt', () => {
      const zone = HazardZone.create(validPolygonProps).value!;
      const result = zone.update({ updatedBy: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('HAZARD_ZONE_UPDATED_BY_REQUIRED');
    });
  });

  describe('markDeleted', () => {
    it('emittiert DeletedEvent', () => {
      const zone = HazardZone.create(validPolygonProps).value!;
      zone.clearDomainEvents();

      const result = zone.markDeleted('delete-user');

      expect(result.isSuccess).toBe(true);
      const events = zone.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('HazardZoneDeletedEvent');
    });
  });
});
