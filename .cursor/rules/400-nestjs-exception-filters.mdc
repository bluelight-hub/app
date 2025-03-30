---
description: 
globs: **/*.filter.ts
alwaysApply: false
---
# NestJS Exception Filter Patterns

## Context
- Gilt für alle Exception-Filter im Backend (`**/*.filter.ts`)
- Standardisiert die Implementierung von Exception-Filtern in NestJS
- Verbessert Konsistenz, Fehlerbehandlung und Benutzererfahrung

## Requirements

1. **Struktur und Benennung**
   - Filter-Klassen mit Suffix `Filter` benennen
   - Passende Dateinamen mit Muster: `*.filter.ts`
   - Aussagekräftige Namen (z.B. `HttpExceptionFilter`, `ValidationExceptionFilter`)
   - Organisiert in einem `/filters` Verzeichnis oder domänenspezifisch

2. **Implementation**
   - Implements `ExceptionFilter<T>` Interface
   - Klar definierte `catch()` Methode
   - `@Catch()` Decorator mit spezifischen Exception-Typen
   - Injectable() Decorator wenn Dependency Injection benötigt wird

3. **Fehlerbehandlung**
   - Konsistentes Fehlerformat für Responses
   - HTTP-Statuscodes korrekt setzen
   - Fehlerinformationen strukturiert zurückgeben
   - Sensible Fehlerinformationen in Produktionsumgebung filtern

4. **Logging**
   - Fehler mit angemessenem Log-Level protokollieren
   - Wichtige Fehlerinformationen für Debugging loggen
   - Fehler-Kontext (Request-ID, User, etc.) mit protokollieren
   - Logger-Service für strukturiertes Logging verwenden

5. **Security**
   - Keine internen Stacktraces in der Produktion zurückgeben
   - Sensible Daten aus Fehlermeldungen filtern
   - Keine Infrastruktur- oder Implementierungsdetails preisgeben
   - Vage Fehlermeldungen für Sicherheitsprobleme

6. **Benutzererfahrung**
   - Benutzerfreundliche Fehlermeldungen
   - Klare Aktionsanweisungen wenn möglich
   - Mehrsprachige Fehlerunterstützung
   - Fehler-Codes für Clientseitige Spezialbehandlung

7. **Spezifische Exceptions**
   - Domain-spezifische Exceptions definieren
   - Sinnvolle Hierarchie von Exception-Klassen
   - HTTP-Exceptions für API-Fehler verwenden
   - Business-Exceptions für Geschäftslogik-Fehler

8. **Wiederverwendbarkeit**
   - Generische Filter für häufige Fehlertypen
   - Spezifische Filter für besondere Anforderungen
   - Erweiterbare Fehlerformate
   - Wiederverwendbare Hilfsfunktionen für Fehlerformatierung

## Examples

```typescript
// Gutes Beispiel: AllExceptionsFilter
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

/**
 * Einheitliche Struktur für Fehlerantworten.
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errorCode?: string;
  details?: Record<string, any>;
}

/**
 * Globaler Exception Filter für alle Ausnahmen.
 * Formatiert alle Fehler in ein einheitliches Format und verarbeitet spezielle Fehlertypen.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  /**
   * Behandelt alle abgefangenen Ausnahmen und formatiert sie als strukturierte Antwort.
   * 
   * @param exception - Die abgefangene Ausnahme
   * @param host - Der ArgumentsHost mit Request-Kontext
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);
    const errorCode = this.getErrorCode(exception);
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Füge den Fehlercode nur hinzu, wenn vorhanden
    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }

    // Füge Fehlerdetails hinzu, aber nur in Nicht-Produktionsumgebungen
    if (!this.isProduction && exception instanceof Error) {
      errorResponse.details = {
        stack: exception.stack,
        name: exception.name,
      };
    }

    // Logge den Fehler mit angemessenem Level
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method} ${request.url}] ${message}`,
        exception instanceof Error ? exception.stack : null,
      );
    } else {
      this.logger.warn(`[${request.method} ${request.url}] ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Bestimmt den HTTP-Statuscode basierend auf dem Fehlertyp.
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    
    // Spezielle Fehlertypen können hier behandelt werden
    // if (exception instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    // if (exception instanceof DatabaseError) return HttpStatus.SERVICE_UNAVAILABLE;
    
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extrahiert eine benutzerfreundliche Fehlermeldung aus der Ausnahme.
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'message' in response) {
        return Array.isArray(response.message) 
          ? response.message.join(', ')
          : String(response.message);
      }
      return exception.message;
    }
    
    if (exception instanceof Error) {
      return this.isProduction 
        ? 'Ein interner Serverfehler ist aufgetreten.' 
        : exception.message;
    }
    
    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  /**
   * Extrahiert einen Fehlercode aus der Ausnahme, wenn vorhanden.
   */
  private getErrorCode(exception: unknown): string | undefined {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'errorCode' in response) {
        return String(response.errorCode);
      }
    }
    
    // Hier könnten weitere benutzerdefinierte Fehlertypen behandelt werden
    // if (exception instanceof BusinessException) return exception.errorCode;
    
    return undefined;
  }
}
```

```typescript
// Schlechtes Beispiel
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch(Error)
export class SimpleFilter implements ExceptionFilter {
  catch(exception, host) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    console.log('Error:', exception);
    
    response.status(500).json({
      error: exception.message, // Gibt potentiell sensible Informationen preis
      stack: exception.stack, // Stellt Sicherheitsrisiko in Produktion dar
    });
  }
}
``` 