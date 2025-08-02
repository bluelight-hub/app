import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Test-Datenbank-Utilities
 *
 * Hilfsfunktionen für das Management der Test-Datenbank während E2E-Tests.
 * Nutzt Testcontainers für automatische PostgreSQL-Container-Verwaltung.
 */
export class TestDbUtils {
  private static prisma: PrismaClient;
  private static container: StartedPostgreSqlContainer;
  private static databaseUrl: string;

  /**
   * Startet einen PostgreSQL-Container für Tests
   *
   * @returns Database URL für den gestarteten Container
   */
  static async startContainer(): Promise<string> {
    if (this.container) {
      return this.databaseUrl;
    }

    console.log('Starting PostgreSQL test container...');

    this.container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('bluelight_test')
      .withUsername('test')
      .withPassword('test')
      .withExposedPorts(5432)
      .start();

    this.databaseUrl = `postgresql://${this.container.getUsername()}:${this.container.getPassword()}@${this.container.getHost()}:${this.container.getMappedPort(5432)}/${this.container.getDatabase()}`;

    // Setze DATABASE_URL für Prisma
    process.env.DATABASE_URL = this.databaseUrl;

    console.log('PostgreSQL test container started successfully');
    return this.databaseUrl;
  }

  /**
   * Stoppt den PostgreSQL-Container
   */
  static async stopContainer(): Promise<void> {
    if (this.container) {
      console.log('Stopping PostgreSQL test container...');
      await this.container.stop();
      this.container = null;
      this.databaseUrl = null;
    }
  }

  /**
   * Initialisiert die Prisma-Client-Instanz
   */
  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.databaseUrl || process.env.DATABASE_URL,
          },
        },
      });
    }
    return this.prisma;
  }

  /**
   * Führt Datenbank-Migrationen aus
   *
   * Wendet alle ausstehenden Migrationen auf die Test-Datenbank an.
   */
  static async runMigrations(): Promise<void> {
    if (!this.databaseUrl) {
      throw new Error('Database container not started. Call startContainer() first.');
    }

    try {
      console.log('Running database migrations...');
      execSync('pnpm prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: this.databaseUrl,
        },
        stdio: 'pipe', // Unterdrücke Output für sauberere Test-Logs
      });
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Löscht alle Daten aus der Datenbank
   *
   * Entfernt alle Datensätze aus allen Tabellen in der richtigen Reihenfolge,
   * um Foreign Key Constraints zu respektieren.
   */
  static async cleanDatabase(): Promise<void> {
    const prisma = this.getPrisma();

    try {
      // Lösche alle Daten in der richtigen Reihenfolge (abhängige Tabellen zuerst)
      // Füge hier weitere Tabellen hinzu, wenn das Schema erweitert wird
      await prisma.user.deleteMany();
    } catch (error) {
      console.error('Failed to clean database:', error);
      throw error;
    }
  }

  /**
   * Setzt die Datenbank zurück (clean + seed)
   *
   * Löscht alle Daten und fügt optional Seed-Daten ein.
   */
  static async resetDatabase(): Promise<void> {
    await this.cleanDatabase();
    // Optional: Seed-Daten einfügen
    // await this.seedDatabase();
  }

  /**
   * Fügt Seed-Daten für Tests ein
   *
   * Erstellt Standarddaten, die für Tests benötigt werden.
   */
  static async seedDatabase(): Promise<void> {
    const prisma = this.getPrisma();

    try {
      // Beispiel: Erstelle Test-Benutzer
      await prisma.user.create({
        data: {
          username: 'test_admin',
          role: 'SUPER_ADMIN',
        },
      });

      await prisma.user.create({
        data: {
          username: 'test_user',
          role: 'USER',
        },
      });
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Schließt die Datenbankverbindung
   */
  static async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }

  /**
   * Erstellt einen Transaktions-Wrapper für Tests
   *
   * Führt den Test in einer Transaktion aus und macht alle Änderungen
   * am Ende rückgängig.
   *
   * @param testFn Die Test-Funktion, die in der Transaktion ausgeführt wird
   */
  static async runInTransaction<T>(testFn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    const prisma = this.getPrisma();

    return prisma
      .$transaction(async (tx) => {
        const _result = await testFn(tx as PrismaClient);
        // Transaktion wird automatisch zurückgerollt, wenn ein Fehler geworfen wird
        throw new Error('Rollback transaction');
      })
      .catch((error) => {
        if (error.message === 'Rollback transaction') {
          return null;
        }
        throw error;
      });
  }

  /**
   * Initialisiert die Test-Datenbank
   *
   * Startet Container, führt Migrationen aus und stellt Verbindung her.
   */
  static async initialize(): Promise<void> {
    await this.startContainer();
    await this.runMigrations();

    // Stelle sicher, dass Prisma verbunden ist
    const prisma = this.getPrisma();
    await prisma.$connect();
  }
}
