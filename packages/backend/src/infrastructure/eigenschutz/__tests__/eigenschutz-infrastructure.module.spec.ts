import 'reflect-metadata';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY } from '@infrastructure/di-tokens';
import { EigenschutzInfrastructureModule } from '../eigenschutz-infrastructure.module';
import { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from '../event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';

/**
 * Meta-Tests für `EigenschutzInfrastructureModule`.
 *
 * Story 1.6 hat das Modul als Platzhalter angelegt. Seit Story 2.1 stellt es
 * die Prisma-Repositories für Gefährdungsbeurteilung + Version + Vorlage sowie
 * den Log-Event-Adapter bereit. Die Tests fixieren die Provider-/Exports-Shape
 * als Smoke-Test, damit spätere Stories beim Erweitern bewusst anpassen.
 */
describe('EigenschutzInfrastructureModule', () => {
  it('ist ein gültiges NestJS-Modul mit Repository- und Adapter-Providern', () => {
    const providers = Reflect.getMetadata('providers', EigenschutzInfrastructureModule) ?? [];
    const providerTokens = providers.map((provider: { provide?: unknown } | unknown) => (typeof provider === 'function' ? provider : (provider as { provide?: unknown }).provide));

    expect(providerTokens).toEqual(
      expect.arrayContaining([
        GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
        GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
        GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
        EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
      ]),
    );
  });

  it('hat keine Controller (Infrastructure-Layer-Invariante)', () => {
    const controllers = Reflect.getMetadata('controllers', EigenschutzInfrastructureModule);
    expect(controllers ?? []).toEqual([]);
  });

  it('importiert `PrismaModule` (Repositories nutzen PrismaService)', () => {
    const imports = Reflect.getMetadata('imports', EigenschutzInfrastructureModule) ?? [];
    const importNames = imports.map((importedModule: { name?: string }) => importedModule.name ?? '');
    expect(importNames).toContain('PrismaModule');
  });

  it('exportiert die drei Repository-Tokens plus den Event-Adapter', () => {
    const exportsMeta = Reflect.getMetadata('exports', EigenschutzInfrastructureModule) ?? [];
    expect(exportsMeta).toEqual(
      expect.arrayContaining([
        GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
        GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
        GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
        EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
      ]),
    );
  });
});
