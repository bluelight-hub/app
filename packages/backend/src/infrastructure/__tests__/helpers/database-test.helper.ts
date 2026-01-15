/**
 * Database Test Helpers für Integration Tests.
 *
 * Diese Helper-Funktionen ermöglichen graceful Test-Skipping wenn keine
 * PostgreSQL Database verfügbar ist. Verhindert Test-Failures auf macOS
 * wenn PostgreSQL Service nicht läuft.
 *
 * **Verwendung:**
 * ```typescript
 * describe('MyRepository - Integration Tests', () => {
 *   beforeAll(async () => {
 *     const canConnect = await skipIfNoDatabase();
 *     if (!canConnect) {
 *       return; // Skip all tests in this suite
 *     }
 *     // Setup code...
 *   });
 * });
 * ```
 *
 * **Warum graceful skip statt Fehler:**
 * - macOS Development ohne PostgreSQL Service sollte keine Test-Failures verursachen
 * - CI/CD Pipelines haben immer DATABASE_URL gesetzt
 * - Entwickler ohne lokale DB können trotzdem Unit Tests ausführen
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Prüft ob DATABASE_URL gesetzt ist und ob eine Verbindung zur Datenbank möglich ist.
 *
 * Diese Funktion versucht eine Verbindung zur PostgreSQL Datenbank aufzubauen.
 * Falls keine DATABASE_URL vorhanden ist oder die Verbindung fehlschlägt,
 * werden alle Tests in der aktuellen Suite übersprungen.
 *
 * **Use Cases:**
 * - macOS Development: PostgreSQL Service läuft nicht → Tests werden geskippt
 * - CI/CD: DATABASE_URL vorhanden → Tests werden ausgeführt
 * - Docker Setup: PostgreSQL Container läuft → Tests werden ausgeführt
 *
 * **Implementation Notes:**
 * - Verwendet `describe.skip()` Pattern für Suite-Level Skip
 * - Console Warning für Entwickler-Feedback
 * - Schnelle Connection-Probe (5s Timeout)
 * - Cleanup von PrismaClient nach Prüfung
 *
 * @returns Promise<boolean> - true wenn DB verfügbar, false wenn geskippt werden soll
 *
 * @example
 * ```typescript
 * describe('PrismaEinsatzRepository', () => {
 *   beforeAll(async () => {
 *     const canConnect = await skipIfNoDatabase();
 *     if (!canConnect) return;
 *
 *     // Normal setup code...
 *     prisma = new PrismaClient();
 *     repository = new PrismaEinsatzRepository(prisma);
 *   });
 * });
 * ```
 */
export async function skipIfNoDatabase(): Promise<boolean> {
  // AC1: Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set - skipping integration tests. ' + 'Set DATABASE_URL environment variable to run integration tests.');
    return false;
  }

  // AC2: Try to connect to database (with timeout)
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    // Quick connection probe with 5s timeout
    await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 5000))]);

    // Connection successful
    return true;
  } catch (error: unknown) {
    // Connection failed - log warning and skip tests
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Database connection failed - skipping integration tests.
   Error: ${errorMessage}
   Ensure PostgreSQL is running and DATABASE_URL is correct.`);
    return false;
  } finally {
    // Always cleanup PrismaClient
    await prisma.$disconnect();
  }
}

/**
 * Jest Condition für conditional test skipping.
 *
 * Diese Variable wird in beforeAll() gesetzt und kann mit `it.skipIf()`
 * verwendet werden um Tests zu skippen wenn keine DB verfügbar ist.
 *
 * **Verwendung mit it.skipIf():**
 * ```typescript
 * let skipTests = false;
 *
 * beforeAll(async () => {
 *   skipTests = !(await skipIfNoDatabase());
 * });
 *
 * it.skipIf(skipTests)('should do something', async () => {
 *   // Test code...
 * });
 * ```
 *
 * **Alternative: Guard Pattern (empfohlen für Legacy-Tests):**
 * ```typescript
 * let databaseAvailable = false;
 *
 * beforeAll(async () => {
 *   databaseAvailable = await skipIfNoDatabase();
 *   if (!databaseAvailable) return;
 *   // Setup code...
 * });
 *
 * it('should do something', async () => {
 *   if (!databaseAvailable) return;
 *   // Test code...
 * });
 * ```
 */
