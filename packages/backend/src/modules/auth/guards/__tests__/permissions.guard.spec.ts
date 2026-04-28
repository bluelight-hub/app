import { ForbiddenException, InternalServerErrorException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PermissionsGuard, EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY } from '../permissions.guard';
import { RequiresPermission } from '../../decorators/requires-permission.decorator';

/**
 * Unit-Tests für `PermissionsGuard` (Story 1.5 AC3, AC4, AC5, AC8, AC9).
 */
describe('PermissionsGuard', () => {
  const TEST_USER_ID = 'clw3h8x9y0000qwertyui00099';
  const TEST_EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';

  let reflector: Reflector;
  let logger: jest.Mocked<ILogger>;
  let guard: PermissionsGuard;

  interface MockEinsatzContext {
    einsatzId: string;
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

  function expectNoPiiInLogPayload(warnMock: jest.Mocked<ILogger>['warn']) {
    for (const call of warnMock.mock.calls) {
      const payload = typeof call[0] === 'string' ? call[0] : JSON.stringify(call[0]);
      expect(payload).not.toContain('personVorname');
      expect(payload).not.toContain('personNachname');
      expect(payload).not.toContain('rollenName');
      // AC3: Permission-Strings tauchen bewusst NICHT im Log-Payload auf.
      expect(payload).not.toContain('eigenschutz:psa:');
      expect(payload).not.toContain('eigenschutz:vorfall:');
    }
  }

  function makeEinsatzContext(overrides?: Partial<MockEinsatzContext>): MockEinsatzContext {
    return {
      einsatzId: TEST_EINSATZ_ID,
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

    guard = new PermissionsGuard(reflector, logger);
  });

  // ---------------------------------------------------------------------------
  // AC9 Szenarien
  // ---------------------------------------------------------------------------

  it('(j) Happy Path: Permission-Match → true', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:write', 'eigenschutz:vorfall:read'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('(j-Story34) eigenschutz:psa:acknowledge granted → true (Story 3.4 AC6)', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:acknowledge')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:acknowledge'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('(k-Story34) eigenschutz:psa:acknowledge missing → 403 (Story 3.4 AC6)', () => {
    // Caller darf zwar `:psa:write` (z. B. Sicherheitsbeauftragter), aber
    // die Quittungs-Permission ist eine separate Permission. Exakter
    // String-Match ohne Wildcard.
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:acknowledge')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:write', 'eigenschutz:psa:read'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(() => guard.canActivate(context)).toThrow();
  });

  it('(j-OR) Multi-Permission: mindestens eine matcht → true (OR-Semantik)', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write', 'eigenschutz:psa:read')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:read'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('(k) Permission-Miss → 403 mit InsufficientPermission-Body + reason "insufficient-permission"', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:read'] }),
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
    expect((rejection as ForbiddenException).getResponse()).toMatchObject(EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('insufficient-permission'), 'PermissionsGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('(l) Leere einsatzPermissions → 403 mit vollständigem strukturiertem Body', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: [] }),
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
    // Review-Lesson Story 1.3: beide 403-Pfade teilen denselben Body —
    // explizit asserten, damit Drift auffällt.
    expect((rejection as ForbiddenException).getResponse()).toMatchObject(EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('insufficient-permission'), 'PermissionsGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('Kein Decorator → Pass-through true', () => {
    class UnprotectedController {
      handler() {
        return 'ok';
      }
    }
    const controller = new UnprotectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: [] }),
      handler: controller.handler,
      controllerClass: UnprotectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('ADMIN-Bypass: role=ADMIN → true + logger.debug("admin-bypass")', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser({ role: 'ADMIN' }),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: [] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('admin-bypass'), 'PermissionsGuard');
  });

  it('SUPER_ADMIN-Bypass → true', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:vorfall:export')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: makeUser({ role: 'SUPER_ADMIN' }),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: [] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('admin-bypass'), 'PermissionsGuard');
  });

  it('Fehlender einsatzContext → 500 mit DX-Message (AC5)', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
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

  it('Fehlender request.user (JwtAuthGuard fehlt) → ForbiddenException "Nicht authentifiziert"', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    const { context } = createMockContextAndRequest({
      user: undefined,
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:write'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing-jwt-user'), 'PermissionsGuard');
    expectNoPiiInLogPayload(logger.warn);
  });

  it('Handler-Decorator übersteuert Klassen-Decorator', () => {
    @RequiresPermission('eigenschutz:psa:read')
    class MixedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new MixedController();

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:psa:write'] }),
      handler: controller.handler,
      controllerClass: MixedController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('Wildcard-Match matcht NICHT (AC3: exakter String-Match, keine Wildcard-Expansion)', () => {
    class ProtectedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }
    const controller = new ProtectedController();

    // User hat eine "Wildcard"-artige Permission "eigenschutz:*" — sollte NICHT matchen.
    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: ['eigenschutz:*'] }),
      handler: controller.handler,
      controllerClass: ProtectedController,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('Reflector-Garbage (Nicht-Array-Metadata) → Pass-through true', () => {
    class BrokenController {
      handler() {
        return 'ok';
      }
    }
    const controller = new BrokenController();
    Reflect.defineMetadata('eigenschutzPermissions', 'eigenschutz:psa:write', controller.handler);

    const { context } = createMockContextAndRequest({
      user: makeUser(),
      einsatzContext: makeEinsatzContext({ einsatzPermissions: [] }),
      handler: controller.handler,
      controllerClass: BrokenController,
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
