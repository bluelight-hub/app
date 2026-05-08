import { InternalServerErrorException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { ListOffeneRueckmeldungenQuery } from '@/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.query';
import { EIGENSCHUTZ_PERMISSION_KEY } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { LOGGER } from '@infrastructure/di-tokens';
import { PsaProfilController } from '../psa-profil.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';

describe('PsaProfilController — Story 6.4 (offene Rückmeldungen)', () => {
  let controller: PsaProfilController;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PsaProfilController],
      providers: [
        { provide: CommandBus, useValue: { execute: jest.fn() } },
        { provide: QueryBus, useValue: queryBus },
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EinsatzScopeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PsaProfilController);
  });

  it('reicht die Query-Antwort durch und baut ListOffeneRueckmeldungenQuery', async () => {
    const sample = [
      {
        propagationGroupId: GROUP_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        lueckeNotiz: 'Filterpatrone fehlt',
        gemeldetAm: '2026-05-08T09:42:13.000Z',
        begruendungAnriss: 'CBRN-Lage',
      },
    ];
    queryBus.execute.mockResolvedValue(Result.ok(sample));

    const result = await controller.listOffeneRueckmeldungen(EINSATZ_ID);

    const query = queryBus.execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(ListOffeneRueckmeldungenQuery);
    expect(query.einsatzId).toBe(EINSATZ_ID);
    expect(result).toBe(sample);
  });

  it('liefert eine leere Liste ohne Spezialfehler', async () => {
    queryBus.execute.mockResolvedValue(Result.ok([]));

    await expect(controller.listOffeneRueckmeldungen(EINSATZ_ID)).resolves.toEqual([]);
  });

  it('trägt @RequiresPermission("eigenschutz:psa:read")', () => {
    const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, PsaProfilController.prototype.listOffeneRueckmeldungen);
    expect(required).toEqual(['eigenschutz:psa:read']);
  });

  it('nutzt eine statische GET-Route vor dynamischen propagation-groups-Routen', () => {
    const path = Reflect.getMetadata(PATH_METADATA, PsaProfilController.prototype.listOffeneRueckmeldungen);
    const method = Reflect.getMetadata(METHOD_METADATA, PsaProfilController.prototype.listOffeneRueckmeldungen);
    expect(path).toBe('rueckmeldungen/offen');
    expect(method).toBe(0);

    const methodOrder = Object.getOwnPropertyNames(PsaProfilController.prototype);
    expect(methodOrder.indexOf('listOffeneRueckmeldungen')).toBeLessThan(methodOrder.indexOf('meldeLuecke'));
    expect(methodOrder.indexOf('listOffeneRueckmeldungen')).toBeLessThan(methodOrder.indexOf('quittieren'));
    expect(methodOrder.indexOf('listOffeneRueckmeldungen')).toBeLessThan(methodOrder.indexOf('listQuittungen'));
  });

  it('Swagger-Response ist als gewrappte Array-Response dokumentiert', () => {
    const responses = Reflect.getMetadata(DECORATORS.API_RESPONSE, PsaProfilController.prototype.listOffeneRueckmeldungen) as Record<string, { schema?: unknown }>;
    const okResponse = responses?.['200'];
    expect(okResponse).toBeDefined();
    expect(JSON.stringify(okResponse.schema)).toContain('OffeneRueckmeldungDto');
    expect(JSON.stringify(okResponse.schema)).toContain('"data"');
  });

  it('mappt InfrastructureError auf 500', async () => {
    queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:OffeneRueckmeldungen:db-down'));

    await expect(controller.listOffeneRueckmeldungen(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
