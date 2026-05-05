import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { ILogger } from '@domain/ports/i-logger.port';
import {
  EIGENSCHUTZ_TELEMETRY_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
  GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
  LOGGER,
  METRICS,
} from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EigenschutzInfrastructureModule } from '../eigenschutz-infrastructure.module';
import { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from '../event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';
import { PrismaEigenschutzTelemetryRepository } from '../repositories/prisma-eigenschutz-telemetry.repository';
import { PrometheusEigenschutzCollector } from '../telemetry/prometheus-eigenschutz.collector';
import { TelemetryIngestService } from '../telemetry/telemetry-ingest.service';

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

  describe('Telemetrie-Provider-Trio (Story 3.11 AC6)', () => {
    it('listet die drei neuen Telemetrie-Provider als Provider-Tokens', () => {
      const providers = Reflect.getMetadata('providers', EigenschutzInfrastructureModule) ?? [];
      const providerTokens = providers.map((provider: { provide?: unknown } | unknown) => (typeof provider === 'function' ? provider : (provider as { provide?: unknown }).provide));
      expect(providerTokens).toEqual(expect.arrayContaining([EIGENSCHUTZ_TELEMETRY_REPOSITORY, PrometheusEigenschutzCollector, TelemetryIngestService]));
    });

    it('exportiert EIGENSCHUTZ_TELEMETRY_REPOSITORY und TelemetryIngestService', () => {
      const exportsMeta = Reflect.getMetadata('exports', EigenschutzInfrastructureModule) ?? [];
      expect(exportsMeta).toEqual(expect.arrayContaining([EIGENSCHUTZ_TELEMETRY_REPOSITORY, TelemetryIngestService]));
    });

    it('Boot-Smoke: alle drei Telemetrie-Provider resolven mit gemockten Dependencies', async () => {
      const NOOP_LOGGER: ILogger = {
        log: () => undefined,
        error: () => undefined,
        warn: () => undefined,
        debug: () => undefined,
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PrometheusEigenschutzCollector,
          TelemetryIngestService,
          { provide: EIGENSCHUTZ_TELEMETRY_REPOSITORY, useClass: PrismaEigenschutzTelemetryRepository },
          { provide: PrismaService, useValue: { eigenschutzTelemetryEvent: { createMany: jest.fn() } } },
          { provide: LOGGER, useValue: NOOP_LOGGER },
          { provide: METRICS.EIGENSCHUTZ_PSA_PROPAGATION_DURATION, useValue: { observe: jest.fn() } },
          { provide: METRICS.EIGENSCHUTZ_QUITTUNG_LATENCY, useValue: { observe: jest.fn() } },
          { provide: METRICS.EIGENSCHUTZ_BLIND_ACK_TOTAL, useValue: { inc: jest.fn() } },
        ],
      }).compile();

      const collector = moduleRef.get(PrometheusEigenschutzCollector);
      const service = moduleRef.get(TelemetryIngestService);
      const repo = moduleRef.get<PrismaEigenschutzTelemetryRepository>(EIGENSCHUTZ_TELEMETRY_REPOSITORY);

      expect(collector).toBeInstanceOf(PrometheusEigenschutzCollector);
      expect(service).toBeInstanceOf(TelemetryIngestService);
      expect(repo).toBeInstanceOf(PrismaEigenschutzTelemetryRepository);

      await moduleRef.close();
    });
  });
});
