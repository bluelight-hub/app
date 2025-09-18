# Technology Stack - Bluelight Hub

## 🚀 Übersicht

Dieses Dokument beschreibt den vollständigen Technology Stack des Bluelight Hub Systems. Es dient als zentrale Referenz
für alle verwendeten Technologien, Frameworks, Libraries und Tools.

## 🏗️ Core Architecture

### System-Architektur

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React + Vite]
        DESKTOP[Desktop App<br/>Tauri v2]
        MOBILE[Mobile App<br/>Tauri v2]
    end

    subgraph "API Gateway"
        REST[REST API<br/>NestJS + Swagger]
    end

    subgraph "Backend Services"
        AUTH[Auth Service<br/>JWT + Passport]
        EINSATZ[Einsatz Service<br/>Business Logic]
        SYNC[Sync Service<br/>Data Sync]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary DB)]
    end

    WEB --> REST
    DESKTOP --> REST
    MOBILE --> REST
    REST --> AUTH
    REST --> EINSATZ
    REST --> SYNC
    AUTH --> POSTGRES
    EINSATZ --> POSTGRES
    SYNC --> POSTGRES
```

## 📱 Frontend Stack

### Core Technologies

| Technology     | Version | Verwendung             | Begründung                                        |
|----------------|---------|------------------------|---------------------------------------------------|
| **React**      | 18.3.x  | UI Framework           | Komponenten-basierte Architektur, große Community |
| **TypeScript** | 5.9.x   | Type Safety            | Typsicherheit, bessere IDE-Unterstützung          |
| **Vite**       | 6.1.x   | Build Tool             | Schnelle HMR, optimierte Builds                   |
| **Tauri v2**   | 2.x     | Desktop/Mobile Wrapper | Native Performance, kleine Bundle-Größe           |

### UI & Styling

| Technology                   | Version | Verwendung            | Begründung                                |
|------------------------------|---------|-----------------------|-------------------------------------------|
| **Tailwind CSS**             | 3.x     | Utility-First CSS     | Schnelle Entwicklung, konsistentes Design |
| **Headless UI**              | 2.x     | Accessible Components | Barrierefreie UI-Komponenten              |
| **TailwindUI**               | Premium | Premium Components    | Professionelle, getestete Komponenten     |
| **class-variance-authority** | Latest  | Variant Management    | Type-safe styling variants                |
| **tailwind-merge**           | Latest  | Class Merging         | Konfliktfreie Tailwind-Klassen            |

### State Management & Data Fetching

| Technology          | Version | Verwendung            | Begründung                                   |
|---------------------|---------|-----------------------|----------------------------------------------|
| **TanStack Query**  | 5.x     | Data Fetching         | Caching, Synchronisation, Optimistic Updates |
| **TanStack Store**  | Latest  | Global State          | Einfaches, typsicheres State Management      |
| **TanStack Form**   | Latest  | Form Management       | Performante, flexible Forms                  |
| **TanStack Router** | Latest  | Routing               | Type-safe routing                            |
| **TanStack Table**  | 8.x     | Data Tables           | Powerful table features                      |
| **TanStack Pacer**  | Latest  | Debouncing/Throttling | Performance optimization                     |

### Validation & Forms

| Technology               | Version | Verwendung        | Begründung                                |
|--------------------------|---------|-------------------|-------------------------------------------|
| **Zod**                  | 3.x     | Schema Validation | TypeScript-first validation               |
| **@tanstack/react-form** | 1.x     | Form Handling     | Zod-Integration; gemäß Projekt-Guidelines |

### Development Tools

| Technology            | Version | Verwendung        | Begründung                     |
|-----------------------|---------|-------------------|--------------------------------|
| **TanStack DevTools** | Latest  | Debugging         | Query, Router, Store debugging |
| **Vitest**            | 2.x     | Unit Testing      | Vite-native testing            |
| **Testing Library**   | Latest  | Component Testing | User-centric testing           |

### Fonts & Icons

| Technology      | Version  | Verwendung     |
|-----------------|----------|----------------|
| **Inter**       | Variable | Primary Font   |
| **Nunito**      | Variable | Secondary Font |
| **Montserrat**  | Variable | Display Font   |
| **React Icons** | Latest   | Icon Library   |

## 🖥️ Backend Stack

### Core Technologies

| Technology     | Version  | Verwendung        | Begründung                          |
|----------------|----------|-------------------|-------------------------------------|
| **NestJS**     | 11.x     | Backend Framework | Strukturierte, modulare Architektur |
| **TypeScript** | 5.9.x    | Type Safety       | Konsistenz mit Frontend             |
| **Node.js**    | 22.x LTS | Runtime           | JavaScript Runtime                  |
| **Prisma**     | 6.x      | ORM               | Type-safe database access           |

### Database & Storage

| Technology        | Version | Verwendung       | Begründung                      |
|-------------------|---------|------------------|---------------------------------|
| **PostgreSQL**    | 17.x    | Primary Database | ACID, JSON support, Performance |
| **Prisma Client** | 6.x     | Database Client  | Type-safe queries               |

### Authentication & Security

| Technology        | Version | Verwendung        | Begründung               |
|-------------------|---------|-------------------|--------------------------|
| **Passport.js**   | 0.7.x   | Auth Framework    | Flexible authentication  |
| **JWT**           | 9.x     | Token Management  | Stateless authentication |
| **bcrypt**        | 6.x     | Password Hashing  | Secure password storage  |
| **Helmet**        | 8.x     | Security Headers  | XSS, CSP protection      |
| **Cookie Parser** | 1.4.x   | Cookie Management | Secure cookie handling   |

### API & Documentation

| Technology            | Version | Verwendung          | Begründung          |
|-----------------------|---------|---------------------|---------------------|
| **Swagger/OpenAPI**   | 11.x    | API Documentation   | Auto-generated docs |
| **class-validator**   | 0.14.x  | DTO Validation      | Request validation  |
| **class-transformer** | 0.5.x   | Data Transformation | DTO mapping         |

### Performance & Monitoring

| Technology                | Version | Verwendung    | Begründung         |
|---------------------------|---------|---------------|--------------------|
| **@nestjs/throttler**     | 6.x     | Rate Limiting | DDoS protection    |
| **@nestjs/cache-manager** | 3.x     | Caching       | Response caching   |
| **@nestjs/terminus**      | 11.x    | Health Checks | Service monitoring |
| **@nestjs/event-emitter** | 3.x     | Event System  | Loose coupling     |

### Testing

| Technology         | Version | Verwendung          | Begründung                 |
|--------------------|---------|---------------------|----------------------------|
| **Jest**           | 30.x    | Unit Testing        | Standard testing framework |
| **Supertest**      | 7.x     | API Testing         | HTTP assertions            |
| **Testcontainers** | 11.x    | Integration Testing | Real database testing      |
| **ts-jest**        | 29.x    | TypeScript Testing  | TS support for Jest        |

## 🔄 Shared/Common

### API Generation

| Technology            | Version  | Verwendung        | Begründung            |
|-----------------------|----------|-------------------|-----------------------|
| **OpenAPI Generator** | 7.x      | Client Generation | Type-safe API clients |
| **TypeScript Axios**  | Template | Client Template   | Axios-based clients   |

### Utilities

| Technology   | Version | Verwendung         | Begründung                                             |
|--------------|---------|--------------------|--------------------------------------------------------|
| **date-fns** | 4.x     | Date Manipulation  | Modular, tree-shakeable                                |
| **nanoid**   | 5.x     | ID Generation      | URL-safe unique IDs                                    |
| **consola**  | Latest  | Logging (Frontend) | Beautiful console logging (use via app logger wrapper) |

#### Frontend Logging Strategy

- Preferred default: Use `consola` for browser console logging in local development.
- Production: Route logs via centralized logger hooks (e.g., Sentry/ELK) through an app-level logger adapter.
- Wrapper/adapter: Expose a single logger surface at `packages/frontend/src/logger/index.ts` with
  `debug/info/warn/error`.
- Usage rule: Do not call `console.*` or raw `consola` in components; always import the shared `logger`.
- Environment routing: `logger` delegates to `consola` in `development` and to configured hooks in `production`.

## 🛠️ Development Tools

### Build & Bundle

| Technology    | Version   | Verwendung      | Begründung                   |
|---------------|-----------|-----------------|------------------------------|
| **pnpm**      | 10.x      | Package Manager | Efficient, workspace support |
| **Turborepo** | (planned) | Monorepo Build  | Optimized builds             |
| **esbuild**   | Latest    | JS Bundling     | Fast bundling                |
| **SWC**       | Latest    | Transpilation   | Fast TypeScript/JSX          |

### Code Quality

| Technology            | Version | Verwendung           | Begründung          |
|-----------------------|---------|----------------------|---------------------|
| **Biome**             | 2.x     | Linting & Formatting | Fast, all-in-one    |
| **TypeScript ESLint** | 8.x     | TypeScript Linting   | Type-aware linting  |
| **Husky**             | 9.x     | Git Hooks            | Pre-commit checks   |
| **lint-staged**       | 16.x    | Staged Files Linting | Incremental linting |

### Documentation

| Technology        | Version | Verwendung        | Begründung           |
|-------------------|---------|-------------------|----------------------|
| **Compodoc**      | 1.x     | API Documentation | NestJS docs          |
| **AsciiDoc**      | Latest  | Architecture Docs | arc42 template       |
| **Mermaid**       | 11.x    | Diagrams          | Code-based diagrams  |
| **DBML Renderer** | 1.x     | Database Diagrams | Schema visualization |

### CI/CD & Deployment

| Technology           | Version | Verwendung        | Begründung                |
|----------------------|---------|-------------------|---------------------------|
| **GitHub Actions**   | Latest  | CI/CD Pipeline    | Native GitHub integration |
| **Docker**           | Latest  | Containerization  | Consistent environments   |
| **Docker Compose**   | Latest  | Local Development | Multi-container setup     |
| **Semantic Release** | 24.x    | Versioning        | Automated releases        |

## 🗺️ Infrastructure (Production)

### Hosting & Deployment

| Technology               | Verwendung    | Begründung                        |
|--------------------------|---------------|-----------------------------------|
| **PostgreSQL Container** | Database      | Containerisierte Datenbank-Lösung |
| **NGINX**                | Reverse Proxy | Load balancing, SSL               |

### Monitoring & Logging

| Technology     | Verwendung     | Begründung                 |
|----------------|----------------|----------------------------|
| **Prometheus** | Metrics        | Time-series metrics        |
| **Grafana**    | Visualization  | Monitoring dashboards      |
| **ELK Stack**  | Logging        | Centralized logging        |
| **Sentry**     | Error Tracking | Real-time error monitoring |

## 📦 NPM Package Catalogs

### Frontend Catalog Versions

```json
{
  "@fontsource-variable/inter": "^5.0.0",
  "@fontsource-variable/montserrat": "^5.0.0",
  "@fontsource-variable/nunito": "^5.0.0",
  "@headlessui/react": "^2.2.0",
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-form": "latest",
  "@tanstack/react-store": "latest",
  "@tanstack/react-router": "latest",
  "@tanstack/react-table": "^8.x",
  "tailwindcss": "^3.x",
  "zod": "^3.x"
}
```

### Backend Catalog Versions

```json
{
  "@nestjs/common": "^11.x",
  "@nestjs/core": "^11.x",
  "@prisma/client": "^6.x",
  "passport": "^0.7.x",
  "jsonwebtoken": "^9.x",
  "bcrypt": "^6.x"
}
```

## 🔐 Environment Variables

### Required API Keys

```bash
# Authentication
JWT_SECRET=
JWT_REFRESH_SECRET=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bluelight

# External Services
MAPBOX_API_KEY=
SENTRY_DSN=

# Development
NODE_ENV=development
```

## 📈 Performance Targets

### Frontend Metrics

| Metric                     | Target  | Current |
|----------------------------|---------|---------|
| **First Contentful Paint** | < 1.0s  | ✅ 0.8s  |
| **Time to Interactive**    | < 2.5s  | ✅ 2.1s  |
| **Bundle Size (gzipped)**  | < 200KB | ✅ 175KB |
| **Lighthouse Score**       | > 90    | ✅ 94    |

### Backend Metrics

| Metric                        | Target       | Current      |
|-------------------------------|--------------|--------------|
| **API Response Time (p95)**   | < 100ms      | ✅ 85ms       |
| **Database Query Time (p95)** | < 50ms       | ✅ 42ms       |
| **Throughput**                | > 1000 req/s | ✅ 1200 req/s |
| **Memory Usage**              | < 512MB      | ✅ 380MB      |

## 🔄 Version Management

### Semantic Versioning

Hinweis: Die folgenden Versionsangaben sind Beispiele. Die tatsächlich aktuelle Version wird durch CI/Semantic Release
bestimmt und sollte hier nicht hart codiert werden. Dieses Dokument ist mit der Semantic-Release-Pipeline zu
synchronisieren.

```
MAJOR.MINOR.PATCH-PRERELEASE

1.0.0-alpha.21  → Beispiel: aktueller Pre-Release
1.0.0-beta.1    → Beispiel: Beta-Release
1.0.0           → Beispiel: erste stabile Version
```

### Breaking Change Policy

- Major versions for breaking API changes
- Minor versions for new features
- Patch versions for bug fixes
- Alpha/Beta for pre-release testing

## 🚦 Technology Decisions

### Warum TypeScript überall?

- **Konsistenz**: Gleiche Sprache Frontend/Backend
- **Type Safety**: Fehler zur Compile-Zeit finden
- **Developer Experience**: Bessere IDE-Unterstützung
- **Refactoring**: Sicheres Refactoring möglich

### Warum Tailwind CSS?

- **Utility-First**: Schnelle Entwicklung
- **Konsistenz**: Design-System eingebaut
- **Performance**: Nur verwendete Styles
- **Maintenance**: Keine CSS-Dateien pflegen

### Warum NestJS?

- **Struktur**: Enterprise-ready Architecture
- **TypeScript**: First-class support
- **Modular**: Clean separation of concerns
- **Testing**: Eingebaute Test-Unterstützung

### Warum PostgreSQL?

- **ACID**: Transaktionale Integrität
- **JSON Support**: Flexible Datenstrukturen
- **Performance**: Optimiert für komplexe Queries
- **Extensions**: PostGIS für Geo-Daten (geplant)

### Warum Tauri?

- **Performance**: Native Performance
- **Security**: Secure by default
- **Size**: Kleine Bundle-Größen (< 10MB)
- **Cross-Platform**: Ein Codebase für alle

## 📚 Weiterführende Dokumentation

- [Frontend Architecture](./frontend-architecture.md)
- [Backend Architecture](./backend-architecture.md)
- [Database Schema](./database-schema.md)
- [API Documentation](./api-documentation.md)
- [Deployment Guide](./deployment-guide.md)
- [Security Concepts](./security-concepts.md)
