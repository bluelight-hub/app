---
description: 
globs: **/*.decorator.ts,**/*.guard.ts,**/*.interceptor.ts,**/*.pipe.ts
alwaysApply: false
---
# NestJS Middleware-Patterns

## Context
- Gilt für alle Middleware-Komponenten (`**/*.decorator.ts`, `**/*.guard.ts`, `**/*.interceptor.ts`, `**/*.pipe.ts`)
- Standardisiert die Implementierung von Decorators, Guards, Interceptors und Pipes
- Verbessert Konsistenz, Wiederverwendbarkeit und Wartbarkeit

## Requirements

### Allgemeine Anforderungen

1. **Struktur und Benennung**
   - Eindeutige, beschreibende Namen verwenden
   - Entsprechende Suffixe verwenden (.decorator.ts, .guard.ts, .interceptor.ts, .pipe.ts)
   - Eine Middleware-Komponente pro Datei
   - In entsprechenden Verzeichnissen organisieren (/decorators, /guards, /interceptors, /pipes)

2. **Dokumentation**
   - Zweck und Verwendungszweck kommentieren
   - Parameter und Rückgabewerte dokumentieren
   - Beispiele für die Verwendung angeben
   - Potenzielle Fehlerszenarien dokumentieren

3. **Dependency Injection**
   - Constructor Injection für Services verwenden
   - Abhängigkeiten als private readonly deklarieren
   - Zirkuläre Abhängigkeiten vermeiden

4. **Fehlerbehandlung**
   - Spezifische Exceptions werfen
   - Fehler klar und verständlich melden
   - Best Practices für HTTP-Status-Codes befolgen

5. **Testbarkeit**
   - Einfache Testbarkeit durch klare Verantwortlichkeiten
   - Möglichkeit zum Mocking von Abhängigkeiten
   - Loose Coupling durch Abstraktion

### Spezifische Anforderungen für Decorators

1. **Implementation**
   - Factory-Funktionen für parametrisierbare Decorators verwenden
   - Klare Trennung zwischen Metadaten-Decorators und funktionalen Decorators
   - Keine Seiteneffekte in Metadaten-Decorators

2. **Metadaten**
   - Konsistente Metadaten-Schlüssel verwenden
   - Reflector für Zugriff auf Metadaten nutzen
   - Typsicherheit durch Interfaces für Metadaten

### Spezifische Anforderungen für Guards

1. **Implementation**
   - Implements CanActivate Interface
   - Klare Logik in canActivate-Methode
   - Boolean oder Promise<boolean> oder Observable<boolean> zurückgeben

2. **Authentifizierung & Autorisierung**
   - Authentifizierungslogik in AuthGuards
   - Rollenbasierte Autorisierung über Guards
   - Berechtigungsprüfungen in Guards

### Spezifische Anforderungen für Interceptors

1. **Implementation**
   - Implements NestInterceptor Interface
   - RxJS Operatoren für Transformationen verwenden
   - Klare Trennung zwischen Request und Response Manipulation

2. **Performance & Logging**
   - Logging in Interceptors implementieren
   - Performance-Überwachung durch Interceptors
   - Caching in spezialisierten Interceptors

### Spezifische Anforderungen für Pipes

1. **Implementation**
   - Implements PipeTransform Interface
   - Klare Validierungs- oder Transformationslogik
   - Validierungsfehler durch ValidationPipes

2. **Validierung**
   - class-validator für Validierung nutzen
   - ValidationPipe für DTO-Validierung
   - Benutzerdefinierte Validierungslogik bei Bedarf

## Examples

### Decorator Beispiel

```typescript
// Gutes Beispiel: Roles Decorator
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  EDITOR = 'editor',
}

/**
 * Dekorator zur Definition von erforderlichen Rollen für einen Endpunkt oder Controller.
 * Wird zusammen mit RolesGuard verwendet.
 * 
 * @param roles - Eine oder mehrere erforderliche Rollen
 * @returns Decorator-Funktion
 * 
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('users')
 * getAllUsers() {
 *   // Nur für Administratoren zugänglich
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### Guard Beispiel

```typescript
// Gutes Beispiel: RolesGuard
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

/**
 * Guard zur Überprüfung von Benutzerrollen für geschützte Routen.
 * Verwendet den Roles-Decorator, um erforderliche Rollen zu definieren.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Prüft, ob der aktuelle Benutzer die erforderlichen Rollen für den Zugriff besitzt.
   * 
   * @param context - ExecutionContext mit Request-Informationen
   * @returns true wenn Zugriff erlaubt, sonst false oder wirft Exception
   */
  canActivate(context: ExecutionContext): boolean {
    // Erforderliche Rollen aus Metadaten lesen
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Wenn keine Rollen definiert sind, erlaube Zugriff
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Benutzer muss authentifiziert sein
    if (!user) {
      throw new UnauthorizedException('Nicht authentifiziert');
    }

    // Prüfe, ob Benutzer mindestens eine der erforderlichen Rollen hat
    const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));
    
    if (!hasRequiredRole) {
      throw new UnauthorizedException('Unzureichende Berechtigungen');
    }
    
    return true;
  }
}
```

### Interceptor Beispiel

```typescript
// Gutes Beispiel: LoggingInterceptor
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor zum Loggen der Anfrage-Verarbeitung inklusive Ausführungszeit.
 * Protokolliert den Anfang und das Ende jeder Anfrage.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * Interceptor-Methode, die Anfrage und Antwort verarbeitet.
   * 
   * @param context - ExecutionContext mit Request-Informationen
   * @param next - CallHandler für die nächste Handler-Ausführung
   * @returns Observable mit der Antwort
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    this.logger.log(`${method} ${url} Anfrage gestartet`);

    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - now;
        this.logger.log(`${method} ${url} Anfrage abgeschlossen in ${executionTime}ms`);
      }),
    );
  }
}
```

### Pipe Beispiel

```typescript
// Gutes Beispiel: ParseIdPipe
import { 
  PipeTransform, 
  Injectable, 
  ArgumentMetadata, 
  BadRequestException 
} from '@nestjs/common';

/**
 * Pipe zur Validierung und Umwandlung von ID-Parametern.
 * Stellt sicher, dass IDs gültige Zahlen sind und optional einen Mindest- und Höchstwert haben.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  /**
   * @param options - Konfigurationsoptionen für die Validierung
   */
  constructor(
    private readonly options: {
      minValue?: number;
      maxValue?: number;
    } = {},
  ) {}

  /**
   * Transformiert den String-Parameter in eine Nummer und validiert den Wertebereich.
   * 
   * @param value - Der zu validierende Wert
   * @param metadata - Metadaten zum Parameter
   * @returns Transformierter Zahlenwert
   * @throws BadRequestException bei ungültigen Werten
   */
  transform(value: string, metadata: ArgumentMetadata): number {
    const id = parseInt(value, 10);

    if (isNaN(id)) {
      throw new BadRequestException(`Parameter ${metadata.data} muss eine gültige Zahl sein`);
    }

    if (
      this.options.minValue !== undefined && id < this.options.minValue
    ) {
      throw new BadRequestException(
        `Parameter ${metadata.data} muss mindestens ${this.options.minValue} sein`,
      );
    }

    if (
      this.options.maxValue !== undefined && id > this.options.maxValue
    ) {
      throw new BadRequestException(
        `Parameter ${metadata.data} darf höchstens ${this.options.maxValue} sein`,
      );
    }

    return id;
  }
}
``` 