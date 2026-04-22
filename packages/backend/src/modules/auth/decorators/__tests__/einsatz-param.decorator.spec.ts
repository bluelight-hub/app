import { Reflector } from '@nestjs/core';
import { EINSATZ_PARAM_KEY, EinsatzParam } from '../einsatz-param.decorator';

/**
 * Unit-Tests für `@EinsatzParam` (Story 1.3 Task 2, AC4, AC7).
 *
 * Der Decorator setzt ausschließlich Metadata — es wird **nicht** ein Wert
 * injiziert. Die Tests prüfen drei Aspekte:
 *  (a) Metadata wird unter dem korrekten Key abgelegt
 *  (b) `Reflector` kann den Wert auf Handler-Ebene lesen
 *  (c) `Reflector` kann den Wert auf Controller-Klassen-Ebene lesen
 */
describe('@EinsatzParam', () => {
  const reflector = new Reflector();

  it('(a) exportiert den Metadata-Key als stabile Konstante', () => {
    expect(EINSATZ_PARAM_KEY).toBe('einsatzParam');
  });

  it('(b) Reflector liest Wert auf Handler-Ebene', () => {
    class TestController {
      @EinsatzParam('id')
      handler() {
        return 'ok';
      }
    }

    const controller = new TestController();
    const value = reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [controller.handler, TestController]);

    expect(value).toBe('id');
  });

  it('(c) Reflector liest Wert auf Klassen-Ebene (fallback, wenn Handler kein eigenes Override hat)', () => {
    @EinsatzParam('legacyEinsatzId')
    class LegacyController {
      handler() {
        return 'ok';
      }
    }

    const controller = new LegacyController();
    const value = reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [controller.handler, LegacyController]);

    expect(value).toBe('legacyEinsatzId');
  });

  it('(d) Handler-Wert überschreibt Klassen-Wert (SetMetadata-Semantik)', () => {
    @EinsatzParam('klassenEinsatz')
    class MixedController {
      @EinsatzParam('handlerEinsatz')
      handler() {
        return 'ok';
      }
    }

    const controller = new MixedController();
    const value = reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [controller.handler, MixedController]);

    expect(value).toBe('handlerEinsatz');
  });

  it('(e) ohne Decorator liefert Reflector `undefined` — Guard kann auf Default `einsatzId` fallen', () => {
    class PlainController {
      handler() {
        return 'ok';
      }
    }

    const controller = new PlainController();
    const value = reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [controller.handler, PlainController]);

    expect(value).toBeUndefined();
  });
});
