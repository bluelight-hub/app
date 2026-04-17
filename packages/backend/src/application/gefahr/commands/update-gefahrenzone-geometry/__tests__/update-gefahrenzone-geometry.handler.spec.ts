// @ts-nocheck
import { Test } from '@nestjs/testing';
import { UpdateGefahrenzoneGeometryHandler } from '../update-gefahrenzone-geometry.handler';
import { UpdateGefahrenzoneGeometryCommand } from '../update-gefahrenzone-geometry.command';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENZONE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { GefahrenzoneGeometryGeaendertEvent } from '@domain/gefahr/events/gefahrenzone-geometry-geaendert.event';

const validFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [10, 50],
        [10.2, 50],
        [10.2, 50.2],
        [10, 50.2],
        [10, 50],
      ],
    ],
  },
};

function makeZone() {
  const geometry = GefahrenzoneGeometry.fromFeature(validFeature).value;
  return Gefahrenzone.create({
    einsatzId: 'einsatz-1',
    gefahrentyp: Gefahrentyp.ATEMGIFTE,
    schutzobjekt: Schutzobjekt.MENSCHEN,
    geometryType: GefahrenzoneGeometryType.POLYGON,
    geometry,
    erstelltVon: 'user-1',
  }).value;
}

describe('UpdateGefahrenzoneGeometryHandler', () => {
  let handler: UpdateGefahrenzoneGeometryHandler;
  let repo: any;
  let outbox: any;
  let prisma: any;

  beforeEach(async () => {
    repo = { save: jest.fn().mockResolvedValue(undefined), findById: jest.fn(), findByEinsatzIdWithWarnstufe: jest.fn(), delete: jest.fn() };
    outbox = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module = await Test.createTestingModule({
      providers: [
        UpdateGefahrenzoneGeometryHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outbox },
        { provide: GEFAHRENZONE_REPOSITORY, useValue: repo },
        { provide: LOGGER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    handler = module.get(UpdateGefahrenzoneGeometryHandler);
  });

  it('aktualisiert die Geometrie und emittiert das Event', async () => {
    const existing = makeZone();
    existing.clearDomainEvents();
    repo.findById.mockResolvedValue(existing);

    const cmd = UpdateGefahrenzoneGeometryCommand.create({
      einsatzId: 'einsatz-1',
      zoneId: existing.id.value,
      geometryType: 'POLYGON',
      geometry: validFeature,
      aktualisiertVon: 'user-2',
    }).value;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedEvents = outbox.save.mock.calls[0][0];
    expect(savedEvents[0]).toBeInstanceOf(GefahrenzoneGeometryGeaendertEvent);
  });

  it('schlägt fehl wenn die Zone nicht gefunden wird', async () => {
    repo.findById.mockResolvedValue(null);
    const cmd = UpdateGefahrenzoneGeometryCommand.create({
      einsatzId: 'einsatz-1',
      zoneId: 'zone-gone',
      geometryType: 'POLYGON',
      geometry: validFeature,
      aktualisiertVon: 'user-2',
    }).value;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('GEFAHRENZONE_NOT_FOUND');
  });
});
