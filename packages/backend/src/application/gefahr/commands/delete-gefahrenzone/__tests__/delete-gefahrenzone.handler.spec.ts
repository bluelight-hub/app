// @ts-nocheck
import { Test } from '@nestjs/testing';
import { DeleteGefahrenzoneHandler } from '../delete-gefahrenzone.handler';
import { DeleteGefahrenzoneCommand } from '../delete-gefahrenzone.command';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENZONE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { GefahrenzoneGeloeschtEvent } from '@domain/gefahr/events/gefahrenzone-geloescht.event';

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

function makeZone() {
  const geometry = GefahrenzoneGeometry.fromFeature(validFeature).value;
  return Gefahrenzone.create({
    einsatzId: 'einsatz-1',
    gefahrentyp: Gefahrentyp.BRAND,
    schutzobjekt: Schutzobjekt.SACHWERTE,
    geometryType: GefahrenzoneGeometryType.POLYGON,
    geometry,
    erstelltVon: 'user-1',
  }).value;
}

describe('DeleteGefahrenzoneHandler', () => {
  let handler: DeleteGefahrenzoneHandler;
  let repo: any;
  let outbox: any;
  let prisma: any;

  beforeEach(async () => {
    repo = { save: jest.fn(), findById: jest.fn(), findByEinsatzIdWithWarnstufe: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    outbox = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module = await Test.createTestingModule({
      providers: [
        DeleteGefahrenzoneHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outbox },
        { provide: GEFAHRENZONE_REPOSITORY, useValue: repo },
        { provide: LOGGER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    handler = module.get(DeleteGefahrenzoneHandler);
  });

  it('löscht die Zone und publiziert das Event', async () => {
    const zone = makeZone();
    zone.clearDomainEvents();
    repo.findById.mockResolvedValue(zone);

    const cmd = DeleteGefahrenzoneCommand.create({ einsatzId: 'einsatz-1', zoneId: zone.id.value, geloeschtVon: 'user-9' }).value;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('einsatz-1', zone.id.value, expect.anything());
    const savedEvents = outbox.save.mock.calls[0][0];
    expect(savedEvents[0]).toBeInstanceOf(GefahrenzoneGeloeschtEvent);
  });

  it('schlägt fehl wenn die Zone nicht existiert', async () => {
    repo.findById.mockResolvedValue(null);
    const cmd = DeleteGefahrenzoneCommand.create({ einsatzId: 'einsatz-1', zoneId: 'zone-gone', geloeschtVon: 'user-9' }).value;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('GEFAHRENZONE_NOT_FOUND');
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
