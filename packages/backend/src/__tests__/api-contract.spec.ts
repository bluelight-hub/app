// @ts-nocheck
import { AddBefehlKommentarHandler } from '@/application/befehl/commands/add-befehl-kommentar/add-befehl-kommentar.handler';
import { AendereEmpfaengerStatusHandler } from '@/application/befehl/commands/aendere-empfaenger-status/aendere-empfaenger-status.handler';
import { CreateBefehlHandler } from '@/application/befehl/commands/create-befehl/create-befehl.handler';
import { KorrigiereBefehlHandler } from '@/application/befehl/commands/korrigiere-befehl/korrigiere-befehl.handler';
import { QuittierenBefehlHandler } from '@/application/befehl/commands/quittieren-befehl/quittieren-befehl.handler';
import { BefehlsgeberSucheQueryHandler } from '@/application/befehl/queries/befehlsgeber-suche/befehlsgeber-suche.handler';
import { EmpfaengerSucheQueryHandler } from '@/application/befehl/queries/empfaenger-suche/empfaenger-suche.handler';
import { ExportBefehleQueryHandler } from '@/application/befehl/queries/export-befehle/export-befehle.handler';
import { GetBefehlHistorieQueryHandler } from '@/application/befehl/queries/get-befehl-historie/get-befehl-historie.handler';
import { UpdateEinsatzRollenHandler } from '@/application/einsatz/commands';
import { GetEinsatzRollenQueryHandler, GetEinsatzTeilnehmerHandler } from '@/application/einsatz/queries';
import { PrismaService } from '@/infrastructure/database/prisma.service';

// --- Health Controller + Dependencies ---
import { HealthController } from '@/infrastructure/health/health.controller';
import { PrismaHealthIndicator } from '@/infrastructure/health/prisma-health.indicator';

// --- Guards (muessen overridden werden) ---
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

// --- Befehl Controller + Dependencies ---
import { BefehlController } from '@/modules/befehl/controllers/befehl.controller';
import { BefehlRollenGuard } from '@/modules/common/guards/befehl-rollen.guard';

// --- Einsatz Controller + Dependencies ---
import { EinsatzController } from '@/modules/einsatz/controllers/einsatz.controller';
import { GetSystemHealthQueryHandler } from '@application/monitoring/queries/get-system-health/get-system-health.handler';
import { BEFEHL_REPOSITORY, LOGGER, RESILIENCE, SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY } from '@infrastructure/di-tokens';
import { type INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DiskHealthIndicator, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';

/** Pass-Through Guard der immer true zurueckgibt */
const mockGuard = { canActivate: () => true };

/**
 * Erstellt alle gemockten Provider fuer die 3 stabilen v1-Controller.
 *
 * Alle Dependencies werden als leere Mocks bereitgestellt, da nur die
 * OpenAPI-Decorator-Metadaten relevant sind, nicht die Runtime-Logik.
 */
function createMockProviders() {
  return [
    // --- Shared ---
    { provide: Reflector, useValue: new Reflector() },
    { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },

    // --- Befehl Dependencies ---
    { provide: AddBefehlKommentarHandler, useValue: { execute: jest.fn() } },
    { provide: CreateBefehlHandler, useValue: { execute: jest.fn() } },
    { provide: KorrigiereBefehlHandler, useValue: { execute: jest.fn() } },
    { provide: QuittierenBefehlHandler, useValue: { execute: jest.fn() } },
    { provide: AendereEmpfaengerStatusHandler, useValue: { execute: jest.fn() } },
    { provide: GetBefehlHistorieQueryHandler, useValue: { execute: jest.fn() } },
    { provide: ExportBefehleQueryHandler, useValue: { execute: jest.fn() } },
    { provide: EmpfaengerSucheQueryHandler, useValue: { execute: jest.fn() } },
    { provide: BefehlsgeberSucheQueryHandler, useValue: { execute: jest.fn() } },
    { provide: BEFEHL_REPOSITORY, useValue: {} },

    // --- Einsatz Dependencies ---
    { provide: CommandBus, useValue: { execute: jest.fn() } },
    { provide: QueryBus, useValue: { execute: jest.fn() } },
    { provide: GetEinsatzTeilnehmerHandler, useValue: { execute: jest.fn() } },
    { provide: UpdateEinsatzRollenHandler, useValue: { execute: jest.fn() } },
    { provide: GetEinsatzRollenQueryHandler, useValue: { execute: jest.fn() } },

    // --- Health Dependencies ---
    { provide: HealthCheckService, useValue: { check: jest.fn() } },
    { provide: MemoryHealthIndicator, useValue: { checkHeap: jest.fn() } },
    { provide: DiskHealthIndicator, useValue: { checkStorage: jest.fn() } },
    { provide: PrismaHealthIndicator, useValue: { pingCheck: jest.fn(), isConnected: jest.fn() } },
    { provide: PrismaService, useValue: {} },
    { provide: ConfigService, useValue: { get: jest.fn() } },
    { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: { findAllActive: jest.fn(), countActive: jest.fn() } },
    { provide: SERVER_CONFIG_REPOSITORY, useValue: { isInsecureMode: jest.fn() } },
    { provide: RESILIENCE.CIRCUIT_BREAKER, useValue: { getAllStatus: jest.fn().mockReturnValue([]) } },
    { provide: GetSystemHealthQueryHandler, useValue: { execute: jest.fn() } },
  ];
}

/**
 * Erstellt eine NestJS-App mit den 3 stabilen v1-Controllern und gemockten Guards.
 *
 * @returns Initialisierte NestJS Application fuer OpenAPI-Generierung
 */
async function createContractTestApp(): Promise<INestApplication> {
  // biome-ignore lint/correctness/useHookAtTopLevel: NestJS testing module API uses "useValue" method names.
  const moduleRef = await Test.createTestingModule({
    controllers: [BefehlController, EinsatzController, HealthController],
    providers: createMockProviders(),
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockGuard)
    .overrideGuard(RolesGuard)
    .useValue(mockGuard)
    .overrideGuard(BefehlRollenGuard)
    .useValue(mockGuard)
    .compile();

  const app = moduleRef.createNestApplication();

  // Versioning konfigurieren identisch zu main.ts
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v-',
    defaultVersion: 'alpha',
  });
  app.setGlobalPrefix('api', { exclude: ['/'] });

  await app.init();
  return app;
}

/**
 * Normalisiert die OpenAPI-Spec fuer stabile Snapshots.
 *
 * Entfernt dynamische Felder die sich zwischen Runs aendern
 * (Version, Server-URLs, Timestamps).
 *
 * @param spec - Die rohe OpenAPI-Spec als JSON-Objekt
 * @returns Normalisierte Spec ohne umgebungsabhaengige Felder
 */
function normalizeSpec<T extends object>(spec: T): T {
  const normalized = JSON.parse(JSON.stringify(spec)) as T & {
    info?: { version?: string };
    servers?: unknown;
  };

  // Version normalisieren (aendert sich mit jedem Release)
  if (normalized.info) {
    normalized.info.version = 'NORMALIZED';
  }

  // Server URLs entfernen (umgebungsabhaengig)
  delete normalized.servers;

  return normalized;
}

/**
 * API Contract Tests fuer die v1 (Stable) OpenAPI-Spezifikation.
 *
 * Sicherstellungen:
 * - Die v1 API-Pfade bleiben stabil zwischen Releases
 * - Keine unbeabsichtigten Schema-Aenderungen (Breaking Changes)
 * - Alle erwarteten Endpunkte sind in der v1 Spec enthalten
 *
 * **Architektur:**
 * Nutzt ein minimales TestModule mit gemockten Dependencies statt
 * dem vollstaendigen AppModule, um DB-Abhaengigkeit zu vermeiden.
 * Die OpenAPI-Spec wird aus den Controller-Decoratoren generiert,
 * was die tatsaechliche API-Oberflaechenbeschreibung testet.
 *
 * **v1 stabile Module:** BefehlModule, EinsatzModule, HealthModule
 *
 * @see Story 5.7 Task 6 (Contract Testing)
 */
describe('API Contract Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createContractTestApp();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  /**
   * Snapshot-Test: v1 OpenAPI-Spec muss stabil bleiben.
   *
   * Bei gewollten Aenderungen: `pnpm --filter @bluelight-hub/backend update-api-snapshot`
   */
  it('v1 OpenAPI spec should match snapshot', () => {
    const v1Config = new DocumentBuilder()
      .setTitle('BlueLight Hub API v1 (Stable)')
      .setDescription('Stabile API-Vertraege fuer externe Integrationen.')
      .setVersion('1.0.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-Server-Access-Token',
          in: 'header',
        },
        'server-access-token',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'admin-jwt',
      )
      .build();

    const v1Document = SwaggerModule.createDocument(app, v1Config);
    const normalized = normalizeSpec(v1Document);

    expect(normalized).toMatchSnapshot();
  });

  /**
   * Structural Test: Alle erwarteten v1-Pfade muessen vorhanden sein.
   *
   * Dieser Test schlaegt fehl wenn ein Endpoint entfernt wird,
   * auch wenn der Snapshot-Test noch nicht aktualisiert wurde.
   */
  it('v1 spec should contain expected endpoint paths', () => {
    const config = new DocumentBuilder().setTitle('v1 Contract Test').setVersion('1.0.0').build();
    const document = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(document.paths ?? {});

    // Befehle v-alpha Endpunkte (version: ['alpha', '1'])
    expect(paths).toContain('/api/v-alpha/befehle');
    expect(paths).toContain('/api/v-alpha/befehle/export');
    expect(paths).toContain('/api/v-alpha/befehle/empfaenger-suche');
    expect(paths).toContain('/api/v-alpha/befehle/{id}/quittieren');
    expect(paths).toContain('/api/v-alpha/befehle/{id}/korrigieren');
    expect(paths).toContain('/api/v-alpha/befehle/{id}/kommentare');
    expect(paths).toContain('/api/v-alpha/befehle/{id}/historie');

    // Befehle v-1 Endpunkte (Dual-Version: selber Controller, version: ['alpha', '1'])
    expect(paths).toContain('/api/v-1/befehle');
    expect(paths).toContain('/api/v-1/befehle/export');
    expect(paths).toContain('/api/v-1/befehle/empfaenger-suche');
    expect(paths).toContain('/api/v-1/befehle/{id}/quittieren');
    expect(paths).toContain('/api/v-1/befehle/{id}/korrigieren');
    expect(paths).toContain('/api/v-1/befehle/{id}/kommentare');
    expect(paths).toContain('/api/v-1/befehle/{id}/historie');

    // Einsatz v-alpha Endpunkte (version: ['alpha', '1'])
    expect(paths).toContain('/api/v-alpha/einsatz');
    expect(paths).toContain('/api/v-alpha/einsatz/{id}');
    expect(paths).toContain('/api/v-alpha/einsatz/{id}/rollen');

    // Einsatz v-1 Endpunkte (Dual-Version)
    expect(paths).toContain('/api/v-1/einsatz');
    expect(paths).toContain('/api/v-1/einsatz/{id}');
    expect(paths).toContain('/api/v-1/einsatz/{id}/rollen');

    // Health-Endpunkte (VERSION_NEUTRAL — kein Version-Prefix)
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/health/liveness');
    expect(paths).toContain('/api/health/readiness');
    expect(paths).toContain('/api/health/db');
    expect(paths).toContain('/api/health/integrations');
    expect(paths).toContain('/api/health/system');
  });

  /**
   * Structural Test: v1 Schemas muessen die erwarteten DTOs enthalten.
   */
  it('v1 spec should contain expected schema definitions', () => {
    const config = new DocumentBuilder().setTitle('v1 Schema Test').setVersion('1.0.0').build();
    const document = SwaggerModule.createDocument(app, config);
    const schemaNames = Object.keys(document.components?.schemas ?? {});

    // Befehl-Schemas
    expect(schemaNames).toContain('BefehlDto');
    expect(schemaNames).toContain('BefehlEmpfaengerDto');
    expect(schemaNames).toContain('CreateBefehlDto');
    expect(schemaNames).toContain('BefehlHistorieTimelineDto');

    // Einsatz-Schemas
    expect(schemaNames).toContain('EinsatzDto');
    expect(schemaNames).toContain('CreateEinsatzDto');
    expect(schemaNames).toContain('EinsatzRolleDto');

    // Health-Schemas
    expect(schemaNames).toContain('BasicHealthDto');
    expect(schemaNames).toContain('DetailedHealthDto');
    expect(schemaNames).toContain('IntegrationHealthDto');
    expect(schemaNames).toContain('SystemHealthDto');
  });
});
