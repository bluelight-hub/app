import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Konfigurationsklasse für Datenbankzugriffe.
 * Stellt Konfigurationswerte für den Prisma-Datenbankzugriff bereit.
 */
@Injectable()
export class DatabaseConfig {
    /**
     * Konstruktor für die DatabaseConfig
     * 
     * @param configService Der ConfigService für den Zugriff auf Umgebungsvariablen
     */
    constructor(private configService: ConfigService) { }

    /**
     * Gibt die PostgreSQL-Verbindungs-URL für Prisma zurück.
     * 
     * @returns Die DATABASE_URL für Prisma
     */
    get databaseUrl(): string {
        return this.configService.getOrThrow<string>('DATABASE_URL');
    }
} 