/**
 * Tests für den Story-3.9-Endpoint im neuen `SyncConflictController`:
 * - `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts` (AC5).
 *
 * Permission-Smoke-Test (Code-Review P1): Der HTTP-Level-Race-Test ist
 * deferred (Test-Infrastructure-Story); zur Tautologie-Vermeidung prüfen
 * wir hier strukturell, dass der Controller den `PermissionsGuard` und
 * den `@RequiresPermission('eigenschutz:psa:write')`-Decorator trägt.
 * Pattern Story 3.6 Code-Review-Patches.
 */
import { InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { ReportSyncConflictCommand } from '@/application/eigenschutz/commands/report-sync-conflict/report-sync-conflict.command';
import { REPORT_SYNC_CONFLICT_ERROR_CODES } from '@/application/eigenschutz/commands/report-sync-conflict/report-sync-conflict.handler';
import { EIGENSCHUTZ_PERMISSION_KEY } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { LOGGER } from '@infrastructure/di-tokens';
import { SyncConflictController } from '../sync-conflict.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const ENTITY_ID = 'clw3h8x9y0000qwertyui00080';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

describe('SyncConflictController — Story 3.9 (Sync-Konflikt-Folgecall)', () => {
  let controller: SyncConflictController;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncConflictController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
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

    controller = module.get(SyncConflictController);
  });

  // Code-Review P1 — Permission-Strukturtest (kein Mock-Override-Tautologie):
  // verifiziert per Reflect-Metadata, dass die Drei-Schicht-Guard-Kette
  // (JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard) und der
  // `@RequiresPermission('eigenschutz:psa:write')`-Decorator wirklich am
  // Controller hängen. Echter HTTP-403-Test ist im Test-Infrastructure-
  // Story (deferred) — bis dahin schützt diese strukturelle Assertion
  // gegen versehentliches Entfernen der Guard-Kette.
  describe('Drei-Schicht-Guard-Kette + Permission-Decorator (AC5 P1)', () => {
    it('trägt JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard auf Klassen-Ebene', () => {
      const guards = Reflect.getMetadata('__guards__', SyncConflictController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(3);
      expect(guards[0]).toBe(JwtAuthGuard);
      expect(guards[1]).toBe(EinsatzScopeGuard);
      expect(guards[2]).toBe(PermissionsGuard);
    });

    it('Routing trägt einsatz-scoped Path und version="alpha"', () => {
      const path = Reflect.getMetadata('path', SyncConflictController);
      const version = Reflect.getMetadata('__version__', SyncConflictController);
      expect(path).toBe('einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts');
      expect(version).toBe('alpha');
    });

    it('reportSyncConflict-Handler trägt @RequiresPermission("eigenschutz:psa:write")', () => {
      const required = Reflect.getMetadata(EIGENSCHUTZ_PERMISSION_KEY, SyncConflictController.prototype.reportSyncConflict);
      expect(required).toEqual(['eigenschutz:psa:write']);
    });
  });

  function callReport(overrides: Record<string, unknown> = {}) {
    return controller.reportSyncConflict(
      EINSATZ_ID,
      {
        einheitId: EINHEIT_ID,
        entityId: ENTITY_ID,
        fieldPath: 'profil',
        localPayload: { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }] },
        serverVersion: 6,
        localExpectedVersion: 5,
        ...overrides,
      } as never,
      { userId: USER_ID } as never,
    );
  }

  it('202: Command wird mit allen Feldern + entityType="PSA_PROFIL_ZUWEISUNG" konstruiert; Result trägt syncConflictId+alreadyExisted', async () => {
    commandBus.execute.mockResolvedValue(Result.ok({ syncConflictId: 'sc-1', alreadyExisted: false }));

    const response = await callReport();

    expect(response).toEqual({ syncConflictId: 'sc-1', alreadyExisted: false });
    const cmd = commandBus.execute.mock.calls[0][0] as ReportSyncConflictCommand;
    expect(cmd).toBeInstanceOf(ReportSyncConflictCommand);
    expect(cmd.einsatzId).toBe(EINSATZ_ID);
    expect(cmd.einheitId).toBe(EINHEIT_ID);
    expect(cmd.entityType).toBe('PSA_PROFIL_ZUWEISUNG');
    expect(cmd.entityId).toBe(ENTITY_ID);
    expect(cmd.fieldPath).toBe('profil');
    expect(cmd.serverVersion).toBe(6);
    expect(cmd.localExpectedVersion).toBe(5);
    expect(cmd.callerUserId).toBe(USER_ID);
  });

  it('einheitId fehlt im Body → null im Command (Phase-2-Forward-Compat)', async () => {
    commandBus.execute.mockResolvedValue(Result.ok({ syncConflictId: 'sc-2', alreadyExisted: false }));
    await callReport({ einheitId: undefined });
    const cmd = commandBus.execute.mock.calls[0][0] as ReportSyncConflictCommand;
    expect(cmd.einheitId).toBeNull();
  });

  it('Idempotenz-Echo: alreadyExisted=true im Body', async () => {
    commandBus.execute.mockResolvedValue(Result.ok({ syncConflictId: 'sc-existing', alreadyExisted: true }));
    const response = await callReport();
    expect(response.alreadyExisted).toBe(true);
  });

  it('422 UnprocessableEntity bei VERSION_NOT_CONFLICT', async () => {
    commandBus.execute.mockResolvedValue(Result.fail(REPORT_SYNC_CONFLICT_ERROR_CODES.VERSION_NOT_CONFLICT));
    await expect(callReport()).rejects.toBeInstanceOf(UnprocessableEntityException);
    try {
      await callReport();
    } catch (e) {
      const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string } };
      expect(response.context.rule).toBe('ServerVersionMussGroesserAlsLocalSein');
    }
  });

  it('422 UnprocessableEntity bei ValidationFailed:LocalPayloadTooLarge', async () => {
    commandBus.execute.mockResolvedValue(Result.fail('ValidationFailed:LocalPayloadTooLarge'));
    await expect(callReport()).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('422 UnprocessableEntity bei ENTITY_TYPE_NOT_SUPPORTED', async () => {
    commandBus.execute.mockResolvedValue(Result.fail(REPORT_SYNC_CONFLICT_ERROR_CODES.ENTITY_TYPE_NOT_SUPPORTED));
    await expect(callReport()).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('422 UnprocessableEntity bei NOT_TEILNEHMER (Auth-Defense-in-Depth)', async () => {
    commandBus.execute.mockResolvedValue(Result.fail(REPORT_SYNC_CONFLICT_ERROR_CODES.NOT_TEILNEHMER));
    await expect(callReport()).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('500 InternalServerError bei InfrastructureError-Sentinel', async () => {
    commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:SyncConflictRepository:db-down'));
    await expect(callReport()).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('404 NotFoundException bei NotFound-Sentinel (Forward-Compat)', async () => {
    commandBus.execute.mockResolvedValue(Result.fail('NotFound:Conflict'));
    await expect(callReport()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('500 InternalServerError bei unbekanntem Sentinel', async () => {
    commandBus.execute.mockResolvedValue(Result.fail('boom'));
    await expect(callReport()).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
