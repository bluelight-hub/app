# Bluelight-Hub Documentation Index

> **Primary AI Context File** - Start here for AI-assisted development

---

## Project Overview

- **Type:** Monorepo (Backend + Frontend + Shared)
- **Domain:** Emergency Response Management System for German Red Cross (DRK)
- **Status:** Active Development (alpha release track)
- **Version:** 1.0.0-alpha.32
- **Repository:** github.com/rubenvitt/bluelight-hub

---

## Quick Reference

### Technology Stack

| Part | Tech Stack | Port | Entry Point |
|------|-----------|------|-------------|
| **Backend** | NestJS 11 + Prisma + PostgreSQL | 3000 | `packages/backend/src/main.ts` |
| **Frontend** | React 19 + Tauri 2 + Tailwind | 5173 | `packages/frontend/src/main.tsx` |
| **Shared** | OpenAPI Generator (TypeScript) | N/A | `packages/shared/client/apis/index.ts` |

### Key Metrics

- **API Endpoints:** 54 across 10 controllers
- **Database Models:** 9 models, 5 enums
- **UI Components:** 135+ (Atomic Design)
- **Query Hooks:** 24+ TanStack Query hooks
- **Documentation Files:** 14 BMM docs (current + accurate) + 57 archived docs

---

## BMM Generated Documentation

### Core Architecture

- [🏛️ **Architecture Documentation**](./architecture.md) - **PRIMARY ARCHITECTURE REFERENCE** (100% accurate)
- [📋 Project Overview](./project-overview.md) - Executive summary and quick start
- [🏗️ Project Structure](./project-structure.md) - Monorepo organization
- [🌲 Source Tree Analysis](./source-tree-analysis.md) - Annotated directory tree (78 critical dirs)
- [🔗 Integration Architecture](./integration-architecture.md) - How parts communicate
- [📊 Arc42 Reality Check](./arc42-reality-check.md) - Gap analysis of deprecated documentation

### Backend Documentation

- [📡 API Contracts](./backend-api-contracts.md) - 54 REST endpoints documented
- [🗄️ Data Models](./backend-data-models.md) - 9 Prisma models + 5 enums

### Frontend Documentation

- [🧩 Component Inventory](./frontend-components.md) - 135+ components (Atomic Design)
- [🔄 State Management](./frontend-state-management.md) - TanStack Query/Store patterns
- [🔌 API Integration](./frontend-api-integration.md) - How frontend calls backend

### Development Resources

- [🛠️ Development Guide](./development-guide.md) - **Setup, commands, troubleshooting**
- [🔧 Technology Stack](./technology-stack.md) - Detailed tech stack analysis
- [📚 Existing Docs Inventory](./existing-docs-inventory.md) - 57+ existing docs catalogued

---

## Existing Project Documentation

### Architecture Documentation

**PRIMARY REFERENCE:** [`architecture.md`](./architecture.md)
- **Status:** ✅ Current and accurate (100% verified against codebase)
- **Coverage:** Complete system architecture, technology stack, integration patterns
- **Generated:** 2025-01-11 via exhaustive codebase scan

**ARCHIVED:** `docs/archive/arc42-deprecated-2025-01-11/`
- **Status:** ⚠️ Deprecated (65% accuracy, outdated claims)
- **Reason:** Contains overpromised features, outdated tech stack, missing modern implementations
- **See:** [Arc42 Reality Check](./arc42-reality-check.md) for detailed gap analysis

**Architecture Decisions (ADRs):**
- 21 ADRs archived with arc42 documentation
- Key decisions validated in [`architecture.md`](./architecture.md)
- For ADR history, see: `docs/archive/arc42-deprecated-2025-01-11/adr/`

### AI-Specific Documentation

**Location:** `docs/ai-docs/`

- [AI Documentation Index](./ai-docs/index.md)

---

## Quick Navigation by Use Case

### "I need to add a new API endpoint"

**Steps:**
1. Read: [Backend API Contracts](./backend-api-contracts.md) - Understand existing patterns
2. Read: [Backend Data Models](./backend-data-models.md) - Understand database schema
3. Create endpoint in Backend with OpenAPI decorators
4. Run: `pnpm run generate-api` - Generate TypeScript client
5. Create TanStack Query hook in Frontend
6. Reference: [API Integration](./frontend-api-integration.md) - Usage patterns

**Example Flow:**
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
// $ pnpm run generate-api

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

// 4. Component: packages/frontend/src/components/organisms/ExampleList.tsx
export const ExampleList = () => {
  const { data, isLoading } = useExamples();
  return <>{/* render */}</>;
};
```

### "I need to add a new UI component"

**Steps:**
1. Read: [Component Inventory](./frontend-components.md) - Explore existing components
2. Follow Atomic Design principles:
   - **Atoms:** Basic elements (Button, Input, Badge)
   - **Molecules:** Composite components (FormField, SearchBar)
   - **Organisms:** Complex modules (EinsatzList, ETBEditor)
   - **Templates:** Page layouts
   - **Pages:** Route components
3. Use **ONLY** Tailwind CSS + Headless UI (no other frameworks!)
4. Reference existing components for patterns

**Example:**
```typescript
// packages/frontend/src/components/molecules/ExampleCard.tsx
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';

export const ExampleCard = ({ title, status }: Props) => {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant={status}>{status}</Badge>
      </div>
      <Button onClick={handleAction}>Action</Button>
    </div>
  );
};
```

### "I need to add a new database model"

**Steps:**
1. Read: [Data Models](./backend-data-models.md) - Understand schema conventions
2. Update: `packages/backend/prisma/schema.prisma`
3. Run: `pnpm --filter @bluelight-hub/backend prisma migrate dev`
4. Update DTOs and controllers
5. Regenerate API client: `pnpm run generate-api`

**Example:**
```prisma
// packages/backend/prisma/schema.prisma
model Example {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(255)
  description String?  @db.Text
  status      ExampleStatus @default(ACTIVE)

  // Audit fields (always include!)
  createdAt   DateTime @default(now())
  createdBy   String   @db.VarChar(100)
  updatedAt   DateTime @updatedAt
  updatedBy   String?  @db.VarChar(100)

  // Soft delete (if applicable)
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  deletedBy   String?  @db.VarChar(100)

  @@index([status])
  @@index([isDeleted])
}

enum ExampleStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

### "I need to understand data flow"

**Reading Order:**
1. [Integration Architecture](./integration-architecture.md) - **Start here**
2. [State Management](./frontend-state-management.md) - Frontend state patterns
3. [API Integration](./frontend-api-integration.md) - Frontend-backend communication

**Complete Request Flow:**
```
User Interaction
    ↓
Component (React)
    ↓
TanStack Query Hook (caching, optimistic updates)
    ↓
Generated API Client (type-safe, auto-generated)
    ↓
HTTP Request (axios, cookies for auth)
    ↓
Backend Controller (NestJS, OpenAPI decorators)
    ↓
Service Layer (business logic)
    ↓
Prisma Repository (ORM)
    ↓
PostgreSQL Database
```

### "I need to setup the project"

**Reading Order:**
1. [Development Guide](./development-guide.md) - **Complete setup instructions**
2. [Technology Stack](./technology-stack.md) - Understand dependencies
3. [Project Structure](./project-structure.md) - Navigate the codebase

**Quick Setup:**
```bash
# 1. Clone and install
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub
pnpm install

# 2. Setup database
docker-compose up -d postgres

# 3. Configure environment
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
# Edit .env files as needed

# 4. Run migrations
pnpm --filter @bluelight-hub/backend prisma migrate dev

# 5. Generate API client
pnpm run generate-api

# 6. Start all services
pnpm -r dev

# 7. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# Swagger: http://localhost:3000/api
```

---

## Development Commands

### Monorepo-wide

```bash
# Start all services (backend + frontend)
pnpm -r dev

# Build all packages
pnpm -r build

# Lint all packages (auto-fix with Biome)
pnpm lint

# Lint check only (CI mode)
pnpm lint:check

# Generate API client (after backend changes)
pnpm run generate-api

# Generate documentation (arc42 HTML + PDF)
pnpm docs:build
```

### Backend

```bash
# Development mode (watch)
pnpm --filter @bluelight-hub/backend dev

# Build
pnpm --filter @bluelight-hub/backend build

# Production mode
pnpm --filter @bluelight-hub/backend start:prod

# Prisma commands
pnpm --filter @bluelight-hub/backend prisma:generate  # Generate client
pnpm --filter @bluelight-hub/backend prisma:migrate   # Run migrations
pnpm --filter @bluelight-hub/backend prisma:studio    # Open GUI

# Documentation
pnpm --filter @bluelight-hub/backend docs:build       # Generate Compodoc
pnpm --filter @bluelight-hub/backend check:jsdoc:public  # Check JSDoc coverage (85% threshold)

# Admin tools
pnpm --filter @bluelight-hub/backend admin:reset      # Reset admin password
```

### Frontend

```bash
# Tauri dev mode (desktop app)
pnpm --filter @bluelight-hub/frontend dev

# Vite only (browser mode)
pnpm --filter @bluelight-hub/frontend dev:vite

# Build
pnpm --filter @bluelight-hub/frontend build

# Preview production build
pnpm --filter @bluelight-hub/frontend preview

# Tauri build (cross-platform)
pnpm --filter @bluelight-hub/frontend tauri build
```

---

## Important Notes

### ⚠️ BREAKING RULES (Never Break!)

#### 1. API Client Generation

**NEVER create manual API helpers!**

```typescript
// ❌ WRONG: Manual fetch
const fetchAlerts = async () => {
  return await fetch('/api/security/alerts');
};

// ✅ RIGHT: Use generated client
const useSecurityAlerts = () => {
  return useQuery({
    queryKey: ['security', 'alerts'],
    queryFn: () => api.security().getSecurityAlerts(),
  });
};
```

**Workflow:** Backend endpoint → `pnpm run generate-api` → TanStack Query Hook → Component

#### 2. UI Framework

**ONLY Tailwind CSS + Headless UI** - no other frameworks!

- NEVER mix other CSS frameworks or CSS-in-JS
- ALWAYS use Tailwind classes and Headless UI components
- **TailwindUI (Premium):** ALWAYS ask user to provide code (never invent!)

#### 3. Forms & State

- **Forms:** ONLY @tanstack/react-form with Zod schemas
- **State:** @tanstack/react-store for global state
- **Timing:** @tanstack/pacer for debouncing/throttling
- **NEVER:** HTML Forms, Redux, or other libraries

#### 4. Commit Rules

- **NEVER** use `--no-verify` (bypasses hooks)
- **ALWAYS** commit after each subtask
- **Format:** `<emoji>(<context>): <title>`

**Semantic Emojis:**
- 💥 Breaking - Major version bump
- ✨ Feature - Minor version bump
- 🐛 Fix - Patch version bump
- 🚑 Hotfix - Critical patch
- 🔒 Security - Security patch
- ♻️ Refactor - Code refactoring

### ⚠️ Tests Currently Disabled

**Important:** Test infrastructure was removed in PR #257 (2025-01-28).

- `pnpm test` - Not functional
- `pnpm test:cov` - Not functional
- `pnpm test:ui` - Not functional

See [README.md](../README.md#tests) for future testing strategy.

### ⚠️ No-Delete Policy for Einsätze

**Einsätze (missions) can ONLY be archived, NEVER deleted.**

This is a **business requirement** for regulatory compliance (10-year retention).

**Implementation:**
- No DELETE endpoint for Einsätze
- Only `PATCH /api/einsaetze/:id/archive`
- Archived missions flagged with `isArchived=true`
- Bulk archive: `POST /api/einsaetze/bulk-archive`

---

## Key Features

### 1. Einsatzverwaltung (Mission Management)

**Capabilities:**
- Create missions with alarm keywords, location, description
- Status progression: ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT
- Archive missions (no deletion!)
- Bulk archive operations
- Full audit logging

**No-Delete Policy:** Missions can only be archived for 10-year retention.

### 2. Einsatztagebuch (ETB - Mission Log)

**Capabilities:**
- Timestamped entries with priority levels (ROUTINE, WICHTIG, KRITISCH)
- Automatic entry numbering
- Full version history for edits
- Soft-delete entries (never purge)
- Lock ETB after mission completion
- Template system (Textbausteine)

**Archival:** SHA-256 checksums for data integrity verification.

### 3. Lagekarte (Situation Map)

**Capabilities:**
- Interactive Leaflet map with POIs
- MGRS coordinates (military precision) + Lat/Lng fallback
- POI types: FAHRZEUG, EINSATZORT, SAMMELSTELLE, WASSERENTNAHME, GEFAHRENBEREICH, SONSTIGES
- Geocoding via Nominatim API
- Export map as PNG screenshot

### 4. User Management

**Capabilities:**
- Unified authentication (auto-registration on first login)
- Three roles: SUPER_ADMIN, ADMIN, USER
- Password-based admin login
- Passwordless user login
- JWT tokens in httpOnly cookies (XSS protection)

### 5. Audit Logging

**Capabilities:**
- Complete audit trail for all entities
- ETB entry versioning
- 10-year archival with SHA-256 checksums
- Immutable history records

---

## Architecture Decisions

**Current Reference:** [Architecture Documentation](./architecture.md#11-architecture-decisions-adr-validation)

### Core Decisions (Verified Against Implementation)

| Decision | Implementation | Status |
|----------|----------------|--------|
| **TypeScript everywhere** | TypeScript 5.9.3 across all packages | ✅ Implemented |
| **NestJS for backend** | NestJS 11.x with modular structure | ✅ Implemented |
| **TanStack Query** | TanStack Query 5.x + Store | ✅ Implemented |
| **Tailwind + Headless UI** | Tailwind CSS 4.x + Headless UI (ONLY!) | ✅ Implemented |
| **Cookie-based JWT** | 3-token system (access, refresh, admin) | ✅ Implemented |
| **No-delete for Einsätze** | Archive-only (10-year retention) | ✅ Implemented |
| **Generated API Client** | OpenAPI Generator (TypeScript) | ✅ Implemented |

**Historical ADRs:** See `docs/archive/arc42-deprecated-2025-01-11/adr/` (21 ADRs archived)

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Database connection fails** | Check `DATABASE_URL` in `.env`, verify PostgreSQL is running |
| **API client type errors** | Run `pnpm run generate-api` to regenerate client |
| **Port 3000 already in use** | Kill process: `lsof -i :3000` then `kill -9 <PID>` |
| **Prisma client out of sync** | Run `pnpm --filter @bluelight-hub/backend prisma:generate` |
| **JWT 401 errors** | Verify JWT secrets in `.env`, clear browser cookies |
| **Tauri build fails** | Install platform dependencies (see [Development Guide](./development-guide.md)) |

**Detailed Troubleshooting:** [Development Guide - Troubleshooting](./development-guide.md#troubleshooting)

---

## CI/CD Pipeline

### GitHub Actions Workflows

**Location:** `.github/workflows/`

| Workflow | Triggers | Purpose |
|----------|----------|---------|
| **CI Pipeline** | PR/Push to main, develop, alpha | Multi-platform build, lint, tests |
| **Release** | CI success on main, alpha, beta | Docker images, Tauri apps, GitHub Release |
| **Docker Publish** | Release | Publish to GHCR |
| **Docs** | Push to main | Deploy arc42 docs |

**Semantic Release:**
- Emoji-based commit messages trigger version bumps
- Automatic CHANGELOG generation
- Release to multiple tracks (main, alpha, beta)

---

## API Documentation

### Swagger UI

**Access:** http://localhost:3000/api (when backend running)

**Features:**
- Interactive API documentation
- Test endpoints directly
- View request/response schemas
- Download OpenAPI spec

### OpenAPI Spec

**Access:** http://localhost:3000/api-json

**Usage:**
- Input for OpenAPI Generator
- API contract documentation
- Client generation in other languages

---

## Additional Resources

### Package READMEs

- [Backend README](../packages/backend/README.md)
- [Frontend README](../packages/frontend/README.md)
- [Shared README](../packages/shared/README.md)

### External Documentation

- **Backend API Docs (Live):** https://backend-docs.bluelight-hub.rubeen.dev
- **GitHub Repository:** https://github.com/rubenvitt/bluelight-hub
- **Issue Tracker:** https://github.com/rubenvitt/bluelight-hub/issues

---

## For AI Agents

### Best Practices

1. **Start with this index** to understand project structure
2. **Use specific BMM docs** for detailed technical information
3. **Reference [`architecture.md`](./architecture.md)** for current architecture (NOT arc42!)
4. **Follow BREAKING RULES** (no manual API clients, only Tailwind, etc.)
5. **Use semantic commits** with emoji prefixes

### Quick Lookup

**Need to...** → **Read this:**
- Understand architecture → [**Architecture Documentation**](./architecture.md) ⭐
- Understand overall project → [Project Overview](./project-overview.md)
- Add API endpoint → [API Contracts](./backend-api-contracts.md)
- Add UI component → [Component Inventory](./frontend-components.md)
- Modify database → [Data Models](./backend-data-models.md)
- Debug integration → [Integration Architecture](./integration-architecture.md)
- Setup environment → [Development Guide](./development-guide.md)

### Code Generation Patterns

**Backend Endpoint:**
```typescript
@Controller('resource')
@ApiTags('Resource')
export class ResourceController {
  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }
}
```

**Frontend Query Hook:**
```typescript
export const useResource = (id: string) => {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: async () => {
      const response = await api.resource().findOne(id);
      return response.data;
    },
  });
};
```

**Frontend Component:**
```typescript
export const ResourceDetail = ({ id }: Props) => {
  const { data, isLoading, error } = useResource(id);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <NotFound />;

  return <div>{/* render resource */}</div>;
};
```

---

## Next Steps

### For New Developers

1. Setup environment: [Development Guide](./development-guide.md)
2. Understand architecture: [Project Overview](./project-overview.md)
3. Explore codebase: [Source Tree Analysis](./source-tree-analysis.md)
4. Check open issues: [GitHub Issues](https://github.com/rubenvitt/bluelight-hub/issues)

### For Feature Development

1. Identify affected part (Backend/Frontend/Both)
2. Read relevant BMM docs (API Contracts, Components, Integration)
3. Check ADRs for constraints
4. Follow development workflow (commit after each subtask)
5. Regenerate API client after backend changes

### For Brownfield PRD

Use this documentation series as **primary input** for PRD generation:
- **Current State:** All features documented
- **Technical Constraints:** BREAKING RULES + Architecture Decisions
- **Architecture:** [`architecture.md`](./architecture.md) (PRIMARY) + [Integration Architecture](./integration-architecture.md)
- **Code Patterns:** Component Inventory + API Contracts

---

**Generated:** 2025-01-11 (BMM Document-Project Workflow v1.2.0)
**Scan Level:** Exhaustive
**Documentation Status:** ✅ Complete
**Total Files:** 12 BMM docs + 57+ existing docs
