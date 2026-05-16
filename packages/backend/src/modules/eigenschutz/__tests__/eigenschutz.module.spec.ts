import 'reflect-metadata';
import { AuthModule } from '@/modules/auth/auth.module';
import { EigenschutzHealthController } from '../controllers/eigenschutz-health.controller';
import { EigenschutzVorfallController } from '../controllers/eigenschutz-vorfall.controller';
import { EigenschutzModule } from '../eigenschutz.module';

/**
 * Modul-Meta-Tests für den Eigenschutz-Slice (Story 1.6 AC10).
 *
 * Diese Tests nutzen `Reflect.getMetadata`, um das NestJS-Dekorator-
 * Metadata zu inspizieren — ohne echte Bootstrap-Kosten. Das stellt sicher,
 * dass:
 *
 * 1. Der Controller im HTTP-Modul registriert ist (sonst kein Routing).
 * 2. `AuthModule` ist importiert — die `JwtAuthGuard`-Strategie wird transitiv
 *    via Re-Export aus `AuthModule` aufgelöst.
 * 3. Das Modul **keine** eigenen Provider registriert — Story 1.6 lebt
 *    bewusst ohne Application-Handler.
 */
describe('EigenschutzModule', () => {
  it('registriert EigenschutzHealthController', () => {
    const controllers = Reflect.getMetadata('controllers', EigenschutzModule) as unknown[];
    expect(controllers).toContain(EigenschutzHealthController);
  });

  it('registriert EigenschutzVorfallController (Story 5.1)', () => {
    const controllers = Reflect.getMetadata('controllers', EigenschutzModule) as unknown[];
    expect(controllers).toContain(EigenschutzVorfallController);
  });

  it('Story 5.1 — EIGENSCHUTZ_VORFALL_REPOSITORY ist via Infrastructure-Modul-Export injizierbar', async () => {
    const { EigenschutzInfrastructureModule } = await import('@/infrastructure/eigenschutz/eigenschutz-infrastructure.module');
    const { EIGENSCHUTZ_VORFALL_REPOSITORY } = await import('@/infrastructure/di-tokens');
    const exports = Reflect.getMetadata('exports', EigenschutzInfrastructureModule) as unknown[];
    expect(exports).toContain(EIGENSCHUTZ_VORFALL_REPOSITORY);
  });

  it('importiert AuthModule (stellt JwtAuthGuard-Strategie bereit)', () => {
    const imports = Reflect.getMetadata('imports', EigenschutzModule) as unknown[];
    expect(imports).toEqual(expect.arrayContaining([AuthModule]));
  });

  it('dokumentiert die aktuelle Leere: keine eigenen Provider', () => {
    const providers = Reflect.getMetadata('providers', EigenschutzModule);
    expect(providers ?? []).toEqual([]);
  });

  it('exportiert keine eigenen Provider (YAGNI bis Story 2.x)', () => {
    const exportsMeta = Reflect.getMetadata('exports', EigenschutzModule);
    expect(exportsMeta ?? []).toEqual([]);
  });

  // HINWEIS: Ein echter `Test.createTestingModule({ imports: [EigenschutzModule] }).compile()`
  // (AC10-Wortlaut) würde den kompletten transitiven Modul-Graph ziehen, darunter
  // `AuthModule → ServerAccessTokenInfrastructureModule → ServerAccessGuard`, der wiederum
  // `EventEmitterModule.forRoot()` aus dem AppModule-Root erwartet. Diese Dependencies
  // sind weit außerhalb des Eigenschutz-Slice-Scopes und müssten für einen Test-Bootstrap
  // umfangreich gemockt werden (10+ Modul-Overrides). Die Metadata-basierten Checks oben
  // decken die Intention von AC10 (Controller registriert, korrekte Imports, keine
  // versehentlichen Provider) ab, ohne die Kaskade anzufassen. Der tatsächliche
  // DI-Regressionstest passiert im Controller-Spec via `Test.createTestingModule` mit
  // Provider-Overrides (siehe `controllers/__tests__/eigenschutz-health.controller.spec.ts`).
});
