import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Konfigurationsservice für Datenbankverbindungen
 *
 * Diese Klasse kapselt die Datenbankonfiguration und stellt
 * typsichere Zugriffsmethoden für Datenbankverbindungsparameter bereit.
 * Sie nutzt den NestJS ConfigService für den Zugriff auf Umgebungsvariablen.
 *
 * Features:
 * - Zentralisierte Datenbankkonfiguration
 * - Typsichere Konfigurationswerte
 * - Validierung von erforderlichen Umgebungsvariablen
 * - Abstrahierung von Konfigurationsdetails
 *
 * @class DatabaseConfig
 */
@Injectable()
export class DatabaseConfig {
  /**
   * Konstruktor für die DatabaseConfig
   *
   * @param configService Der ConfigService für den Zugriff auf Umgebungsvariablen
   */
  constructor(private configService: ConfigService) {}

  /**
   * Gibt die PostgreSQL-Verbindungs-URL für Prisma zurück.
   *
   * @returns Die DATABASE_URL für Prisma
   */
  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }
}
