import { Reflector } from '@nestjs/core';
import type { EigenschutzPermission } from '@domain/eigenschutz/enums/eigenschutz-permission.enum';
import { EIGENSCHUTZ_PERMISSION_KEY, RequiresPermission } from '../requires-permission.decorator';

/**
 * Unit-Tests für `@RequiresPermission` (Story 1.5 AC6, Task 2).
 */
describe('@RequiresPermission', () => {
  const reflector = new Reflector();

  it('(a) Metadata-Key ist stabile Konstante "eigenschutzPermissions"', () => {
    expect(EIGENSCHUTZ_PERMISSION_KEY).toBe('eigenschutzPermissions');
  });

  it('(b) Reflector liest Wert auf Handler-Ebene', () => {
    class TestController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }

    const controller = new TestController();
    const value = reflector.getAllAndOverride<EigenschutzPermission[]>(EIGENSCHUTZ_PERMISSION_KEY, [controller.handler, TestController]);

    expect(value).toEqual(['eigenschutz:psa:write']);
  });

  it('(c) Reflector liest Wert auf Klassen-Ebene', () => {
    @RequiresPermission('eigenschutz:vorfall:read', 'eigenschutz:vorfall:report')
    class ClassLevelController {
      handler() {
        return 'ok';
      }
    }

    const controller = new ClassLevelController();
    const value = reflector.getAllAndOverride<EigenschutzPermission[]>(EIGENSCHUTZ_PERMISSION_KEY, [controller.handler, ClassLevelController]);

    expect(value).toEqual(['eigenschutz:vorfall:read', 'eigenschutz:vorfall:report']);
  });

  it('(d) Handler-Wert überschreibt Klassen-Wert (SetMetadata-Semantik)', () => {
    @RequiresPermission('eigenschutz:psa:read')
    class MixedController {
      @RequiresPermission('eigenschutz:psa:write')
      handler() {
        return 'ok';
      }
    }

    const controller = new MixedController();
    const value = reflector.getAllAndOverride<EigenschutzPermission[]>(EIGENSCHUTZ_PERMISSION_KEY, [controller.handler, MixedController]);

    expect(value).toEqual(['eigenschutz:psa:write']);
  });

  it('(e) ohne Decorator liefert Reflector `undefined` → Guard-Pass-through', () => {
    class PlainController {
      handler() {
        return 'ok';
      }
    }

    const controller = new PlainController();
    const value = reflector.getAllAndOverride<EigenschutzPermission[]>(EIGENSCHUTZ_PERMISSION_KEY, [controller.handler, PlainController]);

    expect(value).toBeUndefined();
  });
});
