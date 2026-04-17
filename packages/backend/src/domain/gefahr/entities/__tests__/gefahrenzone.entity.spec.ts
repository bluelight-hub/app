import { Gefahrenzone, GEFAHRENZONE_ERROR_CODES } from '../gefahrenzone.entity';
import { Gefahrentyp } from '../../value-objects/gefahrentyp';
import { Schutzobjekt } from '../../value-objects/schutzobjekt';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '../../value-objects/gefahrenzone-geometry';

function validGeometry() {
  return GefahrenzoneGeometry.fromFeature({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [10, 50],
          [10.1, 50],
          [10.1, 50.1],
          [10, 50.1],
          [10, 50],
        ],
      ],
    },
  }).value!;
}

function validProps() {
  return {
    einsatzId: 'einsatz-42',
    gefahrentyp: Gefahrentyp.ATEMGIFTE,
    schutzobjekt: Schutzobjekt.MENSCHEN,
    geometryType: GefahrenzoneGeometryType.POLYGON,
    geometry: validGeometry(),
    erstelltVon: 'user-1',
  };
}

describe('Gefahrenzone Aggregate', () => {
  describe('create', () => {
    it('legt eine valide Zone an und emittiert GefahrenzoneErstelltEvent', () => {
      const result = Gefahrenzone.create(validProps());
      expect(result.isSuccess).toBe(true);
      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.constructor.name).toBe('GefahrenzoneErstelltEvent');
    });

    it('lehnt leere einsatzId ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), einsatzId: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    it('lehnt ungültigen Gefahrentyp ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), gefahrentyp: 'INVALID' as Gefahrentyp });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.GEFAHRENTYP_INVALID);
    });

    it('lehnt ungültiges Schutzobjekt ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), schutzobjekt: 'INVALID' as Schutzobjekt });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.SCHUTZOBJEKT_INVALID);
    });

    it('lehnt ungültigen GeometryType ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), geometryType: 'SPLINE' as GefahrenzoneGeometryType });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    });

    it('lehnt zu lange Bezeichnung ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), bezeichnung: 'x'.repeat(201) });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.BEZEICHNUNG_TOO_LONG);
    });

    it('normalisiert leere Bezeichnung zu null', () => {
      const result = Gefahrenzone.create({ ...validProps(), bezeichnung: '   ' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.bezeichnung).toBeNull();
    });

    it('lehnt leeren erstelltVon ab', () => {
      const result = Gefahrenzone.create({ ...validProps(), erstelltVon: '  ' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    });
  });

  describe('updateGeometry', () => {
    it('tauscht die Geometrie und emittiert ein GeometryGeaendertEvent', () => {
      const zone = Gefahrenzone.create(validProps()).value!;
      zone.clearDomainEvents();

      const neueGeometrie = GefahrenzoneGeometry.fromCircle([10, 50], 300).value!;
      const res = zone.updateGeometry(GefahrenzoneGeometryType.CIRCLE, neueGeometrie, 'user-2');
      expect(res.isSuccess).toBe(true);
      expect(zone.geometryType).toBe(GefahrenzoneGeometryType.CIRCLE);
      const events = zone.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.constructor.name).toBe('GefahrenzoneGeometryGeaendertEvent');
    });

    it('lehnt leeren aktualisiertVon ab', () => {
      const zone = Gefahrenzone.create(validProps()).value!;
      const neueGeometrie = GefahrenzoneGeometry.fromCircle([10, 50], 300).value!;
      const res = zone.updateGeometry(GefahrenzoneGeometryType.CIRCLE, neueGeometrie, '');
      expect(res.isFailure).toBe(true);
      expect(res.error).toBe(GEFAHRENZONE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    });
  });

  describe('markDeleted', () => {
    it('emittiert ein GeloeschtEvent', () => {
      const zone = Gefahrenzone.create(validProps()).value!;
      zone.clearDomainEvents();
      const res = zone.markDeleted('user-3');
      expect(res.isSuccess).toBe(true);
      const events = zone.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.constructor.name).toBe('GefahrenzoneGeloeschtEvent');
    });
  });
});
