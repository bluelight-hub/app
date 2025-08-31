# BlueLight Hub - Simple Performance Tracking

## 🎯 Ziel

Ersetze manuelle Performance-Logs durch einen einzigen Interceptor, der automatisch alle Controller-Methoden misst.

## 📦 Was wir bauen (nur 2 Dateien!)

### 1. Performance Interceptor

```typescript
// packages/backend/src/common/interceptors/performance.interceptor.ts
```

### 2. Registration in main.ts

```typescript
// packages/backend/src/main.ts (1 Zeile hinzufügen)
```

## 🛠️ Implementation

### Schritt 1: Performance Interceptor erstellen

```typescript
// packages/backend/src/common/interceptors/performance.interceptor.ts
import {Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger} from '@nestjs/common';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Performance');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const type = context.getType();

        // Nur HTTP Requests tracken
        if (type !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const {method, url, body} = request;
        const className = context.getClass().name;
        const handlerName = context.getHandler().name;

        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - now;

                    // Standard Log für alle Requests
                    this.logger.log(
                        `[${className}/${handlerName}] ${method} ${url} - ${duration}ms`
                    );

                    // Warning für langsame Requests (optional)
                    if (duration > 1000) {
                        this.logger.warn(
                            `Slow request detected: ${method} ${url} took ${duration}ms`
                        );
                    }
                },
                error: (error) => {
                    const duration = Date.now() - now;
                    this.logger.error(
                        `[${className}/${handlerName}] ${method} ${url} failed after ${duration}ms: ${error.message}`
                    );
                }
            })
        );
    }
}
```

### Schritt 2: Global registrieren

```typescript
// packages/backend/src/main.ts
import {PerformanceInterceptor} from './common/interceptors/performance.interceptor';

async function bootstrap() {
    // ... existing code ...

    // Nach den anderen globalInterceptors hinzufügen:
    app.useGlobalInterceptors(
        new TransformInterceptor(reflector, configService),
        new PerformanceInterceptor() // <-- NEU
    );

    // ... rest of bootstrap ...
}
```

## 🧹 Cleanup: Alte Logs entfernen

Nach der Aktivierung können diese manuellen Logs entfernt werden:

### Beispiel vorher:

```typescript
// einsatz.service.ts
async function createEinsatz(data: CreateEinsatzDto) {
    const startTime = Date.now();
    const result = await this.prisma.einsatz.create({data});
    this.logger.log(`Einsatz ${result.id} created in ${Date.now() - startTime}ms`);
    return result;
}
```

### Beispiel nachher:

```typescript
// einsatz.service.ts
async function createEinsatz(data: CreateEinsatzDto) {
    return this.prisma.einsatz.create({data});
}
```

## 📊 Was du bekommst

### Automatische Logs für ALLE Controller:

```
[2024-01-15 10:23:45] [EinsatzController/create] POST /api/einsatz - 45ms
[2024-01-15 10:23:46] [AuthController/login] POST /api/auth/login - 123ms
[2024-01-15 10:23:47] [UserController/findAll] GET /api/users - 12ms
[2024-01-15 10:23:48] WARN: Slow request detected: GET /api/reports/yearly took 2341ms
```

## ✅ Vorteile

- **Zero Config** - Einmal registriert, funktioniert überall
- **Konsistente Logs** - Gleiches Format für alle Endpoints
- **Automatische Slow-Detection** - Warnings bei >1000ms
- **Error Tracking** - Zeigt auch fehlgeschlagene Requests mit Dauer
- **Kein manueller Code** in Services/Controllers mehr nötig

## 🚀 Migration (5 Minuten)

1. **Interceptor erstellen** (Copy & Paste von oben)
2. **In main.ts registrieren** (1 Zeile)
3. **Testen** ob Logs erscheinen
4. **Alte Logs entfernen** aus Services/Controllers

## 🔧 Optional: Konfigurierbar machen

Falls du später mehr Kontrolle willst:

```typescript
export class PerformanceInterceptor implements NestInterceptor {
    constructor(
        private readonly options: {
            slowThreshold?: number;  // Default: 1000ms
            logLevel?: 'log' | 'debug' | 'verbose';  // Default: 'log'
            excludePaths?: string[];  // z.B. ['/health', '/metrics']
        } = {}
    ) {
    }

    // ... rest bleibt gleich
}

// In main.ts:
app.useGlobalInterceptors(
    new PerformanceInterceptor({
        slowThreshold: 500,
        excludePaths: ['/health']
    })
);
```

## 📝 Fertig!

Das war's schon! Ein Interceptor, der automatisch alle Controller-Methoden trackt.
Keine Frameworks, keine Dependencies, kein Over-Engineering.

**Geschätzter Aufwand:** 30 Minuten inkl. Testing