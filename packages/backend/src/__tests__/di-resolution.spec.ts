// @ts-nocheck
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlController } from '@/modules/befehl/controllers/befehl.controller';
import { HealthController } from '@/infrastructure/health/health.controller';
import { EinsatzController } from '@/modules/einsatz/controllers/einsatz.controller';
import { CreateBefehlHandler } from '@/application/befehl/commands/create-befehl/create-befehl.handler';
import { BEFEHL_REPOSITORY, EINSATZ_REPOSITORY, ETB_REPOSITORY, MONITORING, METRICS, RESILIENCE } from '@/infrastructure/di-tokens';

/**
 * DI Resolution Smoke Test.
 *
 * Kompiliert das vollstaendige AppModule und validiert, dass alle
 * Dependency-Injection-Bindings korrekt aufgeloest werden koennen.
 * PrismaService wird gemockt, um eine echte DB-Verbindung zu vermeiden.
 *
 * Haette den MonitoringApplicationModule IMetricsCollector-Fehler
 * sofort erkannt, statt erst zur Laufzeit.
 */
describe('DI Resolution Smoke Test', () => {
  let moduleRef: TestingModule;

  /**
   * Mock fuer PrismaService.
   *
   * Alle Model-Getter als leere Objekte, alle Client-Methoden als jest.fn().
   * Verhindert den Constructor-Aufruf (kein PrismaPg, kein DB-Connect).
   */
  const mockPrismaService = {
    // Lifecycle
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),

    // Client-Methoden
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),

    // Model-Getter (alle 35+ Models)
    user: {},
    einsatz: {},
    einsatztagebuch: {},
    etbEintrag: {},
    etbEintragHistorie: {},
    etbTextbaustein: {},
    etbSnapshot: {},
    etbArchiv: {},
    lagekarte: {},
    outboxEvent: {},
    lagekartePoi: {},
    qualifikation: {},
    fahrzeugtyp: {},
    rollenDefinition: {},
    rolleQualifikation: {},
    funkStatusConfig: {},
    stammFahrzeug: {},
    stammPerson: {},
    stammPersonQualifikation: {},
    einsatzFahrzeug: {},
    einsatzPerson: {},
    einsatzPersonQualifikation: {},
    einsatzRollenbesetzung: {},
    einsatzRollenzuweisung: {},
    integrationCredential: {},
    oAuth2State: {},
    qualifikationMapping: {},
    serverAccessToken: {},
    inviteCode: {},
    serverConfig: {},
    einsatzTeilnehmer: {},
    erinnerung: {},
    erinnerungKonfiguration: {},
    erinnerungsvorlage: {},
    fuehrungsrhythmusTemplate: {},
    fuehrungsrhythmusEintrag: {},
    notiz: {},
    kategorie: {},
    befehl: {},
    befehlEmpfaenger: {},
    befehlKommentar: {},
    aufbewahrungsKonfiguration: {},
    complianceReport: {},
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  }, 30_000);

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('AppModule kompiliert ohne DI-Fehler', () => {
    expect(moduleRef).toBeDefined();
  });

  it('Kritische Services sind aufloesbar', () => {
    // Controller aus verschiedenen Modulen
    expect(moduleRef.get(BefehlController)).toBeDefined();
    expect(moduleRef.get(EinsatzController)).toBeDefined();
    expect(moduleRef.get(HealthController)).toBeDefined();

    // Application Layer Handler
    expect(moduleRef.get(CreateBefehlHandler)).toBeDefined();

    // Infrastructure Repositories (via DI Token)
    expect(moduleRef.get(BEFEHL_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(EINSATZ_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(ETB_REPOSITORY)).toBeDefined();

    // Monitoring & Metrics (Story 5.6 — urspruenglicher Fehler-Ort)
    expect(moduleRef.get(MONITORING.METRICS_COLLECTOR)).toBeDefined();
    expect(moduleRef.get(MONITORING.GATEWAY)).toBeDefined();
    expect(moduleRef.get(METRICS.REGISTRY)).toBeDefined();

    // Resilience (Story 5.3)
    expect(moduleRef.get(RESILIENCE.CIRCUIT_BREAKER)).toBeDefined();
  });
});
