# Bluelight Hub - Projektdokumentation

> **Generiert:** 2026-01-04
> **Scan-Level:** Exhaustive
> **Workflow-Version:** 1.2.0

---

## 1. Projektübersicht

**Bluelight Hub** ist eine Desktop-Anwendung für Einsatzkräfte (Feuerwehr, Rettungsdienst) zur Verwaltung und Dokumentation von Einsätzen. Die Anwendung ermöglicht:

- Einsatzverwaltung mit Status-Tracking
- Einsatztagebuch (ETB) für Ereignisdokumentation
- Lagekarte mit Symbolen und POIs
- Kräfteverwaltung (Fahrzeuge, Personen, Qualifikationen)
- Integration mit externen Systemen (HiOrg-Server)

---

## 2. Repository-Struktur

**Typ:** Monorepo (pnpm Workspaces)

```
bluelight-hub/
├── packages/
│   ├── backend/       # NestJS API Server
│   ├── frontend/      # React + Tauri Desktop App
│   └── shared/        # Generierter API Client
├── docs/              # Projektdokumentation
└── .claude/           # AI Agent Konfiguration (BMad v6)
```

### Packages im Detail

| Package | Pfad | Beschreibung |
|---------|------|--------------|
| **@bluelight-hub/backend** | `packages/backend` | NestJS 11 REST API mit Hexagonal Architecture |
| **@bluelight-hub/frontend** | `packages/frontend` | React 19 + Tauri 2 Desktop-Anwendung |
| **@bluelight-hub/shared** | `packages/shared` | Auto-generierter TypeScript API Client |

---

## 3. Technologie-Stack

### 3.1 Backend

| Kategorie | Technologie | Version |
|-----------|-------------|---------|
| **Framework** | NestJS | 11.0.11 |
| **Language** | TypeScript | 5.8.3 |
| **ORM** | Prisma | 6.8.2 |
| **Datenbank** | PostgreSQL | 17 |
| **Auth** | JWT (passport-jwt) | - |
| **API Docs** | @nestjs/swagger | 11.1.4 |
| **Testing** | Jest | 30.0.0-beta.3 |

### 3.2 Frontend

| Kategorie | Technologie | Version |
|-----------|-------------|---------|
| **UI Library** | React | 19.1.0 |
| **Build Tool** | Vite | 6.3.5 |
| **Desktop** | Tauri | 2.5.1 |
| **Routing** | TanStack Router | 1.120.13 |
| **State** | TanStack Query + Store | 5.81.0 |
| **Forms** | TanStack Form + Zod | 1.12.3 |
| **Styling** | Tailwind CSS | 4.1.10 |
| **Testing** | Vitest | 3.2.3 |

### 3.3 DevOps

| Kategorie | Technologie |
|-----------|-------------|
| **CI/CD** | GitHub Actions |
| **Linting** | Biome 1.9.4 |
| **Git Hooks** | Husky + lint-staged |
| **Release** | semantic-release + Gitmoji |
| **Container** | Docker (PostgreSQL) |

---

## 4. Architektur-Patterns

### 4.1 Backend: Hexagonal Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Modules (HTTP Layer)                  │
│              Controllers, Decorators, Guards             │
├─────────────────────────────────────────────────────────┤
│                 Application (Use Cases)                  │
│        Command Handlers, Query Handlers, DTOs            │
├─────────────────────────────────────────────────────────┤
│                 Domain (Business Logic)                  │
│   Entities, Value Objects, Events, Repository Interfaces │
├─────────────────────────────────────────────────────────┤
│               Infrastructure (Adapters)                  │
│    Prisma Repos, Event Bus, Outbox, External Services   │
└─────────────────────────────────────────────────────────┘
```

**Implementierte Patterns:**
- **CQRS** - Getrennte Command/Query Handler
- **Result<T>** - Error Handling ohne Exceptions
- **Outbox Pattern** - Zuverlässige Event-Publikation
- **DDD** - Aggregates, Entities, Value Objects, Domain Events
- **Repository Pattern** - Interface im Domain, Implementierung in Infrastructure

### 4.2 Frontend: Feature-based + Atomic Design

```
features/
├── einsatz/
│   ├── api/        # TanStack Query Hooks
│   ├── stores/     # TanStack Store
│   ├── ui/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── pages/
│   └── utils/
├── etb/
├── kraefte/
└── lagekarte/
```

---

## 5. Datenmodell-Übersicht

### 5.1 Prisma-Modelle (10)

| Modell | Beschreibung | Relationen |
|--------|--------------|------------|
| **Einsatz** | Kerneinsatz-Entity | ETB, Lagekarte, Fahrzeuge, Personen |
| **EtbEintrag** | Einsatztagebuch-Eintrag | → Einsatz |
| **LagekartePoi** | Kartenmarker | → Einsatz |
| **EinsatzFahrzeug** | Fahrzeug-Zuweisung | → Einsatz, → Fahrzeug |
| **EinsatzPerson** | Personen-Zuweisung | → Einsatz, → Stammperson |
| **Stammperson** | Basis-Personendaten | ← EinsatzPerson |
| **Fahrzeug** | Fahrzeug-Stammdaten | ← EinsatzFahrzeug |
| **Qualifikation** | Qualifikations-Stammdaten | - |
| **User** | Benutzer | - |
| **OutboxEvent** | Event-Outbox | - |

### 5.2 Domain Entities (9+)

- Einsatz (Aggregate Root)
- EtbEintrag
- LagekarteEintrag
- EinsatzFahrzeug
- EinsatzPerson
- Stammperson
- Fahrzeug
- Qualifikation
- User

### 5.3 Value Objects (18+)

ID-Typen, Status-Enums, Koordinaten, Adressen, etc.

---

## 6. API-Übersicht

**Basis-URL:** `http://localhost:3091/api`

### Endpoints nach Modul

| Modul | Endpoints | Auth |
|-------|-----------|------|
| Health | 1 | Keine |
| Auth | 3+ | Mixed |
| Einsatz | 5+ | JWT |
| ETB | 2+ | JWT |
| Lagekarte | 4+ | JWT |
| Kräfte | 6+ | JWT |
| User Management | 4+ | Admin JWT |
| Integrations | 3+ | JWT |

**Gesamt:** 24+ REST Endpoints

---

## 7. Development-Umgebung

### Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 3090 |
| Backend (NestJS) | 3091 |
| PostgreSQL | 3092 |
| Prisma Studio | 3093 |

### Wichtige Commands

```bash
# Development
pnpm -r dev                    # Alle Services starten
pnpm run generate-api          # API Client generieren

# Testing
pnpm --filter @bluelight-hub/backend test
pnpm --filter @bluelight-hub/frontend test

# Linting
pnpm lint                      # Biome lint + fix

# Database
pnpm --filter @bluelight-hub/backend prisma:migrate
pnpm --filter @bluelight-hub/backend prisma:studio
```

---

## 8. Dokumentations-Index

| Dokument | Beschreibung |
|----------|--------------|
| `CLAUDE.md` | AI Agent Instruktionen |
| `README.md` | Projekt-Einführung |
| `architecture.md` | Architektur-Details |
| `CHANGELOG.md` | Version History |

---

*Dokumentation generiert durch BMad Document-Project Workflow v1.2.0*
