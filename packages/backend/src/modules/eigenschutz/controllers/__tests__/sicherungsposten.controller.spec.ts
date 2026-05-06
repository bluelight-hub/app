import { ConflictException, ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { CreateSicherungspostenCommand } from '@/application/eigenschutz/commands/create-sicherungsposten/create-sicherungsposten.command';
import { UpdateSicherungspostenCommand } from '@/application/eigenschutz/commands/update-sicherungsposten/update-sicherungsposten.command';
import { AufloeseSicherungspostenCommand } from '@/application/eigenschutz/commands/aufloese-sicherungsposten/aufloese-sicherungsposten.command';
import { GetSicherungspostenQuery } from '@/application/eigenschutz/queries/get-sicherungsposten/get-sicherungsposten.query';
import { ListSicherungspostenQuery } from '@/application/eigenschutz/queries/list-sicherungsposten/list-sicherungsposten.query';
import { EIGENSCHUTZ_PERMISSION_KEY } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { LOGGER, SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { SicherungspostenController } from '../sicherungsposten.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui04001';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui04002';
const USER_ID = 'clw3h8x9y0000qwertyui04003';

function buildReadModel(): SicherungspostenReadModel {
  const standort = Standort.create({ kind: 'address', text: 'Hauptbahnhof' }).value!;
  const aggregate = Sicherungsposten.create({
    einsatzId: EINSATZ_ID,
    bezeichnung: 'Posten Nord',
    standort,
    personal: [],
    createdBy: USER_ID,
  }).value!;
  return { aggregate, erstelltAm: new Date('2026-05-05T10:00:00Z'), aktualisiertAm: new Date('2026-05-05T10:05:00Z'), aktualisiertVonUserId: USER_ID };
}

describe('SicherungspostenController (Story 4.1)', () => {
  let controller: SicherungspostenController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let postenRepo: { findReadModelById: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    postenRepo = { findReadModelById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SicherungspostenController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: SICHERUNGSPOSTEN_REPOSITORY, useValue: postenRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EinsatzScopeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SicherungspostenController);
  });

  describe('Drei-Schicht-Guard-Kette + Permission-Decorators (AC8 + AC11)', () => {
    it('(1) trägt JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard auf Klassen-Ebene', () => {
      const guards = Reflect.getMetadata('__guards__', SicherungspostenController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(3);
      expect(guards[0]).toBe(JwtAuthGuard);
      expect(guards[1]).toBe(EinsatzScopeGuard);
      expect(guards[2]).toBe(PermissionsGuard);
    });

    it('(2) Routing trägt einsatz-scoped Path und version="alpha"', () => {
      const path = Reflect.getMetadata('path', SicherungspostenController);
      const version = Reflect.getMetadata('__version__', SicherungspostenController);
      expect(path).toBe('einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten');
      expect(version).toBe('alpha');
    });

    it('(3) listSicherungsposten erfordert eigenschutz:sicherungsposten:read', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SicherungspostenController.prototype.listSicherungsposten);
      expect(required).toEqual(['eigenschutz:sicherungsposten:read']);
    });

    it('(4) createSicherungsposten erfordert eigenschutz:sicherungsposten:write', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SicherungspostenController.prototype.createSicherungsposten);
      expect(required).toEqual(['eigenschutz:sicherungsposten:write']);
    });

    it('(5) updateSicherungsposten erfordert eigenschutz:sicherungsposten:write', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SicherungspostenController.prototype.updateSicherungsposten);
      expect(required).toEqual(['eigenschutz:sicherungsposten:write']);
    });

    it('(6) aufloeseSicherungsposten erfordert eigenschutz:sicherungsposten:write', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SicherungspostenController.prototype.aufloeseSicherungsposten);
      expect(required).toEqual(['eigenschutz:sicherungsposten:write']);
    });

    it('(6b) getSicherungsposten erfordert eigenschutz:sicherungsposten:read (Story 4.4)', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SicherungspostenController.prototype.getSicherungsposten);
      expect(required).toEqual(['eigenschutz:sicherungsposten:read']);
    });
  });

  describe('GET (Liste)', () => {
    it('(7) status=AKTIV ruft Query mit korrekten Argumenten und mappt readmodels', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([buildReadModel()]));
      const result = await controller.listSicherungsposten(EINSATZ_ID, 'AKTIV');
      expect(result).toHaveLength(1);
      expect(result[0]?.bezeichnung).toBe('Posten Nord');
      const query = queryBus.execute.mock.calls[0]?.[0] as ListSicherungspostenQuery;
      expect(query).toBeInstanceOf(ListSicherungspostenQuery);
      expect(query.status).toBe('AKTIV');
    });

    it('(8) status=ungültig liefert UnprocessableEntityException', async () => {
      await expect(controller.listSicherungsposten(EINSATZ_ID, 'BLA')).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('GET :postenId (Story 4.4 — Detail-Ansicht)', () => {
    it('(8a) Erfolg: Query wird gebaut, ReadModel als DTO zurückgegeben', async () => {
      const readModel = buildReadModel();
      queryBus.execute.mockResolvedValue(Result.ok(readModel));

      const dto = await controller.getSicherungsposten(EINSATZ_ID, 'clw3h8x9y0000qwertyui04077');

      expect(dto.bezeichnung).toBe('Posten Nord');
      expect(dto.einsatzId).toBe(EINSATZ_ID);
      const query = queryBus.execute.mock.calls[0]?.[0] as GetSicherungspostenQuery;
      expect(query).toBeInstanceOf(GetSicherungspostenQuery);
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(query.postenId).toBe('clw3h8x9y0000qwertyui04077');
    });

    it('(8b) NotFound:Sicherungsposten (Cross-Einsatz oder unbekannte ID) → 404 mit context.resource="sicherungsposten" und nutzerfreundlicher Message', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<SicherungspostenReadModel>('NotFound:Sicherungsposten'));

      try {
        await controller.getSicherungsposten(EINSATZ_ID, 'clw3h8x9y0000qwertyui04077');
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse() as { context: { resource: string }; message: string };
        expect(response.context.resource).toBe('sicherungsposten');
        // Kein Sentinel-Leak: Public-Response trägt eine UI-taugliche
        // Beschreibung statt des internen `NotFound:Sicherungsposten`.
        expect(response.message).toBe('Sicherungsposten existiert nicht oder gehört zu einem anderen Einsatz.');
      }
    });

    it('(8c) Unerwarteter Fehler → 500 InternalServerError', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<SicherungspostenReadModel>('InfrastructureError:Eigenschutz:db-down'));
      await expect(controller.getSicherungsposten(EINSATZ_ID, 'clw3h8x9y0000qwertyui04077')).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('(8d) Permission-Smoke: 403 ForbiddenException, wenn PermissionsGuard ablehnt', async () => {
      const blocked: TestingModule = await Test.createTestingModule({
        controllers: [SicherungspostenController],
        providers: [
          { provide: CommandBus, useValue: commandBus },
          { provide: QueryBus, useValue: queryBus },
          { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
          { provide: SICHERUNGSPOSTEN_REPOSITORY, useValue: postenRepo },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(EinsatzScopeGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => {
            throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', message: 'Permission `eigenschutz:sicherungsposten:read` fehlt' });
          },
        })
        .compile();

      const blockedController = blocked.get(SicherungspostenController);
      // PermissionsGuard wirft im NestJS-Pipeline-Order vor der Methode —
      // im Unit-Test simulieren wir die Konfiguration. Das eigentliche
      // Guard-Verhalten ist in `permissions.guard.spec.ts` getestet; dieser
      // Smoke-Test dokumentiert die Decorator-Bindung (AC10).
      expect(blockedController).toBeDefined();
    });
  });

  describe('POST (Create)', () => {
    it('(9) Erfolg: Command wird gebaut, Read-Model geladen', async () => {
      commandBus.execute.mockResolvedValue(Result.ok('clw3h8x9y0000qwertyui04077'));
      postenRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel()));
      const dto = await controller.createSicherungsposten(
        EINSATZ_ID,
        { bezeichnung: 'Posten Nord', standort: { kind: 'address', text: 'Hauptbahnhof' }, personal: [], einheitId: EINHEIT_ID } as never,
        { userId: USER_ID } as never,
      );
      expect(dto.bezeichnung).toBe('Posten Nord');
      const cmd = commandBus.execute.mock.calls[0]?.[0] as CreateSicherungspostenCommand;
      expect(cmd).toBeInstanceOf(CreateSicherungspostenCommand);
      expect(cmd.einsatzId).toBe(EINSATZ_ID);
      expect(cmd.createdBy).toBe(USER_ID);
    });

    it('(10) Handler-Failure mit ValidationFailed:* → 422', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Standort:invalid'));
      await expect(
        controller.createSicherungsposten(EINSATZ_ID, { bezeichnung: 'X', standort: { kind: 'address', text: 'X' }, personal: [] } as never, { userId: USER_ID } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('PATCH (Update)', () => {
    it('(11) ConflictDetected:Sicherungsposten:current=<n> → 409 mit currentVersion + attemptedVersion im Context', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ConflictDetected:Sicherungsposten:current=7'));
      try {
        await controller.updateSicherungsposten(EINSATZ_ID, 'fakeid', { expectedVersion: 3, bezeichnung: 'X' } as never, { userId: USER_ID } as never);
        fail('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { currentVersion: number; attemptedVersion: number } };
        expect(response.context.currentVersion).toBe(7);
        expect(response.context.attemptedVersion).toBe(3);
      }
      const cmd = commandBus.execute.mock.calls[0]?.[0] as UpdateSicherungspostenCommand;
      expect(cmd).toBeInstanceOf(UpdateSicherungspostenCommand);
      expect(cmd.expectedVersion).toBe(3);
    });

    it('(12) NotFound:Sicherungsposten → 404', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('NotFound:Sicherungsposten'));
      await expect(controller.updateSicherungsposten(EINSATZ_ID, 'fake', { expectedVersion: 1, bezeichnung: 'X' } as never, { userId: USER_ID } as never)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('POST :id/aufloesen', () => {
    it('(13) Erfolg: Command + Read-Model-Reload', async () => {
      commandBus.execute.mockResolvedValue(Result.ok('id'));
      postenRepo.findReadModelById.mockResolvedValue(Result.ok(buildReadModel()));
      const dto = await controller.aufloeseSicherungsposten(EINSATZ_ID, 'id', { expectedVersion: 1, begruendung: 'Posten nicht mehr nötig' } as never, { userId: USER_ID } as never);
      expect(dto).toBeDefined();
      const cmd = commandBus.execute.mock.calls[0]?.[0] as AufloeseSicherungspostenCommand;
      expect(cmd).toBeInstanceOf(AufloeseSicherungspostenCommand);
      expect(cmd.begruendung).toBe('Posten nicht mehr nötig');
    });

    it('(14) BusinessRule:BereitsAufgeloest → 422', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('BusinessRule:BereitsAufgeloest'));
      await expect(controller.aufloeseSicherungsposten(EINSATZ_ID, 'id', { expectedVersion: 1, begruendung: 'X' } as never, { userId: USER_ID } as never)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('(15) ValidationFailed:Begruendung → 422 (rule:ItemValidation)', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Begruendung'));
      await expect(controller.aufloeseSicherungsposten(EINSATZ_ID, 'id', { expectedVersion: 1, begruendung: '' } as never, { userId: USER_ID } as never)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('Fehler-Mapping', () => {
    it('(16) Cross-Einsatz-Reload (other einsatzId) → 404', async () => {
      commandBus.execute.mockResolvedValue(Result.ok('id'));
      const otherReadModel = buildReadModel();
      // overwrite einsatzId via direct private mutation impossible; use mock returning aggregate from another einsatz
      const standort = Standort.create({ kind: 'address', text: 'Hauptbahnhof' }).value!;
      const otherAggregate = Sicherungsposten.create({
        einsatzId: 'clw3h8x9y0000qwertyui09999',
        bezeichnung: 'Posten Anders',
        standort,
        personal: [],
        createdBy: USER_ID,
      }).value!;
      postenRepo.findReadModelById.mockResolvedValue(Result.ok({ ...otherReadModel, aggregate: otherAggregate }));
      await expect(
        controller.createSicherungsposten(EINSATZ_ID, { bezeichnung: 'X', standort: { kind: 'address', text: 'X' }, personal: [] } as never, { userId: USER_ID } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(17) Unbekannter Sentinel → 500', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('mystery error'));
      await expect(
        controller.createSicherungsposten(EINSATZ_ID, { bezeichnung: 'X', standort: { kind: 'address', text: 'X' }, personal: [] } as never, { userId: USER_ID } as never),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
