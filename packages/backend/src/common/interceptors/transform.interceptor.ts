import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { nanoid } from 'nanoid';

/**
 * Interface für paginierte Daten vom Controller
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * Interface für Antworten mit Message
 */
export interface ResponseWithMessage<T = any> {
  data?: T;
  message: string;
}

/**
 * Interface für die transformierte API-Antwort
 */
export interface TransformedResponse<T = any> {
  data: T;
  meta: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

/**
 * Type Guard für paginierte Daten
 */
function isPaginatedData<T>(data: unknown): data is PaginatedData<T> {
  return (
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as any).items) &&
    'total' in data &&
    typeof (data as any).total === 'number'
  );
}

/**
 * Type Guard für Response mit Message
 */
function hasMessage(data: unknown): data is { message: string } {
  return data !== null && typeof data === 'object' && 'message' in data;
}

/**
 * Type Guard für bereits transformierte Response
 */
function isTransformedResponse<T>(data: unknown): data is TransformedResponse<T> {
  return (
    data !== null &&
    typeof data === 'object' &&
    'data' in data &&
    'meta' in data &&
    typeof (data as any).meta === 'object'
  );
}

/**
 * Interceptor zur Transformation aller API-Antworten in ein standardisiertes Format
 *
 * RxJS wird benötigt, da NestJS auf dem Observable-Pattern basiert:
 * - Ermöglicht asynchrone Stream-Verarbeitung
 * - Unterstützt reaktive Programmierung
 * - Erlaubt Transformation von Response-Daten im Stream
 */
@Injectable()
export class TransformInterceptor<T = any>
  implements NestInterceptor<T, TransformedResponse<T> | any>
{
  private readonly appUrl: string;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    // Cache the APP_URL at initialization to avoid repeated config lookups
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformedResponse<T> | any> {
    // Prüfe ob Transform übersprungen werden soll
    const skipTransform = this.reflector.getAllAndOverride<boolean>('skipTransform', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTransform) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || nanoid();

    return next.handle().pipe(
      map((responseData): TransformedResponse<any> => {
        // Wenn data bereits das korrekte Format hat, nicht nochmal wrappen
        if (isTransformedResponse(responseData)) {
          return responseData;
        }

        // Basis-Transformation
        const transformed: TransformedResponse<any> = {
          data: responseData as any,
          meta: {
            timestamp: new Date().toISOString(),
            version: 'alpha',
            requestId,
          },
        };

        // Prüfe auf paginierte Daten
        if (isPaginatedData(responseData)) {
          const { items, total, page = 1, limit = 20 } = responseData;
          transformed.data = items;
          transformed.pagination = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          };

          // Generiere Links für Pagination mit sicherer Base-URL aus Konfiguration
          // Verwende nur den Pfad aus der Request-URL, nicht den Host-Header
          const pathname = request.originalUrl.split('?')[0];
          // Ensure we don't duplicate /api if it's already in the pathname
          const apiPath = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
          const baseUrl = `${this.appUrl}${apiPath}`;

          transformed.links = {
            self: `${baseUrl}?page=${page}&limit=${limit}`,
          };

          if (page < transformed.pagination.totalPages) {
            transformed.links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
          }

          if (page > 1) {
            transformed.links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
          }
        }

        // Füge message hinzu, wenn vorhanden
        if (hasMessage(responseData)) {
          const { message } = responseData;
          transformed.message = message;

          // Wenn es auch ein data-Feld gibt, verwende das
          if ('data' in responseData) {
            transformed.data = (responseData as ResponseWithMessage).data;
          } else {
            // Entferne message aus dem data-Objekt
            const { message: _, ...restData } = responseData as any;
            transformed.data = restData;
          }
        }

        return transformed;
      }),
    );
  }
}
