// @ts-nocheck
import { ConflictException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED, Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES } from '@/application/eigenschutz/commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler';
import { UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES } from '@/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler';
import { GetGefaehrdungsbeurteilungQuery } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.query';
import { ListGefaehrdungsbeurteilungsVorlagenQuery } from '@/application/eigenschutz/queries/list-gefaehrdungsbeurteilungs-vorlagen/list-gefaehrdungsbeurteilungs-vorlagen.query';
import { EigenschutzRolleGuard } from '@/modules/auth/guards/eigenschutz-rolle.guard';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { EIGENSCHUTZ_ROLE_KEY } from '@/modules/auth/decorators/requires-eigenschutz-rolle.decorator';
import { EIGENSCHUTZ_PERMISSION_KEY } from '@/modules/auth/decorators/requires-permission.decorator';
import { LOGGER } from '@infrastructure/di-tokens';
import { GefaehrdungsbeurteilungController } from '../gefaehrdungsbeurteilung.controller';

/**
 * Unit-Tests für `GefaehrdungsbeurteilungController` (Story 415-2-1, Task 5).
 *
 * **Teststrategie:**
 * - CommandBus/QueryBus werden mit `jest.fn()` gemockt — hier liegt der Fokus
 *   auf Controller-Orchestrierung, nicht Handler-Logik.
 * - Guard-Metadata wird via `Reflect.getMetadata('__guards__', ...)` auf
 *   struktureller Ebene verifiziert: die 4-Guard-Kette in exakter Reihenfolge
 *   ist verbindlicher Story-Kontrakt (AC).
 * - Decorator-Metadata (`@RequiresEigenschutzRolle`, `@RequiresPermission`)
 *   wird pro Handler geprüft, damit Verschiebungen auffallen.
 * - Error-Mapping wird auf alle Sentinel-Zweige getestet:
 *   `NotFound:Einheit` / `NotFound:Vorlage` / `BusinessRule:*` + unbekannt.
 */
describe('GefaehrdungsbeurteilungController', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00003';
  const USER_ID = 'clw3h8x9y0000qwertyui00007';
  const VORLAGE_ID = 'clw3h8x9y0000qwertyui00111';

  let controller: GefaehrdungsbeurteilungController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  async function buildController() {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GefaehrdungsbeurteilungController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        {
          provide: LOGGER,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EinsatzScopeGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EigenschutzRolleGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GefaehrdungsbeurteilungController);
  }

  beforeEach(async () => {
    await buildController();
  });

  function makeAggregate(einsatzId: string = EINSATZ_ID): Gefaehrdungsbeurteilung {
    const item = GefaehrdungItem.create({ title: 'Stolperfalle' }).value!;
    return Gefaehrdungsbeurteilung.create({
      id: BEURTEILUNG_ID,
      einsatzId,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      vorlageId: null,
      gefahrenzoneId: null,
      items: [item],
    }).value!;
  }

  function makeReadModel(einsatzId: string = EINSATZ_ID) {
    return {
      aggregate: makeAggregate(einsatzId),
      erstelltAm: new Date('2026-04-22T09:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-22T09:30:00.000Z'),
      aktualisiertVonUserId: USER_ID,
    };
  }

  // ==================================================
  // STRUKTUR: Guard-Kette + Decorator-Metadata
  // ==================================================

  describe('Guard-Kette (AC: 4 Guards in exakter Reihenfolge)', () => {
    it('trägt JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard in dieser Reihenfolge', () => {
      const guards = Reflect.getMetadata('__guards__', GefaehrdungsbeurteilungController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(4);
      expect(guards[0]).toBe(JwtAuthGuard);
      expect(guards[1]).toBe(EinsatzScopeGuard);
      expect(guards[2]).toBe(EigenschutzRolleGuard);
      expect(guards[3]).toBe(PermissionsGuard);
    });
  });

  describe('Decorator-Metadata pro Methode', () => {
    it('GET /gefaehrdungsbeurteilungs-vorlagen: alle vier Reader-Rollen + read-Permission', () => {
      const prototype = Object.getPrototypeOf(controller);
      const rollen = Reflect.getMetadata(EIGENSCHUTZ_ROLE_KEY, prototype.listVorlagen);
      const permissions = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, prototype.listVorlagen);
      expect(rollen).toEqual(['Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung']);
      expect(permissions).toEqual(['eigenschutz:gefaehrdungsbeurteilung:read']);
    });

    it('POST /gefaehrdungsbeurteilungen: nur Sicherheitsbeauftragter + write-Permission', () => {
      const prototype = Object.getPrototypeOf(controller);
      const rollen = Reflect.getMetadata(EIGENSCHUTZ_ROLE_KEY, prototype.createBeurteilung);
      const permissions = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, prototype.createBeurteilung);
      expect(rollen).toEqual(['Sicherheitsbeauftragter']);
      expect(permissions).toEqual(['eigenschutz:gefaehrdungsbeurteilung:write']);
    });

    it('GET /gefaehrdungsbeurteilungen/:id: Reader-Rollen + read-Permission', () => {
      const prototype = Object.getPrototypeOf(controller);
      const rollen = Reflect.getMetadata(EIGENSCHUTZ_ROLE_KEY, prototype.getBeurteilung);
      const permissions = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, prototype.getBeurteilung);
      expect(rollen).toEqual(['Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung']);
      expect(permissions).toEqual(['eigenschutz:gefaehrdungsbeurteilung:read']);
    });
  });

  // ==================================================
  // GET /gefaehrdungsbeurteilungs-vorlagen
  // ==================================================

  describe('listVorlagen', () => {
    it('reicht die einsatzId 1:1 an den QueryBus weiter und mapped das Array via Factory', async () => {
      const vorlageReadModel = {
        id: VORLAGE_ID,
        slug: 'manv',
        name: 'MANV',
        szenario: 'MANV',
        items: [GefaehrdungItem.create({ title: 'Triage' }).value!],
        version: 1,
        aktiv: true,
        erstelltAm: new Date('2026-04-22T08:00:00.000Z'),
      };
      queryBus.execute.mockResolvedValue(Result.ok([vorlageReadModel]));

      const response = await controller.listVorlagen(EINSATZ_ID);

      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListGefaehrdungsbeurteilungsVorlagenQuery));
      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg.einsatzId).toBe(EINSATZ_ID);
      expect(response).toHaveLength(1);
      expect(response[0]).toMatchObject({ id: VORLAGE_ID, slug: 'manv', name: 'MANV', version: 1, aktiv: true });
      expect(response[0].items).toHaveLength(1);
    });

    it('wirft InternalServerError, wenn der QueryBus fehlschlägt', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('boom'));
      await expect(controller.listVorlagen(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ==================================================
  // POST /gefaehrdungsbeurteilungen
  // ==================================================

  describe('createBeurteilung', () => {
    const user = { userId: USER_ID, email: 'sb@test.com', role: 'USER' } as const;

    function requestBody(overrides: Record<string, unknown> = {}) {
      return { einheitId: EINHEIT_ID, ...overrides } as any;
    }

    it('liefert das DTO, wenn der CommandBus erfolgreich ist und das Read-Model geladen wird', async () => {
      commandBus.execute.mockResolvedValue(Result.ok(BEURTEILUNG_ID));
      queryBus.execute.mockResolvedValue(Result.ok(makeReadModel()));

      const response = await controller.createBeurteilung(EINSATZ_ID, requestBody(), user as any);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg).toBeInstanceOf(GetGefaehrdungsbeurteilungQuery);
      expect(queryArg.einsatzId).toBe(EINSATZ_ID);
      expect(queryArg.gefaehrdungsbeurteilungId).toBe(BEURTEILUNG_ID);

      expect(response).toMatchObject({
        id: BEURTEILUNG_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        version: 1,
        erstelltVonUserId: USER_ID,
        aktualisiertVonUserId: USER_ID,
      });
      expect(response.items).toHaveLength(1);
    });

    it('mappt NotFound:Einheit auf 404 mit context.resource === "einheit"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_NOT_FOUND));

      const promise = controller.createBeurteilung(EINSATZ_ID, requestBody(), user as any);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('einheit');
      }
    });

    it('mappt NotFound:Vorlage auf 404 mit context.resource === "vorlage"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.VORLAGE_NOT_FOUND));

      const promise = controller.createBeurteilung(EINSATZ_ID, requestBody({ vorlageId: VORLAGE_ID }), user as any);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { context: { resource: string } };
        expect(body.context.resource).toBe('vorlage');
      }
    });

    it('mappt BusinessRule:EinheitHatBereitsBeurteilung auf 422 mit context.rule', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.EINHEIT_HAT_BEREITS_BEURTEILUNG));

      const promise = controller.createBeurteilung(EINSATZ_ID, requestBody(), user as any);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(422);
        expect(body.context.rule).toBe('EinheitHatBereitsBeurteilung');
      }
    });

    it('mappt unbekannte Handler-Fehler auf 500', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('UNEXPECTED: something else'));
      await expect(controller.createBeurteilung(EINSATZ_ID, requestBody(), user as any)).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('wirft 422 mit rule InvalidCommand, wenn die Command-Validierung fehlschlägt', async () => {
      // Leere einheitId löst Command.create-Failure aus (Result-Pattern, nicht class-validator).
      const promise = controller.createBeurteilung(EINSATZ_ID, requestBody({ einheitId: '' }), user as any);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(body.context.rule).toBe('InvalidCommand');
      }
    });
  });

  // ==================================================
  // GET /gefaehrdungsbeurteilungen/:id
  // ==================================================

  describe('getBeurteilung', () => {
    it('liefert das DTO bei Happy-Path', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(makeReadModel()));
      const response = await controller.getBeurteilung(EINSATZ_ID, BEURTEILUNG_ID);
      expect(response).toMatchObject({ id: BEURTEILUNG_ID, einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID });
    });

    it('wirft 404 mit context.resource === "beurteilung" bei NotFound:Beurteilung (inkl. Cross-Einsatz-Check)', async () => {
      queryBus.execute.mockResolvedValue(Result.fail(GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.NOT_FOUND));
      const promise = controller.getBeurteilung(EINSATZ_ID, BEURTEILUNG_ID);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('beurteilung');
      }
    });

    it('wirft 500 bei unbekanntem Query-Fehler', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('Boom'));
      await expect(controller.getBeurteilung(EINSATZ_ID, BEURTEILUNG_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('updateItems (Story 2.2)', () => {
    const USER = { userId: USER_ID, permissions: [], einsatzRollenNamen: [] } as never;

    function buildBody(overrides: Partial<{ items: unknown; expectedVersion: number }> = {}): never {
      return {
        items: [{ title: 'Neue-Gefährdung' }],
        expectedVersion: 1,
        ...overrides,
      } as never;
    }

    beforeEach(() => {
      // Default: Command succeeds, GET-ReadModel succeeds.
      commandBus.execute.mockResolvedValue(Result.ok(BEURTEILUNG_ID));
      queryBus.execute.mockResolvedValue(
        Result.ok({
          aggregate: makeAggregate(),
          erstelltAm: new Date('2026-04-22T10:00:00Z'),
          aktualisiertAm: new Date('2026-04-22T10:30:00Z'),
          aktualisiertVonUserId: USER_ID,
        }),
      );
    });

    it('(Happy-Path) gibt das aktualisierte DTO zurück und triggert genau einen Command', async () => {
      const dto = await controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      expect(dto.id).toBe(BEURTEILUNG_ID);
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('(409 Conflict) wirft ConflictException mit currentVersion + attemptedVersion (Story 2.3 AC10)', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(`${GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED}:current=12`));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody({ expectedVersion: 7 }), USER);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      try {
        await promise;
      } catch (error) {
        const body = (error as ConflictException).getResponse() as { statusCode: number; context: { currentVersion: number; attemptedVersion: number } };
        expect(body.statusCode).toBe(409);
        expect(body.context.currentVersion).toBe(12);
        expect(body.context.attemptedVersion).toBe(7);
      }
    });

    it('(409 Conflict ohne current=) setzt currentVersion=undefined als Fallback (Abwärtskompatibilität)', async () => {
      // Defensiv: Sollte der Handler das Suffix einmal nicht setzen, bleibt
      // der Controller funktional — das Frontend rendert dann den generischen
      // Fallback-Banner-Text.
      commandBus.execute.mockResolvedValue(Result.fail(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody({ expectedVersion: 7 }), USER);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      try {
        await promise;
      } catch (error) {
        const body = (error as ConflictException).getResponse() as { statusCode: number; context: { currentVersion?: number; attemptedVersion: number } };
        expect(body.statusCode).toBe(409);
        expect(body.context.currentVersion).toBeUndefined();
        expect(body.context.attemptedVersion).toBe(7);
      }
    });

    it('(404 NotFound:Beurteilung) wirft NotFoundException mit resource=beurteilung', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.BEURTEILUNG_NOT_FOUND));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('beurteilung');
      }
    });

    it('(422 ItemValidation) wirft UnprocessableEntity für ValidationFailed:-präfixte Fehler', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('ValidationFailed:Titel ist erforderlich'));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(422);
        expect(body.context.rule).toBe('ItemValidation');
      }
    });

    it('(422 BusinessRule DuplicateItemId) wirft UnprocessableEntity mit rule-Context (Story 2.3 AC4)', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('BusinessRule:DuplicateItemId'));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(422);
        expect(body.context.rule).toBe('DuplicateItemId');
      }
    });

    it('(500 Unexpected) unerkannte Error-Strings landen als Internal Server Error (Story 2.3 AC11)', async () => {
      // Whitelist-Semantik: ohne bekanntes Sentinel-Präfix KEIN Catch-all-422.
      // Monitoring muss echte DB-Ausfälle als 5xx-Spike sehen.
      commandBus.execute.mockResolvedValue(Result.fail('random db outage'));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.rule).toBe('Unexpected');
      }
    });

    it('(500 InfrastructureError) präfixte Infra-Fehler landen im 500-Branch', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:Eigenschutz:Prisma-Timeout'));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { layer: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.layer).toBe('infrastructure');
      }
    });

    it('(500 Invariant) Aggregate-Invarianz-Bruch landet im 500-Branch (Story 2.3 AC3)', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('Invariant:DiffSumMismatch'));
      const promise = controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody(), USER);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { layer: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.layer).toBe('domain');
      }
    });

    it('(422 InvalidCommand) wirft UnprocessableEntity, wenn die Command-Factory fehlschlägt', async () => {
      // Invalider Body: expectedVersion = 0 → Command.create failt.
      await expect(controller.updateItems(EINSATZ_ID, BEURTEILUNG_ID, buildBody({ expectedVersion: 0 }), USER)).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('Guard-Kette ist an der updateItems-Methode in exakter Reihenfolge registriert', () => {
      const guards = Reflect.getMetadata('__guards__', GefaehrdungsbeurteilungController.prototype.updateItems) as Array<{ name: string }> | undefined;
      // Klassen-level-Guards sind auf Class-Metadata, nicht method-level. Wir lesen sie vom Class ab.
      const classGuards = Reflect.getMetadata('__guards__', GefaehrdungsbeurteilungController) as Array<{ name: string }> | undefined;
      const allGuards = [...(classGuards ?? []), ...(guards ?? [])];
      const names = allGuards.map((g) => g.name);
      expect(names).toContain('JwtAuthGuard');
      expect(names).toContain('EinsatzScopeGuard');
      expect(names).toContain('EigenschutzRolleGuard');
      expect(names).toContain('PermissionsGuard');
      expect(names.indexOf('JwtAuthGuard')).toBeLessThan(names.indexOf('EinsatzScopeGuard'));
      expect(names.indexOf('EinsatzScopeGuard')).toBeLessThan(names.indexOf('EigenschutzRolleGuard'));
      expect(names.indexOf('EigenschutzRolleGuard')).toBeLessThan(names.indexOf('PermissionsGuard'));
    });

    it('RequiresEigenschutzRolle-Decorator an updateItems trägt "Sicherheitsbeauftragter"', () => {
      const roles = Reflect.getMetadata(EIGENSCHUTZ_ROLE_KEY, GefaehrdungsbeurteilungController.prototype.updateItems) as string[] | undefined;
      expect(roles).toEqual(['Sicherheitsbeauftragter']);
    });

    it('RequiresPermission-Decorator an updateItems trägt "eigenschutz:gefaehrdungsbeurteilung:write"', () => {
      const permissions = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, GefaehrdungsbeurteilungController.prototype.updateItems) as string[] | undefined;
      expect(permissions).toContain('eigenschutz:gefaehrdungsbeurteilung:write');
    });
  });
});
