import { Reflector } from '@nestjs/core';
import type { EigenschutzRolle } from '@domain/eigenschutz/enums/eigenschutz-rolle.enum';
import { EIGENSCHUTZ_ROLE_KEY, RequiresEigenschutzRolle } from '../requires-eigenschutz-rolle.decorator';

/**
 * Unit-Tests für `@RequiresEigenschutzRolle` (Story 1.5 AC6, Task 2).
 *
 * Pattern entspricht `einsatz-param.decorator.spec.ts` (Story 1.3).
 */
describe('@RequiresEigenschutzRolle', () => {
  const reflector = new Reflector();

  it('(a) Metadata-Key ist stabile Konstante "eigenschutzRoles"', () => {
    expect(EIGENSCHUTZ_ROLE_KEY).toBe('eigenschutzRoles');
  });

  it('(b) Reflector liest Wert auf Handler-Ebene', () => {
    class TestController {
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
      handler() {
        return 'ok';
      }
    }

    const controller = new TestController();
    const value = reflector.getAllAndOverride<EigenschutzRolle[]>(EIGENSCHUTZ_ROLE_KEY, [controller.handler, TestController]);

    expect(value).toEqual(['Sicherheitsbeauftragter']);
  });

  it('(c) Reflector liest Wert auf Klassen-Ebene', () => {
    @RequiresEigenschutzRolle('Abschnittsleiter', 'Einheitsführer')
    class ClassLevelController {
      handler() {
        return 'ok';
      }
    }

    const controller = new ClassLevelController();
    const value = reflector.getAllAndOverride<EigenschutzRolle[]>(EIGENSCHUTZ_ROLE_KEY, [controller.handler, ClassLevelController]);

    expect(value).toEqual(['Abschnittsleiter', 'Einheitsführer']);
  });

  it('(d) Handler-Wert überschreibt Klassen-Wert (SetMetadata-Semantik)', () => {
    @RequiresEigenschutzRolle('Einheitsführer')
    class MixedController {
      @RequiresEigenschutzRolle('Nachbereitung')
      handler() {
        return 'ok';
      }
    }

    const controller = new MixedController();
    const value = reflector.getAllAndOverride<EigenschutzRolle[]>(EIGENSCHUTZ_ROLE_KEY, [controller.handler, MixedController]);

    expect(value).toEqual(['Nachbereitung']);
  });

  it('(e) ohne Decorator liefert Reflector `undefined` → Guard-Pass-through', () => {
    class PlainController {
      handler() {
        return 'ok';
      }
    }

    const controller = new PlainController();
    const value = reflector.getAllAndOverride<EigenschutzRolle[]>(EIGENSCHUTZ_ROLE_KEY, [controller.handler, PlainController]);

    expect(value).toBeUndefined();
  });
});
