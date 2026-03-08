// @ts-nocheck
/**
 * E2E Test Module Setup fuer Einsatz Infrastructure.
 *
 * Diese Datei stellt die vollständige E2E Test-Infrastruktur bereit:
 * - Database Setup/Cleanup Utilities mit Trigger-Management
 * - SpyEventPublisher fuer Event Verification
 * - Test User Creation Helpers (3 Rollen: USER, ADMIN, SUPER_ADMIN)
 * - Test Einsatz/Outbox Creation Helpers
 * - ID-Generator Funktionen (CUID2 Format via @paralleldrive/cuid2)
 * - Transaction-sichere Cleanup-Logik
 *
 * **ID-FORMAT-KONVENTIONEN:**
 * - **CUID2** (alle Entity IDs: EinsatzId, UserId, OutboxEventId): Format von @paralleldrive/cuid2
 *
 * **TEST STRATEGY:**
 * - Real PostgreSQL Database (NICHT mocked)
 * - Direct Handler Invocation (CQRS Commands/Queries)
 * - Given-When-Then BDD Style
 * - Cleanup mit Triggers disabled (SET session_replication_role = replica)
 * - RBAC Testing mit 3 User-Rollen (USER, ADMIN, SUPER_ADMIN)
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import type { DomainEvent } from '@domain/common/domain-event';
import type { IEventPublisher } from '@domain/services/ports/i-event-publisher.port';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaEinsatzRepository } from '../repositories/prisma-einsatz.repository';
import { PrismaOutboxRepository } from '@/infrastructure/outbox/prisma-outbox.repository';
import { EventSerializer } from '@/infrastructure/outbox/event-serializer';
import { createId } from '@paralleldrive/cuid2';
import { BCRYPT_COST_FACTOR_TOKEN } from '@infrastructure/config/security.constants';

/**
 * Typ für Prisma Executor (Client oder Transaction).
 *
 * Ermöglicht die Verwendung von `$executeRawUnsafe` sowohl mit
 * PrismaClient als auch innerhalb von Transactions.
 */
type PrismaExecutor = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
};

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
 * um mit PrismaEinsatzRepository kompatibel zu sein.
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
// SPY EVENT PUBLISHER
// ============================================

/**
 * SpyEventPublisher: Implementiert IEventPublisher und trackt alle publizierten Events.
 *
 * Gleiche Implementierung wie in integration/test-setup.ts und etb.e2e-setup.ts,
 * aber hier fuer Einsatz E2E Tests. Ermoeglicht Event-Verification ohne echte
 * EventEmitter-Infrastruktur.
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
// MOCK LOGGER FACTORY
// ============================================

/**
 * Erstellt einen Mock Logger für E2E Tests.
 *
 * Implementiert das ILogger Interface mit No-Op Funktionen.
 * Nuetzlich für Handler und Services die einen Logger benötigen.
 *
 * @returns Mock Logger Instanz
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 * const handler = new SomeHandler(repository, mockLogger);
 * ```
 */
export function createMockLogger() {
  return {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
    setContext: () => {},
  };
}

// ============================================
// ID GENERATION UTILITIES
// ============================================

/**
 * Generiert eine Test-ID im CUID2-Format.
 *
 * Verwendet @paralleldrive/cuid2 - das echte Format das auch
 * im Domain Layer zur Validierung verwendet wird (isCuid()).
 * Verwendet fuer: EinsatzId, UserId, OutboxEventId - ALLE Entity IDs!
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

// Cache für SUPERUSER-Status (wird einmal pro Test-Run geprüft)
let _superuserStatus: boolean | null = null;

/**
 * Prueft einmalig, ob der DB-User SUPERUSER-Rechte hat.
 *
 * Das Ergebnis wird gecached, da alle Connections zum selben User gehoeren.
 * Die Pruefung passiert AUSSERHALB einer Transaction mit eigenem
 * Error-Handling, damit keine Connection in einem schlechten Zustand bleibt.
 *
 * @param prisma - PrismaClient Instanz
 * @returns true wenn SUPERUSER, false wenn nicht
 */
async function checkSuperuserPrivileges(prisma: TestPrismaService): Promise<boolean> {
  // Cache nutzen wenn bereits geprüft
  if (_superuserStatus !== null) {
    return _superuserStatus;
  }

  try {
    // Query statt SET, um Transaktions-Probleme zu vermeiden
    const result = (await prisma.$queryRaw`
      SELECT usesuper FROM pg_user WHERE usename = current_user
    `) as { usesuper: boolean }[];
    _superuserStatus = result.length > 0 && result[0]?.usesuper === true;
    return _superuserStatus;
  } catch {
    // Bei jedem Fehler annehmen, dass keine SUPERUSER-Rechte vorhanden
    _superuserStatus = false;
    return false;
  }
}

/**
 * Setzt session_replication_role innerhalb einer Transaction.
 *
 * WICHTIG: Nur aufrufen wenn vorher checkSuperuserPrivileges() true ergab!
 *
 * @param tx - Prisma Transaction Context
 * @param mode - 'replica' zum Deaktivieren, 'DEFAULT' zum Reaktivieren
 */
async function setReplicationRole(tx: PrismaExecutor, mode: 'replica' | 'DEFAULT'): Promise<void> {
  await tx.$executeRawUnsafe(`SET session_replication_role = ${mode};`);
}

/**
 * Helper: Loescht alte Test-Daten aus einer Tabelle (aelter als 1 Stunde).
type PrismaExecutor = {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

/**
 * Helper: Loescht alte Test-Daten aus einer Tabelle (aelter als 1 Stunde) innerhalb einer Transaktion.
 *
 * @param tx - Prisma Transaction Context
 * @param table - Tabellenname (inkl. Quotes wenn reserved word)
 * @param timestampCol - Spaltenname fuer Timestamp-Vergleich (inkl. Quotes)
 */
async function safeDeleteOldTx(tx: PrismaExecutor, table: string, timestampCol: string): Promise<void> {
  // SAVEPOINT verwenden, damit Fehler die Transaction nicht abbrechen.
  // PostgreSQL bricht bei jedem Fehler die Transaction ab, auch wenn
  // wir den Fehler in JavaScript abfangen. Mit SAVEPOINT wird nur der
  // Savepoint zurückgerollt, nicht die gesamte Transaction.
  const savepointName = `sp_${table.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
  try {
    await tx.$executeRawUnsafe(`SAVEPOINT ${savepointName};`);
    await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${timestampCol} < NOW() - INTERVAL '1 hour'`);
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName};`);
  } catch (error: unknown) {
    // Rollback zum Savepoint bei JEDEM Fehler
    try {
      await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepointName};`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName};`);
    } catch {
      // Ignore - Savepoint cleanup ist best-effort
    }
    // Bekannte Fehler ignorieren:
    // - 42P01: relation does not exist (Tabelle noch nicht angelegt)
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('does not exist') && !msg.includes('42P01')) {
      throw error;
    }
  }
}

/**
 * Helper: Fuehrt SQL DELETE aus, ignoriert aber Fehler wenn Tabelle nicht existiert.
 *
 * Nuetzlich fuer Cleanup-Operationen bei optionalen/zukuenftigen Tabellen.
 *
 * @param executor - Prisma Client oder Transaction Context
 * @param sql - SQL DELETE Statement
 * @param params - SQL Parameter (optional)
 */
async function safeDelete(executor: PrismaExecutor, sql: string, params?: unknown[]): Promise<void> {
  // SAVEPOINT verwenden, damit Fehler die Transaction nicht abbrechen.
  const savepointName = `sp_safedel_${Date.now()}`;
  try {
    await executor.$executeRawUnsafe(`SAVEPOINT ${savepointName};`);
    if (params) {
      await executor.$executeRawUnsafe(sql, ...params);
    } else {
      await executor.$executeRawUnsafe(sql);
    }
    await executor.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName};`);
  } catch (error: unknown) {
    // Rollback zum Savepoint bei JEDEM Fehler
    try {
      await executor.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepointName};`);
      await executor.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName};`);
    } catch {
      // Ignore - Savepoint cleanup ist best-effort
    }
    // Bekannte Fehler ignorieren:
    // - 42P01: relation does not exist (Tabelle noch nicht angelegt)
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
 * Definiert die Struktur des Test-Kontexts der von createEinsatzE2eModule() zurueckgegeben wird.
 */
export interface EinsatzE2eTestContext {
  /** PrismaClient fuer direkte DB-Zugriffe in Tests */
  prisma: TestPrismaService;

  /** Einsatz Repository (real Prisma Implementation) */
  repository: PrismaEinsatzRepository;

  /** Outbox Repository (fuer Outbox Integration Tests) */
  outboxRepository: PrismaOutboxRepository;

  /** Event Publisher (Spy fuer Event Verification) */
  eventPublisher: SpyEventPublisher;

  /** Mock Logger fuer Handler und Services */
  mockLogger: ReturnType<typeof createMockLogger>;

  /** Test User IDs (3 Rollen fuer RBAC Testing) */
  testUserIds: {
    /** User mit USER Rolle */
    user: string;
    /** User mit ADMIN Rolle */
    admin: string;
    /** User mit SUPER_ADMIN Rolle */
    superAdmin: string;
  };

  /** Unique Test Run ID fuer Isolation (Timestamp) */
  testRunId: string;

  /**
   * Server Access Token fuer SetupPendingGuard.
   *
   * Der SetupPendingGuard prueft ob mindestens ein aktiver Admin UND ein aktiver
   * ServerAccessToken existiert. Ohne diesen Token wird 503 zurueckgegeben.
   */
  serverAccessToken: {
    /** Token ID in DB (Format: blh_{cuid2}) */
    id: string;
    /** Klartext-Token fuer X-Server-Access-Token Header */
    rawToken: string;
  };
}

/**
 * Factory fuer Einsatz E2E Test Module.
 *
 * Erstellt vollstaendigen Test-Kontext mit:
 * - PrismaClient fuer DB-Zugriffe
 * - 3 Test Users (USER, ADMIN, SUPER_ADMIN Rollen) - CUID2 IDs
 * - PrismaEinsatzRepository
 * - PrismaOutboxRepository (fuer Outbox Integration Tests)
 * - SpyEventPublisher
 *
 * Fuehrt automatisch Cleanup von alten Test-Daten aus (aelter als 1 Stunde).
 * Cleanup-Reihenfolge beachtet FK Constraints:
 * - Lagekarten (POIs, Aktualisierungen, Versionen, Snapshots, Eintraege)
 * - ETB (Snapshots, Eintraege, Einsatztagebuecher)
 * - Outbox Events
 * - Einsaetze
 * - Test Users
 *
 * @returns E2E Test Context mit Repository, Prisma, Helpers
 *
 * @example
 * ```typescript
 * describe('Einsatz CQRS API - E2E Tests', () => {
 *   let ctx: EinsatzE2eTestContext;
 *
 *   beforeAll(async () => {
 *     ctx = await createEinsatzE2eModule();
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
 *   it('should create Einsatz', async () => {
 *     // ... test
 *   });
 * });
 * ```
 */
export async function createEinsatzE2eModule(): Promise<EinsatzE2eTestContext> {
  // 1. PrismaClient erstellen (TestPrismaService fuer Repository-Kompatibilitaet)
  const prisma = new TestPrismaService();

  // 2. Cleanup von vorherigen Test-Runs (älter als 1 Stunde)
  // Prüfe SUPERUSER-Rechte AUSSERHALB der Transaction (bricht nichts ab bei Fehler)
  const hasSuperuserPrivileges = await checkSuperuserPrivileges(prisma);

  // Interaktive Transaktion stellt sicher, dass session_replication_role
  // auf derselben Verbindung wie alle DELETEs ausgeführt wird
  await prisma.$transaction(async (tx) => {
    // Triggers deaktivieren (nur wenn SUPERUSER-Rechte vorhanden)
    // In CI-Umgebungen ohne SUPERUSER funktionieren die Tests trotzdem,
    // da die DELETE-Reihenfolge FK-Constraints beachtet
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'replica');
    }

    // Reihenfolge wichtig (FK Constraints beachten!):
    // Lagekarten Dependencies (POIs, etc.) -> ETB Dependencies -> Outbox -> Einsaetze -> Users

    // Lagekarten Dependencies (deepest FK first)
    await safeDeleteOldTx(tx, 'lagekarten_pois', '"createdAt"');
    await safeDeleteOldTx(tx, 'lagekarten_aktualisierungen', '"createdAt"');
    await safeDeleteOldTx(tx, 'lagekarten_versionen', '"versionTimestamp"');
    await safeDeleteOldTx(tx, 'lagekarten_snapshots', '"snapshotAt"');
    await safeDeleteOldTx(tx, 'lagekarten_eintraege', '"createdAt"');
    await safeDeleteOldTx(tx, 'lagekarten', '"createdAt"');

    // ETB Dependencies
    await safeDeleteOldTx(tx, 'etb_snapshots', '"snapshotAt"');
    await safeDeleteOldTx(tx, 'etb_eintraege', '"createdAt"');
    await safeDeleteOldTx(tx, 'einsatztagebuecher', '"createdAt"');

    // Outbox Events (for outbox integration tests)
    await safeDeleteOldTx(tx, 'outbox_events', '"createdAt"');

    // Einsaetze
    await safeDeleteOldTx(tx, 'einsaetze', '"createdAt"');

    // Test Users
    await safeDeleteOldTx(tx, '"User"', '"createdAt"');

    // Reaktiviere Triggers am Ende der Transaktion (nur wenn vorher deaktiviert)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'DEFAULT');
    }
  });

  // 3. Test Users erstellen (3 Rollen fuer RBAC Testing - CUID2 Format!)
  const testRunId = Date.now().toString();

  const userId = generateTestId();
  const adminId = generateTestId();
  const superAdminId = generateTestId();

  // User mit USER Rolle
  await prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      ${userId},
      ${`test_einsatz_e2e_user_${testRunId}`},
      'dummy-hash',
      'USER'::"UserRole",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING
  `;

  // User mit ADMIN Rolle
  await prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      ${adminId},
      ${`test_einsatz_e2e_admin_${testRunId}`},
      'dummy-hash',
      'ADMIN'::"UserRole",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING
  `;

  // User mit SUPER_ADMIN Rolle
  await prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      ${superAdminId},
      ${`test_einsatz_e2e_superadmin_${testRunId}`},
      'dummy-hash',
      'SUPER_ADMIN'::"UserRole",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING
  `;

  // 4. ServerAccessToken erstellen (erforderlich fuer SetupPendingGuard)
  // Der Guard prueft: hasAdmin && hasActiveToken
  const serverAccessToken = await createServerAccessTokenHelper(prisma, testRunId);

  // 6. Mock Logger für Repository-Instanziierung
  const mockLogger = createMockLogger();

  // 7. Repository und EventPublisher
  // Cast TestPrismaService zu PrismaService für Repository-Kompatibilität
  const prismaService = prisma as unknown as PrismaService;
  const repository = new PrismaEinsatzRepository(prismaService, mockLogger);
  const eventPublisher = new SpyEventPublisher();

  // Outbox Repository für direkten Zugriff in Tests
  const eventSerializer = new EventSerializer();
  const outboxRepository = new PrismaOutboxRepository(prismaService, eventSerializer, mockLogger);

  return {
    prisma,
    repository,
    outboxRepository,
    eventPublisher,
    mockLogger,
    testUserIds: {
      user: userId,
      admin: adminId,
      superAdmin: superAdminId,
    },
    testRunId,
    serverAccessToken,
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
export async function teardownE2eModule(ctx: EinsatzE2eTestContext): Promise<void> {
  // Cleanup all test data created during tests (delete by test user IDs)
  const allUserIds = [ctx.testUserIds.user, ctx.testUserIds.admin, ctx.testUserIds.superAdmin];
  const serverAccessTokenId = ctx.serverAccessToken?.id;

  // Prüfe SUPERUSER-Rechte AUSSERHALB der Transaction (bricht nichts ab bei Fehler)
  const hasSuperuserPrivileges = await checkSuperuserPrivileges(ctx.prisma);

  // Interaktive Transaktion stellt sicher, dass session_replication_role
  // auf derselben Verbindung wie alle DELETEs ausgeführt wird
  await ctx.prisma.$transaction(async (tx) => {
    // Triggers deaktivieren (nur wenn SUPERUSER-Rechte vorhanden)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'replica');
    }

    // Reihenfolge (FK-Reverse Order!):
    // Lagekarten -> ETB -> Outbox -> Einsaetze -> Users

    // Lagekarten Dependencies (safe delete - tables may not exist yet)
    await safeDelete(tx, `DELETE FROM lagekarten_pois WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [allUserIds]);
    await safeDelete(tx, `DELETE FROM lagekarten_aktualisierungen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_versionen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_snapshots WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_eintraege WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allUserIds]);

    // ETB Dependencies
    await safeDelete(tx, `DELETE FROM etb_snapshots WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [allUserIds]);
    await safeDelete(tx, `DELETE FROM etb_eintraege WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [allUserIds]);
    await safeDelete(tx, `DELETE FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allUserIds]);

    // Outbox Events
    await safeDelete(tx, `DELETE FROM outbox_events WHERE "aggregateId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allUserIds]);

    // Einsaetze
    await safeDelete(tx, `DELETE FROM einsaetze WHERE "createdBy" = ANY($1)`, [allUserIds]);

    // ServerAccessTokens (fuer SetupPendingGuard)
    if (serverAccessTokenId) {
      await safeDelete(tx, `DELETE FROM "server_access_tokens" WHERE id = $1`, [serverAccessTokenId]);
    }
    // Cleanup alle Test-Tokens (fuer Tests die zusaetzliche Tokens erstellen)
    await safeDelete(tx, `DELETE FROM "server_access_tokens" WHERE name LIKE 'test_einsatz_e2e_%'`);

    // Test Users
    await safeDelete(tx, `DELETE FROM "User" WHERE id = ANY($1)`, [allUserIds]);

    // Reaktiviere Triggers am Ende der Transaktion (nur wenn vorher deaktiviert)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'DEFAULT');
    }
  });

  await ctx.prisma.$disconnect();
}

/**
 * Cleanup fuer einzelnen Test (afterEach).
 *
 * Loescht Einsatz-Daten aber behaelt Test-Users.
 * Cleared auch den Event Publisher Spy.
 *
 * Verwendet eine interaktive Transaktion, um sicherzustellen, dass
 * SET session_replication_role auf derselben Verbindung wie die DELETEs läuft.
 *
 * @param ctx - E2E Test Context
 */
export async function cleanupTestData(ctx: EinsatzE2eTestContext): Promise<void> {
  ctx.eventPublisher.clear();

  const allUserIds = [ctx.testUserIds.user, ctx.testUserIds.admin, ctx.testUserIds.superAdmin];

  // Also include 'admin' user created by HTTP tests (not in ctx.testUserIds)
  // Get admin user ID(s) by username pattern
  const adminUsers = (await ctx.prisma.$queryRaw`
    SELECT id FROM "User" WHERE username = 'admin' OR username LIKE 'admin_%'
  `) as { id: string }[];
  const adminUserIds = adminUsers.map((u) => u.id);
  const allCleanupUserIds = [...allUserIds, ...adminUserIds];

  // Prüfe SUPERUSER-Rechte AUSSERHALB der Transaction (bricht nichts ab bei Fehler)
  const hasSuperuserPrivileges = await checkSuperuserPrivileges(ctx.prisma);

  // Interaktive Transaktion stellt sicher, dass session_replication_role
  // auf derselben Verbindung wie alle DELETEs ausgeführt wird
  await ctx.prisma.$transaction(async (tx) => {
    // Triggers deaktivieren (nur wenn SUPERUSER-Rechte vorhanden)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'replica');
    }

    // Reihenfolge (FK Order!): Lagekarten -> ETB -> Outbox -> Einsaetze
    // (Users bleiben erhalten!)

    // Lagekarten Dependencies (safe delete - tables may not exist yet)
    await safeDelete(tx, `DELETE FROM lagekarten_pois WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_aktualisierungen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_versionen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_snapshots WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten_eintraege WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM lagekarten WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allCleanupUserIds]);

    // ETB Dependencies
    await safeDelete(tx, `DELETE FROM etb_snapshots WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM etb_eintraege WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1)))`, [
      allCleanupUserIds,
    ]);
    await safeDelete(tx, `DELETE FROM einsatztagebuecher WHERE "einsatzId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allCleanupUserIds]);

    // Outbox Events
    await safeDelete(tx, `DELETE FROM outbox_events WHERE "aggregateId" IN (SELECT id FROM einsaetze WHERE "createdBy" = ANY($1))`, [allCleanupUserIds]);

    // Einsaetze
    await safeDelete(tx, `DELETE FROM einsaetze WHERE "createdBy" = ANY($1)`, [allCleanupUserIds]);

    // Reaktiviere Triggers am Ende der Transaktion (nur wenn vorher deaktiviert)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'DEFAULT');
    }
  });
}

// ============================================
// SERVER ACCESS TOKEN HELPER
// ============================================

/**
 * Interner Helper: Erstellt einen ServerAccessToken fuer E2E Tests.
 *
 * Wird von createEinsatzE2eModule() intern aufgerufen um SetupPendingGuard
 * zu erfuellen. Der Guard prueft: hasAdmin && hasActiveToken.
 *
 * @param prisma - PrismaClient Instanz
 * @param testRunId - Unique Test Run ID
 * @returns Token ID und Klartext-Token
 */
async function createServerAccessTokenHelper(prisma: TestPrismaService, testRunId: string): Promise<{ id: string; rawToken: string }> {
  // AccessTokenId Format: blh_ (4 Zeichen) + cuid2 (24 Zeichen) = 28 Zeichen
  const cuid = createId();
  const id = `blh_${cuid}`;
  const rawToken = `blh_test_${createId()}`;
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);

  await prisma.$executeRaw`
    INSERT INTO "server_access_tokens" (id, "tokenHash", name, "isRevoked", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${tokenHash},
      ${`test_einsatz_e2e_token_${testRunId}`},
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;

  return { id, rawToken };
}

/**
 * Exportierte Helper-Funktion: Erstellt einen ServerAccessToken fuer E2E Tests.
 *
 * Nuetzlich wenn ein Test einen zusaetzlichen Token benoetigt (z.B. fuer
 * Multi-Token-Tests oder um einen separaten Token zu erstellen/deaktivieren).
 *
 * @param ctx - E2E Test Context
 * @param options - Optionale Token-Konfiguration
 * @returns Token ID und Klartext-Token
 *
 * @example
 * ```typescript
 * it('should handle multiple tokens', async () => {
 *   const token1 = ctx.serverAccessToken; // Bereits erstellt
 *   const token2 = await createTestServerAccessToken(ctx, { name: 'second-token' });
 *   // ... test logic
 * });
 * ```
 */
export async function createTestServerAccessToken(
  ctx: EinsatzE2eTestContext,
  options?: {
    name?: string;
    expiresAt?: Date | null;
    isRevoked?: boolean;
  },
): Promise<{ id: string; rawToken: string; tokenHash: string }> {
  const cuid = createId();
  const id = `blh_${cuid}`;
  const rawToken = `blh_test_${createId()}`;
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);

  await ctx.prisma.$executeRaw`
    INSERT INTO "server_access_tokens" (id, "tokenHash", name, "expiresAt", "isRevoked", "revokedAt", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${tokenHash},
      ${options?.name ?? `test_einsatz_e2e_token_${ctx.testRunId}_${Date.now()}`},
      ${options?.expiresAt ?? null},
      ${options?.isRevoked ?? false},
      ${options?.isRevoked ? new Date() : null},
      NOW(),
      NOW()
    )
  `;

  return { id, rawToken, tokenHash };
}

// ============================================
// TEST HELPERS
// ============================================

/**
 * Optionen fuer Test-Einsatz Erstellung.
 */
export interface CreateTestEinsatzOptions {
  /** Einsatz Status (default: ANGELEGT) */
  status?: 'ANGELEGT' | 'IN_BEARBEITUNG' | 'ABGESCHLOSSEN' | 'ARCHIVIERT';
  /** User ID der den Einsatz erstellt (default: ctx.testUserIds.user) */
  createdBy?: string;
  /** Alarmstichwort (default: generiert) */
  alarmstichwort?: string;
  /** archivedAt Timestamp (nur fuer ARCHIVIERT, default: NOW) */
  archivedAt?: Date;
}

/**
 * Helper: Erstellt einen neuen Test-Einsatz.
 *
 * Nuetzlich wenn ein Test einen separaten Einsatz benoetigt.
 * Verwendet standardmaessig den testUserIds.user aus dem Context fuer createdBy/updatedBy.
 *
 * @param ctx - E2E Test Context
 * @param options - Optionale Einsatz-Konfiguration
 * @returns ID des erstellten Einsatzes (CUID2 Format)
 *
 * @example
 * ```typescript
 * it('should work with separate Einsatz', async () => {
 *   const separateEinsatzId = await createTestEinsatz(ctx, {
 *     status: 'IN_BEARBEITUNG',
 *     createdBy: ctx.testUserIds.admin,
 *   });
 *   // ... test logic
 * });
 * ```
 */
export async function createTestEinsatz(ctx: EinsatzE2eTestContext, options?: CreateTestEinsatzOptions): Promise<string> {
  const einsatzId = generateTestId();
  const createdBy = options?.createdBy ?? ctx.testUserIds.user;
  const status = options?.status ?? 'ANGELEGT';
  const alarmstichwort = options?.alarmstichwort ?? `TEST - Einsatz E2E ${ctx.testRunId}-${Date.now()}`;

  // Determine archivedAt timestamp (only for ARCHIVIERT status)
  let archivedAt: Date | null = null;
  let archivedBy: string | null = null;

  if (status === 'ARCHIVIERT') {
    archivedAt = options?.archivedAt ?? new Date();
    archivedBy = createdBy; // Same user who created it
  }

  const nummer = `E2026-E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await ctx.prisma.$executeRaw`
    INSERT INTO einsaetze (id, alarmstichwort, einsatzort, nummer, status, "createdBy", "updatedBy", "archivedAt", "archivedBy", "createdAt", "updatedAt")
    VALUES (
      ${einsatzId},
      ${alarmstichwort},
      'Test-Einsatzort',
      ${nummer},
      ${status}::"EinsatzStatus",
      ${createdBy},
      ${createdBy},
      ${archivedAt},
      ${archivedBy},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;
  return einsatzId;
}

/**
 * Helper: Erstellt einen neuen Test-User mit spezifischer Rolle.
 *
 * Nuetzlich wenn ein Test zusaetzliche User mit bestimmten Rollen benoetigt.
 *
 * @param ctx - E2E Test Context
 * @param role - User Rolle (USER, ADMIN, SUPER_ADMIN)
 * @param username - Optionaler Username (default: generiert)
 * @returns ID des erstellten Users (CUID2 Format)
 *
 * @example
 * ```typescript
 * it('should handle multiple users', async () => {
 *   const extraAdminId = await createTestUser(ctx, 'ADMIN');
 *   // ... test logic
 * });
 * ```
 */
export async function createTestUser(ctx: EinsatzE2eTestContext, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN', username?: string): Promise<string> {
  const userId = generateTestId();
  const generatedUsername = username ?? `test_einsatz_e2e_${role.toLowerCase()}_${ctx.testRunId}_${Date.now()}`;

  await ctx.prisma.$executeRaw`
    INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
    VALUES (
      ${userId},
      ${generatedUsername},
      'dummy-hash',
      ${role}::"UserRole",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING
  `;
  return userId;
}

/**
 * Optionen fuer Test-Outbox-Event Erstellung.
 */
export interface CreateTestOutboxEventOptions {
  /** Event Name (default: 'test.event') */
  eventName?: string;
  /** Aggregate ID (default: generiert) */
  aggregateId?: string;
  /** Event Status (default: PENDING) */
  status?: 'PENDING' | 'PUBLISHED' | 'FAILED';
  /** Retry Count (default: 0) */
  retryCount?: number;
  /** Event Payload (default: {}) */
  payload?: Record<string, unknown>;
}

/**
 * Helper: Erstellt ein Test-Outbox-Event.
 *
 * Nuetzlich fuer Outbox Integration Tests.
 *
 * @param ctx - E2E Test Context
 * @param options - Optionale Event-Konfiguration
 * @returns ID des erstellten Outbox Events (CUID2 Format)
 *
 * @example
 * ```typescript
 * it('should publish pending outbox events', async () => {
 *   const eventId = await createTestOutboxEvent(ctx, {
 *     eventName: 'einsatz.created',
 *     status: 'PENDING',
 *   });
 *   // ... test logic
 * });
 * ```
 */
export async function createTestOutboxEvent(ctx: EinsatzE2eTestContext, options?: CreateTestOutboxEventOptions): Promise<string> {
  const eventId = generateTestId();
  const eventName = options?.eventName ?? 'test.event';
  const aggregateId = options?.aggregateId ?? generateTestId();
  const status = options?.status ?? 'PENDING';
  const retryCount = options?.retryCount ?? 0;
  const innerPayload = options?.payload ?? {};

  // Wrap innerPayload in SerializedEvent structure
  // Der EventDeserializer erwartet: { eventId, eventName, eventVersion, occurredAt, aggregateId?, payload }
  const serializedEvent = {
    eventId,
    eventName,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    aggregateId,
    payload: innerPayload,
  };

  await ctx.prisma.$executeRaw`
    INSERT INTO outbox_events (id, "eventName", "aggregateId", payload, status, "retryCount", "createdAt", "occurredAt", "eventVersion")
    VALUES (
      ${eventId},
      ${eventName},
      ${aggregateId},
      ${JSON.stringify(serializedEvent)}::jsonb,
      ${status}::"OutboxEventStatus",
      ${retryCount},
      NOW(),
      NOW(),
      1
    )
  `;
  return eventId;
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
 *     const events = ctx.eventPublisher.getEventsByName('einsatz.created');
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

/**
 * Helper: Cleanup fuer spezifischen Einsatz (inkl. Dependencies).
 *
 * Loescht einen Einsatz und alle abhaengigen Daten (Lagekarte, ETB, Outbox).
 * Nuetzlich fuer gezieltes Cleanup in Tests.
 *
 * @param ctx - E2E Test Context
 * @param einsatzId - ID des zu loeschenden Einsatzes
 *
 * @example
 * ```typescript
 * it('should clean up after test', async () => {
 *   const einsatzId = await createTestEinsatz(ctx);
 *   // ... test logic
 *   await cleanupEinsatzById(ctx, einsatzId);
 * });
 * ```
 */
export async function cleanupEinsatzById(ctx: EinsatzE2eTestContext, einsatzId: string): Promise<void> {
  // Prüfe SUPERUSER-Rechte AUSSERHALB der Transaction (bricht nichts ab bei Fehler)
  const hasSuperuserPrivileges = await checkSuperuserPrivileges(ctx.prisma);

  // Interaktive Transaktion stellt sicher, dass session_replication_role
  // auf derselben Verbindung wie alle DELETEs ausgeführt wird
  await ctx.prisma.$transaction(async (tx) => {
    // Triggers deaktivieren (nur wenn SUPERUSER-Rechte vorhanden)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'replica');
    }

    // Reihenfolge (FK Order!): Lagekarten -> ETB -> Outbox -> Einsatz

    // Lagekarten Dependencies (safe delete - tables may not exist yet)
    await safeDelete(tx, `DELETE FROM lagekarten_pois WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM lagekarten_aktualisierungen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM lagekarten_versionen WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM lagekarten_snapshots WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM lagekarten_eintraege WHERE "lagekarteId" IN (SELECT id FROM lagekarten WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM lagekarten WHERE "einsatzId" = $1`, [einsatzId]);

    // ETB Dependencies
    await safeDelete(tx, `DELETE FROM etb_snapshots WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM etb_eintraege WHERE "etbId" IN (SELECT id FROM einsatztagebuecher WHERE "einsatzId" = $1)`, [einsatzId]);
    await safeDelete(tx, `DELETE FROM einsatztagebuecher WHERE "einsatzId" = $1`, [einsatzId]);

    // Outbox Events
    await safeDelete(tx, `DELETE FROM outbox_events WHERE "aggregateId" = $1`, [einsatzId]);

    // Einsatz
    await safeDelete(tx, `DELETE FROM einsaetze WHERE id = $1`, [einsatzId]);

    // Reaktiviere Triggers am Ende der Transaktion (nur wenn vorher deaktiviert)
    if (hasSuperuserPrivileges) {
      await setReplicationRole(tx, 'DEFAULT');
    }
  });
}

// ============================================
// E2E TEST TEMPLATE DOCUMENTATION
// ============================================

/**
 * Template fuer Einsatz E2E Tests.
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
 * - RBAC Testing mit verschiedenen User-Rollen (USER, ADMIN, SUPER_ADMIN)
 *
 * @example
 * ```typescript
 * describe('Einsatz CQRS API - E2E Tests', () => {
 *   let ctx: EinsatzE2eTestContext;
 *
 *   beforeAll(async () => {
 *     ctx = await createEinsatzE2eModule();
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
 *   describe('Create Einsatz', () => {
 *     it('should create Einsatz successfully', async () => {
 *       // Given
 *       const command = CreateEinsatzCommand.create({
 *         alarmstichwort: 'Brand',
 *         einsatzort: 'Hauptstraße 1',
 *       }, ctx.testUserIds.user).value!;
 *
 *       // When
 *       const result = await createHandler.execute(command);
 *
 *       // Then
 *       expect(result.isSuccess).toBe(true);
 *       const einsatz = await ctx.repository.findById(result.value!);
 *       expect(einsatz).not.toBeNull();
 *       expect(einsatz!.status.value).toBe('ANGELEGT');
 *     });
 *
 *     it('should emit einsatz.created event', async () => {
 *       // Given
 *       const command = CreateEinsatzCommand.create({
 *         alarmstichwort: 'Brand',
 *       }, ctx.testUserIds.user).value!;
 *
 *       // When
 *       await createHandler.execute(command);
 *
 *       // Then
 *       await waitFor(async () => {
 *         const events = ctx.eventPublisher.getEventsByName('einsatz.created');
 *         expect(events).toHaveLength(1);
 *       });
 *     });
 *   });
 *
 *   describe('RBAC Authorization', () => {
 *     it('should allow ADMIN to archive Einsatz', async () => {
 *       // Given: Einsatz created by USER
 *       const einsatzId = await createTestEinsatz(ctx, {
 *         createdBy: ctx.testUserIds.user,
 *       });
 *
 *       // When: ADMIN archives
 *       const command = ArchiveEinsatzCommand.create(einsatzId, ctx.testUserIds.admin).value!;
 *       const result = await archiveHandler.execute(command);
 *
 *       // Then
 *       expect(result.isSuccess).toBe(true);
 *     });
 *
 *     it('should deny USER to archive other users Einsatz', async () => {
 *       // Given: Einsatz created by ADMIN
 *       const einsatzId = await createTestEinsatz(ctx, {
 *         createdBy: ctx.testUserIds.admin,
 *       });
 *
 *       // When: USER tries to archive
 *       const command = ArchiveEinsatzCommand.create(einsatzId, ctx.testUserIds.user).value!;
 *       const result = await archiveHandler.execute(command);
 *
 *       // Then
 *       expect(result.isFailure).toBe(true);
 *       expect(result.error).toContain('Unauthorized');
 *     });
 *   });
 *
 *   describe('Outbox Integration', () => {
 *     it('should store events in outbox', async () => {
 *       // Given
 *       const command = CreateEinsatzCommand.create({
 *         alarmstichwort: 'Brand',
 *       }, ctx.testUserIds.user).value!;
 *
 *       // When
 *       await createHandler.execute(command);
 *
 *       // Then
 *       const pendingEvents = await ctx.outboxRepository.findPendingEvents(10);
 *       expect(pendingEvents.length).toBeGreaterThan(0);
 *       expect(pendingEvents[0].eventName).toBe('einsatz.created');
 *     });
 *   });
 * });
 * ```
 */
export const E2E_TEST_TEMPLATE_DOCUMENTATION = 'See JSDoc above for E2E test template';
