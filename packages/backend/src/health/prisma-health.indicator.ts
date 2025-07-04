import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

/**
 * Health Indicator für Prisma Datenbankverbindungen.
 * Ermöglicht das Prüfen der Verbindung zur Datenbank über den Prisma Client.
 */
@Injectable()
export class PrismaHealthIndicator {
    /**
     * Konstruktor für den PrismaHealthIndicator
     * 
     * @param prisma Der Prisma-Service für Datenbankzugriffe
     */
    constructor(
        private readonly prisma: PrismaService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
    }

    /**
     * Prüft die Verbindung zur Datenbank durch Ausführung eines einfachen Queries.
     * 
     * @param key Der Name des Indikators im Gesundheitsbericht
     * @returns Ein HealthIndicatorResult mit dem Status der Datenbankverbindung
     */
    async pingCheck(key: string): Promise<HealthIndicatorResult> {
        try {
            // Führe eine einfache Query aus, um die Verbindung zu prüfen
            await this.prisma.$queryRaw`SELECT 1`;

            return this.healthIndicatorService.check(key).up();
        } catch (error: any) {
            return this.healthIndicatorService.check(key).down(error);
        }
    }

    /**
     * Prüft, ob der Prisma-Client verbunden ist.
     * 
     * @param key Der Name des Indikators im Gesundheitsbericht
     * @returns Ein HealthIndicatorResult mit dem Status der Verbindung
     */
    async isConnected(key: string): Promise<HealthIndicatorResult> {
        try {
            // Prüfe, ob der Client verbunden ist
            const connectionStatus = await this.prisma.$executeRaw`SELECT 1 as connected`;
            return this.healthIndicatorService.check(key).up({
                connected: connectionStatus !== null
            });
        } catch (error: any) {
            return this.healthIndicatorService.check(key).down(error);
        }
    }
} 