---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/prd.md
  - docs/ux-design-specification.md
  - docs/analysis/research/domain-kraefte-management-research-2025-12-09.md
  - docs/architecture/index.md
  - docs/index/index.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-09'
project_name: 'Bluelight Hub - Kräfte-Management'
feature_name: 'Kräfte'
github_issue: 49
user_name: 'Ruben'
date: '2025-12-09'
project_context: 'brownfield'
---

# Architecture Decision Document - Kräfte-Management

_Dieses Dokument entsteht durch schrittweise gemeinsame Entdeckung. Abschnitte werden angehängt, während wir architektonische Entscheidungen erarbeiten._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- 41 FRs in 9 Kategorien: Fahrzeug, Personen, Rollen, Stärke, Dashboard, Lagekarte, ETB, Admin, Integrationen
- Kernfunktionen: Schnellerfassung (< 5s), Auto-ETB, Taktische Stärke, QR-Code-Registrierung
- Integrationen: HiOrg-Server (Stammdaten-Import), DRK-Helfer-App (QR-Code)

**Non-Functional Requirements:**
- Performance: Dashboard < 2s, Status-Update < 1s
- Compliance: ETB unveränderlich, 10 Jahre Aufbewahrung
- Reliability: Offline-Modus, Auto-Sync, atomare Persistierung
- Integration: Lose Kopplung via Domain Events, Port/Adapter Pattern

**Scale & Complexity:**
- Primary domain: Full-Stack Desktop App (Tauri + NestJS)
- Complexity level: Medium-High
- Estimated architectural components: 6 Domain Entities, 4 Ports/Adapters, 3 Module-Integrationen

### Technical Constraints & Dependencies

**Brownfield Constraints:**
- Muss bestehende Hexagonale Architektur (DDD + CQRS) folgen
- TransactionalCommandHandler für atomare Event-Persistierung
- Outbox Pattern für ETB-Integration bereits etabliert
- TanStack Query/Form/Store als Frontend-Standard

**External Dependencies:**
- HiOrg-Server REST API (Stammdaten-Sync)
- DRK-Helfer-App QR-Code Format (Helfer-Registrierung)
- Bestehende Module: ETB, Lagekarte, Einsatz

### Cross-Cutting Concerns Identified

1. **ETB-Integration:** Alle Status-Änderungen müssen automatisch ETB-Einträge erzeugen (via Domain Events)
2. **Taktische Stärke:** Echtzeit-Berechnung bei jeder Änderung an Kräften
3. **Konfigurierbarkeit:** Funkstatus 7-9, Qualifikationen, Rollen sind mandantenspezifisch
4. **Dual-Mode UI:** Compact (Bearbeitung) vs. FullScreen (Übersicht) mit shared Components
5. **Offline-Fähigkeit:** Lokales Caching mit Auto-Sync bei Reconnect

---

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Desktop App (Brownfield Extension) - Tauri + NestJS + React

### Starter: Existing Bluelight Hub Codebase

**Rationale:** Dies ist eine Brownfield-Erweiterung. Kein neues Starter-Template erforderlich - das Kräfte-Modul integriert sich in die bestehende Architektur.

**Bestehende Patterns werden übernommen:**

| Pattern | Verwendung im Kräfte-Modul |
|---------|---------------------------|
| Hexagonale Architektur | Domain/Application/Infrastructure Layer |
| CQRS | CreateKraftCommand, UpdateStatusCommand, GetDashboardQuery |
| Domain Events | KraftErfasst, StatusGeaendert → ETB-Consumer |
| TransactionalCommandHandler | Atomare Status-Updates mit ETB-Event |
| Outbox Pattern | Reliable ETB-Integration |
| Port/Adapter | IHelferRegistrationPort, IStammdatenSyncPort |

**Kräfte-Modul Struktur:**

```
packages/backend/src/
├── domain/kraefte/
│   ├── entities/          # Fahrzeug, Person, Rolle
│   ├── value-objects/     # FunkStatus, Qualifikation, TaktischeStaerke
│   ├── events/            # KraftErfasst, StatusGeaendert
│   └── repositories/      # IFahrzeugRepository, IPersonRepository
├── application/kraefte/
│   ├── commands/          # CreateFahrzeug, UpdateStatus, AssignPerson
│   ├── queries/           # GetDashboard, GetTaktischeStaerke
│   └── ports/             # IHelferRegistrationPort, IStammdatenSyncPort
├── infrastructure/kraefte/
│   ├── repositories/      # PrismaFahrzeugRepository
│   └── adapters/          # DrkHelferAppAdapter, HiOrgServerAdapter
└── modules/kraefte/
    └── controllers/       # KraefteController, AdminController

packages/frontend/src/
├── components/organisms/kraefte/
│   ├── KraefteDashboard.tsx
│   ├── FahrzeugTabelle.tsx
│   ├── StaerkeAnzeige.tsx
│   └── QrScanner.tsx
├── hooks/kraefte/
│   ├── useKraefteDashboard.ts
│   ├── useFahrzeuge.ts
│   └── useTaktischeStaerke.ts
└── routes/kraefte/
    ├── index.tsx          # Dashboard
    └── admin.tsx          # Stammdaten
```

**Note:** Kein `npx create-*` erforderlich - Integration in bestehendes Monorepo.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Stammdaten vs. Einsatzdaten Trennung
- ETB-Integration via Domain Events
- Konfigurierbare Funkstatus

**Important Decisions (Shape Architecture):**
- QR-Code Scanner Strategie
- Dual-Mode UI Pattern

**Deferred Decisions (Post-MVP):**
- GPS-Tracking für Fahrzeuge
- Mobile App für Status-Updates

### Data Architecture

**ADR-K1: Stammdaten vs. Einsatzdaten**

| Aspekt | Entscheidung |
|--------|--------------|
| Pattern | Separate Entities mit Kopier-Semantik |
| Stammdaten | `Fahrzeug`, `Person`, `Qualifikation`, `Rolle` |
| Einsatzdaten | `EinsatzFahrzeug`, `EinsatzPerson`, `EinsatzRolle` |
| Referenz | Einsatz-Entity hält `stammId` für Traceability |
| Rationale | Stammdaten ändern sich nicht während Einsatz, Dokumentation bleibt konsistent |

**ADR-K2: Konfigurierbare Funkstatus**

| Aspekt | Entscheidung |
|--------|--------------|
| Pattern | Config Table in Datenbank |
| Entity | `FunkStatusConfig` mit `code`, `label`, `farbe`, `istAlarmierbar` |
| Scope | Mandantenspezifisch (Status 7-9 regional unterschiedlich) |
| Admin | CRUD via Admin-Portal |
| Rationale | Typsicher, persistiert, flexibel pro Leitstellen-Bereich |

### Domain Events & ETB-Integration

**ADR-K3: Event-Granularität**

| Aspekt | Entscheidung |
|--------|--------------|
| Pattern | Fein-granulare Domain Events |
| Events | `FahrzeugErfasst`, `FahrzeugStatusGeaendert`, `PersonZugewiesen`, `PersonAbgemeldet`, `RolleBesetzt`, `RolleFreigegeben` |
| ETB-Mapping | Jeder Event-Typ hat eigene ETB-Vorlage |
| Handler | `EtbAutoCreationHandler` konsumiert alle Kräfte-Events |
| Rationale | Präzise ETB-Einträge, passt zu bestehendem Outbox-Pattern |

### Frontend Architecture

**ADR-K4: QR-Code Scanner**

| Aspekt | Entscheidung |
|--------|--------------|
| Pattern | Hybrid (Tauri + Browser Fallback) |
| Tauri | Plugin für native Kamera-Integration (wenn verfügbar) |
| Browser | `navigator.mediaDevices` + zxing-js Library |
| Detection | Runtime-Check ob Tauri-API verfügbar |
| Rationale | Beste Kompatibilität, optimale UX auf Desktop |

**ADR-K5: Dual-Mode UI**

| Aspekt | Entscheidung |
|--------|--------------|
| Pattern | Generische FullscreenContainer-Komponente |
| Component | `<FullscreenContainer>` wrapt Dashboard-Content |
| Density | CSS Custom Properties oder Tailwind data-Attribute |
| Toggle | Button im Dashboard-Header |
| Rationale | Wiederverwendbar, ein Component für beide Modi |

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma Schema (Stamm + Einsatz Entities, FunkStatusConfig)
2. Domain Layer (Entities, Value Objects, Events)
3. Application Layer (Commands, Queries, Event Handlers)
4. Infrastructure Layer (Repositories, Adapters)
5. API Layer (Controller, DTOs)
6. Frontend (Hooks, Components, QR-Scanner)

**Cross-Component Dependencies:**
- ETB-Modul konsumiert alle `Kraft*`-Events
- Lagekarte-Modul konsumiert `EinsatzFahrzeugErfasst` für POI-Sync
- Admin-Modul teilt `FunkStatusConfig` mit Kräfte-Modul

---

## Implementation Patterns & Consistency Rules

### Bestehende Patterns (aus CLAUDE.md)

Diese Patterns sind projektweiter Standard und gelten unverändert:

| Kategorie | Pattern |
|-----------|---------|
| API Controller | `@ApiTags`, `@ApiOperation`, `@ApiResponse` Decorators |
| DTOs | `class-validator` + `@ApiProperty` für OpenAPI |
| DI Imports | `import` für Injectable, `import type` nur für reine Typen |
| DI Tokens | `DI_TOKENS.REPOSITORIES.*` als Symbols |
| Application Layer | Nur `@Injectable`, `@Inject`, `@Optional` erlaubt |
| Result Pattern | `Result<T>` statt Exceptions für Business-Fehler |
| Transactional | `TransactionalCommandHandler` für atomare Events |
| Tests | AAA Pattern mit Given-When-Then Kommentaren |
| Frontend State | TanStack Query für Server-State |
| Forms | @tanstack/react-form + Zod |
| Styling | Tailwind CSS + Headless UI |
| API Client | IMMER generiert via `pnpm run generate-api` |

### Kräfte-spezifische Patterns

#### Domain Event Naming

**Konvention:** `<Aggregate><Aktion>` in PascalCase

| Event | Beschreibung |
|-------|--------------|
| `FahrzeugErfasst` | Fahrzeug wurde im Einsatz erfasst |
| `FahrzeugStatusGeaendert` | FMS-Status geändert |
| `PersonZugewiesen` | Person einem Fahrzeug zugewiesen |
| `PersonAbgemeldet` | Person von Fahrzeug abgemeldet |
| `RolleBesetzt` | Führungsrolle besetzt |
| `RolleFreigegeben` | Führungsrolle freigegeben |

**Event Payload Struktur:**

```typescript
interface KraefteEvent extends DomainEvent {
  einsatzId: string;
  aggregateId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}
```

#### ETB-Text-Vorlagen (Hardcoded)

| Event | ETB-Text Template |
|-------|-------------------|
| `FahrzeugErfasst` | `"{funkrufname}" ({typ}) erfasst` |
| `FahrzeugStatusGeaendert` | `"{funkrufname}": Status {altStatus} → {neuStatus}` |
| `PersonZugewiesen` | `"{name}" ({qualifikation}) → "{fahrzeugFunkruf}" zugewiesen` |
| `PersonAbgemeldet` | `"{name}" von "{fahrzeugFunkruf}" abgemeldet` |
| `RolleBesetzt` | `Rolle "{rollenName}" besetzt durch "{personName}"` |
| `RolleFreigegeben` | `Rolle "{rollenName}" freigegeben` |

#### Prisma Schema Naming

**Stammdaten (persistent):**
- `Fahrzeug`, `Person`, `Qualifikation`, `RollenDefinition`
- Existieren unabhängig von Einsätzen
- Werden über Admin-Portal gepflegt

**Einsatzdaten (pro Einsatz):**
- `EinsatzFahrzeug`, `EinsatzPerson`, `EinsatzRolle`
- Kopie der Stammdaten zum Erfassungszeitpunkt
- `stammId` als optionale Referenz (nullable für temporäre Einträge)

**Config-Entities:**
- `FunkStatusConfig` - Mandantenspezifische Status-Konfiguration

#### API Endpoint Structure

**Einsatz-bezogene Kräfte API:**

```
/api/einsatz/{einsatzId}/kraefte
  GET    /                       → Dashboard-Daten inkl. Stärke
  GET    /staerke                → Nur Taktische Stärke

/api/einsatz/{einsatzId}/kraefte/fahrzeuge
  GET    /                       → Alle Fahrzeuge im Einsatz
  POST   /                       → Fahrzeug erfassen (aus Stamm oder temporär)
  PATCH  /{id}/status            → FMS-Status ändern

/api/einsatz/{einsatzId}/kraefte/personen
  GET    /                       → Alle Personen im Einsatz
  POST   /                       → Person manuell registrieren
  POST   /qr                     → Person via QR-Code registrieren
  DELETE /{id}                   → Person abmelden

/api/einsatz/{einsatzId}/kraefte/rollen
  GET    /                       → Alle Rollen mit Besetzungsstatus
  PATCH  /{id}/besetzen          → Rolle besetzen
  PATCH  /{id}/freigeben         → Rolle freigeben
```

**Admin Stammdaten API:**

```
/api/admin/kraefte/fahrzeuge     → CRUD Stamm-Fahrzeuge
/api/admin/kraefte/personen      → CRUD Stamm-Personen
/api/admin/kraefte/qualifikationen → CRUD Qualifikationen
/api/admin/kraefte/rollen        → CRUD Rollen-Definitionen
/api/admin/kraefte/funkstatus    → CRUD Funkstatus-Config (7-9)
```

#### Frontend Route Structure

**Einsatz-Kontext (bestehende Struktur erweitern):**

```
/app/einsatz/$einsatzId/kräfte/
├── index.tsx         # Dashboard mit Stärke (NEU)
├── fahrzeuge.tsx     # Fahrzeug-Tabelle (ERWEITERN)
├── personal.tsx      # Personal-Tabelle (ERWEITERN)
├── einheiten.tsx     # (EXISTIERT)
└── rollen.tsx        # Führungsrollen (NEU)
```

**Admin-Kontext:**

```
/admin/kraefte/
├── index.tsx           # Übersicht
├── fahrzeuge.tsx       # Stammdaten Fahrzeuge
├── personen.tsx        # Stammdaten Personen
├── qualifikationen.tsx # Qualifikationen verwalten
├── rollen.tsx          # Rollen-Definitionen
└── funkstatus.tsx      # Funkstatus 7-9 konfigurieren
```

### Enforcement Guidelines

**Alle AI Agents MÜSSEN:**

1. Domain Events über `TransactionalCommandHandler` + Outbox persistieren
2. ETB-Einträge automatisch via Event Handler erstellen (nicht im Command)
3. Stammdaten bei Erfassung in Einsatz kopieren (nicht referenzieren)
4. API-Responses via generiertem Client konsumieren
5. TanStack Query Hooks für alle API-Calls verwenden

**Pattern Violations vermeiden:**

- ❌ Direkte Event-Emits ohne Outbox
- ❌ Manuelle fetch() Calls statt generiertem Client
- ❌ Stammdaten-Referenzen statt Kopien in Einsatz-Entities
- ❌ HTTP-Exceptions in Application Layer

---

## Project Structure & Boundaries

### Requirements → Component Mapping

**Aus PRD (41 FRs in 9 Kategorien):**

| FR Kategorie | Backend Location | Frontend Location |
|--------------|------------------|-------------------|
| **Fahrzeug-Management (FR1-5)** | `application/kraefte/commands/fahrzeug/` | `features/kraefte/ui/organisms/FahrzeugTabelle` |
| **Personen-Management (FR6-10)** | `application/kraefte/commands/person/` | `features/kraefte/ui/organisms/PersonenListe` |
| **Rollen-Management (FR11-14)** | `application/kraefte/commands/rolle/` | `features/kraefte/ui/organisms/RollenUebersicht` |
| **Taktische Stärke (FR15-18)** | `application/kraefte/queries/get-staerke/` | `features/kraefte/ui/molecules/StaerkeAnzeige` |
| **Dashboard (FR19-24)** | `application/kraefte/queries/get-dashboard/` | `features/kraefte/ui/pages/Dashboard` |
| **Lagekarte-Integration (FR25-26)** | `application/lagekarte/event-handlers/` | `features/lagekarte/` (bestehend) |
| **ETB-Integration (FR27-31)** | `application/etb/event-handlers/kraefte-events` | - (automatisch) |
| **Admin & Config (FR32-37)** | `modules/admin/controllers/kraefte/` | `features/admin/ui/pages/kraefte/` |
| **Externe Integrationen (FR38-41)** | `infrastructure/kraefte/adapters/` | `features/kraefte/ui/organisms/QrScanner` |

### Complete Project Directory Structure

```
packages/backend/src/
├── domain/
│   ├── aggregates/
│   │   ├── einsatz-fahrzeug.aggregate.ts      # NEU: Fahrzeug im Einsatz
│   │   └── einsatz-fahrzeug.aggregate.spec.ts
│   ├── entities/
│   │   ├── stamm-fahrzeug.entity.ts           # NEU: Stammdaten
│   │   ├── stamm-person.entity.ts             # NEU: Stammdaten
│   │   ├── einsatz-person.entity.ts           # NEU: Person im Einsatz
│   │   ├── einsatz-rolle.entity.ts            # NEU: Rolle im Einsatz
│   │   └── __tests__/
│   ├── value-objects/
│   │   ├── funk-status.vo.ts                  # NEU: Status 0-9
│   │   ├── qualifikation.vo.ts                # NEU: RS, NotSan, etc.
│   │   ├── taktische-staerke.vo.ts            # NEU: F/U/H/G Format
│   │   ├── funkrufname.vo.ts                  # NEU: OPTA-konform
│   │   └── __tests__/
│   ├── events/
│   │   ├── fahrzeug-erfasst.event.ts          # NEU
│   │   ├── fahrzeug-status-geaendert.event.ts # NEU
│   │   ├── person-zugewiesen.event.ts         # NEU
│   │   ├── person-abgemeldet.event.ts         # NEU
│   │   ├── rolle-besetzt.event.ts             # NEU
│   │   ├── rolle-freigegeben.event.ts         # NEU
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-stamm-fahrzeug.repository.ts     # NEU: Interface
│   │   ├── i-stamm-person.repository.ts       # NEU: Interface
│   │   ├── i-einsatz-fahrzeug.repository.ts   # NEU: Interface
│   │   ├── i-einsatz-person.repository.ts     # NEU: Interface
│   │   └── i-funk-status-config.repository.ts # NEU: Interface
│   └── ports/
│       ├── i-helfer-registration.port.ts      # NEU: QR-Code Interface
│       └── i-stammdaten-sync.port.ts          # NEU: HiOrg-Server Interface
│
├── application/kraefte/                        # NEU: Komplettes Modul
│   ├── commands/
│   │   ├── fahrzeug/
│   │   │   ├── erfasse-fahrzeug.command.ts
│   │   │   ├── erfasse-fahrzeug.handler.ts
│   │   │   ├── erfasse-fahrzeug.handler.spec.ts
│   │   │   ├── aendere-status.command.ts
│   │   │   ├── aendere-status.handler.ts
│   │   │   └── aendere-status.handler.spec.ts
│   │   ├── person/
│   │   │   ├── registriere-person.command.ts
│   │   │   ├── registriere-person.handler.ts
│   │   │   ├── registriere-person-qr.command.ts
│   │   │   ├── registriere-person-qr.handler.ts
│   │   │   ├── weise-person-zu.command.ts
│   │   │   ├── weise-person-zu.handler.ts
│   │   │   ├── melde-person-ab.command.ts
│   │   │   └── melde-person-ab.handler.ts
│   │   └── rolle/
│   │       ├── besetze-rolle.command.ts
│   │       ├── besetze-rolle.handler.ts
│   │       ├── gib-rolle-frei.command.ts
│   │       └── gib-rolle-frei.handler.ts
│   ├── queries/
│   │   ├── get-dashboard/
│   │   │   ├── get-dashboard.query.ts
│   │   │   ├── get-dashboard.handler.ts
│   │   │   └── get-dashboard.handler.spec.ts
│   │   ├── get-staerke/
│   │   │   ├── get-staerke.query.ts
│   │   │   └── get-staerke.handler.ts
│   │   ├── get-fahrzeuge/
│   │   ├── get-personen/
│   │   └── get-rollen/
│   ├── dto/
│   │   ├── dashboard.dto.ts
│   │   ├── fahrzeug.dto.ts
│   │   ├── person.dto.ts
│   │   ├── rolle.dto.ts
│   │   └── taktische-staerke.dto.ts
│   ├── mappers/
│   │   ├── fahrzeug.mapper.ts
│   │   ├── person.mapper.ts
│   │   └── __tests__/
│   └── event-handlers/
│       └── etb-auto-creation.handler.ts       # Konsumiert alle Kräfte-Events
│
├── infrastructure/kraefte/                     # NEU
│   ├── repositories/
│   │   ├── prisma-stamm-fahrzeug.repository.ts
│   │   ├── prisma-stamm-person.repository.ts
│   │   ├── prisma-einsatz-fahrzeug.repository.ts
│   │   ├── prisma-einsatz-person.repository.ts
│   │   ├── prisma-funk-status-config.repository.ts
│   │   └── __tests__/
│   ├── adapters/
│   │   ├── drk-helfer-app-qr.adapter.ts       # IHelferRegistrationPort
│   │   ├── hiorg-server-api.adapter.ts        # IStammdatenSyncPort
│   │   └── __tests__/
│   └── mappers/
│       └── prisma-kraefte.mapper.ts
│
├── modules/kraefte/                            # NEU: API Module
│   ├── kraefte.module.ts
│   └── controllers/
│       ├── kraefte.controller.ts              # /api/einsatz/{id}/kraefte
│       ├── kraefte.controller.spec.ts
│       └── __tests__/
│
└── modules/admin/controllers/kraefte/          # NEU: Admin API
    ├── admin-stamm-fahrzeuge.controller.ts
    ├── admin-stamm-personen.controller.ts
    ├── admin-qualifikationen.controller.ts
    ├── admin-rollen.controller.ts
    └── admin-funkstatus.controller.ts

packages/backend/prisma/
└── migrations/
    └── 20251209_add_kraefte_module/            # NEU
        └── migration.sql

packages/frontend/src/features/kraefte/         # NEU: Komplettes Feature
├── api/
│   ├── kraefte.api.ts                         # Generierter Client Wrapper
│   └── index.ts
├── hooks/
│   ├── use-kraefte-dashboard.ts
│   ├── use-fahrzeuge.ts
│   ├── use-personen.ts
│   ├── use-rollen.ts
│   ├── use-taktische-staerke.ts
│   ├── use-erfasse-fahrzeug.ts
│   ├── use-qr-scanner.ts
│   └── index.ts
├── stores/
│   ├── dashboard-mode.store.ts                # Compact vs FullScreen
│   └── index.ts
├── schemas/
│   ├── fahrzeug.schema.ts                     # Zod Schemas
│   ├── person.schema.ts
│   └── index.ts
├── types/
│   ├── kraefte.types.ts
│   └── index.ts
├── ui/
│   ├── atoms/
│   │   ├── StatusBadge.tsx
│   │   ├── QualifikationBadge.tsx
│   │   └── index.ts
│   ├── molecules/
│   │   ├── StaerkeAnzeige.tsx                 # F/U/H/G Display
│   │   ├── FahrzeugStatusSelect.tsx
│   │   ├── QualifikationSelect.tsx
│   │   ├── RolleBesetzungStatus.tsx
│   │   └── index.ts
│   ├── organisms/
│   │   ├── KraefteDashboard.tsx               # Haupt-Dashboard
│   │   ├── FahrzeugTabelle.tsx
│   │   ├── PersonenListe.tsx
│   │   ├── RollenUebersicht.tsx
│   │   ├── QrScanner.tsx                      # Kamera-Integration
│   │   ├── FahrzeugErfassungForm.tsx
│   │   ├── PersonErfassungForm.tsx
│   │   ├── FullscreenContainer.tsx            # Dual-Mode Wrapper
│   │   └── index.ts
│   └── pages/
│       ├── KraeftePage.tsx                    # Route Entry Point
│       └── index.ts
└── index.ts

packages/frontend/src/features/admin/ui/pages/kraefte/  # NEU: Admin UI
├── StammFahrzeugePage.tsx
├── StammPersonenPage.tsx
├── QualifikationenPage.tsx
├── RollenDefinitionenPage.tsx
├── FunkstatusConfigPage.tsx
└── index.ts

packages/frontend/src/routes/                   # TanStack Router
├── app/
│   └── einsatz/
│       └── $einsatzId/
│           └── kraefte/
│               ├── index.tsx                  # → KraeftePage
│               ├── fahrzeuge.tsx
│               ├── personal.tsx
│               └── rollen.tsx
└── admin/
    └── kraefte/
        ├── index.tsx
        ├── fahrzeuge.tsx
        ├── personen.tsx
        ├── qualifikationen.tsx
        ├── rollen.tsx
        └── funkstatus.tsx
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Endpoint Pattern | Auth |
|----------|------------------|------|
| Einsatz-Kräfte | `/api/einsatz/{einsatzId}/kraefte/*` | User (einsatz-bezogen) |
| Admin Stammdaten | `/api/admin/kraefte/*` | Admin only |
| Sync Endpoints | `/api/admin/kraefte/sync/*` | Admin only |

**Domain Event Flow:**

```
Command Handler → Domain Event → Outbox → Event Handler → ETB Entry
     ↓                                         ↓
TransactionalCommandHandler              EtbAutoCreationHandler
```

**Data Boundaries:**

| Layer | Responsibility |
|-------|----------------|
| Domain | Entities, Value Objects, Business Rules |
| Application | Use Cases (Commands/Queries), DTOs |
| Infrastructure | Prisma Repositories, External Adapters |
| Modules | HTTP Controllers, OpenAPI Decorators |

### Cross-Module Integration

| Source Event | Consumer Module | Action |
|--------------|-----------------|--------|
| `FahrzeugStatusGeaendert` | ETB | Auto-Eintrag erstellen |
| `PersonZugewiesen` | ETB | Auto-Eintrag erstellen |
| `RolleBesetzt` | ETB | Auto-Eintrag erstellen |
| `FahrzeugErfasst` | Lagekarte | POI erstellen (ohne GPS) |

### Integration Points

**Internal Communication:**
- Commands/Queries via NestJS CQRS
- Domain Events via Outbox Pattern + EventEmitter2
- Frontend ↔ Backend via generiertem OpenAPI Client

**External Integrations:**
- HiOrg-Server API: REST via `IStammdatenSyncPort` → `HiOrgServerApiAdapter`
- DRK-Helfer App: QR-Code Scan via `IHelferRegistrationPort` → `DrkHelferAppQrAdapter`

**Data Flow:**
```
User Action → Frontend Hook → API Client → Controller → Command/Query Handler
     ↓                                                           ↓
UI Update ← Query Invalidation ← Domain Event ← Repository ← Business Logic
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Alle Technologien (NestJS, Prisma, TanStack, Tauri) sind kompatibel und bereits im Projekt etabliert. Die gewählten Patterns (CQRS, Domain Events, Hexagonal Architecture) ergänzen sich gegenseitig und folgen den bestehenden Projekt-Konventionen.

**Pattern Consistency:**
- Naming Conventions folgen bestehendem `<Aggregate><Aktion>` Pattern
- Struktur-Patterns spiegeln etablierte Module (etb, lagekarte, einsatz)
- Kommunikations-Patterns (Outbox, EventEmitter2) sind projektweiter Standard

**Structure Alignment:**
Die definierte Projekt-Struktur fügt sich nahtlos in das bestehende Monorepo ein. Alle Boundaries (Domain → Application → Infrastructure → Modules) werden respektiert.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| FR Kategorie | Anzahl | Architektur-Support |
|--------------|--------|---------------------|
| Fahrzeug-Management | 5 | Commands, Entities, Repository |
| Personen-Management | 5 | Commands, QR-Adapter, DB-Matching |
| Rollen-Management | 4 | Commands, Qualifikations-Validation |
| Taktische Stärke | 4 | Value Object, Dedicated Query |
| Dashboard & Übersicht | 6 | GetDashboardQuery, FullscreenContainer |
| Lagekarte-Integration | 2 | Domain Event → Lagekarte Handler |
| ETB-Integration | 5 | Outbox Pattern, EtbAutoCreationHandler |
| Administration | 6 | Admin Controllers, Config Entity |
| Externe Integrationen | 4 | Port/Adapter (HiOrg, DRK-App) |
| **Gesamt** | **41** | **100% abgedeckt** |

**Non-Functional Requirements Coverage:**

| NFR Kategorie | Anzahl | Architektur-Support |
|---------------|--------|---------------------|
| Performance | 5 | TanStack Query Caching, optimierte Queries |
| Security & Compliance | 5 | ETB Immutability, Auth Guards, Mandanten-Isolation |
| Reliability & Offline | 4 | Outbox Pattern, TanStack Offline, Autosave |
| Integration | 4 | Domain Events, Port/Adapter Pattern |
| Usability | 4 | Dual-Mode UI, CSS Custom Properties |
| **Gesamt** | **22** | **100% abgedeckt** |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 5 ADRs (K1-K5) vollständig dokumentiert mit Rationale
- Kritische Entscheidungen (Stamm/Einsatz-Trennung, ETB-Integration) klar definiert
- Deferred Decisions (GPS, Mobile App) explizit als Post-MVP markiert

**Structure Completeness:**
- Vollständige Backend-Struktur (Domain → Application → Infrastructure → Modules)
- Vollständige Frontend-Struktur (features/kraefte mit allen Subfoldern)
- Alle Routes definiert (Einsatz-Kontext + Admin-Kontext)

**Pattern Completeness:**
- Event Naming und Payload-Struktur definiert
- ETB-Text-Vorlagen für alle Event-Typen
- API Endpoint Structure vollständig spezifiziert
- Enforcement Guidelines für AI Agents dokumentiert

### Gap Analysis Results

**Kritische Lücken:** Keine

**Wichtige Lücken (empfohlen):**

| Gap | Empfehlung |
|-----|------------|
| DI Token Constants | `DI_TOKENS.REPOSITORIES.KRAEFTE.*` bei Implementation ergänzen |
| Prisma Schema | Beim Implementation Start als erstes definieren |

**Nice-to-Have:**

| Gap | Benefit |
|-----|---------|
| QR-Code Format-Spec | Schnellere DRK-Adapter Implementierung |
| HiOrg API Response-Beispiel | Klareres Qualifikations-Mapping |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (Brownfield, GitHub Issue #49)
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (Hexagonal, CQRS, Outbox)
- [x] Cross-cutting concerns mapped (ETB, Stärke, Konfigurierbarkeit, Dual-Mode, Offline)

**✅ Architectural Decisions**
- [x] Critical decisions documented (ADR-K1 to ADR-K5)
- [x] Technology stack fully specified (bestehender Stack)
- [x] Integration patterns defined (Port/Adapter, Domain Events)
- [x] Performance considerations addressed (Caching, Query-Optimierung)

**✅ Implementation Patterns**
- [x] Naming conventions established (Event Naming, Prisma Schema)
- [x] Structure patterns defined (Feature-based, Hexagonal Layers)
- [x] Communication patterns specified (Outbox, EventEmitter2)
- [x] Process patterns documented (TransactionalCommandHandler, Auto-ETB)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Nahtlose Integration in bewährte Brownfield-Architektur
- Vollständige FR/NFR-Abdeckung durch architektonische Entscheidungen
- Klare Separation of Concerns (Stamm vs. Einsatz, Domain vs. Infrastructure)
- Robuste ETB-Integration durch bestehendes Outbox-Pattern

**Areas for Future Enhancement:**
- GPS-Tracking für Fahrzeuge (Post-MVP)
- Mobile App für Status-Updates (Vision)
- Erweiterte Offline-Konfliktlösung (über Last-Write-Wins hinaus)

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-09
**Document Location:** docs/architecture-kraefte.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- 5 architektonische Entscheidungen (ADR-K1 bis ADR-K5) mit Rationale
- Implementation Patterns für AI Agent Consistency
- Vollständige Projekt-Struktur mit allen Dateien und Verzeichnissen
- Requirements-zu-Architektur Mapping
- Validation mit Kohärenz- und Vollständigkeits-Prüfung

**🏗️ Implementation Ready Foundation**

- 5 Architektur-Entscheidungen dokumentiert
- 10+ Implementation Patterns definiert
- 6 Domain Entities, 4 Ports/Adapters spezifiziert
- 41 FRs + 22 NFRs vollständig unterstützt

**📚 AI Agent Implementation Guide**

- Bestehender Tech-Stack mit verifizierten Patterns
- Consistency Rules zur Vermeidung von Implementierungs-Konflikten
- Projekt-Struktur mit klaren Boundaries
- Integration Patterns und Kommunikations-Standards

### Implementation Handoff

**Für AI Agents:**
Dieses Architektur-Dokument ist der vollständige Guide für die Implementierung des Kräfte-Management-Moduls. Folge allen Entscheidungen, Patterns und Strukturen exakt wie dokumentiert.

**Erste Implementation-Priorität:**
1. Prisma Schema für Kräfte-Entities erstellen
2. Domain Layer (Entities, Value Objects, Events)
3. Application Layer (Commands, Queries, Handlers)

**Development Sequence:**

1. Prisma Schema erweitern (Stamm + Einsatz Entities, FunkStatusConfig)
2. Domain Layer implementieren (Entities, Value Objects, Events)
3. Application Layer implementieren (Commands, Queries, Event Handlers)
4. Infrastructure Layer implementieren (Repositories, Adapters)
5. API Layer implementieren (Controllers, DTOs)
6. Frontend implementieren (Hooks, Components, QR-Scanner)

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] Alle Entscheidungen arbeiten konfliktfrei zusammen
- [x] Technologie-Choices sind kompatibel
- [x] Patterns unterstützen die architektonischen Entscheidungen
- [x] Struktur aligned mit allen Choices

**✅ Requirements Coverage**
- [x] Alle funktionalen Requirements werden unterstützt (41/41)
- [x] Alle nicht-funktionalen Requirements werden adressiert (22/22)
- [x] Cross-cutting Concerns werden behandelt
- [x] Integration Points sind definiert

**✅ Implementation Readiness**
- [x] Entscheidungen sind spezifisch und actionable
- [x] Patterns verhindern Agent-Konflikte
- [x] Struktur ist vollständig und unambiguous
- [x] Beispiele sind für Klarheit bereitgestellt

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

