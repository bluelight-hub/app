import { logger } from '@/logger/consola.logger';
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiMeta, ApiPagination, ApiResponse } from '../interfaces/api-response.interface';

/**
 * Interceptor zur Transformation von API-Antworten in ein standardisiertes Format
 * Wandelt alle Antworten in die Struktur {data, meta} um
 * @template T Typ der ursprünglichen Antwortdaten
 */
@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T> {
    /**
     * Transformiert die API-Antwort in das standardisierte Format
     * 
     * @param _context Der Ausführungskontext
     * @param next Der nächste Handler in der Kette
     * @returns Die transformierte Antwort
     */
    intercept(
        _context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                // Wenn bereits ein data-Feld existiert, verwende es, sonst die gesamten Daten
                const responseData = data?.['data'] ?? data;

                // Erstelle die Meta-Daten
                const meta: ApiMeta = {
                    timestamp: new Date().toISOString(),
                };

                // Erstelle oder übernehme Paginierungsinformationen
                if (data?.['entries'] && data?.['total'] !== undefined) {
                    // EtbController spezifisches Format mit entries und total
                    meta.pagination = this.createPaginationFromEntriesTotal(data);
                } else if (data?.['meta']?.['pagination']) {
                    // Bereits vorhandene Paginierungsinformationen verwenden
                    meta.pagination = data['meta'].pagination;
                }

                // Erstelle die standardisierte Antwort
                const response = {
                    data: responseData,
                    meta,
                };

                // Optional: Füge Message hinzu, wenn vorhanden
                if (data?.['message']) {
                    response['message'] = data['message'];
                }

                logger.trace(`TransformInterceptor: Antwortformat standardisiert`);
                return response;
            }),
        );
    }

    /**
     * Erstellt Paginierungsinformationen aus einem Format mit entries und total
     * Spezifisch für den EtbController
     * 
     * @param data Die ursprünglichen Daten
     * @returns Paginierungsinformationen
     */
    private createPaginationFromEntriesTotal(data: any): ApiPagination {
        // Erstelle Pagination-Objekt aus einem Format mit entries und total
        // Für EtbController, der { entries, total } zurückgibt
        if (!data.entries || data.total === undefined) {
            return undefined;
        }

        const pagination: ApiPagination = {
            page: 1, // Standard
            limit: data.entries.length,
            total: data.total,
            totalPages: 1,
        };

        // Berechne totalPages
        if (pagination.limit > 0) {
            pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
        }

        return pagination;
    }
} 