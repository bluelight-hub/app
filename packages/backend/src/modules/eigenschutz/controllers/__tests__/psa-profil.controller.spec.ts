import { ConflictException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { CHANGE_PSA_PROFIL_ERROR_CODES } from '@/application/eigenschutz/commands/change-psa-profil/change-psa-profil.handler';
import { ChangePsaProfilCommand } from '@/application/eigenschutz/commands/change-psa-profil/change-psa-profil.command';
import { GetPsaProfileByEinheitQuery } from '@/application/eigenschutz/queries/get-psa-profile-by-einheit/get-psa-profile-by-einheit.query';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { LOGGER } from '@infrastructure/di-tokens';
import { PsaProfilController } from '../psa-profil.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const ZUWEISUNG_ID = 'clw3h8x9y0000qwertyuipsa001';

describe('PsaProfilController (Story 3.1)', () => {
  let controller: PsaProfilController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PsaProfilController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
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

  describe('Drei-Schicht-Guard-Kette (AC6)', () => {
    it('trägt JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard auf Klassen-Ebene', () => {
      const guards = Reflect.getMetadata('__guards__', PsaProfilController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(3);
      expect(guards[0]).toBe(JwtAuthGuard);
      expect(guards[1]).toBe(EinsatzScopeGuard);
      expect(guards[2]).toBe(PermissionsGuard);
    });

    // Code-Review P-31: OpenAPI-Generator-Backstop. Wenn jemand das `version`
    // im `@Controller(...)` entfernt, brechen die generierten Client-Pfade
    // (`...VAlpha`-Suffixe), aber die strukturellen Reflect-Checks oben
    // würden weiterhin durchgehen. Daher hier explizit prüfen.
    it('Routing trägt einsatz-scoped Path und version="alpha"', () => {
      const path = Reflect.getMetadata('path', PsaProfilController);
      const version = Reflect.getMetadata('__version__', PsaProfilController);
      expect(path).toBe('einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile');
      expect(version).toBe('alpha');
    });
  });

  describe('GET einheiten/:einheitId', () => {
    it('mapped Read-Rows auf DTOs', async () => {
      queryBus.execute.mockResolvedValue(
        Result.ok([
          {
            id: ZUWEISUNG_ID,
            einsatzId: EINSATZ_ID,
            einheitId: EINHEIT_ID,
            profil: 'BASIS',
            gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
            gueltigBis: null,
            aktiviertVonUserId: USER_ID,
            begruendung: 'OK',
            propagationGroupId: 'group-1',
            version: 1,
          },
        ]),
      );

      const result = await controller.getPsaProfile(EINSATZ_ID, EINHEIT_ID);

      const queryArg = queryBus.execute.mock.calls[0][0];
      expect(queryArg).toBeInstanceOf(GetPsaProfileByEinheitQuery);
      expect(queryArg.einsatzId).toBe(EINSATZ_ID);
      expect(queryArg.einheitId).toBe(EINHEIT_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: ZUWEISUNG_ID, profil: 'BASIS', version: 1, gueltigBis: null });
    });
  });

  describe('POST einheiten/:einheitId/change — Error-Mapping', () => {
    function callChange() {
      return controller.changePsaProfil(EINSATZ_ID, EINHEIT_ID, { profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 3 }], begruendung: 'Schließen' }, {
        userId: USER_ID,
      } as never);
    }

    it('409 ConflictException mit currentVersion bei ConflictDetected:current=<n>', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED}:current=5`));
      await expect(callChange()).rejects.toBeInstanceOf(ConflictException);
      try {
        await callChange();
      } catch (e) {
        const response = (e as ConflictException).getResponse() as { context: { currentVersion: number; attemptedVersion?: number } };
        expect(response.context.currentVersion).toBe(5);
        expect(response.context.attemptedVersion).toBe(3);
      }
    });

    it('Story 3.9 AC1: 409 ConflictException trägt context.zuweisungId, wenn Sentinel `:zuweisungId=<id>` enthält', async () => {
      const loserCuid = 'clw3h8x9y0000qwertyuiloser1';
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED}:current=5:einheit=${EINHEIT_ID}:profil=BASIS:zuweisungId=${loserCuid}`));
      try {
        await callChange();
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { currentVersion?: number; zuweisungId?: string; einheitId?: string; profil?: string } };
        expect(response.context.currentVersion).toBe(5);
        expect(response.context.einheitId).toBe(EINHEIT_ID);
        expect(response.context.profil).toBe('BASIS');
        expect(response.context.zuweisungId).toBe(loserCuid);
      }
    });

    it('409 ConflictException mit rule=DuplicateActiveProfile bei DUPLICATE-Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE));
      await expect(callChange()).rejects.toBeInstanceOf(ConflictException);
    });

    it('Story 3.9 AC1: DUPLICATE-Sentinel mit `:zuweisungId=<id>` propagiert sie in context.zuweisungId', async () => {
      const activeCuid = 'clw3h8x9y0000qwertyuiactive';
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE}:einheit=${EINHEIT_ID}:profil=BASIS:zuweisungId=${activeCuid}`));
      try {
        await callChange();
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { rule: string; zuweisungId?: string } };
        expect(response.context.rule).toBe('DuplicateActiveProfile');
        expect(response.context.zuweisungId).toBe(activeCuid);
      }
    });

    it('404 NotFoundException bei NotFound-Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CHANGE_PSA_PROFIL_ERROR_CODES.ACTIVE_NOT_FOUND));
      await expect(callChange()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('422 UnprocessableEntity bei BusinessRule-Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CHANGE_PSA_PROFIL_ERROR_CODES.EXPECTED_VERSION_REQUIRED));
      await expect(callChange()).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('500 InternalServerError bei InfrastructureError-Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:Eigenschutz:db-down'));
      await expect(callChange()).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('500 InternalServerError bei unbekanntem Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('boom'));
      await expect(callChange()).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('POST einheiten/:einheitId/change — Happy-Path', () => {
    it('baut ChangePsaProfilCommand mit Single-Element-einheitIds und reicht user.userId durch', async () => {
      commandBus.execute.mockResolvedValue(
        Result.ok({
          propagationGroupId: 'group-99',
          affectedZuweisungen: [{ einheitId: EINHEIT_ID, profil: 'BASIS', aktion: 'AKTIVIERT', zuweisungId: ZUWEISUNG_ID, version: 1 }],
        }),
      );
      queryBus.execute.mockResolvedValue(
        Result.ok([
          {
            id: ZUWEISUNG_ID,
            einsatzId: EINSATZ_ID,
            einheitId: EINHEIT_ID,
            profil: 'BASIS',
            gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
            gueltigBis: null,
            aktiviertVonUserId: USER_ID,
            begruendung: 'Routine',
            propagationGroupId: 'group-99',
            version: 1,
          },
        ]),
      );

      const result = await controller.changePsaProfil(EINSATZ_ID, EINHEIT_ID, { profilToggles: [{ profil: 'BASIS', aktivieren: true }], begruendung: 'Routine' }, { userId: USER_ID } as never);

      const cmdArg = commandBus.execute.mock.calls[0][0] as ChangePsaProfilCommand;
      expect(cmdArg).toBeInstanceOf(ChangePsaProfilCommand);
      expect(cmdArg.einsatzId).toBe(EINSATZ_ID);
      expect(cmdArg.einheitIds).toEqual([EINHEIT_ID]);
      expect(cmdArg.callerUserId).toBe(USER_ID);
      expect(cmdArg.begruendung).toBe('Routine');

      expect(result.propagationGroupId).toBe('group-99');
      expect(result.affected).toHaveLength(1);
      expect(result.affected[0]).toMatchObject({ id: ZUWEISUNG_ID, profil: 'BASIS', version: 1 });
    });
  });

  describe('Fallback-Pfad bei Read-Refetch-Failure (P-13)', () => {
    it('liefert echte callerUserId und body-begruendung statt leerer Strings', async () => {
      commandBus.execute.mockResolvedValue(
        Result.ok({
          propagationGroupId: 'group-fallback',
          affectedZuweisungen: [{ einheitId: EINHEIT_ID, profil: 'INFEKTION', aktion: 'AKTIVIERT', zuweisungId: ZUWEISUNG_ID, version: 1 }],
        }),
      );
      queryBus.execute.mockResolvedValueOnce(Result.fail('InfrastructureError:db-blip'));

      const result = await controller.changePsaProfil(EINSATZ_ID, EINHEIT_ID, { profilToggles: [{ profil: 'INFEKTION', aktivieren: true }], begruendung: 'Verdacht auf Infektion' }, {
        userId: USER_ID,
      } as never);

      expect(result.affected).toHaveLength(1);
      expect(result.affected[0].aktiviertVonUserId).toBe(USER_ID);
      expect(result.affected[0].begruendung).toBe('Verdacht auf Infektion');
      expect(result.affected[0].gueltigBis).toBeNull();
    });
  });

  describe('POST bulk-aendern — Story 3.2', () => {
    const E1 = 'clw3h8x9y0000qwertyuib0001';
    const E2 = 'clw3h8x9y0000qwertyuib0002';
    const E3 = 'clw3h8x9y0000qwertyuib0003';

    function callBulk(extras: Partial<{ einheitIds: string[]; expectedVersion: number; aktivieren: boolean }> = {}) {
      return controller.bulkChangePsaProfil(
        EINSATZ_ID,
        {
          einheitIds: extras.einheitIds ?? [E1, E2, E3],
          profilToggles: [
            {
              profil: 'CBRN_PATIENT',
              aktivieren: extras.aktivieren ?? true,
              expectedVersion: extras.expectedVersion,
            },
          ],
          begruendung: 'CBRN hochstufen',
        },
        { userId: USER_ID } as never,
      );
    }

    it('Happy-Path: 3 Einheiten → ChangePsaProfilCommand mit allen einheitIds', async () => {
      commandBus.execute.mockResolvedValue(
        Result.ok({
          propagationGroupId: 'group-bulk-1',
          affectedZuweisungen: [
            { einheitId: E1, profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'z1', version: 1 },
            { einheitId: E2, profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'z2', version: 1 },
            { einheitId: E3, profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'z3', version: 1 },
          ],
        }),
      );
      // 3 Refetches, einer pro Einheit.
      queryBus.execute
        .mockResolvedValueOnce(
          Result.ok([
            {
              id: 'z1',
              einsatzId: EINSATZ_ID,
              einheitId: E1,
              profil: 'CBRN_PATIENT',
              gueltigVon: new Date(),
              gueltigBis: null,
              aktiviertVonUserId: USER_ID,
              begruendung: 'CBRN hochstufen',
              propagationGroupId: 'group-bulk-1',
              version: 1,
            },
          ]),
        )
        .mockResolvedValueOnce(
          Result.ok([
            {
              id: 'z2',
              einsatzId: EINSATZ_ID,
              einheitId: E2,
              profil: 'CBRN_PATIENT',
              gueltigVon: new Date(),
              gueltigBis: null,
              aktiviertVonUserId: USER_ID,
              begruendung: 'CBRN hochstufen',
              propagationGroupId: 'group-bulk-1',
              version: 1,
            },
          ]),
        )
        .mockResolvedValueOnce(
          Result.ok([
            {
              id: 'z3',
              einsatzId: EINSATZ_ID,
              einheitId: E3,
              profil: 'CBRN_PATIENT',
              gueltigVon: new Date(),
              gueltigBis: null,
              aktiviertVonUserId: USER_ID,
              begruendung: 'CBRN hochstufen',
              propagationGroupId: 'group-bulk-1',
              version: 1,
            },
          ]),
        );

      const result = await callBulk();

      const cmdArg = commandBus.execute.mock.calls[0][0] as ChangePsaProfilCommand;
      expect(cmdArg).toBeInstanceOf(ChangePsaProfilCommand);
      expect(cmdArg.einheitIds).toEqual([E1, E2, E3]);
      expect(cmdArg.callerUserId).toBe(USER_ID);
      expect(result.propagationGroupId).toBe('group-bulk-1');
      expect(result.affected).toHaveLength(3);
      expect(result.affected.map((a) => a.einheitId).sort()).toEqual([E1, E2, E3]);
    });

    it('409 mit context.einheitId und context.profil bei OCC-Conflict mit Annotation', async () => {
      // Sentinel-`profil=` muss im Bulk-Body als Toggle vorkommen, damit
      // der Controller die zugehörige `expectedVersion` finden und an das
      // konfliktierende Profil binden kann (E11). Wir senden den Toggle
      // für `CBRN_PATIENT` und mocken den Sentinel mit demselben Profil.
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED}:current=7:einheit=${E2}:profil=CBRN_PATIENT`));
      try {
        await callBulk({ aktivieren: false, expectedVersion: 5 });
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { currentVersion: number; attemptedVersion?: number; einheitId?: string; profil?: string } };
        expect(response.context.currentVersion).toBe(7);
        expect(response.context.attemptedVersion).toBe(5);
        expect(response.context.einheitId).toBe(E2);
        expect(response.context.profil).toBe('CBRN_PATIENT');
      }
    });

    it('409 mit context.einheitId bei DUPLICATE-Annotation', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE}:einheit=${E1}:profil=INFEKTION`));
      try {
        await callBulk();
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { rule: string; einheitId?: string; profil?: string } };
        expect(response.context.rule).toBe('DuplicateActiveProfile');
        expect(response.context.einheitId).toBe(E1);
        expect(response.context.profil).toBe('INFEKTION');
      }
    });

    it('422 bei BusinessRule-Sentinel (z. B. ZuVieleEinheiten)', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(CHANGE_PSA_PROFIL_ERROR_CODES.TOO_MANY_EINHEITEN));
      await expect(callBulk()).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('parsed Sentinel-Suffixe unabhängig von der Reihenfolge', async () => {
      // Sentinel-Format ist key=value-basiert. Der Parser darf nicht von der
      // Reihenfolge `current → einheit → profil` abhängen — Story 3.2 AC5
      // dokumentiert das explizit als „Reihenfolge nicht verbindlich".
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED}:einheit=${E2}:profil=BASIS:current=4`));
      try {
        await callBulk({ aktivieren: false, expectedVersion: 1 });
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse() as { context: { currentVersion?: number; einheitId?: string; profil?: string } };
        expect(response.context.currentVersion).toBe(4);
        expect(response.context.einheitId).toBe(E2);
        expect(response.context.profil).toBe('BASIS');
      }
    });

    it('attemptedVersion ist gesetzt, wenn alle Toggles dieselbe expectedVersion tragen', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(`${CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED}:current=2:einheit=${E2}:profil=CBRN_PATIENT`));
      try {
        await callBulk({ aktivieren: false, expectedVersion: 1 });
        throw new Error('expected ConflictException');
      } catch (e) {
        const response = (e as ConflictException).getResponse() as { context: { attemptedVersion?: number } };
        expect(response.context.attemptedVersion).toBe(1);
      }
    });

    it('Synthetic-Fallback im Bulk-Pfad: Refetch eines Einheit-Reads schlägt fehl, andere Einheiten kommen aus dem Server', async () => {
      commandBus.execute.mockResolvedValue(
        Result.ok({
          propagationGroupId: 'group-fallback-bulk',
          affectedZuweisungen: [
            { einheitId: E1, profil: 'INFEKTION', aktion: 'AKTIVIERT', zuweisungId: 'z1', version: 1 },
            { einheitId: E2, profil: 'INFEKTION', aktion: 'AKTIVIERT', zuweisungId: 'z2', version: 1 },
          ],
        }),
      );
      queryBus.execute.mockResolvedValueOnce(Result.fail('InfrastructureError:db-blip')).mockResolvedValueOnce(
        Result.ok([
          {
            id: 'z2',
            einsatzId: EINSATZ_ID,
            einheitId: E2,
            profil: 'INFEKTION',
            gueltigVon: new Date(),
            gueltigBis: null,
            aktiviertVonUserId: USER_ID,
            begruendung: 'CBRN hochstufen',
            propagationGroupId: 'group-fallback-bulk',
            version: 1,
          },
        ]),
      );

      const result = await controller.bulkChangePsaProfil(
        EINSATZ_ID,
        {
          einheitIds: [E1, E2],
          profilToggles: [{ profil: 'INFEKTION', aktivieren: true }],
          begruendung: 'CBRN hochstufen',
        },
        { userId: USER_ID } as never,
      );

      expect(result.affected).toHaveLength(2);
      const e1 = result.affected.find((a) => a.einheitId === E1);
      expect(e1?.aktiviertVonUserId).toBe(USER_ID);
      expect(e1?.begruendung).toBe('CBRN hochstufen');
    });
  });

  // P-32: HTTP-Integration-Test mit echten Guards + 401/403/200-Pfad wartet
  // auf den Test-Harness aus Story 3.9 (Action Item B3, Epic-2-Retro). Bis
  // dahin als `.skip`-Skelett, damit der Stub im Test-File bleibt und nach
  // Harness-Boot sofort verkabelbar ist (Code-Review Task 6.7).
  describe.skip('(Story 3.1 AC4/AC6) HTTP-Integration mit Vier-Schicht-Guard-Kette — harness blocked, siehe deferred-work.md', () => {
    it.skip('401 ohne JWT', () => {});
    it.skip('403 wenn Membership fehlt (EinsatzScopeGuard)', () => {});
    it.skip('403 wenn Eigenschutz-Rolle fehlt', () => {});
    it.skip('403 wenn Permission fehlt', () => {});
    it.skip('201 + Wrapper-Envelope bei vollständig erfüllter Guard-Kette', () => {});
    it.skip('409 mit context.currentVersion bei Lost-Update', () => {});
  });
});
