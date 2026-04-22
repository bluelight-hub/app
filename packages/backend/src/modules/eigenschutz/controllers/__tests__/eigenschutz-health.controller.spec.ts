import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import { EigenschutzRolleGuard, EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY } from '@/modules/auth/guards/eigenschutz-rolle.guard';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { EigenschutzHealthController } from '../eigenschutz-health.controller';

/**
 * Controller-Integration-Tests für den Eigenschutz-Health-Endpoint
 * (Story 1.6 AC10 a–f).
 *
 * **Teststrategie:**
 * - `JwtAuthGuard`: Mock, da Plattform-Default (Story 1.3-agnostisch).
 * - `EinsatzScopeGuard`: Mock, setzt `request.einsatzContext` deterministisch.
 *   Der Scope-Guard selbst ist in Story 1.3 unit-tested — hier nur der
 *   Kontext-Vertrag, den unser Controller konsumiert.
 * - `EigenschutzRolleGuard`: **echte Instanz**. Das ist der direkteste
 *   Verknüpfungstest für die Story, weil die `OR`-Match-Semantik über alle
 *   vier Rollen + ADMIN-Bypass hier tatsächlich durchlaufen wird.
 */
describe('EigenschutzHealthController', () => {
  const TEST_USER_ID = 'clw3h8x9y0000qwertyui00099';
  const TEST_EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';

  interface MockEinsatzContext {
    einsatzId: string;
    einsatzRollenNamen: string[];
    einsatzPermissions: string[];
  }

  interface MockRequest {
    user?: ValidatedUser;
    einsatzContext?: MockEinsatzContext;
  }

  interface TestSetup {
    controller: EigenschutzHealthController;
    roleGuard: EigenschutzRolleGuard;
    request: MockRequest;
    context: ExecutionContext;
    logger: jest.Mocked<ILogger>;
    jwtCanActivate: jest.Mock;
    scopeCanActivate: jest.Mock;
  }

  async function createSetup(options: {
    user?: ValidatedUser;
    einsatzContext?: MockEinsatzContext;
    jwtResult?: boolean | (() => boolean);
    scopeResult?: boolean | (() => boolean);
  }): Promise<TestSetup> {
    const request: MockRequest = {
      user: options.user,
      einsatzContext: options.einsatzContext,
    };

    const jwtResultFn = typeof options.jwtResult === 'function' ? options.jwtResult : () => options.jwtResult ?? true;
    const scopeResultFn = typeof options.scopeResult === 'function' ? options.scopeResult : () => options.scopeResult ?? true;

    const jwtCanActivate = jest.fn().mockImplementation(() => jwtResultFn());
    const scopeCanActivate = jest.fn().mockImplementation(() => scopeResultFn());

    const logger: jest.Mocked<ILogger> = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const mockJwtGuard: CanActivate = {
      canActivate: jwtCanActivate,
    };
    const mockScopeGuard: CanActivate = {
      canActivate: scopeCanActivate,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EigenschutzHealthController],
      providers: [
        Reflector,
        EigenschutzRolleGuard,
        {
          provide: LOGGER,
          useValue: logger,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(EinsatzScopeGuard)
      .useValue(mockScopeGuard)
      .compile();

    const controller = module.get(EigenschutzHealthController);
    const roleGuard = module.get(EigenschutzRolleGuard);

    const context = {
      getHandler: jest.fn().mockReturnValue(controller.getHealth),
      getClass: jest.fn().mockReturnValue(EigenschutzHealthController),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;

    return { controller, roleGuard, request, context, logger, jwtCanActivate, scopeCanActivate };
  }

  const user = (role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' = 'USER'): ValidatedUser =>
    ({
      userId: TEST_USER_ID,
      email: 'test@example.com',
      role,
    }) as unknown as ValidatedUser;

  const ctx = (rollen: string[]): MockEinsatzContext => ({
    einsatzId: TEST_EINSATZ_ID,
    einsatzRollenNamen: rollen,
    einsatzPermissions: [],
  });

  describe('(a) Happy-Path — Sicherheitsbeauftragter', () => {
    it('liefert { status: "ready" } und lässt die Guard-Kette durch', async () => {
      const { controller, roleGuard, context } = await createSetup({
        user: user('USER'),
        einsatzContext: ctx(['Eigenschutz: Sicherheitsbeauftragter']),
      });

      expect(roleGuard.canActivate(context)).toBe(true);
      await expect(controller.getHealth()).resolves.toEqual({ status: 'ready' });
    });
  });

  describe('(b) Happy-Path — Nachbereitung (OR-Semantik)', () => {
    it('akzeptiert Nachbereitung aus der Liste der vier erlaubten Rollen', async () => {
      const { controller, roleGuard, context } = await createSetup({
        user: user('USER'),
        einsatzContext: ctx(['Eigenschutz: Nachbereitung']),
      });

      expect(roleGuard.canActivate(context)).toBe(true);
      await expect(controller.getHealth()).resolves.toEqual({ status: 'ready' });
    });
  });

  describe('(c) ADMIN-Bypass (Story 1.5 AC4)', () => {
    it('lässt Admins ohne Eigenschutz-Rolle durch', async () => {
      const { controller, roleGuard, context, logger } = await createSetup({
        user: user('ADMIN'),
        einsatzContext: ctx([]),
      });

      expect(roleGuard.canActivate(context)).toBe(true);
      await expect(controller.getHealth()).resolves.toEqual({ status: 'ready' });
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('"reason":"admin-bypass"'), 'EigenschutzRolleGuard');
    });
  });

  describe('(d) Mit Rollenbesetzung, aber ohne Eigenschutz-Rolle — 403 + insufficient-eigenschutz-role', () => {
    it('wirft ForbiddenException mit EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY und Reason `insufficient-eigenschutz-role`', async () => {
      const { roleGuard, context, logger } = await createSetup({
        user: user('USER'),
        einsatzContext: ctx(['Einsatzleiter']),
      });

      try {
        roleGuard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY);
      }
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"reason":"insufficient-eigenschutz-role"'), 'EigenschutzRolleGuard');
    });
  });

  describe('(d2) Mit Rollenbesetzung, aber leerer einsatzRollenNamen-Liste — 403 + no-eigenschutz-role', () => {
    // AC3 nennt wörtlich `reason: 'no-eigenschutz-role'`; der Guard liefert
    // diesen Reason nur bei **leerem** `einsatzRollenNamen`-Array. Der
    // Insufficient-Pfad (d) ergänzt den Empty-Pfad (d2) — zusammen decken
    // sie beide Branches der `length === 0 ? ... : ...`-Verzweigung im
    // EigenschutzRolleGuard ab.
    it('wirft ForbiddenException mit EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY und Reason `no-eigenschutz-role`', async () => {
      const { roleGuard, context, logger } = await createSetup({
        user: user('USER'),
        einsatzContext: ctx([]),
      });

      try {
        roleGuard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY);
      }
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"reason":"no-eigenschutz-role"'), 'EigenschutzRolleGuard');
    });
  });

  describe('(e) Ohne Einsatz-Membership / ohne JWT — Guard-Kette blockiert vor dem Handler', () => {
    // Die Szenarien (e) „Ohne Membership → 403 vom EinsatzScopeGuard" und
    // (f) „Ohne JWT → 401 vom JwtAuthGuard" sind Plattform-Verträge aus
    // Stories 1.3 bzw. dem JWT-Strategy-Setup und dort unit-tested. Auf
    // Controller-Spec-Ebene prüfen wir deshalb strukturell: die Guards
    // hängen via `@UseGuards(...)` in korrekter Reihenfolge am Controller —
    // eine Regression beim Swap dieser Reihenfolge würde dieses Strukturen-
    // Assert brechen, bevor ein falsches Verhalten in Produktion auffällt.
    // Ein E2E-Bootstrap mit echtem APP_GUARD-Wiring wäre redundant zum
    // Integrationslayer und sprengt den Story-Scope (siehe AC10-Deferral).
    it('trägt JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard in genau dieser Reihenfolge auf dem Controller', () => {
      // NestJS-interne Metadata-Key für Guards; Literal statt Konstanten-Import
      // aus `@nestjs/common/constants`, damit der Test an Framework-Major-
      // Versionen stabil bleibt. Wenn dieser Key jemals umbenannt wird,
      // fängt das Framework-Upgrade den Bruch hier auf.
      const guards = Reflect.getMetadata('__guards__', EigenschutzHealthController) as unknown[];

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(3);
      expect(guards[0]).toBe(JwtAuthGuard);
      expect(guards[1]).toBe(EinsatzScopeGuard);
      expect(guards[2]).toBe(EigenschutzRolleGuard);
    });

    it('wirft InternalServerError, wenn einsatzContext fehlt, aber der Scope-Guard fälschlich `true` liefert (Fail-Fast-DX)', async () => {
      const { roleGuard, context } = await createSetup({
        user: user('USER'),
        einsatzContext: undefined,
        scopeResult: true,
      });

      expect(() => roleGuard.canActivate(context)).toThrow(InternalServerErrorException);
    });
  });
});
