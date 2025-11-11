# Bluelight Hub - Technology Stack Analysis

**Generated:** 2025-01-10T20:53:00Z
**Analysis Type:** Comprehensive Technology Stack per Part

---

## BACKEND (`@bluelight-hub/backend`)

### Architecture Pattern
**Domain-Driven Modular Architecture** (NestJS Modules + Repository Pattern)

**Structure:** Controller → Service → Repository → Prisma

**Key Characteristics:**
- Layered architecture with clear separation
- CQRS-lite with event emitters
- OpenAPI-First with Swagger decorators
- Strict TypeScript with full type safety
- No-Delete Policy with soft deletes
- Audit trail (createdBy, updatedBy, deletedBy, archivedBy)

### Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | NestJS | 11.1.8 |
| Language | TypeScript | 5.9.3 |
| Runtime | Node.js | 24.10.0+ |
| Database | PostgreSQL | 17 |
| ORM | Prisma | 6.19.0 |
| API Documentation | Swagger/OpenAPI | 11.2.1 |
| Authentication | Passport JWT | 11.0.5 |
| Validation | class-validator | 0.14.2 |
| Security | Helmet + Throttler | 8.1.0 + 6.4.0 |
| Caching | cache-manager | 7.2.4 |
| Events | EventEmitter | 3.0.1 |
| Documentation | Compodoc | 1.1.32 |
| Build Tool | NestJS CLI | 11.0.10 |

### Key Dependencies
1. @nestjs/core (11.1.8) - Core framework
2. @nestjs/swagger (11.2.1) - API documentation
3. @prisma/client (6.19.0) - Database client
4. @nestjs/passport (11.0.5) - Authentication
5. @nestjs/jwt (11.0.1) - JWT tokens
6. class-validator (0.14.2) - DTO validation
7. @nestjs/config (4.0.2) - Configuration
8. @nestjs/event-emitter (3.0.1) - Events
9. helmet (8.1.0) - Security
10. @nestjs/throttler (6.4.0) - Rate limiting

---

## FRONTEND (`@bluelight-hub/frontend`)

### Architecture Pattern
**Atomic Design + Feature-Based Modules**

**Structure:** atoms → molecules → organisms → templates → pages

**Key Characteristics:**
- File-based routing with auto-code-splitting
- Atomic Design component hierarchy
- Feature slicing by domain (einsatz, etb, lagekarte)
- Query-first state management
- Type-safe forms with Zod
- Desktop-first with Tauri
- Offline-first maps

### Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite + SWC | 7.2.2 + 4.2.1 |
| Desktop Framework | Tauri | 2.8.5 |
| Routing | TanStack Router | 1.135.0 |
| State Management | TanStack Store | 0.8.0 |
| Server State | TanStack Query | 5.90.7 |
| Forms | TanStack Form | 1.23.8 |
| Form Validation | Zod | 4.1.12 |
| UI Framework | Tailwind CSS | 4.1.17 |
| Components | Headless UI | 2.2.9 |
| Maps | Leaflet + React Leaflet | 1.9.4 + 5.0.0 |
| Map Drawing | @geoman-io/leaflet-geoman-free | 2.18.3 |
| Notifications | sonner | 2.0.7 |
| Command Palette | cmdk | 1.1.1 |

### Key Dependencies
1. React (19.2.0) - UI library
2. @tanstack/react-router (1.135.0) - Type-safe routing
3. @tanstack/react-query (5.90.7) - Server state
4. @tanstack/react-form (1.23.8) - Forms
5. Tailwind CSS (4.1.17) - Styling
6. @headlessui/react (2.2.9) - Components
7. Tauri (2.8.5) - Desktop app
8. Vite (7.2.2) - Build tool
9. Zod (4.1.12) - Validation
10. Leaflet + React Leaflet (1.9.4 + 5.0.0) - Maps

---

## SHARED (`@bluelight-hub/shared`)

### Architecture Pattern
**Code Generation Pipeline** (OpenAPI → TypeScript Fetch Client)

**Key Characteristics:**
- API-First development
- Full type safety from backend DTOs
- Dual export (manual + generated)
- Immutable generated client
- Auto-formatting with Biome

### Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Language | TypeScript | 5.9.3 |
| API Generation | OpenAPI Generator CLI | 2.25.0 |
| Generator Target | typescript-fetch | - |
| Module System | ESM | ES2020 |
| Build Tool | TypeScript Compiler | 5.9.3 |

### Key Dependencies
1. @openapitools/openapi-generator-cli (2.25.0) - Client generator
2. TypeScript (5.9.3) - Type system
3. rimraf (6.1.0) - Cleanup utility

---

## CROSS-CUTTING TECHNOLOGIES

| Technology | Backend | Frontend | Shared |
|------------|---------|----------|--------|
| TypeScript | 5.9.3 | 5.9.3 | 5.9.3 |
| Biome | ✓ | ✓ | ✓ |
| date-fns | 4.1.0 | 4.1.0 | - |
| mgrs | 2.1.0 | 2.1.0 | - |
| dotenvx | 1.51.1 | 1.51.1 | - |

---

## CRITICAL VERSION CONSTRAINTS

1. **Node.js:** Requires 24.10.0+
2. **NestJS:** All @nestjs/* packages at 11.x
3. **TanStack:** Router 1.135.0, Query 5.90.7, Form 1.23.8, Store 0.8.0
4. **React:** 19.2.0 (latest with concurrent features)
5. **Tailwind CSS:** 4.1.17 (major v4 upgrade)
6. **Tauri:** 2.8.5 (requires Rust 1.77.2+)
7. **TypeScript:** 5.9.3 across all packages
8. **Prisma:** 6.19.0 (client + CLI synchronized)

---

## ARCHITECTURAL DECISIONS SUMMARY

### Backend
- Domain-Driven Modular Architecture
- Prisma ORM with type safety
- OpenAPI-First API documentation
- No-Delete Policy with 10-year ETB retention
- Event-driven cross-module communication
- Strict TypeScript with ES2024 target

### Frontend
- Atomic Design component hierarchy
- TanStack ecosystem for complete state management
- Tauri desktop app with Rust backend
- Tailwind CSS 4 utility-first styling
- Headless UI for accessible components
- Type-safe file-based routing
- Offline-first tactical maps

### Shared
- Code generation from backend OpenAPI spec
- Immutable generated API client
- Dual exports (manual + generated)
- Pure ESM for modern module system

---

## WORKFLOW INTEGRATION

**API Development Workflow:**
1. Backend creates endpoint with OpenAPI decorators
2. Backend exposes Swagger spec at `/api-json`
3. Shared package runs `pnpm generate-api`
4. Generated TypeScript client in `client/apis/`
5. Frontend imports type-safe client from `@bluelight-hub/shared/client`
6. Forms use Zod schemas matching backend DTOs
7. TanStack Query manages server state with caching

**Development Environment:**
- Backend: `localhost:3000` (NestJS + PostgreSQL)
- Frontend: `localhost:3001` (Vite dev server)
- Tauri: Native desktop window wrapping frontend
- Docker Compose: Local PostgreSQL + Redis

**Build Pipeline:**
1. Backend: Prisma generate → NestJS build → Docker image
2. Frontend: Vite build → Tauri bundle → Desktop app (.dmg, .exe, .AppImage)
3. Shared: OpenAPI generate → TypeScript compile
4. Documentation: Compodoc (backend) + arc42 (architecture)
