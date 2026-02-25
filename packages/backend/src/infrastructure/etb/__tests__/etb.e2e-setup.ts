/**
 * E2E Test Module Setup fuer ETB Infrastructure.
 *
 * Diese Datei stellt die vollständige E2E Test-Infrastruktur bereit:
 * - Database Setup/Cleanup Utilities mit Trigger-Management
 * - SpyEventPublisher fuer Event Verification
 * - Test User/Einsatz Creation Helpers
 * - ID-Generator Funktionen (CUID2 Format via @paralleldrive/cuid2)
 * - Transaction-sichere Cleanup-Logik
 *
 * **ID-FORMAT-KONVENTIONEN:**
 * - **CUID2** (alle Entity IDs: EtbId, EinsatzId, EintragId, UserId): Format von @paralleldrive/cuid2
 *
 * **TEST STRATEGY:**
 * - Real PostgreSQL Database (NICHT mocked)
 * - Direct Handler Invocation (oder full HTTP wenn Controller existiert)
 * - Given-When-Then BDD Style
 * - Cleanup mit Triggers disabled (SET session_replication_role = replica)
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { DomainEvent } from '@domain/common/domain-event';
import type { IEventPublisher } from '@domain/services/ports/i-event-publisher.port';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaEtbRepository } from '../repositories/prisma-etb.repository';
import { PrismaOutboxRepository } from '@/infrastructure/outbox/prisma-outbox.repository';
import { EventSerializer } from '@/infrastructure/outbox/event-serializer';
import { createId } from '@paralleldrive/cuid2';

// ============================================
// TEST PRISMA SERVICE
// ============================================

/**
 * Basistyp für den generierten Prisma Client
 * Wird verwendet um den Typ für Composition zu definieren
 */
type BasePrismaClient = InstanceType<typeof PrismaClient>;

/**
 * Test-kompatible PrismaService fuer E2E Tests.
 *
 * Diese Klasse verwendet Composition (wie der echte PrismaService) und
 * implementiert die NestJS Lifecycle Hooks (OnModuleInit, OnModuleDestroy)
 * um mit PrismaEtbRepository kompatibel zu sein.
 *
 * Ab Prisma v7 wird das Adapter-Pattern verwendet, um eine direkte
 * TCP-Verbindung zur PostgreSQL-Datenbank herzustellen.
 */
class TestPrismaService {
  private readonly _client: BasePrismaClient;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    this._client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this._client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect();
  }

  // Delegate all model accessors to the underlying client
  get user() {
    return this._client.user;
  }
  get einsatz() {
    return this._client.einsatz;
  }
  get einsatztagebuch() {
    return this._client.einsatztagebuch;
  }
  get etbEintrag() {
    return this._client.etbEintrag;
  }
  get etbEintragHistorie() {
    return this._client.etbEintragHistorie;
  }
  get etbTextbaustein() {
    return this._client.etbTextbaustein;
  }
  get etbSnapshot() {
    return this._client.etbSnapshot;
  }
  get etbArchiv() {
    return this._client.etbArchiv;
  }
  get lagekarte() {
    return this._client.lagekarte;
  }
  get outboxEvent() {
    return this._client.outboxEvent;
  }
  get lagekartePoi() {
    return this._client.lagekartePoi;
  }
  get qualifikation() {
    return this._client.qualifikation;
  }
  get fahrzeugtyp() {
    return this._client.fahrzeugtyp;
  }
  get rollenDefinition() {
    return this._client.rollenDefinition;
  }
  get rolleQualifikation() {
    return this._client.rolleQualifikation;
  }
  get funkStatusConfig() {
    return this._client.funkStatusConfig;
  }
  get stammFahrzeug() {
    return this._client.stammFahrzeug;
  }
  get stammPerson() {
    return this._client.stammPerson;
  }
  get stammPersonQualifikation() {
    return this._client.stammPersonQualifikation;
  }
  get einsatzFahrzeug() {
    return this._client.einsatzFahrzeug;
  }
  get einsatzPerson() {
    return this._client.einsatzPerson;
  }
  get einsatzPersonQualifikation() {
    return this._client.einsatzPersonQualifikation;
  }
  get einsatzRollenbesetzung() {
    return this._client.einsatzRollenbesetzung;
  }
  get integrationCredential() {
    return this._client.integrationCredential;
  }
  get oAuth2State() {
    return this._client.oAuth2State;
  }
  get qualifikationMapping() {
    return this._client.qualifikationMapping;
  }
  get serverAccessToken() {
    return this._client.serverAccessToken;
  }
  get inviteCode() {
    return this._client.inviteCode;
  }
  get serverConfig() {
    return this._client.serverConfig;
  }

  // Delegate Prisma Client methods
  $connect() {
    return this._client.$connect();
  }
  $disconnect() {
    return this._client.$disconnect();
  }
  $transaction(...args: Parameters<BasePrismaClient['$transaction']>): ReturnType<BasePrismaClient['$transaction']> {
    return this._client.$transaction(...args);
  }
  $queryRaw(...args: Parameters<BasePrismaClient['$queryRaw']>): ReturnType<BasePrismaClient['$queryRaw']> {
    return this._client.$queryRaw(...args);
  }
  $executeRaw(...args: Parameters<BasePrismaClient['$executeRaw']>): ReturnType<BasePrismaClient['$executeRaw']> {
    return this._client.$executeRaw(...args);
  }
  $queryRawUnsafe(...args: Parameters<BasePrismaClient['$queryRawUnsafe']>): ReturnType<BasePrismaClient['$queryRawUnsafe']> {
    return this._client.$queryRawUnsafe(...args);
  }
  $executeRawUnsafe(...args: Parameters<BasePrismaClient['$executeRawUnsafe']>): ReturnType<BasePrismaClient['$executeRawUnsafe']> {
    return this._client.$executeRawUnsafe(...args);
  }
}

// ============================================
// SPY EVENT PUBLISHER (RE-EXPORT)
// ============================================

/**
 * SpyEventPublisher: Implementiert IEventPublisher und trackt alle publizierten Events.
 *
 * Gleiche Implementierung wie in integration/test-setup.ts, aber hier fuer E2E Tests.
 * Ermoeglicht Event-Verification ohne echte EventEmitter-Infrastruktur.
 */
export class SpyEventPublisher implements IEventPublisher {
  public publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }

  getEventsByName(eventName: string): DomainEvent[] {
    return this.publishedEvents.filter((e) => (e.constructor as typeof DomainEvent).eventName() === eventName);
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

// ============================================
// ID GENERATION UTILITIES
// ============================================

/**
 * Generiert eine Test-ID im CUID2-Format.
 *
 * Verwendet @paralleldrive/cuid2 - das echte Format das auch
 * im Domain Layer zur Validierung verwendet wird (isCuid()).
 * Verwendet fuer: EtbId, EinsatzId, EintragId, UserId - ALLE Entity IDs!
 *
 * @returns CUID2-kompatible ID
 *
 * @example
 * ```typescript
 * const einsatzId = generateTestId(); // "clocq1tpv0000..."
 * const userId = generateTestId();     // Gleiches Format!
 * ```
 */
export function generateTestId(): string {
  return createId();
}

// ============================================
// DATABASE UTILITIES
// ============================================

/**
 * SQL zum Deaktivieren von Database Triggers.
 *
 * Notwendig fuer sichere Test-Daten Loeschung (FK Constraints umgehen).
 * ACHTUNG: Erfordert SUPERUSER-Rechte in PostgreSQL!
 */
export const DISABLE_TRIGGERS_SQL = 'SET session_replication_role = replica;';

/**
 * SQL zum Reaktivieren von Database Triggers.
 *
 * IMMER in finally-Block ausfuehren!
 */
export const ENABLE_TRIGGERS_SQL = 'SET session_replication_role = DEFAULT;';

/**
 * Versucht session_replication_role zu setzen, ignoriert aber Fehler
 * wenn der DB-User keine SUPERUSER-Rechte hat (z.B. in CI).
 *
 * Hinweis: Da diese Funktion außerhalb von $transaction aufgerufen wird,
 * ist jeder Befehl auto-commit und SAVEPOINT nicht nötig.
 * Der Fehler wird einfach abgefangen und ignoriert.
 *
 * @param prisma - PrismaClient Instanz
 * @param mode - 'replica' zum Deaktivieren, 'DEFAULT' zum Reaktivieren
 * @returns true wenn erfolgreich, false wenn keine Rechte
 */
async function trySetReplicationRole(prisma: TestPrismaService, mode: 'replica' | 'DEFAULT'): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(`SET session_replication_role = ${mode};`);
    return true;
  } catch (error: unknown) {
    // PostgreSQL Error 42501: permission denied (keine SUPERUSER-Rechte)
    // Dies ist in CI-Umgebungen normal und kann ignoriert werden.
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('42501') || msg.includes('permission denied') || msg.includes('must be superuser')) {
      // Silent ignore - Tests funktionieren auch ohne Trigger-Deaktivierung
      // wenn die DELETE-Reihenfolge FK-Constraints beachtet
      return false;
    }
    throw error;
  }
}

/**
 * Helper: Loescht alte Test-Daten aus einer Tabelle (aelter als 1 Stunde).
 *
 * Diese Funktion wird verwendet um Daten von vorherigen fehlgeschlagenen
 * Test-Runs aufzuraeumen. Sie ist idempotent und behandelt nicht-existente
 * Tabellen gracefully.
 *
 * @param prisma - PrismaClient Instanz
 * @param table - Tabellenname (inkl. Quotes wenn reserved word)
 * @param timestampCol - Spaltenname fuer Timestamp-Vergleich (inkl. Quotes)
 */
async function safeDeleteOld(prisma: TestPrismaService, table: string, timestampCol: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${timestampCol} < NOW() - INTERVAL '1 hour'`);
  } catch (error: unknown) {
    // Table might not exist - ignore error
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('does not exist') && !msg.includes('42P01')) {
      throw error;
    }
  }
}

// ============================================
// E2E TEST MODULE PATTERN
// ============================================

/**
 * E2E Test Module Context Interface.
 *
 * Definiert die Struktur des Test-Kontexts der von createEtbE2eModule() zurueckgegeben wird.
 */
export interface EtbE2eTestContext {
  /** PrismaClient fuer direkte DB-Zugriffe in Tests */
  prisma: TestPrismaService;

  /** ETB Repository (real Prisma Implementation) */
  repository: PrismaEtbRepository;

  /** Event Publisher (Spy fuer Event Verification) */
  eventPublisher: SpyEventPublisher;

  /** Test User ID (erstellt in beforeAll) - Nanoid Format */
  testUserId: string;

  /** Test Einsatz ID (erstellt in beforeAll) - CUID Format */
  testEinsatzId: string;

  /** Unique Test Run ID fuer Isolation (Timestamp) */
  testRunId: string;
}

/**
 * Factory fuer ETB E2E Test Module.
 *
 * Erstellt vollstaendigen Test-Kontext mit:
 * - PrismaClient fuer DB-Zugriffe
 * - Test User (Nanoid ID)
 * - Test Einsatz (CUID ID)
 * - PrismaEtbRepository
 * - SpyEventPublisher
 *
 * Fuehrt automatisch Cleanup von alten Test-Daten aus (aelter als 1 Stunde).
 *
 * @returns E2E Test Context mit Repository, Prisma, Helpers
 *
 * @example
 * ```typescript
 * describe('ETB CQRS API - E2E Tests', () => {
 *   let ctx: EtbE2eTestContext;
 *
 *   beforeAll(async () => {
 *     ctx = await createEtbE2eModule();
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestData(ctx);
 *   });
 *
 *   afterAll(async () => {
 *     await teardownE2eModule(ctx);
 *   });
 *
 *   it('should create ETB', async () => {
 *     // ... test
 *   });
 * });
 * ```
 */
export async function createEtbE2eModule(): Promise<EtbE2eTestContext> {
  // 1. PrismaClient erstellen (TestPrismaService fuer Repository-Kompatibilitaet)
  const prisma = new TestPrismaService();

  // 2. Cleanup von vorherigen Test-Runs (älter als 1 Stunde)
  // Versuche Triggers zu deaktivieren (benötigt SUPERUSER-Rechte)
  const triggersDisabled = await trySetReplicationRole(prisma, 'replica');
  try {
    // Reihenfolge wichtig (FK Constraints!):
    // Snapshots -> Eintraege -> Einsatztagebuecher -> Einsaetze -> User
    await safeDeleteOld(prisma, 'etb_snapshots', '"snapshotAt"');
    await safeDeleteOld(prisma, 'etb_eintraege', '"createdAt"');
    await safeDeleteOld(prisma, 'einsatztagebuecher', '"createdAt"');
    await safeDeleteOld(prisma, 'einsaetze', '"createdAt"');
    await safeDeleteOld(prisma, '"User"', '"createdAt"');
  } finally {
    // Reaktiviere Triggers (nur wenn vorher deaktiviert)
    if (triggersDisabled) {
      await trySetReplicationRole(prisma, 'DEFAULT');
    }
  }

  // 3. Test User erstellen (CUID2 Format!)
  // WICHTIG: testRunId enthält Timestamp UND Random-Suffix um parallele Test-Runs zu isolieren
  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testUserId = generateTestId();
  await prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      ${testUserId},
      ${`test-etb-e2e-user-${testRunId}`},
      'dummy-hash',
      'USER'::"UserRole",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO UPDATE SET id = EXCLUDED.id
  `;

  // 3b. SYSTEM User erstellen (für ETBs ohne Einträge - Fallback im Repository)
  // WICHTIG: Der PrismaEtbRepository verwendet 'SYSTEM' als Fallback-ID wenn kein Eintrag vorhanden ist.
  // Wir verwenden ON CONFLICT DO UPDATE um sicherzustellen, dass die ID 'SYSTEM' ist,
  // auch wenn bereits ein 'system' User mit anderer ID existiert.
  await prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      'SYSTEM',
      'system',
      'no-login',
      'USER'::"UserRole",
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO UPDATE SET id = 'SYSTEM'
  `;

  // 4. Test Einsatz erstellen (CUID2 Format!)
  // HINWEIS: ON CONFLICT auf id ist selten (CUID2 Kollision unwahrscheinlich),
  // aber wir aktualisieren trotzdem um sicherzustellen, dass die FK-Referenz korrekt ist
  const testEinsatzId = generateTestId();
  const testEinsatzNummer = `E2026-E2E-${testRunId}`;
  await prisma.$executeRaw`
    INSERT INTO einsaetze (id, alarmstichwort, einsatzort, nummer, status, "createdBy", "updatedBy", "createdAt", "updatedAt")
    VALUES (
      ${testEinsatzId},
      ${`TEST - ETB E2E ${testRunId}`},
      'Test-Einsatzort fuer ETB E2E Tests',
      ${testEinsatzNummer},
      'ANGELEGT'::"EinsatzStatus",
      ${testUserId},
      ${testUserId},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET "createdBy" = EXCLUDED."createdBy", "updatedBy" = EXCLUDED."updatedBy"
  `;

  // 5. Mock Logger für Outbox Repository
  const mockLogger = {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
    setContext: () => {},
  };

  // 6. Repository und EventPublisher
  // Cast TestPrismaService zu PrismaService für Repository-Kompatibilität
  const prismaService = prisma as unknown as PrismaService;
  const repository = new PrismaEtbRepository(prismaService);
  const eventPublisher = new SpyEventPublisher();

  // Outbox Repository für direkten Zugriff in Tests (Story 4-4)
  const eventSerializer = new EventSerializer();
  const _outboxRepository = new PrismaOutboxRepository(prismaService, eventSerializer, mockLogger);

  return {
    prisma,
    repository,
    eventPublisher,
    testUserId,
    testEinsatzId,
    testRunId,
  };
}

/**
 * Teardown fuer E2E Test Module.
 *
 * Loescht alle Test-Daten und schliesst DB-Verbindung.
 * Verwendet Trigger-Deaktivierung fuer sichere Loeschung.
 *
 * @param ctx - E2E Test Context
 */
export async function teardownE2eModule(ctx: EtbE2eTestContext): Promise<void> {
  // Versuche Triggers zu deaktivieren (benötigt SUPERUSER-Rechte)
  const triggersDisabled = await trySetReplicationRole(ctx.prisma, 'replica');
  try {
    // Reihenfolge (FK-Reverse Order!):
    // Snapshots -> Eintraege -> Einsatztagebuecher -> Outbox Events -> Einsaetze -> User
    await ctx.prisma.$executeRaw`DELETE FROM etb_snapshots WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId})`;
    await ctx.prisma.$executeRaw`DELETE FROM etb_eintraege WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId})`;
    await ctx.prisma.$executeRaw`DELETE FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId}`;
    await ctx.prisma.$executeRaw`DELETE FROM outbox_events WHERE "aggregateId" = ${ctx.testEinsatzId}`;
    await ctx.prisma.$executeRaw`DELETE FROM einsaetze WHERE id = ${ctx.testEinsatzId}`;
    await ctx.prisma.$executeRaw`DELETE FROM "User" WHERE id = ${ctx.testUserId}`;
  } finally {
    // Reaktiviere Triggers (nur wenn vorher deaktiviert)
    if (triggersDisabled) {
      await trySetReplicationRole(ctx.prisma, 'DEFAULT');
    }
    await ctx.prisma.$disconnect();
  }
}

/**
 * Cleanup fuer einzelnen Test (afterEach).
 *
 * Loescht ETB-Daten aber behaelt User/Einsatz.
 * Cleard auch den Event Publisher Spy.
 *
 * @param ctx - E2E Test Context
 */
export async function cleanupTestData(ctx: EtbE2eTestContext): Promise<void> {
  ctx.eventPublisher.clear();

  // Versuche Triggers zu deaktivieren (benötigt SUPERUSER-Rechte)
  const triggersDisabled = await trySetReplicationRole(ctx.prisma, 'replica');
  try {
    // Reihenfolge (FK Order!): Snapshots -> Eintraege -> Einsatztagebuecher -> Outbox Events
    await ctx.prisma.$executeRaw`DELETE FROM etb_snapshots WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId})`;
    await ctx.prisma.$executeRaw`DELETE FROM etb_eintraege WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId})`;
    await ctx.prisma.$executeRaw`DELETE FROM einsatztagebuecher WHERE "einsatzId" = ${ctx.testEinsatzId}`;
    await ctx.prisma.$executeRaw`DELETE FROM outbox_events WHERE "aggregateId" = ${ctx.testEinsatzId}`;
  } finally {
    // Reaktiviere Triggers (nur wenn vorher deaktiviert)
    if (triggersDisabled) {
      await trySetReplicationRole(ctx.prisma, 'DEFAULT');
    }
  }
}

// ============================================
// TEST HELPERS
// ============================================

/**
 * Helper: Erstellt einen neuen Test-Einsatz.
 *
 * Nuetzlich wenn ein Test einen separaten Einsatz benoetigt.
 * Verwendet den testUserId aus dem Context fuer createdBy/updatedBy.
 *
 * @param ctx - E2E Test Context
 * @returns ID des erstellten Einsatzes (CUID2 Format)
 *
 * @example
 * ```typescript
 * it('should work with separate Einsatz', async () => {
 *   const separateEinsatzId = await createTestEinsatz(ctx);
 *   // ... test logic
 * });
 * ```
 */
export async function createTestEinsatz(ctx: EtbE2eTestContext): Promise<string> {
  const einsatzId = generateTestId();
  const einsatzNummer = `E2026-E2E-${ctx.testRunId}-${Date.now()}`;
  const rowsAffected = await ctx.prisma.$executeRaw`
    INSERT INTO einsaetze (id, alarmstichwort, einsatzort, nummer, status, "createdBy", "updatedBy", "createdAt", "updatedAt")
    VALUES (
      ${einsatzId},
      ${`TEST - ETB E2E ${ctx.testRunId}-${Date.now()}`},
      'Test-Einsatzort',
      ${einsatzNummer},
      'ANGELEGT'::"EinsatzStatus",
      ${ctx.testUserId},
      ${ctx.testUserId},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET "createdBy" = EXCLUDED."createdBy"
  `;
  if (rowsAffected === 0) {
    throw new Error(`Failed to create test Einsatz with id ${einsatzId}`);
  }
  return einsatzId;
}

/**
 * Helper: Wartet bis eine asynchrone Assertion erfolgreich ist.
 *
 * Nuetzlich fuer Event-Handler Tests die async sind und Zeit benoetigen.
 * Pollt die Assertion in Intervallen bis timeout erreicht ist.
 *
 * @param assertion - Async Funktion die eine Assertion ausfuehrt
 * @param timeout - Maximale Wartezeit in Millisekunden (default: 500ms)
 * @param interval - Poll-Intervall in Millisekunden (default: 50ms)
 *
 * @throws Der letzte Assertion-Error wenn Timeout erreicht wird
 *
 * @example
 * ```typescript
 * it('should emit event', async () => {
 *   await createHandler.execute(command);
 *
 *   await waitFor(async () => {
 *     const events = ctx.eventPublisher.getEventsByName('etb.created');
 *     expect(events).toHaveLength(1);
 *   });
 * });
 * ```
 */
export async function waitFor(assertion: () => Promise<void>, timeout = 500, interval = 50): Promise<void> {
  const start = Date.now();
  let lastError: Error | undefined;
  while (Date.now() - start < timeout) {
    try {
      await assertion();
      return;
    } catch (e) {
      lastError = e as Error;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw lastError ?? new Error('Timeout waiting for assertion');
}

// ============================================
// E2E TEST TEMPLATE DOCUMENTATION
// ============================================

/**
 * Template fuer ETB E2E Tests.
 *
 * Dieses Template zeigt die erwartete Struktur von E2E Tests.
 * Es dient als Referenz fuer Entwickler die neue E2E Tests schreiben.
 *
 * **BEST PRACTICES:**
 * - Given-When-Then BDD Style
 * - Event Publisher nach jedem Test clearen
 * - Test-Daten nach jedem Test aufräumen
 * - Alle DB-Ressourcen in afterAll schließen
 * - Async Event Handler mit waitFor() testen
 *
 * @example
 * ```typescript
 * describe('ETB CQRS API - E2E Tests', () => {
 *   let ctx: EtbE2eTestContext;
 *
 *   beforeAll(async () => {
 *     ctx = await createEtbE2eModule();
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestData(ctx);
 *   });
 *
 *   afterAll(async () => {
 *     await teardownE2eModule(ctx);
 *   });
 *
 *   describe('Create ETB', () => {
 *     it('should create ETB successfully', async () => {
 *       // Given
 *       const command = CreateEtbCommand.create(ctx.testEinsatzId).value!;
 *
 *       // When
 *       const result = await createHandler.execute(command);
 *
 *       // Then
 *       expect(result.isSuccess).toBe(true);
 *       const etb = await ctx.repository.findById(result.value!);
 *       expect(etb).not.toBeNull();
 *       expect(etb!.status.value).toBe('DRAFT');
 *     });
 *
 *     it('should emit etb.created event', async () => {
 *       // Given
 *       const command = CreateEtbCommand.create(ctx.testEinsatzId).value!;
 *
 *       // When
 *       await createHandler.execute(command);
 *
 *       // Then
 *       await waitFor(async () => {
 *         const events = ctx.eventPublisher.getEventsByName('etb.created');
 *         expect(events).toHaveLength(1);
 *       });
 *     });
 *   });
 *
 *   describe('Add Eintrag', () => {
 *     it('should add eintrag to existing ETB', async () => {
 *       // Given: Create ETB first
 *       const createCmd = CreateEtbCommand.create(ctx.testEinsatzId).value!;
 *       const createResult = await createHandler.execute(createCmd);
 *       const etbId = createResult.value!.value;
 *       ctx.eventPublisher.clear();
 *
 *       // When
 *       const addCmd = AddEintragCommand.create(etbId, 'Test Eintrag', ctx.testUserId).value!;
 *       const result = await addEintragHandler.execute(addCmd);
 *
 *       // Then
 *       expect(result.isSuccess).toBe(true);
 *       const etb = await ctx.repository.findById(EtbId.create(etbId).value!);
 *       expect(etb!.eintraege).toHaveLength(1);
 *       expect(etb!.eintraege[0].text).toBe('Test Eintrag');
 *     });
 *   });
 *
 *   describe('Lock ETB', () => {
 *     it('should lock ETB and prevent further modifications', async () => {
 *       // Given: Create ETB with entries
 *       const createCmd = CreateEtbCommand.create(ctx.testEinsatzId).value!;
 *       const createResult = await createHandler.execute(createCmd);
 *       const etbId = createResult.value!.value;
 *
 *       // When: Lock
 *       const lockCmd = LockEtbCommand.create(etbId, ctx.testUserId).value!;
 *       const lockResult = await lockHandler.execute(lockCmd);
 *
 *       // Then
 *       expect(lockResult.isSuccess).toBe(true);
 *       const etb = await ctx.repository.findById(EtbId.create(etbId).value!);
 *       expect(etb!.isLocked()).toBe(true);
 *
 *       // Verify: Further modifications fail
 *       const addCmd = AddEintragCommand.create(etbId, 'Should fail', ctx.testUserId).value!;
 *       const addResult = await addEintragHandler.execute(addCmd);
 *       expect(addResult.isFailure).toBe(true);
 *     });
 *   });
 * });
 * ```
 */
export const E2E_TEST_TEMPLATE_DOCUMENTATION = 'See JSDoc above for E2E test template';
