import { InternalServerErrorException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { GetEigenschutzAmpelStatusQuery } from '@/application/eigenschutz/queries/get-eigenschutz-ampel-status/get-eigenschutz-ampel-status.query';
import { ListAmpelWarnBadgesQuery } from '@/application/eigenschutz/queries/list-ampel-warn-badges/list-ampel-warn-badges.query';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { EigenschutzAmpelController } from '../eigenschutz-ampel.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06201';

describe('EigenschutzAmpelController', () => {
  let controller: EigenschutzAmpelController;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EigenschutzAmpelController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EigenschutzAmpelController);
  });

  it('trägt nur JwtAuthGuard auf Klassen-Ebene', () => {
    const guards = Reflect.getMetadata('__guards__', EigenschutzAmpelController) as unknown[];
    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('Routing trägt einsatz-scoped Path und version="alpha"', () => {
    expect(Reflect.getMetadata('path', EigenschutzAmpelController)).toBe('einsaetze/:einsatzId/sicherheit/eigenschutz');
    expect(Reflect.getMetadata('__version__', EigenschutzAmpelController)).toBe('alpha');
  });

  it('listWarnBadges nutzt die statische Route ampel/warn-badges', () => {
    expect(Reflect.getMetadata('path', EigenschutzAmpelController.prototype.listWarnBadges)).toBe('ampel/warn-badges');
  });

  it('liefert die AmpelProjection-Liste aus dem QueryBus', async () => {
    const rows = [{ einsatzId: EINSATZ_ID, einheitId: 'einheit-1', status: 'GRUEN' }];
    queryBus.execute.mockResolvedValue(Result.ok(rows));

    const response = await controller.getAmpel(EINSATZ_ID);

    expect(response).toBe(rows);
    expect(queryBus.execute).toHaveBeenCalledWith(new GetEigenschutzAmpelStatusQuery(EINSATZ_ID));
  });

  it('liefert eine leere Liste ohne Spezialfehler', async () => {
    queryBus.execute.mockResolvedValue(Result.ok([]));

    await expect(controller.getAmpel(EINSATZ_ID)).resolves.toEqual([]);
  });

  it('liefert Warn-Badges aus dem QueryBus', async () => {
    const rows = [
      {
        id: 'gefahr:gef-1:item-1',
        einsatzId: EINSATZ_ID,
        einheitId: 'einheit-1',
        type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME',
        label: 'Gefährdung ohne Schutzmaßnahme',
        sortRank: 10,
        occurredAt: '2026-05-08T10:00:00.000Z',
      },
    ];
    queryBus.execute.mockResolvedValue(Result.ok(rows));

    const response = await controller.listWarnBadges(EINSATZ_ID);

    expect(response).toBe(rows);
    expect(queryBus.execute).toHaveBeenCalledWith(new ListAmpelWarnBadgesQuery(EINSATZ_ID));
  });

  it('liefert eine leere Warn-Badge-Liste ohne Spezialfehler', async () => {
    queryBus.execute.mockResolvedValue(Result.ok([]));

    await expect(controller.listWarnBadges(EINSATZ_ID)).resolves.toEqual([]);
  });

  it('mappt InfrastructureError auf 500', async () => {
    queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:AmpelProjection:db-down'));

    await expect(controller.getAmpel(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('mappt Warn-Badge-InfrastructureError auf 500', async () => {
    queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:AmpelWarnBadgeRead:db-down'));

    await expect(controller.listWarnBadges(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
