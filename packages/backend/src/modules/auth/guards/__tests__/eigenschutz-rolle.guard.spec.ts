import { ForbiddenException, InternalServerErrorException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EIGENSCHUTZ_ROLE_PREFIX } from '@domain/eigenschutz/enums/eigenschutz-rolle.enum';
import { EigenschutzRolleGuard, EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY } from '../eigenschutz-rolle.guard';
import { RequiresEigenschutzRolle } from '../../decorators/requires-eigenschutz-rolle.decorator';

/**
 * Unit-Tests für `EigenschutzRolleGuard` (Story 1.5 AC1, AC2, AC4, AC5, AC8, AC9).
 *
 * Pattern: `einsatz-scope.guard.spec.ts`. Nutzt echten `Reflector`, damit
 * `@RequiresEigenschutzRolle(...)`-Dekorationen wie im Produktionsbetrieb
 * gelesen werden.
 */
describe('EigenschutzRolleGuard', () => {
  const TEST_USER_ID = 'clw3h8x9y0000qwertyui00099';
  const TEST_EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';

  let reflector: Reflector;
  let logger: jest.Mocked<ILogger>;
  let guard: EigenschutzRolleGuard;

  interface MockEinsatzContext {
    einsatzId: string;
    einsatzRollenNamen: string[];
    einsatzPermissions: string[];
  }

  interface MockUser {
    userId: string;
    role?: 'ADMIN' | 'SUPER_ADMIN' | 'USER';
  }

  interface MockRequest {
    user?: MockUser;
    einsatzContext?: MockEinsatzContext;
  }

  function createMockContextAndRequest(options?: {
    user?: MockUser | undefined;
    einsatzContext?: MockEinsatzContext | undefined;
    handler?: (...args: unknown[]) => unknown;
    controllerClass?: new () => unknown;
  }): { context: ExecutionContext; request: MockRequest } {
    const handlerFn = options?.handler ?? ((): string => 'noop');
    const ClassRef = options?.controllerClass ?? class TestController {};

    const request: MockRequest = {
      user: options?.user,
      einsatzContext: options?.einsatzContext,
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

  /**
   * AC2/AC9-Kontrakt: Security-Logs enthalten niemals PII. Prüft strukturiert
   * alle `logger.warn`- und `logger.debug`-Aufrufe auf bekannte PII-Feldnamen.
   */
  function expectNoPiiInLogPayload(warnMock: jest.Mocked<ILogger>['warn']) {
    for (const call of warnMock.mock.calls) {
      const payload = typeof call[0] === 'string' ? call[0] : JSON.stringify(call[0]);
      expect(payload).not.toContain('personVorname');
      expect(payload).not.toContain('personNachname');
      expect(payload).not.toContain('rollenName');
    }
  }

  function makeEinsatzContext(overrides?: Partial<MockEinsatzContext>): MockEinsatzContext {
    return {
      einsatzId: TEST_EINSATZ_ID,
      einsatzRollenNamen: [],
      einsatzPermissions: [],
      ...overrides,
    };
  }

  function makeUser(overrides?: Partial<MockUser>): MockUser {
    return {
      userId: TEST_USER_ID,
      role: 'USER',
      ...overrides,
    };
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

    guard = new EigenschutzRolleGuard(reflector, logger);
  });

  // ---------------------------------------------------------------------------
  // AC9 Szenarien
  // ---------------------------------------------------------------------------

  it('(a) Happy Path: Rolle-Match → true', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Sicherheitsbeauftragter'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('(a-OR) Multi-Rolle-Decorator: mindestens eine passt → true (OR-Semantik)', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Nachbereitung')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Nachbereitung'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('(b) Falsche Rolle → ForbiddenException mit vollständigem strukturiertem Body (AC2)', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Einheitsführer'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    const rejection = (() => {
      try {
        guard.canActivate(context);
        return null;
      } catch (err) {
        return err;
      }
    })();

    expect(rejection).toBeInstanceOf(ForbiddenException);
    expect((rejection as ForbiddenException).getResponse()).toMatchObject(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('insufficient-eigenschutz-role'), 'EigenschutzRolleGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(c) Leere einsatzRollenNamen → 403 mit reason "no-eigenschutz-role" + vollständiger Body', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    const rejection = (() => {
      try {
        guard.canActivate(context);
        return null;
      } catch (err) {
        return err;
      }
    })();

    expect(rejection).toBeInstanceOf(ForbiddenException);
    // Review-Lesson Story 1.3: beide 403-Pfade (insufficient + no-role) teilen
    // denselben strukturierten Body — explizit asserten, damit Drift auffällt.
    expect((rejection as ForbiddenException).getResponse()).toMatchObject(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no-eigenschutz-role'), 'EigenschutzRolleGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(d) Kein Decorator → Pass-through true', () => {
    class UnprotectedController {
      handler() {
        return 'ok';
      }
    }
    const controller = new UnprotectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [] }),
      handler: controller.handler,
      controllerClass: UnprotectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('(e) ADMIN-Bypass: role=ADMIN → short-circuit true + logger.debug("admin-bypass")', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser({ role: 'ADMIN' }),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Nachbereitung'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('admin-bypass'), 'EigenschutzRolleGuard');
  });

  it('(f) SUPER_ADMIN-Bypass: role=SUPER_ADMIN → true', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser({ role: 'SUPER_ADMIN' }),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('admin-bypass'), 'EigenschutzRolleGuard');
  });

  it('(g) Fehlender einsatzContext (EinsatzScopeGuard fehlt in der Kette) → 500 mit DX-Message (AC5)', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: undefined,
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    const rejection = (() => {
      try {
        guard.canActivate(context);
        return null;
      } catch (err) {
        return err;
      }
    })();

    expect(rejection).toBeInstanceOf(InternalServerErrorException);
    expect((rejection as InternalServerErrorException).message).toContain('EinsatzScopeGuard muss VOR diesem Guard');
  });

  it('(h) Fehlender request.user (JwtAuthGuard fehlt) → ForbiddenException "Nicht authentifiziert"', () => {
    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: undefined,
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Sicherheitsbeauftragter'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing-jwt-user'), 'EigenschutzRolleGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(i) Handler-Decorator übersteuert Klassen-Decorator (Reflector-Semantik)', () => {
    @RequiresEigenschutzRolle('Einheitsführer')
    class MixedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new MixedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: ['Eigenschutz: Sicherheitsbeauftragter'] }),
      handler: controller.handler,
      controllerClass: MixedController,
    });

    // Handler verlangt nur "Sicherheitsbeauftragter" → match, obwohl Klasse auf "Einheitsführer" steht
    expect(guard.canActivate(context)).toBe(true);
  });

  it('(m) Präfix kommt aus EIGENSCHUTZ_ROLE_PREFIX-Konstante, nicht Magic-String', () => {
    // Regression-Schutz: Der Guard-Match muss exakt gegen die Konstante prüfen.
    // Wenn der Guard irgendwo einen Magic-String "Eigenschutz: " verwendet und
    // die Konstante driftet (z. B. auf "Selbstschutz: "), fällt das hier auf.
    const customName = `${EIGENSCHUTZ_ROLE_PREFIX}Sicherheitsbeauftragter`;

    class ProtectedController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [customName] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('Reflector-Garbage (Nicht-Array-Metadata) → Pass-through true (kein 500)', () => {
    // Simuliert einen falsch typisierten Decorator-Aufruf, der kein Array legt.
    class BrokenController {
      handler() {
        return 'ok';
      }
    }
    const controller = new BrokenController();
    // Wir setzen per Reflect eine Nicht-Array-Metadata auf den Handler.
    Reflect.defineMetadata('eigenschutzRoles', 'Sicherheitsbeauftragter', controller.handler);

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [] }),
      handler: controller.handler,
      controllerClass: BrokenController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('Reflector-Leer-Array (length=0) → Pass-through true', () => {
    class BrokenController {
      handler() {
        return 'ok';
      }
    }
    const controller = new BrokenController();
    Reflect.defineMetadata('eigenschutzRoles', [], controller.handler);

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzRollenNamen: [] }),
      handler: controller.handler,
      controllerClass: BrokenController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
