# BlueLight-Hub Project Overview

**Generated:** 2025-01-11 by BMM Document-Project Workflow v1.2.0

---

## Executive Summary

**BlueLight-Hub** is a comprehensive emergency response management system designed for the German Red Cross (Deutsches Rotes Kreuz - DRK). The application facilitates mission management, mission logging (Einsatztagebuch - ETB), and situation mapping (Lagekarte) with military-grade precision using MGRS coordinates.

Built as a **monorepo** with three distinct packages (Backend, Frontend, Shared), the system emphasizes data integrity through audit logging, versioning, and a strict no-delete policy for critical mission data. The architecture supports both web-based and desktop deployment via Tauri 2, enabling offline capabilities and cross-platform distribution.

**Key Differentiators:**
- **10-year archival compliance** with SHA-256 checksums for regulatory adherence
- **No-delete policy** for Einsätze (missions) - only archival allowed
- **MGRS coordinate system** (military precision) with Lat/Lng fallback
- **Automatic versioning** for all ETB entries with complete audit trail
- **Cookie-based JWT authentication** with auto-refresh (XSS protection)
- **Generated API client** enforcing type-safety across frontend-backend boundary

---

## Project Classification

### General Information

| Attribute | Value |
|-----------|-------|
| **Type** | Monorepo with 3 parts (Backend, Frontend, Shared) |
| **Domain** | Emergency Response Management (German Red Cross) |
| **Architecture** | NestJS Backend + React/Tauri Frontend + PostgreSQL |
| **Repository** | github.com/rubenvitt/bluelight-hub |
| **Current Version** | 1.0.0-alpha.32 (Semantic Versioning) |
| **Release Track** | Alpha (weekly releases) |
| **License** | See [LICENSE.md](../LICENSE.md) |
| **Status** | Active Development (Production-Ready Features) |

### Project Structure

```
bluelight-hub/
├── packages/
│   ├── backend/           # NestJS 11 + Prisma ORM
│   ├── frontend/          # React 19 + Tauri 2 + Vite
│   └── shared/            # Generated OpenAPI client
├── docs/
│   ├── architecture/      # arc42 documentation (37 files)
│   ├── ai-docs/           # AI-specific documentation (3 files)
│   └── .bmm-*.md          # BMM generated docs (this series)
├── .github/workflows/     # CI/CD pipelines (6 workflows)
├── docker-compose.yml     # PostgreSQL + Backend services
└── package.json           # Monorepo root (pnpm workspace)
```

---

## Technology Stack Summary

### Backend (packages/backend/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | NestJS | 11.1.8 | Modular Node.js framework |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **ORM** | Prisma | 6.19.0 | Database access + migrations |
| **Database** | PostgreSQL | 17.x | Relational data storage |
| **Authentication** | Passport.js + JWT | 11.0.5 | Cookie-based auth |
| **Validation** | class-validator | 0.14.2 | DTO validation |
| **API Docs** | Swagger (OpenAPI 3.0) | 11.2.1 | Interactive API documentation |
| **Rate Limiting** | @nestjs/throttler | 6.4.0 | Brute-force protection |
| **File Uploads** | Multer | 2.0.2 | Multipart/form-data handling |
| **Geocoding** | Nominatim API | - | Address → Coordinates |
| **Coordinates** | MGRS | 2.1.0 | Military Grid Reference System |

**API Endpoints:** 54 across 10 controllers
**Database Models:** 9 models, 5 enums
**Port:** 3000 (development), configurable via env

### Frontend (packages/frontend/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 19.2.0 | UI component library |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Desktop Runtime** | Tauri | 2.9.0 | Cross-platform desktop app |
| **Build Tool** | Vite | 7.2.2 | Fast development + bundling |
| **Router** | TanStack Router | 1.135.0 | Type-safe routing |
| **State Management** | TanStack Query + Store | 5.90.7 + 0.8.0 | Server/Client state |
| **Forms** | TanStack Form + Zod | 1.23.8 + 4.1.12 | Type-safe forms + validation |
| **UI Framework** | Tailwind CSS 4 + Headless UI | 4.1.17 + 2.2.9 | Utility-first styling |
| **Maps** | Leaflet + React-Leaflet | 1.9.4 + 5.0.0 | Interactive maps |
| **Coordinates** | MGRS | 2.1.0 | Military Grid Reference System |
| **Icons** | React Icons | 5.5.0 | Icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |

**Components:** 135+ across Atomic Design levels
**Query Hooks:** 24+ TanStack Query hooks
**Port:** 5173 (Vite dev), 3001 (Tauri)

### Shared (packages/shared/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **API Client** | OpenAPI Generator (TypeScript Axios) | Latest | Type-safe API client |
| **Source** | Backend OpenAPI spec (`/api-json`) | - | Auto-generated from NestJS |

**Generated Files:** 10+ API classes, 50+ model types

---

## Core Features

### 1. Einsatzverwaltung (Mission Management)

**Purpose:** Manage emergency response missions from creation to archival

**Key Capabilities:**
- Create missions with alarm keywords, location, description
- Update mission status: ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN
- Archive missions (no deletion allowed per policy)
- Bulk archive operations for administrative cleanup
- Full audit logging (creator, updater, timestamps)

**Business Rules:**
- **No-delete policy:** Einsätze can only be archived, never deleted
- **Status progression:** Enforced state machine transitions
- **Archival requirement:** Missions must be ABGESCHLOSSEN before archival
- **10-year retention:** Archived missions kept for regulatory compliance

**Database Model:**
```prisma
model Einsatz {
  id               String        @id @default(cuid())
  alarmstichwort   String?       @db.VarChar(255)
  einsatzort       String?       @db.VarChar(500)
  beschreibung     String?       @db.Text
  status           EinsatzStatus @default(ANGELEGT)

  // Archival metadata
  isArchived       Boolean       @default(false)
  archivedAt       DateTime?
  archivalChecksum String?       @db.VarChar(64) // SHA-256

  // Audit fields
  createdAt        DateTime      @default(now())
  createdBy        String        @db.VarChar(100)
  updatedAt        DateTime      @updatedAt
  updatedBy        String?       @db.VarChar(100)
}
```

### 2. Einsatztagebuch (ETB - Mission Log)

**Purpose:** Detailed chronological logging of mission events with full versioning

**Key Capabilities:**
- Create ETB for each mission (1:1 relationship)
- Add timestamped entries with priority levels (ROUTINE, WICHTIG, KRITISCH)
- Automatic entry numbering (laufendeNummer)
- Edit entries with full version history (EtbEintragHistorie)
- Soft-delete entries (flag as deleted, never purge)
- Lock ETB after mission completion (prevent modifications)
- Template system (Textbausteine) for common entries

**Versioning System:**
- Every ETB entry edit creates a history record
- History includes: old values, editor, timestamp, change reason
- Complete audit trail for legal compliance
- History immutable once created

**Archival Process:**
- ETB archived alongside Einsatz
- Generate SHA-256 checksum of all entries
- Checksum stored in EtbArchiv model
- 10-year retention period enforced

**Database Models:**
```prisma
model Einsatztagebuch {
  id          String                   @id @default(cuid())
  einsatzId   String                   @unique
  status      EinsatztagebuchStatus    @default(AKTIV)
  isLocked    Boolean                  @default(false)
  lockedAt    DateTime?
  lockedBy    String?

  eintraege   EtbEintrag[]
  historie    EtbEintragHistorie[]
}

model EtbEintrag {
  id              String              @id @default(cuid())
  tageBuchId      String
  laufendeNummer  Int
  zeitstempel     DateTime            @default(now())
  text            String              @db.Text
  prioritaet      EtbEintragPrioritaet @default(ROUTINE)
  isDeleted       Boolean             @default(false)

  // Versioning
  historie        EtbEintragHistorie[]
}
```

### 3. Lagekarte (Situation Map)

**Purpose:** Real-time geospatial visualization of mission elements

**Key Capabilities:**
- Create situation maps linked to missions
- Add POIs (Points of Interest) with MGRS coordinates
- POI types: FAHRZEUG, EINSATZORT, SAMMELSTELLE, WASSERENTNAHME, GEFAHRENBEREICH, SONSTIGES
- Convert addresses to coordinates via Nominatim geocoding
- Interactive Leaflet map with marker clustering
- Offline tile caching (future feature)
- Export map as PNG screenshot

**Coordinate System:**
- **Primary:** MGRS (Military Grid Reference System) for precision
- **Fallback:** Latitude/Longitude for compatibility
- **Library:** `mgrs` package for conversions

**Database Models:**
```prisma
model Lagekarte {
  id          String   @id @default(cuid())
  einsatzId   String   @unique
  name        String   @db.VarChar(255)
  pois        Poi[]
}

model Poi {
  id          String   @id @default(cuid())
  lagekarteId String
  typ         PoiType
  name        String   @db.VarChar(255)

  // MGRS coordinates (primary)
  mgrs        String?  @db.VarChar(50)

  // Lat/Lng (fallback/display)
  latitude    Float?
  longitude   Float?

  beschreibung String? @db.Text
}
```

### 4. User Management

**Purpose:** Role-based access control with authentication

**Key Capabilities:**
- Unified authentication (automatic registration on first login)
- Three roles: SUPER_ADMIN, ADMIN, USER
- Password-based admin login
- Passwordless user login (username only)
- Manual user locking by admins
- Activity tracking (last login, failed login count)
- Soft delete (isDeleted flag)

**Authentication Strategy:**
- **JWT Tokens:** Access token (15 min) + Refresh token (7 days)
- **Storage:** httpOnly cookies (XSS protection)
- **CSRF Protection:** sameSite: strict
- **Auto-refresh:** Interceptor retries failed requests after token refresh

**Database Model:**
```prisma
model User {
  id               String    @id @default(nanoid())
  username         String    @unique @db.VarChar(100)
  passwordHash     String?   @db.Text // only admin users
  role             UserRole  @default(USER)
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  isLocked         Boolean   @default(false)
  lastLoginAt      DateTime?
  failedLoginCount Int       @default(0)
}
```

### 5. Audit Logging

**Purpose:** Complete audit trail for all entities

**Implementation:**
- Every model includes: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
- ETB entries have full versioning (EtbEintragHistorie)
- Archival process generates SHA-256 checksums
- User actions tracked (login attempts, account locks)

**Regulatory Compliance:**
- 10-year retention for archived missions and ETBs
- Immutable history records (no updates/deletes)
- Checksum verification for data integrity

---

## Repository Structure

### Package Overview

| Package | Location | Purpose | Entry Point |
|---------|----------|---------|-------------|
| **Backend** | `packages/backend/` | REST API + Database | `src/main.ts` |
| **Frontend** | `packages/frontend/` | UI + Desktop App | `src/main.tsx` |
| **Shared** | `packages/shared/` | Generated API Client | `client/apis/index.ts` |

### Detailed Breakdown

**Backend:**
- [API Contracts](./.bmm-backend-api-contracts.md) - 54 REST endpoints documented
- [Data Models](./.bmm-backend-data-models.md) - 9 Prisma models + 5 enums

**Frontend:**
- [Component Inventory](./.bmm-frontend-components.md) - 135+ components (Atomic Design)
- [State Management](./.bmm-frontend-state-management.md) - TanStack Query/Store patterns
- [API Integration](./.bmm-frontend-api-integration.md) - How frontend calls backend

**Integration:**
- [Integration Architecture](./.bmm-integration-architecture.md) - How parts communicate

**Development:**
- [Development Guide](./.bmm-development-guide.md) - Setup, commands, troubleshooting
- [Technology Stack](./.bmm-technology-stack.md) - Detailed tech stack analysis

**Architecture:**
- [arc42 Documentation](./architecture/index.adoc) - Comprehensive architecture docs (37 files)
- [ADRs](./architecture/adr/) - 21 Architecture Decision Records

---

## Quick Start

### Prerequisites

- Node.js ≥ 24.0.0
- pnpm 10.20.0+
- PostgreSQL 17.x (or Docker)
- Rust (for Tauri frontend)

### Installation

```bash
# Clone repository
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub

# Install dependencies
pnpm install

# Setup database (Docker)
docker-compose up -d postgres

# Run migrations
pnpm --filter @bluelight-hub/backend prisma:migrate

# Generate API client
pnpm run generate-api

# Start all services
pnpm -r dev
```

**Access Points:**
- Frontend (Vite): http://localhost:5173
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api
- Prisma Studio: `pnpm --filter @bluelight-hub/backend prisma:studio`

---

## Documentation Map

### BMM Generated Documentation (This Series)

**Location:** `docs/.bmm-*.md`

- [Project Overview](./.bmm-project-overview.md) - **You are here**
- [Project Structure](./.bmm-project-structure.md) - Monorepo organization
- [Source Tree Analysis](./.bmm-source-tree-analysis.md) - Annotated directory tree (78 dirs)
- [Technology Stack](./.bmm-technology-stack.md) - Detailed tech analysis
- [Backend API Contracts](./.bmm-backend-api-contracts.md) - 54 REST endpoints
- [Backend Data Models](./.bmm-backend-data-models.md) - 9 Prisma models
- [Frontend Components](./.bmm-frontend-components.md) - 135+ components
- [Frontend State Management](./.bmm-frontend-state-management.md) - TanStack patterns
- [Frontend API Integration](./.bmm-frontend-api-integration.md) - API usage patterns
- [Integration Architecture](./.bmm-integration-architecture.md) - How parts connect
- [Development Guide](./.bmm-development-guide.md) - Setup + troubleshooting
- [Existing Docs Inventory](./.bmm-existing-docs-inventory.md) - 57+ docs catalogued

### Architecture Documentation (arc42)

**Location:** `docs/architecture/`

- [Architecture Documentation](./architecture/index.adoc) - Full arc42 documentation
- [ADRs](./architecture/adr/) - 21 Architecture Decision Records

**Notable ADRs:**
- ADR-001: Architecture Documentation Framework (arc42)
- ADR-002: TypeScript across all parts
- ADR-003: NestJS for backend
- ADR-005: TanStack Query for state management
- ADR-007: Tailwind CSS + Headless UI (no other frameworks)
- ADR-010: Cookie-based JWT authentication
- ADR-015: No-delete policy for Einsätze

### AI-Specific Documentation

**Location:** `docs/ai-docs/`

- [AI Documentation Index](./ai-docs/index.md)

### Package READMEs

- [Backend README](../packages/backend/README.md)
- [Frontend README](../packages/frontend/README.md)
- [Shared README](../packages/shared/README.md)

---

## Quick Navigation by Use Case

### "I need to add a new API endpoint"

1. Read: [Backend API Contracts](./.bmm-backend-api-contracts.md)
2. Read: [Backend Data Models](./.bmm-backend-data-models.md)
3. Create endpoint in Backend with OpenAPI decorators
4. Run: `pnpm run generate-api`
5. Create TanStack Query hook in Frontend
6. Reference: [API Integration](./.bmm-frontend-api-integration.md)

**Example:**
```typescript
// 1. Backend: packages/backend/src/example/example.controller.ts
@Controller('example')
@ApiTags('Example')
export class ExampleController {
  @Get()
  @ApiOperation({ summary: 'Get all examples' })
  @ApiResponse({ status: 200, type: [ExampleResponseDto] })
  async findAll(): Promise<ExampleResponseDto[]> {
    return this.exampleService.findAll();
  }
}

// 2. Generate API client
// pnpm run generate-api

// 3. Frontend: packages/frontend/src/hooks/queries/useExample.ts
export const useExamples = () => {
  return useQuery({
    queryKey: ['examples'],
    queryFn: async () => {
      const response = await api.example().findAll();
      return response.data;
    },
  });
};
```

### "I need to add a new UI component"

1. Read: [Component Inventory](./.bmm-frontend-components.md)
2. Follow Atomic Design principles (atoms → molecules → organisms)
3. Use Tailwind CSS + Headless UI (ONLY!)
4. Reference existing components for patterns

**Atomic Design Structure:**
```
atoms/      # Basic elements (Button, Input, Badge)
molecules/  # Composite components (FormField, SearchBar)
organisms/  # Complex modules (EinsatzList, ETBEditor)
templates/  # Page layouts
pages/      # Route components
```

### "I need to add a new database model"

1. Read: [Data Models](./.bmm-backend-data-models.md)
2. Update: `packages/backend/prisma/schema.prisma`
3. Run: `pnpm --filter @bluelight-hub/backend prisma migrate dev`
4. Update DTOs and controllers
5. Regenerate API client: `pnpm run generate-api`

**Prisma Migration:**
```bash
# Create migration
pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_example_model

# Generate Prisma Client
pnpm --filter @bluelight-hub/backend prisma:generate

# Update API and regenerate client
pnpm run generate-api
```

### "I need to understand data flow"

1. Read: [Integration Architecture](./.bmm-integration-architecture.md)
2. Read: [State Management](./.bmm-frontend-state-management.md)
3. Read: [API Integration](./.bmm-frontend-api-integration.md)

**Complete Request Flow:**
```
Component → TanStack Query Hook → Generated API Client → Backend Controller → Service → Prisma → PostgreSQL
```

---

## Development Workflow

### Daily Development

```bash
# Start all services
pnpm -r dev

# Backend only
pnpm --filter @bluelight-hub/backend dev

# Frontend only (browser)
pnpm --filter @bluelight-hub/frontend dev:vite

# Frontend only (desktop app)
pnpm --filter @bluelight-hub/frontend dev
```

### After Backend Changes

```bash
# Regenerate API client
pnpm run generate-api

# Verify TypeScript compilation
pnpm --filter @bluelight-hub/frontend build
```

### Before Committing

```bash
# Lint all packages
pnpm lint

# Check TypeScript
pnpm --filter @bluelight-hub/backend build
pnpm --filter @bluelight-hub/frontend build

# Commit with semantic emoji
git commit -m "✨(einsatz): Add bulk archive endpoint"
```

### Database Management

```bash
# Open Prisma Studio
pnpm --filter @bluelight-hub/backend prisma:studio

# Run migrations
pnpm --filter @bluelight-hub/backend prisma:migrate

# Seed database
pnpm --filter @bluelight-hub/backend prisma:seed

# Reset database (development only!)
pnpm --filter @bluelight-hub/backend prisma migrate reset
```

---

## Important Notes

### BREAKING RULES (Never Break!)

1. **API Client Generation:**
   - NEVER create manual API helpers with `fetch()`
   - ALWAYS use generated client from `packages/shared`
   - Run `pnpm run generate-api` after every backend change

2. **UI Framework:**
   - ONLY Tailwind CSS + Headless UI
   - NEVER mix other CSS frameworks or CSS-in-JS
   - For TailwindUI (premium) components: Ask user to provide code

3. **Forms & State:**
   - Forms: ONLY @tanstack/react-form with Zod schemas
   - State: @tanstack/react-store for global state
   - NEVER use HTML forms, Redux, or other libraries

4. **Commit Rules:**
   - NEVER use `--no-verify` (bypasses hooks)
   - ALWAYS commit after each subtask
   - Format: `<emoji>(<context>): <title>`

### Tests Currently Disabled

**Important:** Test infrastructure was removed in PR #257 (2025-01-28).

- `pnpm test` - Not functional
- `pnpm test:cov` - Not functional
- `pnpm test:ui` - Not functional

See [README.md](../README.md#tests) for future testing strategy.

### No-Delete Policy

**Einsätze (missions) can ONLY be archived, NEVER deleted.**

This is a business requirement for regulatory compliance (10-year retention).

**Implementation:**
- No DELETE endpoint for Einsätze
- Only PATCH `/api/einsaetze/:id/archive` allowed
- Archived missions flagged with `isArchived=true`
- Bulk archive endpoint: POST `/api/einsaetze/bulk-archive`

---

## Key Architectural Decisions

### ADR Summary

| ADR | Decision | Rationale |
|-----|----------|-----------|
| **ADR-001** | Use arc42 for architecture docs | Industry-standard structure |
| **ADR-002** | TypeScript everywhere | Type safety, tooling support |
| **ADR-003** | NestJS for backend | Modular architecture, DI, OpenAPI |
| **ADR-005** | TanStack Query for state | Server state separation, caching |
| **ADR-007** | Tailwind CSS + Headless UI | Utility-first styling, accessibility |
| **ADR-010** | Cookie-based JWT | XSS protection, auto-refresh |
| **ADR-015** | No-delete policy for Einsätze | Regulatory compliance, audit trail |

---

## Next Steps

### For New Contributors

1. **Read this overview** to understand project scope
2. **Setup development environment:** [Development Guide](./.bmm-development-guide.md)
3. **Review architecture:** [arc42 docs](./architecture/index.adoc)
4. **Explore codebase:** [Source Tree Analysis](./.bmm-source-tree-analysis.md)
5. **Check open issues:** [GitHub Issues](https://github.com/rubenvitt/bluelight-hub/issues)

### For AI-Assisted Development

Use [index.md](./index.md) as the **primary retrieval document** for AI context.

Key documents for AI:
- [index.md](./index.md) - Master index with quick navigation
- [Integration Architecture](./.bmm-integration-architecture.md) - How to add features
- [API Contracts](./.bmm-backend-api-contracts.md) - Available endpoints
- [Component Inventory](./.bmm-frontend-components.md) - Existing UI patterns

### For Brownfield PRD Creation

This documentation series provides complete input for generating a brownfield PRD:
- **Current State:** Documented in this overview + detailed docs
- **Technical Stack:** [Technology Stack](./.bmm-technology-stack.md)
- **Architecture:** [arc42 docs](./architecture/index.adoc)
- **Business Logic:** Feature descriptions in this document

---

## Contact & Resources

- **Repository:** github.com/rubenvitt/bluelight-hub
- **Issue Tracker:** github.com/rubenvitt/bluelight-hub/issues
- **Documentation:** `docs/` directory (this file)
- **Backend API Docs:** http://localhost:3000/api (when running)
- **Backend API Coverage:** [https://backend-docs.bluelight-hub.rubeen.dev](https://backend-docs.bluelight-hub.rubeen.dev)

---

**Generated:** 2025-01-11
**Workflow Version:** BMM v1.2.0 (Exhaustive Scan)
**Documentation Status:** Complete
