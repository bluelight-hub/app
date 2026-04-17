// @ts-nocheck
import { Test } from '@nestjs/testing';
import { CreateGefahrenzoneHandler } from '../create-gefahrenzone.handler';
import { CreateGefahrenzoneCommand } from '../create-gefahrenzone.command';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENZONE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { GefahrenzoneErstelltEvent } from '@domain/gefahr/events/gefahrenzone-erstellt.event';

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

describe('CreateGefahrenzoneHandler', () => {
  let handler: CreateGefahrenzoneHandler;
  let repo: { save: jest.Mock; findById: jest.Mock; findByEinsatzIdWithWarnstufe: jest.Mock; delete: jest.Mock };
  let outbox: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    repo = { save: jest.fn().mockResolvedValue(undefined), findById: jest.fn(), findByEinsatzIdWithWarnstufe: jest.fn(), delete: jest.fn() };
    outbox = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module = await Test.createTestingModule({
      providers: [
        CreateGefahrenzoneHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_REPOSITORY, useValue: outbox },
        { provide: GEFAHRENZONE_REPOSITORY, useValue: repo },
        { provide: LOGGER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    handler = module.get(CreateGefahrenzoneHandler);
  });

  it('legt eine Zone an, persistiert + publiziert das Event', async () => {
    const command = CreateGefahrenzoneCommand.create({
      einsatzId: 'einsatz-1',
      gefahrentyp: 'ATEMGIFTE',
      schutzobjekt: 'MENSCHEN',
      geometryType: 'POLYGON',
      geometry: validFeature,
      erstelltVon: 'user-1',
      bezeichnung: 'Nord-Sektor',
    }).value;

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.einsatzId).toBe('einsatz-1');
    expect(result.value!.warnstufe).toBeNull();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(outbox.save).toHaveBeenCalledTimes(1);
    const savedEvents = outbox.save.mock.calls[0][0];
    expect(savedEvents[0]).toBeInstanceOf(GefahrenzoneErstelltEvent);
  });

  it('validiert ungültige Gefahrentypen im Command', () => {
    const result = CreateGefahrenzoneCommand.create({
      einsatzId: 'einsatz-1',
      gefahrentyp: 'INVALID',
      schutzobjekt: 'MENSCHEN',
      geometryType: 'POLYGON',
      geometry: validFeature,
      erstelltVon: 'user-1',
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('GEFAHRENZONE_GEFAHRENTYP_INVALID');
  });

  it('validiert ungültige GeoJSON-Payload im Command', () => {
    const result = CreateGefahrenzoneCommand.create({
      einsatzId: 'einsatz-1',
      gefahrentyp: 'ATEMGIFTE',
      schutzobjekt: 'MENSCHEN',
      geometryType: 'POLYGON',
      geometry: { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } },
      erstelltVon: 'user-1',
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('GEFAHRENZONE_GEOMETRY_INVALID_TYPE');
  });

  it('verweigert leere erstelltVon', () => {
    const result = CreateGefahrenzoneCommand.create({
      einsatzId: 'einsatz-1',
      gefahrentyp: 'ATEMGIFTE',
      schutzobjekt: 'MENSCHEN',
      geometryType: 'POLYGON',
      geometry: validFeature,
      erstelltVon: '',
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('GEFAHRENZONE_ERSTELLT_VON_REQUIRED');
  });
});
