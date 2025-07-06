import { EinsatzService } from '@/modules/einsatz/einsatz.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { RetryConfig } from '@/common/utils/retry.util';
import { DatabaseCheckService } from './database-check.service';
import { Permission, UserRole } from '@prisma/generated/prisma/enums';
import * as bcrypt from 'bcrypt';
import { DefaultRolePermissions } from '@/modules/auth/constants';

/**
 * Service zum Seeden der Datenbank mit initialen Daten.
 * Unterstützt Transaktionen, Fehlerbehandlung und umgebungsspezifische Konfiguration.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly databaseCheckService: DatabaseCheckService,
    private readonly einsatzService: EinsatzService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  /**
   * Führt den Seeding-Prozess mit Transaktionen und umgebungsspezifischem Error Handling aus.
   *
   * @param seedFunction Die auszuführende Seed-Funktion
   * @param retryConfig Optionale Retry-Konfiguration
   * @returns true, wenn der Seed-Prozess erfolgreich war, sonst false
   */
  async executeWithTransaction<T>(
    seedFunction: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>,
  ): Promise<boolean> {
    try {
      await this.errorHandlingService.executeWithErrorHandling(
        async () => {
          // Transaktion starten
          return await this.prisma.$transaction(
            async () => {
              // Seed-Funktion ausführen
              return await seedFunction();
            },
            {
              // PostgreSQL-spezifische Transaktionsoptionen
              timeout: this.errorHandlingService.getConfig().operationTimeout,
              isolationLevel: 'Serializable', // Höchstes Isolationslevel für Konsistenz
            },
          );
        },
        'seed-transaction',
        { seedFunction: seedFunction.name }, // Daten für Duplicate Detection
        retryConfig,
      );

      this.logger.log('Seed-Transaktion erfolgreich abgeschlossen');
      return true;
    } catch (error) {
      // Spezielle Behandlung für Unique Constraint Violations
      if (error.code === '23505' || error.code === 'P2002') {
        this.logger.warn('Seed-Prozess abgebrochen: Datensatz existiert bereits');
        return false;
      }

      this.logger.error('Seed-Prozess nach allen Wiederholungsversuchen fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Erstellt einen initialen Einsatz, wenn keiner existiert.
   *
   * @param name Name des zu erstellenden Einsatzes
   * @param beschreibung Optionale Beschreibung
   * @returns Der erstellte Einsatz oder null bei Fehler
   */
  async seedInitialEinsatz(name: string, beschreibung?: string) {
    // Prüfen, ob bereits Einsätze existieren
    const einsatzCount = await this.prisma.einsatz.count();
    if (einsatzCount > 0) {
      this.logger.log('Einsätze bereits vorhanden, überspringe Seed');
      return null;
    }

    // Seed in einer Transaktion ausführen mit spezieller Retry-Konfiguration
    const retryConfig: Partial<RetryConfig> = {
      maxRetries: 5, // Mehr Versuche für kritische Seed-Operationen
      baseDelay: 1000, // Längere Basis-Verzögerung
      maxDelay: 15000, // Höhere maximale Verzögerung
      jitterFactor: 0.2, // Mehr Jitter für bessere Verteilung
    };

    const success = await this.executeWithTransaction(async () => {
      this.logger.log(`Erstelle initialen Einsatz: ${name}`);

      const einsatz = await this.einsatzService.create({
        name,
        beschreibung,
      });

      this.logger.log(`Einsatz erstellt mit ID: ${einsatz.id}`);
      return einsatz;
    }, retryConfig);

    if (!success) {
      this.logger.error('Fehler beim Erstellen des initialen Einsatzes');
      return null;
    }

    return await this.prisma.einsatz.findFirst({
      where: { name },
    });
  }

  /**
   * Erstellt einen Einsatz mit umgebungsspezifischem Error Handling und Duplicate Detection für Race Conditions.
   * Verhindert das Erstellen neuer Einsätze, wenn bereits ein Einsatz existiert (für initiales Seeding).
   *
   * @param name Name des zu erstellenden Einsatzes
   * @param beschreibung Optionale Beschreibung
   * @returns Der erstellte oder bereits existierende Einsatz, oder null wenn bereits Einsätze existieren
   */
  async createEinsatzWithRetry(name: string, beschreibung?: string) {
    // Verwende umgebungsspezifische Konfiguration
    const customRetryConfig: Partial<RetryConfig> = {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      jitterFactor: 0.15,
    };

    return await this.errorHandlingService.executeWithErrorHandling(
      async () => {
        // Prüfen ob bereits IRGENDEIN Einsatz existiert (für initiales Seeding)
        const einsatzCount = await this.prisma.einsatz.count();
        if (einsatzCount > 0) {
          this.logger.log('Es existiert bereits ein Einsatz, Seeding wird übersprungen');
          return null;
        }

        // Zuerst prüfen, ob der Einsatz bereits existiert
        const existingEinsatz = await this.prisma.einsatz.findFirst({
          where: { name },
        });

        if (existingEinsatz) {
          this.logger.log(`Einsatz "${name}" existiert bereits, verwende existierenden`);
          return existingEinsatz;
        }

        // Neuen Einsatz erstellen
        try {
          // Validiere Operation mit umgebungsspezifischen Regeln
          this.errorHandlingService.validateOperation({ name, beschreibung }, 'create-einsatz');

          const einsatz = await this.einsatzService.create({
            name,
            beschreibung,
          });

          this.logger.log(`Neuen Einsatz erstellt: ${name} (ID: ${einsatz.id})`);
          return einsatz;
        } catch (error) {
          // Bei Unique Constraint Violation, nochmal prüfen ob der Einsatz inzwischen existiert
          if (error.code === '23505' || error.code === 'P2002') {
            const existingAfterError = await this.prisma.einsatz.findFirst({
              where: { name },
            });

            if (existingAfterError) {
              this.logger.log(`Einsatz "${name}" wurde parallel erstellt, verwende existierenden`);
              return existingAfterError;
            }
          }

          throw error;
        }
      },
      `create-einsatz-${name}`,
      { name, beschreibung }, // Daten für Duplicate Detection
      customRetryConfig,
    );
  }

  /**
   * Erstellt einen Einsatz mit PostgreSQL ON CONFLICT Handling und umgebungsspezifischem Error Handling
   *
   * @param name Name des zu erstellenden Einsatzes
   * @param beschreibung Optionale Beschreibung
   * @returns Der erstellte oder bereits existierende Einsatz
   */
  async createEinsatzWithUpsert(name: string, beschreibung?: string) {
    return await this.errorHandlingService.executeWithErrorHandling(
      async () => {
        // Validiere Operation mit umgebungsspezifischen Regeln
        this.errorHandlingService.validateOperation({ name, beschreibung }, 'create-einsatz');

        // Verwende PostgreSQL's ON CONFLICT für atomare Upsert-Operation
        const result = await this.prisma.$queryRaw`
                    INSERT INTO "Einsatz" (id, name, beschreibung, "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), ${name}, ${beschreibung || null}, NOW(), NOW()) ON CONFLICT (name) 
                    DO
                    UPDATE SET
                        beschreibung = COALESCE (EXCLUDED.beschreibung, "Einsatz".beschreibung),
                        "updatedAt" = NOW()
                        RETURNING *;
                `;

        const einsatz = Array.isArray(result) ? result[0] : result;
        this.logger.log(`Einsatz upserted: ${name} (ID: ${einsatz.id})`);

        return einsatz;
      },
      `upsert-einsatz-${name}`,
      { name, beschreibung },
    );
  }

  /**
   * Gibt Cache-Statistiken der Duplicate Detection zurück
   */
  getDuplicateDetectionStats() {
    return this.errorHandlingService.getDuplicateDetectionStats();
  }

  /**
   * Gibt Error Handling Metriken zurück
   */
  getErrorMetrics() {
    return this.errorHandlingService.getMetrics();
  }

  /**
   * Gibt die aktuelle umgebungsspezifische Konfiguration zurück
   */
  getConfig() {
    return this.errorHandlingService.getConfig();
  }

  /**
   * Bereinigt Ressourcen (für Tests oder Shutdown)
   */
  cleanup() {
    this.errorHandlingService.cleanup();
  }

  /**
   * Initialisiert die Rollen-Berechtigungen basierend auf der definierten Matrix.
   *
   * @returns true, wenn erfolgreich, sonst false
   */
  async seedRolePermissions(): Promise<boolean> {
    const retryConfig: Partial<RetryConfig> = {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
    };

    return await this.executeWithTransaction(async () => {
      this.logger.log('Erstelle Rollen-Berechtigungen...');

      // Verwende die zentral definierte Permissions-Matrix
      for (const [role, permissions] of Object.entries(DefaultRolePermissions)) {
        this.logger.log(
          `Erstelle Berechtigungen für Rolle ${role}: ${permissions.length} Berechtigungen`,
        );

        for (const permission of permissions) {
          await this.prisma.rolePermission.upsert({
            where: {
              role_permission: {
                role: role as UserRole,
                permission: permission as Permission,
              },
            },
            update: {
              grantedAt: new Date(), // Aktualisiere Zeitstempel bei erneutem Seeding
              grantedBy: null, // Behalte null für System-Berechtigungen
            },
            create: {
              role: role as UserRole,
              permission: permission as Permission,
              grantedBy: null, // System-generierte Berechtigungen haben keinen spezifischen Benutzer
            },
          });
        }
      }

      // Verifiziere die Erstellung
      const totalPermissions = await this.prisma.rolePermission.count();
      this.logger.log(`Rollen-Berechtigungen erfolgreich erstellt. Total: ${totalPermissions}`);

      // Log Zusammenfassung pro Rolle
      for (const role of Object.values(UserRole)) {
        const count = await this.prisma.rolePermission.count({
          where: { role },
        });
        this.logger.log(`  ${role}: ${count} Berechtigungen`);
      }
    }, retryConfig);
  }

  /**
   * Erstellt initiale Benutzer für Entwicklung und Tests.
   *
   * @param password Optionales Passwort für alle Test-Benutzer (Standard: "admin123")
   * @returns true, wenn erfolgreich, sonst false
   */
  async seedUsers(password = 'admin123'): Promise<boolean> {
    try {
      this.logger.log('Erstelle initiale Benutzer...');

      // Passwort-Hash für alle Test-Benutzer
      const passwordHash = await bcrypt.hash(password, 10);
      this.logger.log(`Passwort-Hash erstellt: ${passwordHash.substring(0, 10)}...`);

      // Transaktion für alle Benutzer
      await this.prisma.$transaction(async (tx) => {
        // Super Admin
        const superAdmin = await tx.user.upsert({
          where: { email: 'superadmin@bluelight-hub.com' },
          update: {},
          create: {
            email: 'superadmin@bluelight-hub.com',
            username: 'superadmin',
            passwordHash,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
          },
        });
        this.logger.log(
          `Super Admin erstellt/aktualisiert: ${superAdmin.email} (ID: ${superAdmin.id})`,
        );

        // Admin
        const admin = await tx.user.upsert({
          where: { email: 'admin@bluelight-hub.com' },
          update: {},
          create: {
            email: 'admin@bluelight-hub.com',
            username: 'admin',
            passwordHash,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });
        this.logger.log(`Admin erstellt/aktualisiert: ${admin.email} (ID: ${admin.id})`);

        // Support
        const support = await tx.user.upsert({
          where: { email: 'support@bluelight-hub.com' },
          update: {},
          create: {
            email: 'support@bluelight-hub.com',
            username: 'support',
            passwordHash,
            role: UserRole.SUPPORT,
            isActive: true,
          },
        });
        this.logger.log(`Support erstellt/aktualisiert: ${support.email} (ID: ${support.id})`);

        // Regular User
        const user = await tx.user.upsert({
          where: { email: 'user@bluelight-hub.com' },
          update: {},
          create: {
            email: 'user@bluelight-hub.com',
            username: 'user',
            passwordHash,
            role: UserRole.USER,
            isActive: true,
          },
        });
        this.logger.log(`User erstellt/aktualisiert: ${user.email} (ID: ${user.id})`);
      });

      this.logger.log('Benutzer erfolgreich erstellt');

      // Verifiziere die Erstellung
      const count = await this.prisma.user.count();
      this.logger.log(`Anzahl Benutzer in der Datenbank: ${count}`);

      return true;
    } catch (error) {
      this.logger.error('Fehler beim Erstellen der Benutzer:', error);
      return false;
    }
  }

  /**
   * Führt das komplette Authentication-Seeding durch.
   *
   * @param password Optionales Passwort für Benutzer
   * @returns true, wenn erfolgreich, sonst false
   */
  async seedAuthentication(password?: string): Promise<boolean> {
    this.logger.log('Starte Authentication-Seeding...');

    // Erst Rollen-Berechtigungen
    const permissionsSeeded = await this.seedRolePermissions();
    if (!permissionsSeeded) {
      this.logger.error('Fehler beim Seeden der Rollen-Berechtigungen');
      return false;
    }

    // Dann Benutzer
    const usersSeeded = await this.seedUsers(password);
    if (!usersSeeded) {
      this.logger.warn('Benutzer wurden nicht erstellt (existieren bereits oder Fehler)');
    }

    this.logger.log('Authentication-Seeding abgeschlossen');
    return true;
  }

  // Legacy methods for backwards compatibility
  async seedAdminRolePermissions(): Promise<boolean> {
    return this.seedRolePermissions();
  }

  async seedAdminUsers(password = 'admin123'): Promise<boolean> {
    return this.seedUsers(password);
  }

  async seedAdminAuthentication(password?: string): Promise<boolean> {
    return this.seedAuthentication(password);
  }
}
