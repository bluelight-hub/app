import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Test-Datenbank-Utilities
 *
 * Hilfsfunktionen für das Management der Test-Datenbank während E2E-Tests.
 * Nutzt Testcontainers für automatische PostgreSQL-Container-Verwaltung.
 */

let prisma: PrismaClient | null = null;
let container: StartedPostgreSqlContainer | null = null;
let databaseUrl: string | null = null;

/**
 * Startet einen PostgreSQL-Container für Tests
 *
 * @returns Database URL für den gestarteten Container
 */
export async function startContainer(): Promise<string> {
  if (container && databaseUrl) {
    return databaseUrl;
  }

  console.log('Starting PostgreSQL test container...');

  container = await new PostgreSqlContainer('postgres:17-alpine').withDatabase('bluelight_test').withUsername('test').withPassword('test').withExposedPorts(5432).start();

  databaseUrl = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(5432)}/${container.getDatabase()}`;

  // Setze DATABASE_URL für Prisma
  process.env.DATABASE_URL = databaseUrl;

  console.log('PostgreSQL test container started successfully');
  return databaseUrl;
}

/**
 * Stoppt den PostgreSQL-Container
 */
export async function stopContainer(): Promise<void> {
  if (container) {
    console.log('Stopping PostgreSQL test container...');
    await container.stop();
    container = null;
    databaseUrl = null;
  }
}

/**
 * Initialisiert die Prisma-Client-Instanz
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl || process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

/**
 * Führt Prisma-Migrationen aus
 */
export async function runMigrations(): Promise<void> {
  if (!databaseUrl) {
    throw new Error('Database container not started. Call startContainer() first.');
  }

  console.log('Running Prisma migrations...');
  execSync('pnpm exec prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
  console.log('Migrations completed');
}

/**
 * Setzt die Datenbank zurück (löscht alle Daten)
 */
export async function resetDatabase(): Promise<void> {
  const prismaClient = getPrisma();

  // Lösche alle Daten in der richtigen Reihenfolge (wegen Foreign Keys)
  await prismaClient.user.deleteMany();

  console.log('Database reset completed');
}

/**
 * Löscht Test-Benutzer anhand von Präfix-Mustern
 *
 * @param prefixes Array von Benutzernamen-Präfixen die gelöscht werden sollen
 */
export async function cleanTestUsers(prefixes: string[]): Promise<void> {
  const prismaClient = getPrisma();

  for (const prefix of prefixes) {
    try {
      const result = await prismaClient.user.deleteMany({
        where: {
          username: {
            startsWith: prefix,
          },
        },
      });
      if (result.count > 0) {
        console.log(`Cleaned ${result.count} test users with prefix: ${prefix}`);
      }
    } catch (error) {
      console.error(`Error cleaning test users with prefix ${prefix}:`, error);
    }
  }
}

/**
 * Prüft ob ein Benutzer in der Datenbank existiert
 *
 * @param username Benutzername
 * @returns true wenn der Benutzer existiert
 */
export async function userExists(username: string): Promise<boolean> {
  const prismaClient = getPrisma();
  const user = await prismaClient.user.findUnique({
    where: { username },
  });
  return !!user;
}

/**
 * Holt einen Benutzer aus der Datenbank
 *
 * @param username Benutzername
 * @returns User-Objekt oder null
 */
export async function getUser(username: string) {
  const prismaClient = getPrisma();
  return prismaClient.user.findUnique({
    where: { username },
  });
}

/**
 * Erstellt einen Admin-Benutzer direkt in der Datenbank
 *
 * @param username Admin-Benutzername
 * @param passwordHash Gehashtes Passwort
 * @returns Erstellter Admin-User
 */
export async function createAdminUser(username: string, passwordHash: string) {
  const prismaClient = getPrisma();
  return prismaClient.user.create({
    data: {
      username,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
}

/**
 * Zählt alle Benutzer in der Datenbank
 *
 * @returns Anzahl der Benutzer
 */
export async function countUsers(): Promise<number> {
  const prismaClient = getPrisma();
  return prismaClient.user.count();
}

/**
 * Löscht einen spezifischen Benutzer
 *
 * @param username Benutzername
 */
export async function deleteUser(username: string): Promise<void> {
  const prismaClient = getPrisma();
  await prismaClient.user.delete({
    where: { username },
  });
}

/**
 * Aktualisiert die Rolle eines Benutzers
 *
 * @param username Benutzername
 * @param role Neue Rolle
 */
export async function updateUserRole(username: string, role: string) {
  const prismaClient = getPrisma();
  return prismaClient.user.update({
    where: { username },
    data: { role },
  });
}

/**
 * Holt alle Benutzer aus der Datenbank
 *
 * @returns Array aller Benutzer
 */
export async function getAllUsers() {
  const prismaClient = getPrisma();
  return prismaClient.user.findMany();
}

/**
 * Initialisiert die Test-Datenbank komplett (Container + Migrationen)
 *
 * @returns Database URL
 */
export async function initTestDatabase(): Promise<string> {
  const url = await startContainer();
  await runMigrations();
  return url;
}

/**
 * Beendet die Test-Datenbank komplett
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  await stopContainer();
}

/**
 * Wartet bis die Datenbank bereit ist
 *
 * @param maxRetries Maximale Anzahl von Versuchen
 * @param delayMs Verzögerung zwischen Versuchen in Millisekunden
 */
export async function waitForDatabase(maxRetries = 10, delayMs = 1000): Promise<void> {
  const prismaClient = getPrisma();

  for (let i = 0; i < maxRetries; i++) {
    try {
      await prismaClient.$connect();
      console.log('Database connection established');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Führt ein Datenbank-Seeding aus
 *
 * @param seedData Optionale Seed-Daten
 */
export async function seedDatabase(seedData?: { users?: Array<{ username: string; role?: string }> }): Promise<void> {
  const prismaClient = getPrisma();

  if (seedData?.users) {
    for (const userData of seedData.users) {
      await prismaClient.user.create({
        data: {
          username: userData.username,
          role: userData.role || 'USER',
          isActive: true,
        },
      });
    }
  }
}

/**
 * Führt Prisma Studio für Debugging aus
 */
export function openPrismaStudio(): void {
  console.log('Opening Prisma Studio...');
  execSync('pnpm exec prisma studio', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl || process.env.DATABASE_URL,
    },
    stdio: 'inherit',
  });
}

/**
 * Verbindet zur Datenbank
 */
export async function connectDatabase(): Promise<void> {
  const prismaClient = getPrisma();
  await prismaClient.$connect();
}

// Export für Backward Compatibility
export const TestDbUtils = {
  startContainer,
  stopContainer,
  getPrisma,
  runMigrations,
  resetDatabase,
  cleanTestUsers,
  userExists,
  getUser,
  createAdminUser,
  countUsers,
  deleteUser,
  updateUserRole,
  getAllUsers,
  initTestDatabase,
  teardownTestDatabase,
  waitForDatabase,
  seedDatabase,
  openPrismaStudio,
  connectDatabase,
};
