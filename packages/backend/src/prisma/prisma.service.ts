import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../prisma/generated/prisma/client';

/**
 * Prisma-Service für Datenbankoperationen.
 * Verwaltet die Verbindung zum Prisma-Client und stellt sicher, dass
 * die Verbindung korrekt initialisiert und geschlossen wird.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    /**
     * Initialisiert die Datenbankverbindung beim Starten des Moduls
     */
    async onModuleInit() {
        await this.$connect();
    }

    /**
     * Schließt die Datenbankverbindung beim Beenden des Moduls
     */
    async onModuleDestroy() {
        await this.$disconnect();
    }
} 