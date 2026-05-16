import { ConflictException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { SICHERHEITSREGEL_CONFLICT_DETECTED, SICHERHEITSREGEL_NO_CHANGES_DETECTED, Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { CREATE_SICHERHEITSREGEL_ERROR_CODES } from '@/application/eigenschutz/commands/create-sicherheitsregel/create-sicherheitsregel.handler';
import { UPDATE_SICHERHEITSREGEL_ERROR_CODES } from '@/application/eigenschutz/commands/update-sicherheitsregel/update-sicherheitsregel.handler';
import { GET_SICHERHEITSREGEL_ERROR_CODES } from '@/application/eigenschutz/queries/get-sicherheitsregel/get-sicherheitsregel.handler';
import { GetSicherheitsregelQuery } from '@/application/eigenschutz/queries/get-sicherheitsregel/get-sicherheitsregel.query';
import { ListSicherheitsregelnQuery } from '@/application/eigenschutz/queries/list-sicherheitsregeln/list-sicherheitsregeln.query';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LOGGER } from '@infrastructure/di-tokens';
import { SicherheitsregelController } from '../sicherheitsregel.controller';

/**
 * Unit-Tests für `SicherheitsregelController` (Story 415-2-6, Task 6).
 *
 * **Teststrategie:**
 * - CommandBus/QueryBus werden mit `jest.fn()` gemockt — Controller-
 *   Orchestrierung ist hier der Fokus, nicht Handler-Logik.
 * - Guard-Metadata wird via `Reflect.getMetadata('__guards__', ...)` auf
 *   struktureller Ebene verifiziert: nur `JwtAuthGuard` — Eigenschutz hat
 *   kein eigenes Rollen-/Permission-Gating.
 * - Error-Mapping wird pro Sentinel-Branch getestet: 404/409/422/500, inkl.
 *   Fallback für unbekannte Raw-Fehler.
 * - Fanout-Semantik (AC2/AC4) wird sowohl für POST (einsatzweit + multi-
 *   Einheit) als auch für PUT (In-Place + Re-Wire) abgedeckt.
 */
describe('SicherheitsregelController', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID_A = 'clw3h8x9y0000qwertyui00050';
  const EINHEIT_ID_B = 'clw3h8x9y0000qwertyui00051';
  const EINHEIT_ID_C = 'clw3h8x9y0000qwertyui00052';
  const REGEL_ID = 'clw3h8x9y0000qwertyui00003';
  const NEW_REGEL_ID_1 = 'clw3h8x9y0000qwertyui00004';
  const NEW_REGEL_ID_2 = 'clw3h8x9y0000qwertyui00005';
  const NEW_REGEL_ID_3 = 'clw3h8x9y0000qwertyui00006';
  const USER_ID = 'clw3h8x9y0000qwertyui00007';
  const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00099';

  let controller: SicherheitsregelController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  async function buildController() {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SicherheitsregelController],
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
      .compile();

    controller = module.get(SicherheitsregelController);
  }

  beforeEach(async () => {
    await buildController();
  });

  function makeAggregate(opts: { id?: string; einheitId?: string | null } = {}): Sicherheitsregel {
    const createResult = Sicherheitsregel.create({
      id: opts.id ?? REGEL_ID,
      einsatzId: EINSATZ_ID,
      einheitId: opts.einheitId === undefined ? EINHEIT_ID_A : opts.einheitId,
      titel: 'Absicherung',
      inhalt: 'Warnweste tragen und sichtbar machen',
      erstelltVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
    });
    return createResult.value!;
  }

  function makeReadModel(opts: { id?: string; einheitId?: string | null } = {}) {
    return {
      aggregate: makeAggregate(opts),
      erstelltAm: new Date('2026-04-23T09:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-23T09:30:00.000Z'),
      aktualisiertVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
    };
  }

  // ==================================================
  // STRUKTUR: Guard-Kette
  // ==================================================

  describe('Guard-Kette', () => {
    it('trägt nur JwtAuthGuard auf Klassen-Ebene — kein Eigenschutz-Rollen-/Permission-Gating', () => {
      const guards = Reflect.getMetadata('__guards__', SicherheitsregelController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });

  // ==================================================
  // GET /sicherheitsregeln
  // ==================================================

  describe('listRegeln', () => {
    it('(Happy-Path ohne Filter) dispatcht ListSicherheitsregelnQuery ohne einheitId und mapped Read-Models auf DTOs', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([makeReadModel(), makeReadModel({ id: NEW_REGEL_ID_1, einheitId: null })]));

      const response = await controller.listRegeln(EINSATZ_ID);

      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg).toBeInstanceOf(ListSicherheitsregelnQuery);
      expect(queryArg.einsatzId).toBe(EINSATZ_ID);
      expect(queryArg.einheitId).toBeUndefined();

      expect(response).toHaveLength(2);
      expect(response[0]).toMatchObject({ id: REGEL_ID, einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID_A, einsatzweit: false, version: 1, propagationGroupId: PROPAGATION_GROUP_ID });
      expect(response[1]).toMatchObject({ id: NEW_REGEL_ID_1, einheitId: null, einsatzweit: true });
    });

    it('(Happy-Path mit Filter) reicht den einheitId-Query-Parameter an die Query weiter (Story 2.7 Abschnittsleiter-Sicht)', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([]));

      const response = await controller.listRegeln(EINSATZ_ID, EINHEIT_ID_A);

      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg.einheitId).toBe(EINHEIT_ID_A);
      expect(response).toEqual([]);
    });

    it('(500) wirft InternalServerError bei unbekanntem Query-Fehler', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('boom'));
      await expect(controller.listRegeln(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ==================================================
  // GET /sicherheitsregeln/:id
  // ==================================================

  describe('getRegel', () => {
    it('(Happy-Path) liefert das DTO', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(makeReadModel()));

      const response = await controller.getRegel(EINSATZ_ID, REGEL_ID);

      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg).toBeInstanceOf(GetSicherheitsregelQuery);
      expect(queryArg.einsatzId).toBe(EINSATZ_ID);
      expect(queryArg.regelId).toBe(REGEL_ID);

      expect(response).toMatchObject({
        id: REGEL_ID,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID_A,
        einsatzweit: false,
        version: 1,
        titel: 'Absicherung',
        erstelltVonUserId: USER_ID,
        aktualisiertVonUserId: USER_ID,
        propagationGroupId: PROPAGATION_GROUP_ID,
      });
    });

    it('(404) mappt NotFound:Sicherheitsregel auf 404 mit context.resource="sicherheitsregel"', async () => {
      queryBus.execute.mockResolvedValue(Result.fail(GET_SICHERHEITSREGEL_ERROR_CODES.NOT_FOUND));

      const promise = controller.getRegel(EINSATZ_ID, REGEL_ID);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('sicherheitsregel');
      }
    });

    it('(500) wirft InternalServerError bei unbekanntem Query-Fehler', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('boom'));
      await expect(controller.getRegel(EINSATZ_ID, REGEL_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ==================================================
  // POST /sicherheitsregeln
  // ==================================================

  describe('createRegeln', () => {
    const user = { userId: USER_ID, email: 'sb@test.com', role: 'USER' } as const;

    function requestBody(overrides: Record<string, unknown> = {}) {
      return {
        titel: 'Absicherung',
        inhalt: 'Warnweste tragen',
        einsatzweit: false,
        einheitIds: [EINHEIT_ID_A],
        ...overrides,
      } as any;
    }

    it('(einsatzweit Happy-Path) liefert ein 1-Element-Array von DTOs', async () => {
      commandBus.execute.mockResolvedValue(Result.ok([REGEL_ID]));
      queryBus.execute.mockResolvedValue(Result.ok(makeReadModel({ einheitId: null })));

      const response = await controller.createRegeln(EINSATZ_ID, requestBody({ einsatzweit: true, einheitIds: undefined }), user as any);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      // Das Controller-Mapping zwingt einheitIds bei einsatzweit === true auf null.
      const commandArg = commandBus.execute.mock.calls[0][0];
      expect(commandArg.einheitIds).toBeNull();
      expect(queryBus.execute).toHaveBeenCalledTimes(1);

      expect(response).toHaveLength(1);
      expect(response[0]).toMatchObject({ id: REGEL_ID, einheitId: null, einsatzweit: true, propagationGroupId: PROPAGATION_GROUP_ID });
    });

    it('(Fanout-Happy-Path) liefert N DTOs bei Multi-Einheiten-Create', async () => {
      commandBus.execute.mockResolvedValue(Result.ok([NEW_REGEL_ID_1, NEW_REGEL_ID_2, NEW_REGEL_ID_3]));
      queryBus.execute.mockImplementation((query: GetSicherheitsregelQuery) => {
        const idToEinheit: Record<string, string> = {
          [NEW_REGEL_ID_1]: EINHEIT_ID_A,
          [NEW_REGEL_ID_2]: EINHEIT_ID_B,
          [NEW_REGEL_ID_3]: EINHEIT_ID_C,
        };
        return Promise.resolve(Result.ok(makeReadModel({ id: query.regelId, einheitId: idToEinheit[query.regelId] })));
      });

      const response = await controller.createRegeln(EINSATZ_ID, requestBody({ einsatzweit: false, einheitIds: [EINHEIT_ID_A, EINHEIT_ID_B, EINHEIT_ID_C] }), user as any);

      const commandArg = commandBus.execute.mock.calls[0][0];
      expect(commandArg.einheitIds).toEqual([EINHEIT_ID_A, EINHEIT_ID_B, EINHEIT_ID_C]);
      expect(response).toHaveLength(3);
      expect(response.map((r) => r.id)).toEqual([NEW_REGEL_ID_1, NEW_REGEL_ID_2, NEW_REGEL_ID_3]);
      expect(response.map((r) => r.einheitId)).toEqual([EINHEIT_ID_A, EINHEIT_ID_B, EINHEIT_ID_C]);
      // Fanout-Rows teilen sich die propagationGroupId — Grundlage für Audit
      // + Story 2.7 ACK-Verknüpfung.
      expect(new Set(response.map((r) => r.propagationGroupId))).toEqual(new Set([PROPAGATION_GROUP_ID]));
    });

    it('(404) mappt NotFound:Einheit auf 404 mit context.resource="einheit"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CREATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND));

      const promise = controller.createRegeln(EINSATZ_ID, requestBody(), user as any);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('einheit');
      }
    });

    it('(500 InfrastructureError) präfixte Infra-Fehler landen im 500-Branch', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:Eigenschutz:Prisma-Timeout'));

      const promise = controller.createRegeln(EINSATZ_ID, requestBody(), user as any);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { layer: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.layer).toBe('infrastructure');
      }
    });

    it('(500 Unexpected) unerkannte Error-Strings landen als InternalServerError mit context.rule="Unexpected"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('random db outage'));

      const promise = controller.createRegeln(EINSATZ_ID, requestBody(), user as any);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.rule).toBe('Unexpected');
      }
    });

    it('(422 InvalidCommand) Command-Factory-Fehler werden als 422 mit rule="InvalidCommand" gemappt', async () => {
      // Invalider Body: titel leer → Command.create failt.
      const promise = controller.createRegeln(EINSATZ_ID, requestBody({ titel: '' }), user as any);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(body.context.rule).toBe('InvalidCommand');
      }
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  // ==================================================
  // PUT /sicherheitsregeln/:id
  // ==================================================

  describe('updateRegel', () => {
    const user = { userId: USER_ID } as any;

    function requestBody(overrides: Record<string, unknown> = {}) {
      return {
        titel: 'Absicherung (aktualisiert)',
        inhalt: 'Warnweste tragen und sichtbar machen',
        einsatzweit: false,
        einheitIds: [EINHEIT_ID_A],
        expectedVersion: 1,
        ...overrides,
      } as any;
    }

    it('(In-Place-Happy-Path) liefert ein 1-Element-Array mit identischer ID', async () => {
      commandBus.execute.mockResolvedValue(Result.ok([REGEL_ID]));
      queryBus.execute.mockResolvedValue(Result.ok(makeReadModel()));

      const response = await controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      expect(response).toHaveLength(1);
      expect(response[0]!.id).toBe(REGEL_ID);
    });

    it('(Re-Wire-Happy-Path) liefert N DTOs der neuen Rows bei Ziel-Änderung', async () => {
      commandBus.execute.mockResolvedValue(Result.ok([NEW_REGEL_ID_1, NEW_REGEL_ID_2]));
      queryBus.execute.mockImplementation((query: GetSicherheitsregelQuery) => {
        const map: Record<string, string> = { [NEW_REGEL_ID_1]: EINHEIT_ID_B, [NEW_REGEL_ID_2]: EINHEIT_ID_C };
        return Promise.resolve(Result.ok(makeReadModel({ id: query.regelId, einheitId: map[query.regelId] })));
      });

      const response = await controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody({ einheitIds: [EINHEIT_ID_B, EINHEIT_ID_C] }), user);

      expect(response).toHaveLength(2);
      expect(response.map((r) => r.id)).toEqual([NEW_REGEL_ID_1, NEW_REGEL_ID_2]);
      expect(response.map((r) => r.einheitId)).toEqual([EINHEIT_ID_B, EINHEIT_ID_C]);
    });

    it('(409 Conflict mit :current=<n>) liefert currentVersion + attemptedVersion im Context', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(`${SICHERHEITSREGEL_CONFLICT_DETECTED}:current=5`));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody({ expectedVersion: 3 }), user);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      try {
        await promise;
      } catch (error) {
        const body = (error as ConflictException).getResponse() as { statusCode: number; context: { currentVersion: number; attemptedVersion: number } };
        expect(body.statusCode).toBe(409);
        expect(body.context.currentVersion).toBe(5);
        expect(body.context.attemptedVersion).toBe(3);
      }
    });

    it('(409 Conflict ohne current=) Fallback: currentVersion=undefined, attemptedVersion aus Body', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(SICHERHEITSREGEL_CONFLICT_DETECTED));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody({ expectedVersion: 3 }), user);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      try {
        await promise;
      } catch (error) {
        const body = (error as ConflictException).getResponse() as { statusCode: number; context: { currentVersion?: number; attemptedVersion: number } };
        expect(body.statusCode).toBe(409);
        expect(body.context.currentVersion).toBeUndefined();
        expect(body.context.attemptedVersion).toBe(3);
      }
    });

    it('(422 NoChangesDetected) No-Op-Update wird als 422 mit rule="NoChangesDetected" gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(SICHERHEITSREGEL_NO_CHANGES_DETECTED));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(422);
        expect(body.context.rule).toBe('NoChangesDetected');
      }
    });

    it('(404 NotFound:Sicherheitsregel) wirft NotFoundException mit resource="sicherheitsregel"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(UPDATE_SICHERHEITSREGEL_ERROR_CODES.REGEL_NOT_FOUND));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { statusCode: number; context: { resource: string } };
        expect(body.statusCode).toBe(404);
        expect(body.context.resource).toBe('sicherheitsregel');
      }
    });

    it('(404 NotFound:Einheit im Re-Wire) wirft NotFoundException mit resource="einheit"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(UPDATE_SICHERHEITSREGEL_ERROR_CODES.EINHEIT_NOT_FOUND));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody({ einheitIds: [EINHEIT_ID_B] }), user);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { context: { resource: string } };
        expect(body.context.resource).toBe('einheit');
      }
    });

    it('(422 ItemValidation) ValidationFailed:-präfixte Fehler werden als 422 mit rule="ItemValidation" gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('ValidationFailed:titel darf nicht leer sein'));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(body.context.rule).toBe('ItemValidation');
      }
    });

    it('(500 Invariant) Aggregate-Invarianz-Bruch landet im 500-Branch mit layer="domain"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('Invariant:SomeInvariantBroken'));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { layer: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.layer).toBe('domain');
      }
    });

    it('(500 Unexpected) unerkannte Fehler ohne Sentinel-Präfix werden als 500 mit rule="Unexpected" gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('random db outage'));

      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody(), user);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
      try {
        await promise;
      } catch (error) {
        const body = (error as InternalServerErrorException).getResponse() as { statusCode: number; context: { rule: string } };
        expect(body.statusCode).toBe(500);
        expect(body.context.rule).toBe('Unexpected');
      }
    });

    it('(422 InvalidCommand) Command-Factory-Fehler (z. B. expectedVersion < 1) werden als 422 mit rule="InvalidCommand" gemappt', async () => {
      const promise = controller.updateRegel(EINSATZ_ID, REGEL_ID, requestBody({ expectedVersion: 0 }), user);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(body.context.rule).toBe('InvalidCommand');
      }
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  // ==================================================
  // POST /sicherheitsregeln/:id/quittieren  (Story 2.7 AC2/AC3/AC4)
  // GET  /sicherheitsregeln/:id/quittungen   (Story 2.7 AC10)
  // ==================================================

  describe('quittieren (Story 2.7)', () => {
    const user = { userId: USER_ID } as { userId: string };

    it('(Happy single) dispatcht AckSicherheitsregelCommand und antwortet 204 stumm', async () => {
      commandBus.execute.mockResolvedValue(Result.ok({ alreadyAcknowledged: false }));

      await expect(controller.quittieren(EINSATZ_ID, REGEL_ID, { einheitId: EINHEIT_ID_A }, user)).resolves.toBeUndefined();

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const cmd = commandBus.execute.mock.calls[0][0];
      expect(cmd.einsatzId).toBe(EINSATZ_ID);
      expect(cmd.regelId).toBe(REGEL_ID);
      expect(cmd.einheitId).toBe(EINHEIT_ID_A);
      expect(cmd.callerUserId).toBe(USER_ID);
      expect(cmd.expectedRegelVersion).toBeUndefined();
    });

    it('(Idempotent Re-Ack) Erfolg + alreadyAcknowledged=true bleibt 204', async () => {
      commandBus.execute.mockResolvedValue(Result.ok({ alreadyAcknowledged: true }));

      await expect(controller.quittieren(EINSATZ_ID, REGEL_ID, { einheitId: EINHEIT_ID_A }, user)).resolves.toBeUndefined();
    });

    it('(NotFound) wird auf 404 mit context.resource gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('NotFound:Sicherheitsregel'));

      const promise = controller.quittieren(EINSATZ_ID, REGEL_ID, { einheitId: EINHEIT_ID_A }, user);
      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      try {
        await promise;
      } catch (error) {
        const body = (error as NotFoundException).getResponse() as { context: { resource: string } };
        expect(body.context.resource).toBe('sicherheitsregel');
      }
    });

    it('(BusinessRule:UnzulaessigeEinheitenZuordnung) wird auf 422 mit context.rule gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('BusinessRule:UnzulaessigeEinheitenZuordnung'));

      const promise = controller.quittieren(EINSATZ_ID, REGEL_ID, { einheitId: EINHEIT_ID_A }, user);
      await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await promise;
      } catch (error) {
        const body = (error as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(body.context.rule).toBe('UnzulaessigeEinheitenZuordnung');
      }
    });

    it('(OCC mismatch) wird auf 409 mit currentVersion + attemptedVersion gemappt', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('ConflictDetected:Sicherheitsregel:current=5'));

      const promise = controller.quittieren(EINSATZ_ID, REGEL_ID, { einheitId: EINHEIT_ID_A, expectedRegelVersion: 3 }, user);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      try {
        await promise;
      } catch (error) {
        const body = (error as ConflictException).getResponse() as { context: { currentVersion: number; attemptedVersion?: number } };
        expect(body.context.currentVersion).toBe(5);
        expect(body.context.attemptedVersion).toBe(3);
      }
    });
  });

  describe('listQuittungen (Story 2.7)', () => {
    it('(Happy) dispatcht ListSicherheitsregelQuittungenQuery und reicht DTOs durch', async () => {
      const dto = {
        einheitId: EINHEIT_ID_A,
        einheitName: '1. Sangruppe',
        quittiertAm: '2026-04-27T08:42:13.000Z',
        quittiertVonUserId: USER_ID,
      };
      queryBus.execute.mockResolvedValue(Result.ok([dto]));

      const result = await controller.listQuittungen(EINSATZ_ID, REGEL_ID);

      expect(result).toEqual([dto]);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      const query = queryBus.execute.mock.calls[0][0];
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(query.regelId).toBe(REGEL_ID);
    });

    it('(Empty) leere Quittungs-Liste wird ohne Fehler durchgereicht', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([]));

      const result = await controller.listQuittungen(EINSATZ_ID, REGEL_ID);

      expect(result).toEqual([]);
    });

    it('(Failure) Repo-Fehler werden als 500 gemappt', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:SicherheitsregelQuittung:db-down'));

      const promise = controller.listQuittungen(EINSATZ_ID, REGEL_ID);
      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // Vermeidet Warnungen wegen ungenutzter `createId`-Importe in Umgebungen
  // ohne Helfer-Imports.
  it('cuid2 ist verfügbar (Smoke-Check)', () => {
    expect(typeof createId()).toBe('string');
  });
});
