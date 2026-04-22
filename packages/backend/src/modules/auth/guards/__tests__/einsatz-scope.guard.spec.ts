import { ForbiddenException, InternalServerErrorException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Result } from '@domain/common/result';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EinsatzScopeGuard } from '../einsatz-scope.guard';
import { AuthService } from '../../auth.service';
import { EinsatzParam } from '../../decorators/einsatz-param.decorator';

/**
 * Unit-Tests für `EinsatzScopeGuard` (Story 1.3 AC1–AC7).
 *
 * Deckt alle 9 Szenarien (a–i) aus AC7 ab plus zusätzliche Defense-in-Depth-Pfade.
 * Die Tests arbeiten mit manuellen Jest-Mocks — keine DI-Container-Bootstrapping-Kosten.
 */
describe('EinsatzScopeGuard', () => {
  const TEST_USER_ID = 'clw3h8x9y0000qwertyui00099';
  const TEST_EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const TEST_STAMM_ID = 'clw3h8x9y0000qwertyui00003';

  let reflector: Reflector;
  let logger: jest.Mocked<ILogger>;
  let rollenBesetzungRepository: jest.Mocked<IRollenBesetzungRepository>;
  let authService: jest.Mocked<AuthService>;
  let guard: EinsatzScopeGuard;

  interface MockRequest {
    user?: { userId: string };
    params: Record<string, string>;
    method: string;
    path: string;
    route: { path: string };
    einsatzContext?: { einsatzId: string; einsatzRollenNamen: string[]; einsatzPermissions: string[] };
  }

  function createMockContextAndRequest(options?: { user?: { userId: string } | undefined; params?: Record<string, string>; handler?: () => unknown; controllerClass?: new () => unknown }): {
    context: ExecutionContext;
    request: MockRequest;
  } {
    const handlerFn = options?.handler ?? ((): string => 'noop');
    const ClassRef = options?.controllerClass ?? class TestController {};

    const request: MockRequest = {
      user: options?.user,
      params: options?.params ?? {},
      method: 'GET',
      path: '/einsaetze/123/foo',
      route: { path: '/einsaetze/:einsatzId/foo' },
    };

    const context = {
      getHandler: jest.fn().mockReturnValue(handlerFn),
      getClass: jest.fn().mockReturnValue(ClassRef),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  // Kompat-Wrapper für Tests, die nur den Context brauchen.
  function createMockContext(options?: Parameters<typeof createMockContextAndRequest>[0]): ExecutionContext {
    return createMockContextAndRequest(options).context;
  }

  function createUserEntity(overrides?: { stammpersonId?: string | null; permissions?: string | null }) {
    return {
      id: TEST_USER_ID,
      stammpersonId: overrides?.stammpersonId === undefined ? TEST_STAMM_ID : overrides.stammpersonId,
      permissions: overrides?.permissions === undefined ? '[]' : overrides.permissions,
      isDeleted: false,
      isLocked: false,
    } as unknown as Awaited<ReturnType<AuthService['findUserById']>>;
  }

  function createRollenBesetzung(rollenName: string) {
    return { rollenName } as unknown as RollenBesetzung;
  }

  /**
   * AC3-Kontrakt: Security-Logs enthalten niemals PII. Prüft strukturiert
   * alle `logger.warn`-Aufrufe auf bekannte PII-Feldnamen.
   */
  function expectNoPiiInLogPayload(warnMock: jest.Mocked<ILogger>['warn']) {
    for (const call of warnMock.mock.calls) {
      const payload = typeof call[0] === 'string' ? call[0] : JSON.stringify(call[0]);
      expect(payload).not.toContain('personVorname');
      expect(payload).not.toContain('personNachname');
      expect(payload).not.toContain('rollenName');
    }
  }

  beforeEach(() => {
    reflector = new Reflector();

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    rollenBesetzungRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      findByEinsatzIdAndRolleId: jest.fn(),
      delete: jest.fn(),
      findActiveByUserIdAndEinsatzId: jest.fn(),
    } as unknown as jest.Mocked<IRollenBesetzungRepository>;

    authService = {
      findUserById: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    guard = new EinsatzScopeGuard(reflector, logger, rollenBesetzungRepository, authService);
  });

  // ---------------------------------------------------------------------------
  // AC7 Szenarien a–i
  // ---------------------------------------------------------------------------

  it('(a) Happy Path: aktive Besetzung → true, request.einsatzContext korrekt gesetzt', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity({ permissions: '["eigenschutz:psa:write"]' }));
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

    const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    const ok = await guard.canActivate(context);

    expect(ok).toBe(true);
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).toHaveBeenCalledWith(TEST_USER_ID, TEST_EINSATZ_ID);
    expect(request.einsatzContext).toEqual({
      einsatzId: TEST_EINSATZ_ID,
      einsatzRollenNamen: ['Eigenschutz: Sicherheitsbeauftragter'],
      einsatzPermissions: ['eigenschutz:psa:write'],
    });
  });

  it('(b) Keine Rollenbesetzung → ForbiddenException + Security-Log mit reason', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([]));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no-active-rollenbesetzung'), 'EinsatzScopeGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(c) Nur freigegebene (abgelaufene) Besetzung → Repository filtert in WHERE-Klausel, Guard erhält []', async () => {
    // Disziplin-Trennung: Das `freigegebenAm: null`-Filter läuft im Repository
    // (siehe `prisma-rollen-besetzung.repository.spec.ts (b)`), der Guard sieht
    // deterministisch nur aktive Besetzungen. Aus Guard-Sicht deckt der Test (c)
    // also die Post-Filter-Semantik ab: leeres Result → 403.
    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([]));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no-active-rollenbesetzung'), 'EinsatzScopeGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(d) User ohne stammpersonId → 403 mit reason user-without-stammperson (Repository-Call findet NICHT statt)', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity({ stammpersonId: null }));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user-without-stammperson'), 'EinsatzScopeGuard');
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).not.toHaveBeenCalled();
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(d-variant) User mit leerem String als stammpersonId → 403 (Falsy-Check deckt leer-String ab)', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity({ stammpersonId: '' }));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user-without-stammperson'), 'EinsatzScopeGuard');
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).not.toHaveBeenCalled();
  });

  it('(e) Fehlender Pfad-Parameter → InternalServerErrorException mit DX-Message', async () => {
    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: {} });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: InternalServerErrorException,
      message: expect.stringContaining("Pfad-Parameter 'einsatzId' fehlt"),
    });
  });

  it('(e-variant) Pfad-Parameter ist Array → InternalServerErrorException (Routing-Konfig-Fehler, NICHT stilles Narrowing)', async () => {
    const { context } = createMockContextAndRequest({ user: { userId: TEST_USER_ID } });
    // Express erlaubt `string | string[]` in `req.params`. Array signalisiert einen
    // echten Routing-Bug und darf nicht still auf `[0]` reduziert werden.
    (context.switchToHttp().getRequest() as MockRequest).params = {
      einsatzId: [TEST_EINSATZ_ID, 'extra'] as unknown as string,
    };

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: InternalServerErrorException,
      message: expect.stringContaining('ist ein Array'),
    });
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).not.toHaveBeenCalled();
  });

  it('(f) @EinsatzParam-Override → Guard nutzt custom Param-Namen via Reflector', async () => {
    class CustomController {
      @EinsatzParam('legacyEinsatzId')
      handler() {
        return 'ok';
      }
    }
    const controller = new CustomController();

    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Leiter Eigenschutz')]));

    const context = createMockContext({
      user: { userId: TEST_USER_ID },
      params: { legacyEinsatzId: TEST_EINSATZ_ID },
      handler: controller.handler,
      controllerClass: CustomController,
    });

    const ok = await guard.canActivate(context);

    expect(ok).toBe(true);
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).toHaveBeenCalledWith(TEST_USER_ID, TEST_EINSATZ_ID);
  });

  it('(g) Mehrfach-Rollenbesetzung → einsatzRollenNamen dedupliziert', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(
      Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter'), createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter'), createRollenBesetzung('Eigenschutz: Nachbereitung')]),
    );

    const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await guard.canActivate(context);

    expect(request.einsatzContext?.einsatzRollenNamen).toEqual(['Eigenschutz: Sicherheitsbeauftragter', 'Eigenschutz: Nachbereitung']);
  });

  describe('(h) User.permissions Parse-Robustheit → [] + Warn-Log', () => {
    it('null → []', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: null }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual([]);
    });

    it('leeres Array-JSON "[]" → []', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: '[]' }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual([]);
    });

    it('Array mit String-Elementen → parsed', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: '["eigenschutz:psa:write","eigenschutz:vorfall:read"]' }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual(['eigenschutz:psa:write', 'eigenschutz:vorfall:read']);
    });

    it('Garbage-String "not-json" → [] + Warn-Log mit reason permissions-parse-error', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: 'not-json' }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('permissions-parse-error'), 'EinsatzScopeGuard');
    });

    it('Non-Array-JSON {"a":1} → [] + Warn-Log permissions-not-array', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: '{"a":1}' }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('permissions-not-array'), 'EinsatzScopeGuard');
    });

    it('Array mit gemischten Typen → nur Strings bleiben', async () => {
      authService.findUserById.mockResolvedValue(createUserEntity({ permissions: '["eigenschutz:psa:write",42,null,"vorfall:read"]' }));
      rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([createRollenBesetzung('Eigenschutz: Sicherheitsbeauftragter')]));

      const { context, request } = createMockContextAndRequest({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

      await guard.canActivate(context);

      expect(request.einsatzContext?.einsatzPermissions).toEqual(['eigenschutz:psa:write', 'vorfall:read']);
    });
  });

  it('(i) User zwischen JWT-Ausstellung und Request gelöscht → 403 mit strukturiertem Body (KEIN 404-Leak)', async () => {
    authService.findUserById.mockRejectedValue(new NotFoundException('Benutzer nicht gefunden'));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    const rejection = await guard.canActivate(context).catch((err: unknown) => err);

    expect(rejection).toBeInstanceOf(ForbiddenException);
    // AC3-Kontrakt: Body enthält `suggestedAction` + Message für Frontend-Fallback
    expect((rejection as ForbiddenException).getResponse()).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Kein Zugriff auf diesen Einsatz',
      suggestedAction: 'Zurück zum Überblick',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user-not-found'), 'EinsatzScopeGuard');
    // AC3: nur EIN strukturierter Log-Eintrag im user-not-found-Pfad
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).not.toHaveBeenCalled();
    expectNoPiiInLogPayload(logger.warn);
  });

  // ---------------------------------------------------------------------------
  // Defense-in-Depth-Pfade über AC7 hinaus
  // ---------------------------------------------------------------------------

  it('Defense-in-Depth: Kein User im Request (JwtAuthGuard fehlt) → 403 + strukturierter Security-Log', async () => {
    const context = createMockContext({ user: undefined, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing-jwt-user'), 'EinsatzScopeGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('Repository-Failure (Result.fail) → InternalServerErrorException (kein 403, weil Infra-Fehler)', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.fail('DB_CONNECTION_LOST'));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('DB_CONNECTION_LOST'));
  });

  it('AuthService wirft generischen Error (non-NotFoundException) → rethrown (Programming-Error)', async () => {
    const boom = new Error('boom');
    authService.findUserById.mockRejectedValue(boom);

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: TEST_EINSATZ_ID } });

    await expect(guard.canActivate(context)).rejects.toBe(boom);
  });

  it('AC6: Leere einsatzId im Path → Guard versucht Repository-Call, 403 bei leerem Result (kein 500)', async () => {
    authService.findUserById.mockResolvedValue(createUserEntity());
    rollenBesetzungRepository.findActiveByUserIdAndEinsatzId.mockResolvedValue(Result.ok([]));

    const context = createMockContext({ user: { userId: TEST_USER_ID }, params: { einsatzId: '' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    // Entscheidend: KEIN InternalServerErrorException (leere String ist != undefined).
    expect(rollenBesetzungRepository.findActiveByUserIdAndEinsatzId).toHaveBeenCalledWith(TEST_USER_ID, '');
  });
});
