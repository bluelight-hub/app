// @ts-nocheck
import { Test } from '@nestjs/testing';
import { GetGefahrenzonenByEinsatzHandler } from '../get-gefahrenzonen-by-einsatz.handler';
import { GetGefahrenzonenByEinsatzQuery } from '../get-gefahrenzonen-by-einsatz.query';
import { GEFAHRENZONE_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';

const validFeature = {
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
};

function makeZone(typ: Gefahrentyp) {
  const geometry = GefahrenzoneGeometry.fromFeature(validFeature).value;
  return Gefahrenzone.create({
    einsatzId: 'einsatz-1',
    gefahrentyp: typ,
    schutzobjekt: Schutzobjekt.MENSCHEN,
    geometryType: GefahrenzoneGeometryType.POLYGON,
    geometry,
    erstelltVon: 'user-1',
  }).value;
}

describe('GetGefahrenzonenByEinsatzHandler', () => {
  let handler: GetGefahrenzonenByEinsatzHandler;
  let repo: any;

  beforeEach(async () => {
    repo = { save: jest.fn(), findById: jest.fn(), findByEinsatzIdWithWarnstufe: jest.fn(), delete: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GetGefahrenzonenByEinsatzHandler,
        { provide: GEFAHRENZONE_REPOSITORY, useValue: repo },
        { provide: LOGGER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    handler = module.get(GetGefahrenzonenByEinsatzHandler);
  });

  it('liefert Zonen mit gejointer Warnstufe', async () => {
    const zone1 = makeZone(Gefahrentyp.ATEMGIFTE);
    const zone2 = makeZone(Gefahrentyp.BRAND);
    repo.findByEinsatzIdWithWarnstufe.mockResolvedValue([
      { zone: zone1, warnstufe: Warnstufe.HOCH },
      { zone: zone2, warnstufe: null },
    ]);

    const query = GetGefahrenzonenByEinsatzQuery.create({ einsatzId: 'einsatz-1' }).value;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.zonen).toHaveLength(2);
    expect(result.value.zonen[0].warnstufe).toBe(Warnstufe.HOCH);
    expect(result.value.zonen[1].warnstufe).toBeNull();
  });

  it('verweigert leere einsatzId', () => {
    const result = GetGefahrenzonenByEinsatzQuery.create({ einsatzId: '' });
    expect(result.isFailure).toBe(true);
  });
});
