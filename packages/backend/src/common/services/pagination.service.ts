import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

/**
 * Service für die Verwaltung von Paginierung in Datenbank-Abfragen.
 * Bietet Hilfsmethoden für die Erstellung von paginierten Abfragen und Antworten.
 */
@Injectable()
export class PaginationService {
    /**
     * Konstruktor für den PaginationService
     * 
     * @param prisma Der Prisma-Service für Datenbankabfragen
     */
    constructor(
        private prisma: PrismaService,
    ) { }

    /**
     * Erzeugt eine paginierte Antwort aus einer Prisma-Abfrage.
     * 
     * @param model Der Name des Prisma-Models als String
     * @param options Optionen für die Abfrage (where, orderBy, include)
     * @param page Seitennummer (1-basiert)
     * @param limit Anzahl der Elemente pro Seite
     * @returns Eine paginierte Antwort
     */
    async paginate<T>(
        model: string,
        options: {
            where?: any;
            orderBy?: any;
            include?: any;
        },
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<T>> {
        const prismaModel = this.prisma[model];
        if (!prismaModel) {
            throw new Error(`Prisma model '${model}' not found`);
        }

        const skip = (page - 1) * limit;

        const [items, totalItems] = await Promise.all([
            prismaModel.findMany({
                ...options,
                skip,
                take: limit,
            }),
            prismaModel.count({
                where: options.where
            })
        ]);

        return PaginatedResponse.create(items, totalItems, page, limit);
    }
} 