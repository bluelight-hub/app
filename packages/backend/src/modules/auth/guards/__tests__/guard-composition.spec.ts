import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EigenschutzRolleGuard } from '../eigenschutz-rolle.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequiresEigenschutzRolle } from '../../decorators/requires-eigenschutz-rolle.decorator';
import { RequiresPermission } from '../../decorators/requires-permission.decorator';

/**
 * Guard-Composition Regression-Test (Story 1.5 AC8).
 *
 * Best Practice: ein Guard pro Endpoint. Die Plattform ermöglicht aber
 * technisch auch die parallele Verwendung beider Guards (z. B. für
 * Cross-Cutting-Endpoints, die Rolle **und** Permission erzwingen sollen).
 *
 * Dieser Test bildet Regressions-Schutz gegen versehentliche State-Kopplung
 * zwischen den beiden Guards: sie müssen auf demselben Request **unabhängig**
 * funktionieren.
 */
describe('Guard-Composition: EigenschutzRolleGuard + PermissionsGuard', () => {
  const TEST_USER_ID = 'clw3h8x9y0000qwertyui00099';
  const TEST_EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';

  let reflector: Reflector;
  let logger: jest.Mocked<ILogger>;
  let roleGuard: EigenschutzRolleGuard;
  let permissionGuard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;
    roleGuard = new EigenschutzRolleGuard(reflector, logger);
    permissionGuard = new PermissionsGuard(reflector, logger);
  });

  function makeRequest(einsatzRollenNamen: string[], einsatzPermissions: string[]) {
    return {
      user: { userId: TEST_USER_ID, role: 'USER' },
      einsatzContext: { einsatzId: TEST_EINSATZ_ID, einsatzRollenNamen, einsatzPermissions },
    };
  }

  function makeContext(request: ReturnType<typeof makeRequest>, handler: (...args: unknown[]) => unknown, ControllerClass: new () => unknown): ExecutionContext {
    return {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(ControllerClass),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  }

  it('Beide Guards auf demselben Handler: Rolle + Permission passen → beide true (AND-semantisch durch @UseGuards-Kette)', () => {
    class CrossCuttingController {
      @RequiresEigenschutzRolle('Nachbereitung')
      @RequiresPermission('eigenschutz:vorfall:export')
      handler() {
        return 'ok';
      }
    }
    const controller = new CrossCuttingController();
    const request = makeRequest(['Eigenschutz: Nachbereitung'], ['eigenschutz:vorfall:export']);
    const context = makeContext(request, controller.handler, CrossCuttingController);

    expect(roleGuard.canActivate(context)).toBe(true);
    expect(permissionGuard.canActivate(context)).toBe(true);
  });

  it('Beide Guards: Rolle fehlt → RoleGuard wirft, PermissionGuard würde zwar passen (unabhängig)', () => {
    class CrossCuttingController {
      @RequiresEigenschutzRolle('Nachbereitung')
      @RequiresPermission('eigenschutz:vorfall:export')
      handler() {
        return 'ok';
      }
    }
    const controller = new CrossCuttingController();
    const request = makeRequest(['Eigenschutz: Sicherheitsbeauftragter'], ['eigenschutz:vorfall:export']);
    const context = makeContext(request, controller.handler, CrossCuttingController);

    expect(() => roleGuard.canActivate(context)).toThrow(ForbiddenException);
    // PermissionsGuard ist komplett unabhängig und würde für sich alleine true liefern.
    expect(permissionGuard.canActivate(context)).toBe(true);
  });

  it('Beide Guards: Permission fehlt → PermissionGuard wirft, RoleGuard liefert unabhängig true', () => {
    class CrossCuttingController {
      @RequiresEigenschutzRolle('Nachbereitung')
      @RequiresPermission('eigenschutz:vorfall:export')
      handler() {
        return 'ok';
      }
    }
    const controller = new CrossCuttingController();
    const request = makeRequest(['Eigenschutz: Nachbereitung'], []);
    const context = makeContext(request, controller.handler, CrossCuttingController);

    expect(roleGuard.canActivate(context)).toBe(true);
    expect(() => permissionGuard.canActivate(context)).toThrow(ForbiddenException);
  });
});
