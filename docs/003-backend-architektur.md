# Backend-Architektur

## Übersicht

Die Backend-Architektur basiert auf NestJS und folgt dem Domain-Driven Design (DDD) Ansatz. Die Anwendung ist modular aufgebaut und verwendet eine klare Schichtenarchitektur.

## Ordnerstruktur

```
packages/backend/
├── src/
│   ├── app.module.ts              # Haupt-Modul der Anwendung
│   ├── main.ts                    # Einstiegspunkt der Anwendung
│   ├── common/                    # Gemeinsam genutzte Funktionalitäten
│   │   ├── constants/            # Konstanten und Enums
│   │   ├── decorators/          # Custom Decorators
│   │   ├── filters/             # Exception Filter
│   │   ├── guards/              # Authentication Guards
│   │   ├── interceptors/        # Custom Interceptors
│   │   ├── interfaces/          # Gemeinsame Interfaces
│   │   └── utils/               # Hilfsfunktionen
│   │
│   ├── config/                   # Konfigurationsmodule
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   │
│   ├── modules/                  # Feature Module
│   │   ├── auth/                # Authentifizierung
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   └── auth.module.ts
│   │   │
│   │   └── users/              # Benutzer-Modul (als Beispiel)
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── dto/
│   │       ├── entities/
│   │       └── users.module.ts
│   │
│   └── health/                  # Health Check Module
│       ├── health.controller.ts
│       └── health.module.ts
│
├── test/                        # Tests
│   ├── e2e/                    # End-to-End Tests
│   └── unit/                   # Unit Tests
│
└── docs/                       # API Dokumentation
    └── swagger/
```

## Architektur-Prinzipien

### 1. Modularer Aufbau
- Jedes Feature ist ein eigenständiges Modul
- Module sind lose gekoppelt und stark kohäsiv
- Klare Trennung von Zuständigkeiten

### 2. Schichtenarchitektur
Jedes Modul folgt einer klaren Schichtenarchitektur:
- **Controller**: HTTP-Endpunkte und Request-Handling
- **Services**: Geschäftslogik
- **Repositories**: Datenbankzugriff
- **DTOs**: Datentransfer-Objekte
- **Entities**: Datenbank-Modelle

### 3. Dependency Injection
- Nutzung des NestJS DI-Containers
- Interfaces für bessere Testbarkeit
- Inversion of Control Prinzip

### 4. Fehlerbehandlung
- Zentrale Fehlerbehandlung durch Exception Filter
- Einheitliche Fehlerformate
- Aussagekräftige Fehlermeldungen

### 5. Validierung
- DTO-Validierung mit class-validator
- Request-Validierung durch Pipes
- Geschäftsregeln-Validierung in Services

### 6. Sicherheit
- JWT-basierte Authentifizierung
- Rollenbasierte Autorisierung
- Rate Limiting
- CORS-Konfiguration

### 7. Logging und Monitoring
- Strukturiertes Logging
- Performance Monitoring
- Health Checks

## Best Practices

1. **Naming Conventions**
   - Klare, beschreibende Namen
   - Konsistente Namensgebung über das gesamte Projekt
   - Suffix-Konventionen für verschiedene Typen (z.B. Service, Controller)

2. **Code Organisation**
   - Ein Feature pro Modul
   - Maximale Kohäsion innerhalb der Module
   - Minimale Kopplung zwischen Modulen

3. **Testing**
   - Unit Tests für Services
   - Integration Tests für Controller
   - E2E Tests für kritische Pfade
   - Test Coverage > 80%

4. **Dokumentation**
   - OpenAPI/Swagger für API-Dokumentation
   - JSDoc für Funktionen und Klassen
   - README für Module und Setup-Anweisungen

5. **Performance**
   - Caching wo sinnvoll
   - Pagination für Listen
   - Query Optimierung
   - Lazy Loading von Modulen

## Entwicklungs-Workflow

1. **Qualitätssicherung**
   - Linting (ESLint)
   - Formatting (Prettier)
   - Tests müssen bestanden sein

## Technologie-Stack

- **Framework**: NestJS
- **Datenbank**: SQLite mit TypeORM
- **Authentication**: JWT
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest
- **Logging**: consolas
