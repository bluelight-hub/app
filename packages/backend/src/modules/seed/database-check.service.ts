import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service für die Überprüfung des Datenbankstatus.
 * Bietet Methoden, um die Datenbank auf Existenz von Tabellen und Datensätzen zu prüfen.
 */
@Injectable()
export class DatabaseCheckService {
  private readonly logger = new Logger(DatabaseCheckService.name);
  private readonly queryTimeout = 10000; // 10 Sekunden Timeout für Datenbankabfragen

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Prüft, ob die Datenbank erreichbar ist.
   *
   * @returns true, wenn die Datenbank erreichbar ist, sonst false
   */
  async isDatabaseReachable(): Promise<boolean> {
    try {
      // Einfache Query ausführen, um die Datenbankverbindung zu testen
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Datenbankverbindung konnte nicht hergestellt werden:', error);
      return false;
    }
  }

  /**
   * Prüft, ob eine bestimmte Tabelle existiert.
   *
   * @param tableName Name der zu prüfenden Tabelle
   * @returns true, wenn die Tabelle existiert, sonst false
   */
  async doesTableExist(tableName: string): Promise<boolean> {
    try {
      // PostgreSQL-spezifische Abfrage für Tabellenexistenz
      const result = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${tableName}
        )
      `;

      // Das Ergebnis ist ein Array mit einem Objekt, das ein exists-Feld enthält
      const exists = result[0]?.exists;
      return exists === true;
    } catch (error) {
      this.logger.error(`Fehler beim Prüfen der Existenz der Tabelle '${tableName}':`, error);
      return false;
    }
  }

  /**
   * Zählt die Anzahl der Datensätze in einer Tabelle.
   *
   * @param tableName Name der Tabelle
   * @returns Anzahl der Datensätze oder -1 bei Fehler
   */
  async countRecords(tableName: string): Promise<number> {
    try {
      // Stellen Sie sicher, dass der Tabellenname sicher ist, indem wir ihn in der Abfrage verwenden
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM ${tableName}
      `;

      return parseInt(result[0]?.count, 10) || 0;
    } catch (error) {
      this.logger.error(`Fehler beim Zählen der Datensätze in Tabelle '${tableName}':`, error);
      return -1;
    }
  }

  /**
   * Führt eine Postgres-spezifische Abfrage mit Timeout aus.
   *
   * @param query Die auszuführende SQL-Abfrage
   * @param params Parameter für die Abfrage
   * @returns Das Abfrageergebnis oder null bei Fehler/Timeout
   */
  async executeWithTimeout<T>(query: string, params: any[] = []): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
      // Timeout-Handler
      const timeoutId = setTimeout(() => {
        this.logger.error(`Datenbankabfrage Timeout nach ${this.queryTimeout}ms`);
        resolve(null);
      }, this.queryTimeout);
      timeoutId.unref(); // Timer soll den Prozess nicht am Beenden hindern

      // Abfrage ausführen
      this.prisma
        .$queryRawUnsafe<T>(query, ...params)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.logger.error('Fehler bei Datenbankabfrage:', error);
          resolve(null);
        });
    });
  }

  /**
   * Prüft, ob die Datenbank leer ist (keine Tabellen).
   *
   * @returns true, wenn die Datenbank leer ist, sonst false
   */
  async isDatabaseEmpty(): Promise<boolean> {
    try {
      // PostgreSQL-spezifische Abfrage, um alle Tabellen im öffentlichen Schema zu zählen
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;

      const tableCount = parseInt(result[0]?.count, 10) || 0;
      return tableCount === 0;
    } catch (error) {
      this.logger.error('Fehler beim Prüfen, ob die Datenbank leer ist:', error);
      // Im Fehlerfall nehmen wir an, dass die Datenbank nicht leer ist, um auf der sicheren Seite zu sein
      return false;
    }
  }
}
