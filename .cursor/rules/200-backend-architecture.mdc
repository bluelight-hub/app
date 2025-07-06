---
description: ENFORCE a modular NestJS backend architecture with defined patterns
globs: packages/backend/**
alwaysApply: false
---

# Backend Architektur

## Context
- Gilt für alle Arbeiten im Backend-Bereich (`packages/backend/**`)
- NestJS-Projektstruktur, modulare Organisation

## Requirements
1. **Modulare Struktur**
   - Neue Features in `src/modules/<feature>/`
   - Klare Trennung von Controller, Service, Repository
2. **Code-Standards**
   - TypeScript strict mode
   - Dependency Injection
   - Einheitliche Fehlerbehandlung & Validierung
   - Tests für neue Funktionalität
3. **Entity-Management**
   - Nach modulbasiertem Ansatz in `entities/` ablegen
4. **Dokumentation**
   - JSDoc für Funktionen & Klassen
   - OpenAPI/Swagger für API-Endpunkte
5. **Technologie-Stack**
   - NestJS, Prisma (PostgreSQL), Jest, consolas-Logger

## Backend-Struktur und Komponententypen

Die Backend-Codebasis ist in `packages/backend` organisiert und folgt dieser grundlegenden Struktur:

1. **Common** (`packages/backend/common/`)
   - **Decorators** (`common/decorators/`): Wiederverwendbare Dekoratoren für Controller, Methoden oder Parameter
   - **Filters** (`common/filters/`): Exception Filter für Fehlerbehandlung
   - **Guards** (`common/guards/`): Guards für Authentifizierung und Autorisierung
   - **Interceptors** (`common/interceptors/`): Interceptors für Request/Response-Handling
   - **Pipes** (`common/pipes/`): Validierungs- und Transformations-Pipes

2. **Config** (`packages/backend/config/`)
   - Konfigurationsdateien und -module
   - Umgebungsvariablen-Definitionen und Schemas

3. **Module** (`packages/backend/modules/`)
   - Fachliche Module, nach Domänen organisiert
   - Jedes Modul enthält:
     - `controllers/`: API-Endpunkte 
     - `services/`: Geschäftslogik
     - `repositories/`: Datenzugriffsschicht
     - `entities/`: Datenbankmodelle
     - `dto/`: Data Transfer Objects
     - `interfaces/`: TypeScript-Interfaces
     - `enums/`: Enumerationen
     - `constants/`: Konstanten
     - `utils/`: Hilfsfunktionen
     - `__tests__/`: Test-Dateien

4. **Komponententypen und Namenskonventionen**
   - **Controller**: `*.controller.ts` - Verbinden API-Endpunkte mit Services
   - **Service**: `*.service.ts` - Enthalten Geschäftslogik
   - **Repository**: `*.repository.ts` - Datenzugriff und -manipulation
   - **Entity**: `*.entity.ts` - Datenbankmodelle
   - **DTO**: `*.dto.ts` - Datenstrukturen für API-Kommunikation
   - **Module**: `*.module.ts` - Modulkonfiguration und -organisation
   - **Factory**: `*.factory.ts` - Erstellung komplexer Objekte
   - **Decorator**: `*.decorator.ts` - Metaprogrammierung
   - **Guard**: `*.guard.ts` - Zugriffskontrolle
   - **Interceptor**: `*.interceptor.ts` - Request/Response-Transformation
   - **Pipe**: `*.pipe.ts` - Parametervalidierung und -transformation
   - **Filter**: `*.filter.ts` - Fehlerbehandlung
   - **Config**: `*.config.ts` - Konfigurationsmanagement
   - **Interfaces**: `*.interface.ts` - Typdeklaration
   - **Enums**: `*.enum.ts` - Konstantendefinition
   - **Types**: `*.types.ts` - Komplexe Typdefinitionen

## Examples

<example>
# Typische Struktur
packages/backend/
├── common/
│   ├── decorators/
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── pipes/
│       └── validation.pipe.ts
├── config/
│   ├── app.config.ts
│   └── database.config.ts
└── modules/
    ├── auth/
    │   ├── auth.controller.ts
    │   ├── auth.module.ts
    │   └── auth.service.ts
    └── user/
        ├── dto/
        │   ├── create-user.dto.ts
        │   └── update-user.dto.ts
        ├── entities/
        │   └── user.entity.ts
        ├── user.controller.ts
        ├── user.module.ts
        ├── user.repository.ts
        └── user.service.ts
</example>
