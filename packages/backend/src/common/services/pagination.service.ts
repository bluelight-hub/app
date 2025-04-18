import { Injectable } from '@nestjs/common';
import { FindManyOptions, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

/**
 * Service für die Verwaltung von Paginierung in Datenbank-Abfragen.
 * Bietet Hilfsmethoden für die Erstellung von paginierten Abfragen und Antworten.
 */
@Injectable()
export class PaginationService {
    /**
     * Erzeugt eine paginierte Antwort aus einer TypeORM-Repository-Abfrage.
     * 
     * @param repository Das Repository
     * @param options Optionen für die Abfrage
     * @param page Seitennummer (1-basiert)
     * @param limit Anzahl der Elemente pro Seite
     * @returns Eine paginierte Antwort
     */
    async paginate<T>(
        repository: Repository<T>,
        options: FindManyOptions<T>,
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<T>> {
        const [items, totalItems] = await repository.findAndCount({
            ...options,
            skip: (page - 1) * limit,
            take: limit,
        });

        return PaginatedResponse.create(items, totalItems, page, limit);
    }

    /**
     * Erzeugt eine paginierte Antwort aus einem TypeORM-QueryBuilder.
     * 
     * @param queryBuilder Der QueryBuilder
     * @param page Seitennummer (1-basiert)
     * @param limit Anzahl der Elemente pro Seite
     * @returns Eine paginierte Antwort
     */
    async paginateQueryBuilder<T>(
        queryBuilder: SelectQueryBuilder<T>,
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<T>> {
        const offset = (page - 1) * limit;

        const [items, totalItems] = await queryBuilder
            .take(limit)
            .skip(offset)
            .getManyAndCount();

        return PaginatedResponse.create(items, totalItems, page, limit);
    }
} 