# Source Tree Analysis - Bluelight-Hub

**Generated:** 2025-11-11
**Scan Type:** Exhaustive monorepo analysis
**Project Root:** /Users/rubeen/dev/personal/bluelight-hub

## Overview

Bluelight-Hub ist eine Desktop-Anwendung für das Blaulicht-Einsatzmanagement, entwickelt als Monorepo mit drei Hauptteilen:

1. **Backend** - NestJS REST API mit Prisma ORM und PostgreSQL
2. **Frontend** - React 19 Desktop-Anwendung mit Tauri 2
3. **Shared** - Generierte TypeScript API-Clients und gemeinsame Typen

**Kernprinzip:** Der gesamte API-Client wird automatisch aus der Backend OpenAPI-Spezifikation generiert. Manuelle API-Helper sind **VERBOTEN**.

**Architekturstil:** Domain-Driven Design (DDD) mit modularem Aufbau

## Repository Structure

### Root Level

```
bluelight-hub/
├── packages/                           # Monorepo workspace
│   ├── backend/                        # NestJS API Backend
│   ├── frontend/                       # React + Tauri Desktop App
│   └── shared/                         # Shared TypeScript types and API client
├── docs/                               # Project documentation
│   ├── architecture/                   # 🏛️ arc42 architecture docs (PFLICHT)
│   │   ├── 01-introduction-goals.adoc  # Einführung und Ziele
│   │   ├── 02-constraints.adoc         # Randbedingungen
│   │   ├── 03-context.adoc             # Kontextabgrenzung
│   │   ├── 04-solution-strategy.adoc   # Lösungsstrategie
│   │   ├── 05-building-block-view.adoc # Bausteinsicht
│   │   ├── 06-runtime-view.adoc        # Laufzeitsicht
│   │   ├── 07-deployment-view.adoc     # Verteilungssicht
│   │   ├── 08-concepts.adoc            # Querschnittliche Konzepte
│   │   ├── 09-architecture-decisions.adoc # Entscheidungen
│   │   ├── 10-quality-requirements.adoc # Qualitätsanforderungen
│   │   ├── 11-risks.adoc               # Risiken
│   │   ├── 12-glossary.adoc            # Glossar
│   │   └── adr/                        # Architecture Decision Records (21 ADRs)
│   │       ├── 001-verbindungskonzept.adoc
│   │       ├── 007-jwt-authentifizierung.adoc
│   │       ├── 011-admin-roles-system.adoc
│   │       ├── 013-tailwind-migration.adoc
│   │       ├── 016-unified-authentication.adoc
│   │       ├── 020-optimistic-ui-updates.adoc
│   │       └── ... (weitere ADRs)
│   ├── .bmm-backend-api-contracts.md   # Backend API Dokumentation
│   ├── .bmm-backend-data-models.md     # Datenbankmodelle
│   ├── .bmm-frontend-components.md     # Komponenten-Inventar
│   ├── .bmm-frontend-state-management.md # State Management
│   ├── .bmm-technology-stack.md        # Tech-Stack Dokumentation
│   └── project-scan-report.json        # Projekt-Scan Metadaten
├── .bmad/                              # BMAD Framework (AI-Workflows)
│   ├── core/                           # Core agents and workflows
│   ├── bmm/                            # BMad Method workflows
│   └── _cfg/                           # Configuration and manifests
├── .claude/                            # Claude-Code Konfiguration
│   ├── agents/                         # Custom agents
│   └── commands/bmad/                  # BMAD commands
├── .github/                            # CI/CD workflows
│   └── workflows/                      # GitHub Actions
├── .husky/                             # Git hooks
│   ├── pre-commit                      # Linting und Formatierung
│   └── commit-msg                      # Commit-Message Validierung
├── pnpm-workspace.yaml                 # 📦 Monorepo configuration
├── package.json                        # Root package scripts
├── CLAUDE.md                           # 🤖 AI Agent Instructions (WICHTIG!)
├── README.md                           # Projekt-Readme
├── docker-compose.yml                  # Docker-Infrastruktur
└── biome.json                          # Biome Linter/Formatter Config
```

**Kritische Root-Dateien:**
- **CLAUDE.md** - Zentrales Regelwerk für AI-Agents (Breaking Rules, Patterns, Workflows)
- **pnpm-workspace.yaml** - Definiert Monorepo-Struktur
- **biome.json** - Shared Linting/Formatting Rules für alle Packages

---

## Backend Part (packages/backend/)

**Typ:** REST API Backend
**Framework:** NestJS 11 mit Prisma ORM
**Entry Point:** `src/main.ts`
**Port:** 3000 (dev), konfigurierbar via `PORT` env
**Database:** PostgreSQL via Prisma

### Backend-Struktur

```
packages/backend/
├── src/
│   ├── main.ts                         # 🚀 Application entry point (Bootstrap)
│   │   # - NestJS app initialization
│   │   # - Swagger/OpenAPI setup (KRITISCH für API-Generation!)
│   │   # - Global pipes, filters, interceptors
│   │   # - Versioned API (v-alpha, v-1)
│   │   # - CORS, helmet, rate limiting
│   │
│   ├── app.module.ts                   # Root module with global imports
│   │   # - ConfigModule (global config)
│   │   # - PrismaModule (database)
│   │   # - CacheModule (Redis-backed)
│   │   # - All feature modules
│   │
│   ├── modules/                        # 🏛️ Feature modules (Domain-driven)
│   │   └── lagekarte/                  # Situation Map Module
│   │       ├── controllers/
│   │       │   ├── lagekarte.controller.ts  # Map state CRUD
│   │       │   ├── poi.controller.ts        # POI (Point of Interest) CRUD
│   │       │   └── geocoding.controller.ts  # Address → Coordinates
│   │       ├── services/
│   │       │   ├── lagekarte.service.ts     # Map business logic
│   │       │   ├── poi.service.ts           # POI business logic
│   │       │   ├── geocoding.service.ts     # Nominatim API integration
│   │       │   └── mgrs-converter.service.ts # Military Grid Reference System
│   │       ├── repositories/
│   │       │   ├── lagekarte.repository.ts  # Lagekarte data access
│   │       │   └── poi.repository.ts        # POI data access
│   │       ├── dto/
│   │       │   ├── save-lagekarte-state.dto.ts # GeoJSON state
│   │       │   ├── create-poi.dto.ts        # POI creation (geocoding support)
│   │       │   ├── update-poi.dto.ts        # POI updates
│   │       │   └── poi-response.dto.ts      # POI API response
│   │       ├── validators/
│   │       │   └── coordinates-or-address.validator.ts # Custom Zod validator
│   │       └── lagekarte.module.ts          # Module definition
│   │
│   ├── auth/                           # 🔐 Authentication & Authorization Module
│   │   ├── auth.controller.ts          # Auth endpoints (14 endpoints)
│   │   │   # - POST /auth/login (user login)
│   │   │   # - POST /auth/admin/login (admin login)
│   │   │   # - POST /auth/admin/setup (initial admin setup)
│   │   │   # - POST /auth/refresh (token refresh)
│   │   │   # - GET /auth/check (auth status)
│   │   │   # - POST /auth/logout (logout)
│   │   │   # - GET /auth/users (public user list)
│   │   ├── auth.service.ts             # Core auth logic
│   │   │   # - JWT generation (access + refresh + admin tokens)
│   │   │   # - Password hashing (bcrypt)
│   │   │   # - Token validation and refresh
│   │   │   # - Admin initialization
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts       # Standard user authentication
│   │   │   ├── jwt-refresh.guard.ts    # Refresh token validation
│   │   │   └── admin-jwt-auth.guard.ts # Admin-only authentication
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts         # Passport JWT strategy (user)
│   │   │   ├── jwt-refresh.strategy.ts # Passport JWT refresh strategy
│   │   │   └── admin-jwt.strategy.ts   # Passport JWT strategy (admin)
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts # @CurrentUser() parameter decorator
│   │   ├── dto/                        # 17 DTOs für Auth-Endpoints
│   │   │   ├── auth-request.dto.ts     # Login credentials
│   │   │   ├── auth-response.dto.ts    # Login response with user + tokens
│   │   │   ├── admin-setup.dto.ts      # Initial admin setup
│   │   │   ├── refresh-response.dto.ts # Token refresh response
│   │   │   └── ... (weitere DTOs)
│   │   ├── mappers/                    # Domain → DTO Mapper
│   │   │   ├── auth-response.mapper.ts # User → AuthResponseDto
│   │   │   └── admin-auth.mapper.ts    # Admin → AdminLoginResponseDto
│   │   └── utils/
│   │       └── auth.utils.ts           # Password hashing, validation
│   │
│   ├── einsatz/                        # 🚨 Mission Management Module (Core Domain)
│   │   ├── einsatz.controller.ts       # Einsatz endpoints (12 endpoints)
│   │   │   # - GET /einsatz (list with filters + pagination)
│   │   │   # - POST /einsatz (create new mission)
│   │   │   # - GET /einsatz/:id (get single)
│   │   │   # - PATCH /einsatz/:id (update)
│   │   │   # - DELETE /einsatz/:id (soft-delete)
│   │   │   # - GET /einsatz/:id/navigation (prev/next/first/last)
│   │   │   # - GET /einsatz/status/counts (status statistics)
│   │   │   # - GET /einsatz/:id/completeness (data completeness check)
│   │   │   # - POST /einsatz/:id/archive (archive mission)
│   │   ├── einsatz.service.ts          # Business logic
│   │   │   # - Create with auto-generated name (animals + adjectives)
│   │   │   # - Status transitions with validation
│   │   │   # - Completeness calculation (0-100%)
│   │   │   # - Navigation (prev/next/first/last)
│   │   │   # - Archive with user tracking
│   │   ├── einsatz.repository.ts       # Data access layer
│   │   │   # - Prisma-based queries with relations
│   │   │   # - Soft-delete support
│   │   │   # - Complex filtering (status, date ranges, search)
│   │   ├── dto/                        # 10 DTOs
│   │   │   ├── create-einsatz.dto.ts   # Minimal creation (only date)
│   │   │   ├── update-einsatz.dto.ts   # Partial updates
│   │   │   ├── einsatz-response.dto.ts # Full response with relations
│   │   │   ├── completeness-response.dto.ts # Completeness metrics
│   │   │   ├── navigation-response.dto.ts # Prev/next IDs
│   │   │   └── ... (weitere DTOs)
│   │   ├── events/
│   │   │   └── einsatz-erstellt.event.ts # Domain event
│   │   ├── exceptions/
│   │   │   └── einsatz-not-found.exception.ts # Custom exception
│   │   └── utils/
│   │       ├── name-generator.util.ts  # Adjektiv + Tier (z.B. "Fleißiger Dachs")
│   │       ├── status-transitions.util.ts # Valid status transitions
│   │       └── completeness.util.ts    # Calculate field completeness
│   │
│   ├── etb/                            # 📝 Einsatztagebuch (Mission Log) Module
│   │   ├── etb.controller.ts           # ETB endpoints (9 endpoints)
│   │   │   # - POST /etb (create ETB for Einsatz)
│   │   │   # - GET /etb/:einsatzId (get ETB with entries)
│   │   │   # - POST /etb/:einsatzId/entry (add entry)
│   │   │   # - PATCH /etb/entry/:entryId (update entry)
│   │   │   # - DELETE /etb/entry/:entryId (soft-delete entry)
│   │   │   # - GET /etb/entry/:entryId/history (entry history)
│   │   │   # - GET /etb/textbausteine (templates)
│   │   │   # - POST /etb/textbausteine (create template)
│   │   ├── etb.service.ts              # Business logic
│   │   │   # - Versioning system (entry modifications tracked)
│   │   │   # - Soft-delete with deletedBy tracking
│   │   │   # - Textbausteine (text templates) management
│   │   │   # - History for every entry modification
│   │   ├── etb.repository.ts           # Data access layer
│   │   │   # - Prisma-based CRUD with relations
│   │   │   # - History retrieval with pagination
│   │   ├── dto/                        # 5 DTOs
│   │   │   ├── create-etb.dto.ts       # ETB creation
│   │   │   ├── create-etb-eintrag.dto.ts # Entry creation
│   │   │   ├── update-etb-eintrag.dto.ts # Entry update
│   │   │   ├── etb-response.dto.ts     # ETB with entries
│   │   │   └── etb-pagination.dto.ts   # Pagination params
│   │   └── etb.constants.ts            # Constants (categories, etc.)
│   │
│   ├── user-management/                # 👥 User Management Module
│   │   ├── user.controller.ts          # User profile endpoints (2 endpoints)
│   │   │   # - GET /users/profile (current user profile)
│   │   │   # - PATCH /users/profile (update profile)
│   │   ├── user-management.controller.ts # Admin user management (6 endpoints)
│   │   │   # - GET /user-management (list all users)
│   │   │   # - POST /user-management (create user)
│   │   │   # - PATCH /user-management/:id (update user)
│   │   │   # - POST /user-management/:id/lock (lock user)
│   │   │   # - POST /user-management/:id/unlock (unlock user)
│   │   │   # - DELETE /user-management/:id (soft-delete user)
│   │   ├── user-management.service.ts  # Admin operations
│   │   ├── user.repository.ts          # Data access layer
│   │   ├── dto/                        # 7 DTOs
│   │   │   ├── create-user.dto.ts      # User creation (admin only)
│   │   │   ├── update-user.dto.ts      # User updates
│   │   │   ├── lock-user.dto.ts        # Lock reason
│   │   │   └── ... (weitere DTOs)
│   │   └── mappers/
│   │       └── user-management.mapper.ts # User → UserDto
│   │
│   ├── health/                         # ⚕️ Health Check Module
│   │   ├── health.controller.ts        # Health endpoints (3 endpoints)
│   │   │   # - GET /health (liveness probe)
│   │   │   # - GET /health/readiness (readiness probe)
│   │   │   # - GET /health/detailed (detailed health + database)
│   │   ├── health.module.ts            # TerminusModule integration
│   │   └── prisma-health.indicator.ts  # Custom Prisma health indicator
│   │
│   ├── cli/                            # 🖥️ CLI Commands (NestJS Commander)
│   │   ├── cli.module.ts               # CLI module definition
│   │   └── commands/
│   │       └── admin-reset-password.command.ts # Admin password reset
│   │
│   ├── common/                         # 🔧 Shared utilities and infrastructure
│   │   ├── decorators/
│   │   │   ├── api-wrapped-response.decorator.ts # Swagger wrapper
│   │   │   ├── is-nanoid.decorator.ts  # Zod Nanoid validator
│   │   │   ├── rate-limit.decorator.ts # Rate limiting decorator
│   │   │   └── skip-transform.decorator.ts # Skip response transformation
│   │   ├── guards/
│   │   │   └── rate-limit.guard.ts     # Rate limiting guard (Redis-backed)
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts # Response wrapper (data, meta, errors)
│   │   │   └── performance.interceptor.ts # Performance logging
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts # Global exception handler
│   │   ├── pipes/
│   │   │   └── parse-nanoid.pipe.ts    # Nanoid validation pipe
│   │   ├── dto/
│   │   │   └── pagination.dto.ts       # Pagination params (page, limit)
│   │   ├── interfaces/
│   │   │   └── api-response.interface.ts # ApiResponse<T> interface
│   │   ├── services/
│   │   │   ├── app-config.service.ts   # Centralized config service
│   │   │   ├── cache-rate-limiter.service.ts # Redis rate limiter
│   │   │   └── cache-duplicate-detection.service.ts # Duplicate request detection
│   │   └── utils/
│   │       ├── circuit-breaker.util.ts # Circuit breaker pattern
│   │       ├── retry.util.ts           # Retry logic with exponential backoff
│   │       ├── performance-logger.util.ts # Performance metrics
│   │       └── prisma.util.ts          # Prisma helper utilities
│   │
│   ├── config/                         # ⚙️ Configuration modules
│   │   ├── config.module.ts            # ConfigModule setup
│   │   └── security.config.ts          # Security settings (JWT, CORS, etc.)
│   │
│   ├── prisma/                         # 🗄️ Prisma integration
│   │   ├── prisma.service.ts           # PrismaClient wrapper
│   │   └── prisma.module.ts            # Global Prisma module
│   │
│   ├── websocket/                      # 🔌 WebSocket support (future)
│   │   └── event/                      # WebSocket event types
│   │
│   ├── utils/                          # 🛠️ Global utilities
│   │   ├── date.util.ts                # Date formatting
│   │   └── url.util.ts                 # URL helpers
│   │
│   ├── app.controller.ts               # Root API endpoints
│   │   # - GET / (API info)
│   │   # - GET /meta (API metadata)
│   │
│   └── main-cli.ts                     # 🖥️ CLI entry point (NestJS Commander)
│
├── prisma/                             # 📊 Database Schema & Migrations
│   ├── schema.prisma                   # Prisma schema (9 models, 5 enums)
│   │   # Models:
│   │   # - User (authentication, roles, soft-delete, manual lock)
│   │   # - Einsatz (mission management, status, soft-delete)
│   │   # - Einsatztagebuch (mission log, versioning)
│   │   # - EtbEintrag (log entries, soft-delete)
│   │   # - EtbEintragHistorie (entry history/versioning)
│   │   # - EtbTextbaustein (text templates)
│   │   # - EtbArchiv (ETB archive)
│   │   # - Lagekarte (situation map state)
│   │   # - LagekartePoi (points of interest)
│   │   #
│   │   # Enums:
│   │   # - UserRole (SUPER_ADMIN, ADMIN, USER)
│   │   # - EinsatzStatus (ANGELEGT, IN_BEARBEITUNG, ABGESCHLOSSEN, ARCHIVIERT)
│   │   # - EtbKategorie (EINSATZLEITUNG, FUEHRUNGSSTAB, TECHNISCHE_LEITUNG, etc.)
│   │   # - PoiType (FIRE, WATER, VEHICLE, PERSON, BUILDING, etc.)
│   │   # - PoiPriority (LOW, NORMAL, HIGH, CRITICAL)
│   │
│   ├── migrations/                     # Database migrations (auto-generated)
│   └── seed.ts                         # Database seeding script
│
├── scripts/
│   └── find-missing-jsdoc.ts           # JSDoc coverage checker
│
├── test/                               # E2E Tests (removed as per project notes)
│
├── uploads/                            # File uploads storage
│   └── lagekarte/                      # Lagekarte screenshots
│
├── package.json                        # Backend dependencies
│   # Key dependencies:
│   # - @nestjs/core, @nestjs/common (NestJS framework)
│   # - @nestjs/swagger (OpenAPI generation)
│   # - @prisma/client, prisma (ORM)
│   # - passport, passport-jwt (authentication)
│   # - bcrypt (password hashing)
│   # - nanoid (ID generation)
│   # - @nestjs/terminus (health checks)
│   # - @nestjs/cache-manager (caching)
│   # - nest-commander (CLI)
│
├── nest-cli.json                       # NestJS CLI configuration
├── tsconfig.json                       # TypeScript configuration
└── biome.json                          # Biome linter configuration
```

### Backend-Zusammenfassung

**Feature Modules:** 7 Hauptmodule (Auth, Einsatz, ETB, Lagekarte, User Management, Health, CLI)
**API Endpoints:** ~60 REST-Endpunkte (versioned via `/v-alpha/`, zukünftig `/v-1/`)
**Database Models:** 9 Prisma Models, 5 Enums
**Authentication:** JWT-based (3 token types: access, refresh, admin)
**Architecture Pattern:** Repository Pattern mit Service-Layer
**API Documentation:** Swagger/OpenAPI auto-generated (kritisch für Frontend!)

**Integration Points:**
- Exposes REST API at `http://localhost:3000/api`
- OpenAPI spec at `http://localhost:3000/api-docs`
- Consumed by Frontend via generated client in `packages/shared`

---

## Frontend Part (packages/frontend/)

**Typ:** Desktop Application
**Framework:** React 19 + Vite + Tauri 2
**Entry Point:** `src/main.tsx` (React) + `src-tauri/src/main.rs` (Tauri)
**Port:** 5173 (Vite dev server), Tauri app in production
**UI Framework:** Tailwind CSS + Headless UI (+ TailwindUI Premium Komponenten)

### Frontend-Struktur

```
packages/frontend/
├── src/
│   ├── main.tsx                        # 🚀 React entry point
│   │   # - Root render with StrictMode
│   │   # - ChakraProvider (UI Framework)
│   │   # - TanStack Router integration
│   │   # - TanStack Query setup
│   │
│   ├── App.tsx                         # Root component (deprecated, use router.tsx)
│   │
│   ├── router.tsx                      # 🗺️ React Router configuration
│   │   # - TanStack Router setup
│   │   # - Route guards (auth, admin)
│   │   # - Global layout with providers
│   │
│   ├── components/                     # 🎨 Atomic Design hierarchy
│   │   │
│   │   ├── atoms/                      # 24 Base components
│   │   │   ├── button.atom.tsx         # Primary UI button (variants: primary, secondary, danger)
│   │   │   ├── input.atom.tsx          # Form input with validation states
│   │   │   ├── badge.atom.tsx          # Status badges
│   │   │   ├── card.atom.tsx           # Card container
│   │   │   ├── spinner.atom.tsx        # Loading spinner
│   │   │   ├── alert.atom.tsx          # Alert/notification
│   │   │   ├── heading.atom.tsx        # Typography headings
│   │   │   ├── text.atom.tsx           # Body text
│   │   │   ├── label.atom.tsx          # Form labels
│   │   │   ├── textarea.atom.tsx       # Multi-line text input
│   │   │   ├── select.atom.tsx         # Dropdown select
│   │   │   ├── date-input.atom.tsx     # Date picker
│   │   │   ├── progress-bar.atom.tsx   # Progress bar
│   │   │   ├── icon-button.atom.tsx    # Icon-only button
│   │   │   ├── close-button.atom.tsx   # Modal close button
│   │   │   ├── poi-type-button.atom.tsx # POI type selection button
│   │   │   ├── color-mode-icon.atom.tsx # Dark mode icon
│   │   │   ├── command-trigger.atom.tsx # Command palette trigger
│   │   │   ├── confirmation-prompt.atom.tsx # Confirm dialog
│   │   │   ├── container.atom.tsx      # Layout container
│   │   │   ├── form-field.atom.tsx     # Form field wrapper
│   │   │   ├── image.atom.tsx          # Image component
│   │   │   ├── LoadingState.tsx        # Loading state placeholder
│   │   │   └── ErrorState.tsx          # Error state placeholder
│   │   │
│   │   ├── molecules/                  # 46 Composite components
│   │   │   ├── shared/                 # Reusable molecules (17 components)
│   │   │   │   ├── dialog.molecule.tsx # Modal dialog (Headless UI)
│   │   │   │   ├── table.molecule.tsx  # Data table
│   │   │   │   ├── tabs.molecule.tsx   # Tab navigation
│   │   │   │   ├── timeline.molecule.tsx # Timeline component
│   │   │   │   ├── search-input.molecule.tsx # Search with debounce
│   │   │   │   ├── auth-card.molecule.tsx # Auth form card
│   │   │   │   ├── auth-footer.molecule.tsx # Auth footer
│   │   │   │   ├── color-mode-button.molecule.tsx # Dark mode toggle
│   │   │   │   ├── color-mode-menu.molecule.tsx # Color mode dropdown
│   │   │   │   ├── password-input.molecule.tsx # Password input with toggle
│   │   │   │   ├── password-strength-indicator.molecule.tsx # Password strength
│   │   │   │   ├── poi-type-dropdown.molecule.tsx # POI type selector
│   │   │   │   └── logo-with-indicator.molecule.tsx # Logo with status
│   │   │   │
│   │   │   ├── einsatz/                # Einsatz-specific molecules (13 components)
│   │   │   │   ├── EinsatzHeader.tsx   # Einsatz detail header
│   │   │   │   ├── EinsatzInfoCard.tsx # Info card with stats
│   │   │   │   ├── EinsatzListItem.tsx # List item for table
│   │   │   │   ├── EinsatzStatsCard.tsx # Statistics card
│   │   │   │   ├── EinsatzTimelineWidget.tsx # Timeline widget
│   │   │   │   ├── EinsatzResourceWidget.tsx # Resources overview
│   │   │   │   ├── ModuleButton.tsx    # Module navigation button
│   │   │   │   ├── ModuleOverviewCard.tsx # Module card
│   │   │   │   ├── PlaceholderModule.tsx # Coming soon placeholder
│   │   │   │   ├── ArchivedBanner.tsx  # Archived status banner
│   │   │   │   ├── einsatz-status-badge.molecule.tsx # Status badge
│   │   │   │   ├── einsatz-completeness-bar.molecule.tsx # Completeness %
│   │   │   │   └── einsatz-incomplete-alert.molecule.tsx # Incomplete warning
│   │   │   │
│   │   │   ├── etb/                    # ETB molecules (8 components)
│   │   │   │   ├── EtbSearchBar.tsx    # Search with filters
│   │   │   │   ├── EtbFilterControls.tsx # Filter controls
│   │   │   │   ├── EtbTableHeader.tsx  # Table header
│   │   │   │   ├── EtbTableBody.tsx    # Table body with entries
│   │   │   │   ├── EtbEmptyState.tsx   # Empty state placeholder
│   │   │   │   ├── EtbResultsCount.tsx # Result count badge
│   │   │   │   ├── EtbFormActions.tsx  # Form action buttons
│   │   │   │   └── EtbTextbausteinPreview.tsx # Textbaustein preview
│   │   │   │
│   │   │   ├── lagekarte/              # Lagekarte molecules (4 components)
│   │   │   │   ├── LayerToggle/        # Layer visibility toggle
│   │   │   │   ├── OfflineIndicator/   # Offline status indicator
│   │   │   │   ├── PoiPopup/           # POI detail popup
│   │   │   │   ├── SelectedShapeToolbar.tsx # Shape editing toolbar
│   │   │   │   └── ShapeContextMenu.tsx # Right-click context menu
│   │   │   │
│   │   │   ├── dashboard/              # Dashboard molecules (2 components)
│   │   │   │   ├── StatusCard.tsx      # Status overview card
│   │   │   │   └── MobileStatusBar.tsx # Mobile status bar
│   │   │   │
│   │   │   ├── auth/                   # Auth molecules (1 component)
│   │   │   │   └── AuthLoading.tsx     # Auth loading state
│   │   │   │
│   │   │   ├── admin/                  # Admin molecules (1 component)
│   │   │   │   └── UserFormFields.tsx  # User form fields
│   │   │   │
│   │   │   ├── form/                   # Form molecules (4 components)
│   │   │   │   ├── FormFieldWrapper.tsx # Form field container
│   │   │   │   ├── ColorPicker.molecule.tsx # Color picker
│   │   │   │   └── RangeSlider.molecule.tsx # Range slider
│   │   │   │
│   │   │   └── sidebar/                # Sidebar molecules
│   │   │
│   │   ├── organisms/                  # 73 Complex modules
│   │   │   ├── etb/                    # ETB organisms (17 components) - HIGHEST COMPLEXITY
│   │   │   │   ├── EtbEntryList.tsx    # Entry list with pagination
│   │   │   │   ├── EtbEntryForm.tsx    # Entry creation form
│   │   │   │   ├── EditEtbEntryModal.tsx # Entry editing modal
│   │   │   │   ├── EtbKategorieSelect.tsx # Category selector
│   │   │   │   ├── EtbTextInput.tsx    # Text input with autocomplete
│   │   │   │   ├── EtbTextbausteinSelect.tsx # Template selector
│   │   │   │   ├── EtbFullscreenView/  # Fullscreen ETB view
│   │   │   │   ├── components/         # ETB sub-components
│   │   │   │   ├── constants/          # ETB constants
│   │   │   │   ├── hooks/              # ETB-specific hooks
│   │   │   │   └── types.ts            # ETB TypeScript types
│   │   │   │
│   │   │   ├── lagekarte/              # Lagekarte organisms (16 components)
│   │   │   │   ├── LagekarteView/      # Main map view component
│   │   │   │   ├── PropertyPanel/      # Shape/POI property panel
│   │   │   │   ├── FullscreenCloseButton/ # Fullscreen exit
│   │   │   │   ├── toolbar/            # Map toolbar components
│   │   │   │   │   ├── DrawingToolbar.tsx # Drawing tools
│   │   │   │   │   ├── CoordinateDisplay.tsx # MGRS/LatLng display
│   │   │   │   │   └── ZoomControls.tsx # Zoom buttons
│   │   │   │   ├── layers/             # Map layers
│   │   │   │   │   ├── BaseLayer.tsx   # OSM base layer
│   │   │   │   │   ├── PoiLayer.tsx    # POI markers
│   │   │   │   │   ├── ShapeLayer.tsx  # Drawing shapes
│   │   │   │   │   └── ClusterLayer.tsx # POI clustering
│   │   │   │   ├── modals/             # Map modals
│   │   │   │   │   ├── AddPoiModal.tsx # POI creation
│   │   │   │   │   ├── EditPoiModal.tsx # POI editing
│   │   │   │   │   └── ScreenshotModal.tsx # Screenshot capture
│   │   │   │   └── controls/           # Custom Leaflet controls
│   │   │   │
│   │   │   ├── command-palette/        # Command palette (6 components)
│   │   │   │   ├── CommandPalette.tsx  # Main command palette
│   │   │   │   ├── CommandPaletteErrorBoundary.tsx # Error boundary
│   │   │   │   ├── components/         # Command sub-components
│   │   │   │   ├── hooks/              # Command hooks
│   │   │   │   ├── types.ts            # Command types
│   │   │   │   └── utils.ts            # Command utilities
│   │   │   │
│   │   │   ├── einsatz/                # Einsatz organisms (5 components)
│   │   │   │   ├── EinsatzDashboard.tsx # Einsatz overview
│   │   │   │   ├── EinsatzDetailView.tsx # Einsatz detail
│   │   │   │   ├── EinsatzCreateForm.tsx # Creation form
│   │   │   │   ├── SingleEinsatzDashboard.tsx # Single mission view
│   │   │   │   └── ArchiveConfirmationModal.tsx # Archive confirmation
│   │   │   │
│   │   │   ├── admin/                  # Admin organisms (4 components)
│   │   │   │   ├── UsersTable.tsx      # User management table
│   │   │   │   ├── CreateUserDialog.tsx # User creation
│   │   │   │   ├── EditUserDialog.tsx  # User editing
│   │   │   │   └── ConfirmDeleteDialog.tsx # Delete confirmation
│   │   │   │
│   │   │   ├── auth/                   # Auth organisms (2 components)
│   │   │   │   ├── UnifiedAuthForm.tsx # Login/Register form
│   │   │   │   └── LoginWindow.tsx     # Login window container
│   │   │   │
│   │   │   ├── dashboard/              # Dashboard organisms (2 components)
│   │   │   │   ├── FilterPanel.tsx     # Filter panel
│   │   │   │   └── MobileFilterDialog.tsx # Mobile filter dialog
│   │   │   │
│   │   │   └── einsaetze/              # Einsatz list organisms
│   │   │
│   │   ├── templates/                  # 4 Page layouts
│   │   │   ├── AuthLayout.tsx          # Auth page layout (centered card)
│   │   │   ├── AdminLayout.tsx         # Admin panel layout (sidebar)
│   │   │   ├── AdminDashboardLayout.tsx # Admin dashboard layout
│   │   │   └── SingleEinsatzLayout.tsx # Single mission layout (tabbed)
│   │   │
│   │   ├── pages/                      # 6 Route-bound pages
│   │   │   ├── index.page.tsx          # Landing page
│   │   │   ├── app/                    # App pages
│   │   │   │   └── einsatz/            # Einsatz pages
│   │   │   │       ├── $einsatzId/     # Single mission subpages
│   │   │   │       │   ├── etb.page.tsx # ETB page
│   │   │   │       │   ├── lagekarte.page.tsx # Lagekarte page
│   │   │   │       │   └── overview.page.tsx # Overview page
│   │   │   │       └── index.page.tsx  # Mission list
│   │   │   └── admin/                  # Admin pages
│   │   │       ├── auth/               # Admin auth pages
│   │   │       ├── dashboard/          # Admin dashboard
│   │   │       └── settings/           # Admin settings
│   │   │
│   │   └── ui/                         # Chakra UI customization
│   │       ├── provider.tsx            # ChakraProvider with theme
│   │       ├── color-mode.tsx          # Color mode utilities
│   │       └── combobox.tsx            # Combobox component
│   │
│   ├── hooks/                          # 24+ Custom React hooks
│   │   ├── useAuth.ts                  # 🔐 Authentication hooks
│   │   │   # - useLogin() - User login mutation
│   │   │   # - useLogout() - Logout mutation
│   │   │   # - useCheckAuth() - Auth status query
│   │   │   # - useRegister() - Register mutation (if enabled)
│   │   │
│   │   ├── useAdminAuth.ts             # 🔐 Admin authentication hooks
│   │   │   # - useAdminLogin() - Admin login mutation
│   │   │   # - useAdminSetup() - Initial admin setup mutation
│   │   │   # - useAdminStatus() - Admin initialization status query
│   │   │
│   │   ├── useActiveEinsatz.ts         # 🚨 Active Einsatz context + persistence
│   │   │   # - useActiveEinsatz() - Get/Set active Einsatz ID
│   │   │   # - useActiveEinsatzData() - Get active Einsatz data (React Query)
│   │   │   # - Cross-tab sync via localStorage + StorageEvent
│   │   │   # - Persistence across sessions
│   │   │
│   │   ├── useEinsaetze.ts             # 🚨 Einsatz list hooks
│   │   │   # - useEinsaetze() - Paginated Einsatz list query
│   │   │   # - useInfiniteEinsaetze() - Infinite scroll query
│   │   │   # - useEinsatz() - Single Einsatz query
│   │   │   # - useCreateEinsatz() - Create mutation with optimistic update
│   │   │   # - useUpdateEinsatz() - Update mutation with optimistic update
│   │   │   # - useArchiveEinsatz() - Archive mutation
│   │   │
│   │   ├── useEinsatzStatusCounts.ts   # 🚨 Einsatz status statistics
│   │   │   # - useEinsatzStatusCounts() - Status counts query (ANGELEGT, IN_BEARBEITUNG, etc.)
│   │   │
│   │   ├── useEtb.ts                   # 📝 ETB hooks (7 hooks)
│   │   │   # - useEtb() - Get ETB with entries
│   │   │   # - useCreateEtb() - Create ETB mutation
│   │   │   # - useEtbEntries() - Get entries with filters
│   │   │   # - useCreateEtbEntry() - Create entry mutation with optimistic update
│   │   │   # - useUpdateEtbEntry() - Update entry mutation with optimistic update
│   │   │   # - useDeleteEtbEntry() - Soft-delete mutation with optimistic update
│   │   │   # - useEtbEntryHistory() - Get entry history
│   │   │   # - useEtbTextbausteine() - Get text templates
│   │   │
│   │   ├── useLagekarte.ts             # 🗺️ Lagekarte hooks with offline-first
│   │   │   # - useLagekarte() - Get Lagekarte state (networkMode: 'offlineFirst')
│   │   │   # - useSaveLagekarte() - Save Lagekarte state mutation
│   │   │   # - Offline tile caching support
│   │   │
│   │   ├── usePois.ts                  # 📍 POI hooks with geocoding
│   │   │   # - usePois() - Get POIs for Einsatz
│   │   │   # - useCreatePoi() - Create POI mutation with geocoding
│   │   │   # - useUpdatePoi() - Update POI mutation
│   │   │   # - useDeletePoi() - Delete POI mutation
│   │   │
│   │   ├── usePublicUsers.ts           # 👥 Public user list
│   │   │   # - usePublicUsers() - Get public user list (for user selection)
│   │   │
│   │   ├── useUsers.ts                 # 👥 User profile hooks
│   │   │   # - useUserProfile() - Get current user profile
│   │   │   # - useUpdateUserProfile() - Update profile mutation
│   │   │
│   │   ├── useAdminUserManagement.ts   # 👥 Admin user management hooks
│   │   │   # - useUsers() - Get all users (admin only)
│   │   │   # - useCreateUser() - Create user mutation
│   │   │   # - useUpdateUser() - Update user mutation
│   │   │   # - useLockUser() - Lock user mutation
│   │   │   # - useUnlockUser() - Unlock user mutation
│   │   │   # - useDeleteUser() - Soft-delete user mutation
│   │   │
│   │   ├── einsatz/
│   │   │   └── useEinsatzModules.ts    # Einsatz module metadata
│   │   │
│   │   ├── lagekarte/                  # 🗺️ Lagekarte-specific hooks (10 hooks)
│   │   │   ├── useLeafletPMControls.ts # Leaflet.PM drawing controls
│   │   │   ├── useShapeSelection.ts    # Shape selection state
│   │   │   ├── useShapeEventHandlers.ts # Shape event handlers (created, edited, removed)
│   │   │   ├── useShapeLoading.ts      # Shape loading from state
│   │   │   ├── useShapeHighlighting.ts # Shape highlighting on hover
│   │   │   ├── useShapeStyleUpdates.ts # Shape style updates (color, etc.)
│   │   │   ├── useTextMarkerHandling.ts # Text marker support
│   │   │   ├── useDrawingToolSelection.ts # Drawing tool state
│   │   │   ├── useKeyboardShortcuts.ts # Keyboard shortcuts for map
│   │   │   └── useToolbarPositioning.ts # Toolbar positioning logic
│   │   │
│   │   ├── use-color-mode.ts           # 🎨 Dark mode hook
│   │   ├── useConfirm.tsx              # 🔔 Confirmation dialog hook
│   │   ├── useIsTauri.ts               # 🪟 Tauri detection hook
│   │   └── useWindowOrientation.ts     # 📱 Window orientation hook (mobile)
│   │
│   ├── stores/                         # 🗄️ TanStack Store (global state)
│   │   ├── einsatzStore.ts             # Active Einsatz store
│   │   │   # - activeEinsatzId: string | null
│   │   │   # - setActiveEinsatzId(id: string | null)
│   │   │   # - Cross-tab sync via localStorage
│   │   │   # - Persistence via einsatzPersistence
│   │   │
│   │   └── persistence/
│   │       └── einsatzPersistence.ts   # Einsatz store persistence logic
│   │
│   ├── api/                            # 🔌 API client wrapper
│   │   ├── api.ts                      # BackendApi singleton
│   │   │   # - Wraps generated API client from @bluelight-hub/shared
│   │   │   # - Automatic token refresh on 401
│   │   │   # - Centralized error handling
│   │   │   # - Base URL from VITE_API_URL env
│   │   │
│   │   ├── fetchWithRefresh.ts         # Fetch wrapper with token refresh
│   │   ├── index.ts                    # API exports
│   │   └── hooks/
│   │       └── useLagekarteApi.ts      # Lagekarte API hook (deprecated, use useQuery)
│   │
│   ├── queryKeys.ts                    # 🗝️ Centralized TanStack Query keys
│   │   # Hierarchical structure:
│   │   # - QUERY_KEYS.auth.check
│   │   # - QUERY_KEYS.auth.publicUsers
│   │   # - QUERY_KEYS.einsatz.list(filters)
│   │   # - QUERY_KEYS.einsatz.detail(id)
│   │   # - QUERY_KEYS.etb.detail(einsatzId)
│   │   # - QUERY_KEYS.etb.entries(einsatzId, filters)
│   │   # - QUERY_KEYS.lagekarte.state(einsatzId)
│   │   # - QUERY_KEYS.poi.list(einsatzId)
│   │   # - QUERY_KEYS.users.profile
│   │   # - QUERY_KEYS.admin.users
│   │   # - QUERY_KEYS.admin.status
│   │
│   ├── routes/                         # 🗺️ TanStack Router routes
│   │   ├── __root.tsx                  # Root layout with providers
│   │   ├── index.tsx                   # Landing page route
│   │   ├── auth.tsx                    # Auth page route
│   │   ├── admin-login.tsx             # Admin login route
│   │   ├── app.tsx                     # App layout route (protected)
│   │   ├── app/
│   │   │   ├── einsaetze.tsx           # Einsatz list route
│   │   │   ├── einsaetze/
│   │   │   │   ├── index.tsx           # List view
│   │   │   │   └── $einsatzId.tsx      # Single mission route
│   │   │   └── einsatz/
│   │   │       ├── $einsatzId.tsx      # Single mission layout
│   │   │       └── $einsatzId/
│   │   │           ├── index.tsx       # Overview
│   │   │           ├── etb.tsx         # ETB subpage
│   │   │           └── lagekarte.tsx   # Lagekarte subpage
│   │   └── admin/
│   │       ├── index.tsx               # Admin dashboard route
│   │       ├── setup.tsx               # Admin setup route
│   │       ├── dashboard.tsx           # Admin dashboard
│   │       └── users.tsx               # User management route
│   │
│   ├── contexts/                       # React Context providers
│   │   # (Currently empty, using TanStack Query + Store instead)
│   │
│   ├── guards/
│   │   └── app.guard.tsx               # Route guard for authenticated routes
│   │
│   ├── schemas/                        # Zod validation schemas
│   │   ├── auth.schema.ts              # Auth form schemas
│   │   └── einsatz.schema.ts           # Einsatz form schemas
│   │
│   ├── services/
│   │   └── windowService.ts            # Tauri window service
│   │
│   ├── types/
│   │   ├── auth.ts                     # Auth TypeScript types
│   │   └── tauri.d.ts                  # Tauri type declarations
│   │
│   ├── utils/                          # 🛠️ Utility functions
│   │   ├── cn.ts                       # Tailwind class merging (clsx + twMerge)
│   │   ├── auth.ts                     # Auth utilities
│   │   ├── error-handler.ts            # Error handling utilities
│   │   ├── apiErrorHandler.ts          # API error handler
│   │   ├── dateFormatter.ts            # Date formatting
│   │   ├── logger.ts                   # Console logger
│   │   ├── url.util.ts                 # URL helpers
│   │   ├── timeBasedBackground.ts      # Time-based background gradient
│   │   ├── module-colors.ts            # Module color mapping
│   │   ├── formatPoiTypeLabel.ts       # POI type label formatter
│   │   ├── cluster-icons.ts            # Leaflet cluster icons
│   │   ├── poi-icons.ts                # POI marker icons
│   │   ├── drawing-styles.ts           # Map drawing styles
│   │   ├── offline-tiles.ts            # Offline tile caching
│   │   ├── offline-cleanup.ts          # Offline cache cleanup
│   │   ├── storage-quota.ts            # Storage quota management
│   │   ├── captureMapScreenshot.ts     # Map screenshot capture
│   │   ├── validateScreenshotUrl.ts    # Screenshot URL validator
│   │   └── lagekarte/                  # Lagekarte utilities (5 files)
│   │       ├── layer-utils.ts          # Layer management
│   │       ├── shape-helpers.ts        # Shape utilities
│   │       ├── mgrs.ts                 # MGRS coordinate conversion
│   │       ├── types.ts                # Lagekarte TypeScript types
│   │       └── README.md               # Lagekarte utilities docs
│   │
│   ├── assets/                         # Static assets
│   │   ├── brandbook/                  # Logo assets (5 variants)
│   │   │   ├── horizontal-logo.png
│   │   │   ├── vertical-logo.png
│   │   │   ├── wordmark-logo.png
│   │   │   ├── mobile-logo.png
│   │   │   └── mobile-white.png
│   │   └── images/
│   │       ├── day.png                 # Day gradient background
│   │       ├── evening.png             # Evening gradient background
│   │       └── night.png               # Night gradient background
│   │
│   ├── index.tailwind.css              # Tailwind CSS entry point
│   ├── routeTree.gen.ts                # Generated route tree (TanStack Router)
│   └── vite-env.d.ts                   # Vite type declarations
│
├── src-tauri/                          # 🦀 Tauri backend (Rust)
│   ├── src/
│   │   └── main.rs                     # 🚀 Tauri app entry point
│   │       # - Tauri setup
│   │       # - Window management
│   │       # - System tray integration
│   │       # - IPC handlers
│   │
│   ├── tauri.conf.json                 # Tauri configuration
│   │   # - App identifier: com.bluelight-hub.app
│   │   # - Window settings (size, title, etc.)
│   │   # - Permissions and capabilities
│   │   # - Build settings
│   │
│   ├── capabilities/                   # Tauri capabilities (permissions)
│   ├── icons/                          # App icons (multiple sizes)
│   ├── gen/                            # Generated Tauri files
│   ├── Cargo.toml                      # Rust dependencies
│   ├── Cargo.lock                      # Rust lockfile
│   └── build.rs                        # Rust build script
│
├── cypress/                            # E2E Tests (Cypress, deprecated)
│   └── e2e/
│
├── public/                             # Public static files
│   └── vite.svg                        # Vite logo
│
├── package.json                        # Frontend dependencies
│   # Key dependencies:
│   # - react, react-dom (React 19)
│   # - @tanstack/react-router (routing)
│   # - @tanstack/react-query (server state)
│   # - @tanstack/react-store (global state)
│   # - @tanstack/react-form (forms)
│   # - @chakra-ui/react (UI framework)
│   # - leaflet, react-leaflet (maps)
│   # - @geoman-io/leaflet-geoman-free (map drawing)
│   # - zod (validation)
│   # - @bluelight-hub/shared (generated API client)
│   # - @tauri-apps/api (Tauri API)
│
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript configuration
├── tsconfig.app.json                   # App-specific TypeScript config
├── tsconfig.node.json                  # Node-specific TypeScript config
├── biome.json                          # Biome linter configuration
├── index.html                          # HTML entry point
└── README.md                           # Frontend documentation
```

### Frontend-Zusammenfassung

**Components:**
- **Atoms:** 24 base components (Button, Input, Badge, Spinner, etc.)
- **Molecules:** 46 composite components (Dialog, Table, Search, ETB controls, Lagekarte controls, etc.)
- **Organisms:** 73 complex modules (ETB views, Lagekarte, Command Palette, Admin panels, etc.)
- **Templates:** 4 page layouts (Auth, Admin, SingleEinsatz, AdminDashboard)
- **Pages:** 6 route-bound pages (Landing, Einsatz List, Einsatz Detail, Admin, etc.)

**Hooks:** 24+ custom TanStack Query hooks (Auth, Einsatz, ETB, Lagekarte, POI, Users, Admin)

**State Management:**
- **Server State:** TanStack Query (React Query)
- **UI State:** TanStack Store + React Context
- **Forms:** TanStack Form + Zod validation
- **Router:** TanStack Router (file-based routing)

**Offline Support:**
- Lagekarte: `networkMode: 'offlineFirst'`
- Offline tile caching via IndexedDB
- Service Worker for offline assets (future)

**Integration Points:**
- Consumes Backend API via `BackendApi` singleton
- API client auto-generated from Backend OpenAPI spec
- Cross-tab state sync via localStorage + StorageEvent
- Tauri IPC for desktop features (file system, system tray, etc.)

---

## Shared Part (packages/shared/)

**Typ:** Shared library (TypeScript types + API client)
**Generated:** Yes (via OpenAPI Generator)
**Source:** Backend OpenAPI specification
**WICHTIG:** **NIEMALS manuell ändern!** Alle Änderungen werden überschrieben.

### Shared-Struktur

```
packages/shared/
├── client/
│   ├── apis/                           # 🤖 Generated OpenAPI client (DO NOT EDIT!)
│   │   ├── index.ts                    # Barrel exports for all API modules
│   │   │
│   │   ├── AppApi.ts                   # Root/Meta API client
│   │   │   # - getRoot() - GET /
│   │   │   # - getMeta() - GET /meta
│   │   │
│   │   ├── AuthApi.ts                  # Authentication API client
│   │   │   # - login() - POST /auth/login
│   │   │   # - adminLogin() - POST /auth/admin/login
│   │   │   # - adminSetup() - POST /auth/admin/setup
│   │   │   # - refresh() - POST /auth/refresh
│   │   │   # - logout() - POST /auth/logout
│   │   │   # - checkAuth() - GET /auth/check
│   │   │   # - getPublicUsers() - GET /auth/users
│   │   │   # ... (14 methods total)
│   │   │
│   │   ├── EinsatzApi.ts               # Einsatz API client
│   │   │   # - findAll() - GET /einsatz
│   │   │   # - create() - POST /einsatz
│   │   │   # - findOne() - GET /einsatz/:id
│   │   │   # - update() - PATCH /einsatz/:id
│   │   │   # - remove() - DELETE /einsatz/:id
│   │   │   # - getNavigation() - GET /einsatz/:id/navigation
│   │   │   # - getStatusCounts() - GET /einsatz/status/counts
│   │   │   # - getCompleteness() - GET /einsatz/:id/completeness
│   │   │   # - archive() - POST /einsatz/:id/archive
│   │   │   # ... (12 methods total)
│   │   │
│   │   ├── EinsatztagebuchApi.ts       # ETB API client (deprecated name, use ETBApi)
│   │   │
│   │   ├── ETBApi.ts                   # ETB API client
│   │   │   # - createEtb() - POST /etb
│   │   │   # - getEtb() - GET /etb/:einsatzId
│   │   │   # - createEntry() - POST /etb/:einsatzId/entry
│   │   │   # - updateEntry() - PATCH /etb/entry/:entryId
│   │   │   # - deleteEntry() - DELETE /etb/entry/:entryId
│   │   │   # - getEntryHistory() - GET /etb/entry/:entryId/history
│   │   │   # - getTextbausteine() - GET /etb/textbausteine
│   │   │   # - createTextbaustein() - POST /etb/textbausteine
│   │   │   # ... (9 methods total)
│   │   │
│   │   ├── LagekarteApi.ts             # Lagekarte API client
│   │   │   # - getLagekarte() - GET /lagekarte/:einsatzId
│   │   │   # - saveLagekarteState() - POST /lagekarte/:einsatzId
│   │   │   # - uploadScreenshot() - POST /lagekarte/:einsatzId/screenshot
│   │   │   # ... (3 methods total)
│   │   │
│   │   ├── POIApi.ts                   # POI API client
│   │   │   # - getPois() - GET /poi/:einsatzId
│   │   │   # - createPoi() - POST /poi/:einsatzId
│   │   │   # - updatePoi() - PATCH /poi/:id
│   │   │   # - deletePoi() - DELETE /poi/:id
│   │   │   # ... (4 methods total)
│   │   │
│   │   ├── GeocodingApi.ts             # Geocoding API client
│   │   │   # - geocodeAddress() - POST /geocoding/geocode
│   │   │   # ... (1 method total)
│   │   │
│   │   ├── UserManagementApi.ts        # User management API client (Admin)
│   │   │   # - getAllUsers() - GET /user-management
│   │   │   # - createUser() - POST /user-management
│   │   │   # - updateUser() - PATCH /user-management/:id
│   │   │   # - lockUser() - POST /user-management/:id/lock
│   │   │   # - unlockUser() - POST /user-management/:id/unlock
│   │   │   # - deleteUser() - DELETE /user-management/:id
│   │   │   # ... (6 methods total)
│   │   │
│   │   ├── UsersApi.ts                 # User profile API client
│   │   │   # - getUserProfile() - GET /users/profile
│   │   │   # - updateUserProfile() - PATCH /users/profile
│   │   │   # ... (2 methods total)
│   │   │
│   │   └── HealthApi.ts                # Health check API client
│   │       # - check() - GET /health
│   │       # - checkReadiness() - GET /health/readiness
│   │       # - checkDetailed() - GET /health/detailed
│   │       # ... (3 methods total)
│   │
│   ├── models/                         # 🎯 Generated TypeScript interfaces/types
│   │   ├── index.ts                    # Barrel exports for all models
│   │   │
│   │   # Auth Models (14 models)
│   │   ├── AuthRequestDto.ts           # Login request
│   │   ├── AuthResponseDto.ts          # Login response
│   │   ├── AuthUserDto.ts              # User info
│   │   ├── AuthCheckResponseDto.ts     # Auth check response
│   │   ├── RefreshResponseDto.ts       # Token refresh response
│   │   ├── LogoutResponseDto.ts        # Logout response
│   │   ├── PublicUserDto.ts            # Public user info
│   │   ├── PublicUsersResponseDto.ts   # Public users list
│   │   ├── AdminLoginResponseDto.ts    # Admin login response
│   │   ├── AdminSetupDto.ts            # Admin setup request
│   │   ├── AdminSetupResponseDto.ts    # Admin setup response
│   │   ├── AdminStatusDto.ts           # Admin initialization status
│   │   ├── AdminUserDto.ts             # Admin user info
│   │   ├── AdminTokenVerificationDto.ts # Admin token verification
│   │   │
│   │   # Einsatz Models (7 models)
│   │   ├── CreateEinsatzDto.ts         # Einsatz creation
│   │   ├── UpdateEinsatzDto.ts         # Einsatz update
│   │   ├── EinsatzResponseDto.ts       # Einsatz response
│   │   ├── CompletenessResponseDto.ts  # Completeness metrics
│   │   ├── NavigationResponseDto.ts    # Navigation response
│   │   ├── StatusCountsDto.ts          # Status counts
│   │   ├── StatusCountsResponseDto.ts  # Status counts response
│   │   │
│   │   # ETB Models (9 models)
│   │   ├── CreateEtbDto.ts             # ETB creation
│   │   ├── CreateEtbResponse.ts        # ETB creation response
│   │   ├── CreateEtbEintragDto.ts      # ETB entry creation
│   │   ├── CreateEtbEintragResponse.ts # ETB entry creation response
│   │   ├── UpdateEtbEintragDto.ts      # ETB entry update
│   │   ├── UpdateEtbEintragResponse.ts # ETB entry update response
│   │   ├── GetEtbResponse.ts           # ETB response
│   │   ├── EtbDto.ts                   # ETB data
│   │   ├── EtbEintragDto.ts            # ETB entry data
│   │   ├── EtbHistoryEntryDto.ts       # ETB entry history
│   │   ├── TextbausteinDto.ts          # Textbaustein data
│   │   ├── TextbausteinListResponse.ts # Textbaustein list response
│   │   │
│   │   # Lagekarte Models (3 models)
│   │   ├── SaveLagekarteStateDto.ts    # Lagekarte state save
│   │   ├── PoiResponseDto.ts           # POI response
│   │   ├── CreatePoiDto.ts             # POI creation
│   │   ├── UpdatePoiDto.ts             # POI update
│   │   │
│   │   # Geocoding Models (1 model)
│   │   ├── GeocodeAddressDto.ts        # Geocode request
│   │   │
│   │   # User Management Models (8 models)
│   │   ├── UserDto.ts                  # User data
│   │   ├── UserBasicDto.ts             # Basic user data
│   │   ├── UserResponse.ts             # User response
│   │   ├── UserResponseDto.ts          # User response DTO
│   │   ├── UsersListResponse.ts        # Users list response
│   │   ├── UserBasicListResponse.ts    # Basic users list response
│   │   ├── CreateUserDto.ts            # User creation
│   │   ├── UpdateUserDto.ts            # User update
│   │   ├── LockUserDto.ts              # User lock
│   │   ├── DeleteUserDto.ts            # User deletion
│   │   ├── DeleteUserResponse.ts       # User deletion response
│   │   ├── DeleteUserResponseData.ts   # User deletion data
│   │   │
│   │   # Health Models (3 models)
│   │   ├── HealthControllerCheck200Response.ts # Health check response
│   │   ├── HealthControllerCheck200ResponseInfoValue.ts # Health info value
│   │   ├── HealthControllerCheck503Response.ts # Health check failure
│   │   │
│   │   # API Response Wrappers (13 models)
│   │   ├── ApiMeta.ts                  # API metadata
│   │   ├── ApiPagination.ts            # Pagination metadata
│   │   ├── EinsatzControllerFindAllVAlpha200Response.ts
│   │   ├── EinsatzControllerFindAllVAlpha200ResponsePagination.ts
│   │   ├── EinsatzControllerCreateVAlpha200Response.ts
│   │   ├── EinsatzControllerGetCompletenessVAlpha200Response.ts
│   │   ├── EinsatzControllerGetPreviousVAlpha200Response.ts
│   │   ├── EinsatzControllerGetStatusCountsVAlpha200Response.ts
│   │   ├── PoiControllerGetPoisVAlpha200Response.ts
│   │   ├── PoiControllerCreatePoiVAlpha200Response.ts
│   │   ├── LagekarteControllerGetLagekarteVAlpha200Response.ts
│   │   ├── UserControllerFindOneVAlpha200Response.ts
│   │   └── UserControllerFindOneVAlpha200ResponseMeta.ts
│   │
│   ├── index.ts                        # Main barrel export
│   └── runtime.ts                      # OpenAPI runtime helpers
│
├── src/                                # 📦 Manual shared code (NOT generated)
│   ├── index.ts                        # Shared exports
│   │
│   ├── validation/                     # Shared Zod schemas
│   │   ├── index.ts                    # Validation exports
│   │   └── password.schema.ts          # Password validation schema
│   │
│   └── websocket/                      # WebSocket types (future)
│
├── openapitools.json                   # OpenAPI Generator configuration
│   # - Backend OpenAPI spec URL: http://localhost:3000/api-docs-json
│   # - Output directory: client/
│   # - Generator: typescript-fetch
│
├── package.json                        # Shared dependencies
│   # Key scripts:
│   # - generate - Generate API client from OpenAPI spec
│   #
│   # Key dependencies:
│   # - zod (validation)
│
├── tsconfig.json                       # TypeScript configuration
├── tsconfig.tsbuildinfo                # TypeScript build info
├── biome.json                          # Biome linter configuration
└── README.md                           # Shared package documentation
```

### Shared-Zusammenfassung

**Generation Command:** `pnpm run generate-api` (from root)
**Backend OpenAPI Spec:** `http://localhost:3000/api-docs-json`
**Generated Files:** 91+ TypeScript files (10 API classes, 70+ models, runtime helpers)
**Manual Code:** Only `src/` directory (validation schemas, websocket types)

**WICHTIG:** Alle Dateien in `client/` werden bei jedem `generate-api`-Aufruf überschrieben!

**Consumed By:**
- Frontend: `BackendApi` singleton in `packages/frontend/src/api/api.ts`
- TanStack Query Hooks: All hooks in `packages/frontend/src/hooks/`

---

## Critical Integration Points

### Backend → Frontend (REST API)

**Protocol:** HTTP REST
**Base URL:** `http://localhost:3000` (dev), konfigurierbar via `VITE_API_URL`
**Authentication:** JWT in HTTP-only cookies (3 token types: access, refresh, admin)
**API Contract:** Definiert durch NestJS controllers mit `@ApiTags` decorators
**Client:** Auto-generated TypeScript client in `packages/shared/client/apis`
**Wrapper:** `BackendApi` singleton mit automatischer Token-Refresh bei 401

```typescript
// Backend (NestJS) - Definition
@Controller('einsatz')
@ApiTags('Einsatz')
export class EinsatzController {
  @Get()
  @ApiOperation({ summary: 'List all Einsätze' })
  async findAll(@Query() query: EinsatzQueryDto): Promise<ApiResponse<EinsatzResponseDto[]>> {
    // ...
  }
}

// Shared (Generated) - API Client
export class EinsatzApi {
  async findAll(query?: EinsatzQueryDto): Promise<ApiResponse<EinsatzResponseDto[]>> {
    // Generated fetch code
  }
}

// Frontend - TanStack Query Hook
export const useEinsaetze = (filters?: EinsatzQueryDto) => {
  return useQuery({
    queryKey: QUERY_KEYS.einsatz.list(filters),
    queryFn: () => api.einsatz().findAll(filters),
  });
};

// Frontend - Component
const EinsatzList = () => {
  const { data, isLoading } = useEinsaetze({ status: 'IN_BEARBEITUNG' });
  // ...
};
```

### Frontend → Backend (Data Fetching)

**State Management:**
- **Server State:** TanStack Query (React Query) mit hierarchischen Query Keys
- **UI State:** TanStack Store + React Context
- **Form State:** TanStack Form mit Zod-Validierung

**Query Keys:** Zentralisiert in `packages/frontend/src/queryKeys.ts`

```typescript
export const QUERY_KEYS = {
  auth: {
    check: ['auth', 'check'],
    publicUsers: ['auth', 'publicUsers'],
  },
  einsatz: {
    all: ['einsatz'],
    list: (filters?: EinsatzQueryDto) => ['einsatz', 'list', filters],
    detail: (id: string) => ['einsatz', 'detail', id],
    navigation: (id: string) => ['einsatz', 'navigation', id],
    statusCounts: ['einsatz', 'statusCounts'],
    completeness: (id: string) => ['einsatz', 'completeness', id],
  },
  etb: {
    all: ['etb'],
    detail: (einsatzId: string) => ['etb', 'detail', einsatzId],
    entries: (einsatzId: string, filters?: any) => ['etb', 'entries', einsatzId, filters],
    history: (entryId: string) => ['etb', 'history', entryId],
    textbausteine: ['etb', 'textbausteine'],
  },
  lagekarte: {
    state: (einsatzId: string) => ['lagekarte', 'state', einsatzId],
  },
  poi: {
    list: (einsatzId: string) => ['poi', 'list', einsatzId],
  },
  users: {
    profile: ['users', 'profile'],
  },
  admin: {
    users: ['admin', 'users'],
    status: ['admin', 'status'],
  },
};
```

**Error Handling:**
- Global error boundary mit Toast-Benachrichtigungen
- API-Error-Handler in `packages/frontend/src/utils/apiErrorHandler.ts`
- Automatische Token-Refresh bei 401

**Offline Support:**
- Lagekarte: `networkMode: 'offlineFirst'`
- Offline tile caching via IndexedDB
- Optimistic updates mit Rollback bei Fehler

### Cross-Part Data Flow

```
Backend (NestJS)
  ↓ OpenAPI Spec (Swagger decorators: @ApiTags, @ApiOperation, @ApiProperty)
  ↓ GET http://localhost:3000/api-docs-json
  ↓
  ↓ pnpm run generate-api (OpenAPI Generator)
  ↓
Shared (Generated Client)
  ↓ Import in Frontend: import { BackendApi } from '@bluelight-hub/shared'
  ↓
Frontend (React)
  ↓ api.einsatz().findAll() via BackendApi singleton
  ↓ TanStack Query Hooks (useEinsaetze, useEtb, useLagekarte, etc.)
  ↓
UI Components (Atoms, Molecules, Organisms)
  ↓ User Interaction (clicks, forms, etc.)
  ↓
Mutations (useMutation)
  ↓ api.einsatz().create() via BackendApi singleton
  ↓ Optimistic Updates + Cache Invalidation
  ↓
Backend (NestJS)
  ↓ Database (Prisma + PostgreSQL)
```

**KRITISCH:** Niemals manuelle API-Helper erstellen! Immer `pnpm run generate-api` nach Backend-Änderungen.

---

## Entry Points Summary

| Part     | Entry Point                  | Purpose                                | Port        |
|----------|------------------------------|----------------------------------------|-------------|
| Backend  | src/main.ts                  | NestJS bootstrap (REST API)            | 3000        |
| Backend  | src/main-cli.ts              | NestJS Commander CLI                   | N/A (CLI)   |
| Frontend | src/main.tsx                 | React root render (Vite dev)           | 5173        |
| Frontend | src-tauri/src/main.rs        | Tauri app initialization (Desktop)     | N/A (Tauri) |
| Shared   | client/apis/index.ts         | API client barrel exports              | N/A (Lib)   |
| Shared   | src/index.ts                 | Manual shared code exports             | N/A (Lib)   |

---

## Build & Development Commands

### Root (Monorepo)

```bash
# Alle Services starten
pnpm -r dev

# API-Client regenerieren (WICHTIG nach Backend-Änderungen!)
pnpm run generate-api

# Alle Packages bauen
pnpm -r build

# Dependencies installieren
pnpm install

# Linting + Formatting (Biome)
pnpm run lint
pnpm run format
```

### Backend

```bash
# Dev-Server starten (Port 3000)
pnpm --filter @bluelight-hub/backend dev

# Backend bauen
pnpm --filter @bluelight-hub/backend build

# Prisma migrations
pnpm --filter @bluelight-hub/backend prisma:migrate:dev
pnpm --filter @bluelight-hub/backend prisma:migrate:deploy

# Prisma Studio (Database GUI)
pnpm --filter @bluelight-hub/backend prisma:studio

# Database seeding
pnpm --filter @bluelight-hub/backend prisma:seed

# JSDoc coverage check
pnpm --filter @bluelight-hub/backend check:jsdoc:public

# CLI commands
pnpm --filter @bluelight-hub/backend cli:admin-reset-password
```

### Frontend

```bash
# Vite dev server (Port 5173)
pnpm --filter @bluelight-hub/frontend dev

# Tauri desktop app (dev mode)
pnpm --filter @bluelight-hub/frontend tauri dev

# Frontend bauen
pnpm --filter @bluelight-hub/frontend build

# Tauri desktop app bauen (production)
pnpm --filter @bluelight-hub/frontend tauri build

# Cypress E2E tests (deprecated)
pnpm --filter @bluelight-hub/frontend test:e2e
```

### Shared

```bash
# API-Client generieren (aus Root ausführen!)
pnpm run generate-api

# Shared package bauen
pnpm --filter @bluelight-hub/shared build
```

---

## Documentation Hierarchy

### arc42 Architecture Documentation (PFLICHT für Architektur!)

Alle Architekturdokumentation MUSS in `docs/architecture/` gepflegt werden:

- **01-introduction-goals.adoc** - Einführung und Ziele
- **02-constraints.adoc** - Randbedingungen (Technologie, Organisation, Konventionen)
- **03-context.adoc** - Kontextabgrenzung (Systemgrenzen, externe Schnittstellen)
- **04-solution-strategy.adoc** - Lösungsstrategie (Architekturansatz)
- **05-building-block-view.adoc** - Bausteinsicht (Module, Packages, Komponenten)
- **06-runtime-view.adoc** - Laufzeitsicht (Sequenzdiagramme, User Flows)
- **07-deployment-view.adoc** - Verteilungssicht (Infrastruktur, Deployment)
- **08-concepts.adoc** - Querschnittliche Konzepte (Security, Persistence, UI, etc.)
- **09-architecture-decisions.adoc** - Entscheidungen (Index zu ADRs)
- **10-quality-requirements.adoc** - Qualitätsanforderungen (Performance, Security, etc.)
- **11-risks.adoc** - Risiken und technische Schulden
- **12-glossary.adoc** - Glossar (Fachbegriffe, Abkürzungen)

**Architecture Decision Records (ADRs):** `docs/architecture/adr/`

21 ADRs dokumentieren wichtige Architekturentscheidungen:
- ADR-001: Verbindungskonzept
- ADR-007: JWT-Authentifizierung
- ADR-011: Admin-Roles-System
- ADR-013: Tailwind-Migration
- ADR-016: Unified Authentication
- ADR-020: Optimistic UI Updates
- ... (weitere ADRs)

**NIEMALS** separate Architektur-Markdowns außerhalb arc42 erstellen!

### BMM Documentation (AI-Generated Docs)

AI-generierte Dokumentation in `docs/`:

- **.bmm-backend-api-contracts.md** - Backend API Dokumentation
- **.bmm-backend-data-models.md** - Datenbankmodelle (Prisma Schema)
- **.bmm-frontend-components.md** - Komponenten-Inventar (Atomic Design)
- **.bmm-frontend-state-management.md** - State Management (TanStack Query + Store)
- **.bmm-frontend-api-integration.md** - API-Integration (BackendApi + Hooks)
- **.bmm-technology-stack.md** - Tech-Stack Dokumentation
- **.bmm-project-structure.md** - Projekt-Struktur
- **.bmm-project-parts.json** - Projekt-Teile Metadaten
- **.bmm-source-tree-analysis.md** - Source Tree Analyse (DIESES DOKUMENT)
- **project-scan-report.json** - Projekt-Scan Metadaten

**WICHTIG:** BMM-Docs sind AI-generiert und sollten NICHT manuell gepflegt werden. Nutze BMM-Workflows zur Aktualisierung.

---

## Critical Directories Annotated

### Backend Critical Directories (27 directories)

| Directory                            | Purpose                                           | Files | Integration Point       |
|--------------------------------------|---------------------------------------------------|-------|-------------------------|
| `src/`                               | Source root                                       | 6     | Entry point             |
| `src/modules/lagekarte/`             | Lagekarte feature module                          | 15    | REST API                |
| `src/modules/lagekarte/controllers/` | Lagekarte controllers (3)                         | 3     | REST endpoints          |
| `src/modules/lagekarte/services/`    | Lagekarte services (4)                            | 4     | Business logic          |
| `src/modules/lagekarte/repositories/`| Lagekarte repositories (2)                        | 2     | Data access             |
| `src/modules/lagekarte/dto/`         | Lagekarte DTOs (4)                                | 4     | API contracts           |
| `src/auth/`                          | Auth module (core)                                | 36    | JWT authentication      |
| `src/auth/controllers/`              | Auth controller                                   | 1     | 14 REST endpoints       |
| `src/auth/services/`                 | Auth service                                      | 1     | JWT generation          |
| `src/auth/guards/`                   | Auth guards (3)                                   | 3     | Route protection        |
| `src/auth/strategies/`               | Passport strategies (3)                           | 3     | JWT validation          |
| `src/auth/dto/`                      | Auth DTOs (17)                                    | 17    | API contracts           |
| `src/auth/mappers/`                  | Auth mappers (3)                                  | 3     | Domain → DTO            |
| `src/einsatz/`                       | Einsatz module (core domain)                      | 19    | REST API                |
| `src/einsatz/controllers/`           | Einsatz controller                                | 1     | 12 REST endpoints       |
| `src/einsatz/services/`              | Einsatz service                                   | 1     | Business logic          |
| `src/einsatz/repositories/`          | Einsatz repository                                | 1     | Data access             |
| `src/einsatz/dto/`                   | Einsatz DTOs (10)                                 | 10    | API contracts           |
| `src/etb/`                           | ETB module (mission log)                          | 10    | REST API                |
| `src/etb/controllers/`               | ETB controller                                    | 1     | 9 REST endpoints        |
| `src/etb/services/`                  | ETB service                                       | 1     | Versioning + soft-delete|
| `src/etb/repositories/`              | ETB repository                                    | 1     | Data access             |
| `src/etb/dto/`                       | ETB DTOs (5)                                      | 5     | API contracts           |
| `src/user-management/`               | User management module                            | 12    | REST API                |
| `src/common/`                        | Shared utilities + infrastructure                 | 26    | Global middleware       |
| `src/config/`                        | Configuration modules                             | 2     | App config              |
| `prisma/`                            | Database schema + migrations                      | 16+   | Data layer              |

### Frontend Critical Directories (48 directories)

| Directory                                 | Purpose                                      | Files | Integration Point           |
|-------------------------------------------|----------------------------------------------|-------|-----------------------------|
| `src/`                                    | Source root                                  | 6     | Entry point                 |
| `src/components/atoms/`                   | 24 base components                           | 24    | UI building blocks          |
| `src/components/molecules/`               | 46 composite components                      | 46    | UI composition              |
| `src/components/molecules/einsatz/`       | 13 Einsatz molecules                         | 13    | Einsatz UI                  |
| `src/components/molecules/etb/`           | 8 ETB molecules                              | 8     | ETB UI                      |
| `src/components/molecules/lagekarte/`     | 4 Lagekarte molecules                        | 4     | Lagekarte UI                |
| `src/components/organisms/`               | 73 complex modules                           | 73+   | Feature modules             |
| `src/components/organisms/etb/`           | 17 ETB organisms (HIGHEST COMPLEXITY)        | 17+   | ETB feature                 |
| `src/components/organisms/lagekarte/`     | 16 Lagekarte organisms                       | 16+   | Lagekarte feature           |
| `src/components/organisms/command-palette/`| 6 Command palette organisms                 | 6+    | Command palette             |
| `src/components/organisms/einsatz/`       | 5 Einsatz organisms                          | 5     | Einsatz feature             |
| `src/components/organisms/admin/`         | 4 Admin organisms                            | 4     | Admin feature               |
| `src/components/templates/`               | 4 page layouts                               | 4     | Layout system               |
| `src/components/pages/`                   | 6 route-bound pages                          | 6+    | Routing                     |
| `src/hooks/`                              | 24+ custom hooks                             | 24+   | TanStack Query              |
| `src/hooks/einsatz/`                      | Einsatz hooks                                | 1     | Einsatz state               |
| `src/hooks/lagekarte/`                    | 10 Lagekarte hooks                           | 10    | Lagekarte interactions      |
| `src/stores/`                             | TanStack Store (global state)                | 2     | UI state                    |
| `src/stores/persistence/`                 | Store persistence logic                      | 1     | Cross-tab sync              |
| `src/api/`                                | API client wrapper                           | 4     | Backend integration         |
| `src/queryKeys.ts`                        | 🗝️ Centralized Query Keys                     | 1     | TanStack Query              |
| `src/router.tsx`                          | 🗺️ React Router configuration                | 1     | Routing                     |
| `src/routes/`                             | TanStack Router routes                       | 20+   | File-based routing          |
| `src/routes/app/einsatz/$einsatzId/`      | Single mission subpages (3 pages)            | 3     | Einsatz detail routes       |
| `src/routes/admin/`                       | Admin routes (4 pages)                       | 4     | Admin panel                 |
| `src/schemas/`                            | Zod validation schemas                       | 2     | Form validation             |
| `src/services/`                           | Services (Tauri, etc.)                       | 1     | Desktop integration         |
| `src/types/`                              | TypeScript types                             | 2     | Type definitions            |
| `src/utils/`                              | Utility functions                            | 21+   | Helper functions            |
| `src/utils/lagekarte/`                    | Lagekarte utilities (5 files)                | 5     | Map helpers                 |
| `src/assets/brandbook/`                   | Logo assets (5 variants)                     | 5     | Branding                    |
| `src-tauri/`                              | Tauri backend (Rust)                         | 10+   | Desktop integration         |
| `src-tauri/src/main.rs`                   | 🚀 Tauri entry point                          | 1     | Desktop app                 |

### Shared Critical Directories (3 directories)

| Directory           | Purpose                              | Files | Integration Point   |
|---------------------|--------------------------------------|-------|---------------------|
| `client/apis/`      | 🤖 Generated API client (10 classes) | 11    | Backend API         |
| `client/models/`    | 🎯 Generated TypeScript types (70+)  | 70+   | API contracts       |
| `src/validation/`   | Manual Zod schemas                   | 2     | Shared validation   |

---

## Notes & Conventions

### Breaking Rules (NIEMALS brechen!)

1. **NIEMALS manuelle API-Helper erstellen!** Nutze IMMER TanStack Query Hooks mit generiertem API-Client.
2. **NUR Tailwind CSS + Headless UI** - keine anderen Frameworks!
3. **Forms:** NUR @tanstack/react-form mit Zod-Schemas
4. **State:** @tanstack/react-store für globalen State
5. **NIEMALS `--no-verify` bei Commits** verwenden
6. **IMMER nach jedem Subtask committen**
7. **Commit-Format:** `<emoji>(<context>): <title>`

### API Development Workflow

1. Backend-Endpoint mit NestJS/Swagger erstellen
2. `pnpm run generate-api` ausführen (aus Root!)
3. Frontend nutzt generierten Client via BackendApi-Singleton
4. TanStack Query Hooks für State Management

### UI Development Workflow

1. Nutze Atomic Design Hierarchie (Atoms → Molecules → Organisms → Templates → Pages)
2. IMMER Tailwind CSS Classes + Headless UI verwenden
3. TailwindUI-Komponenten: User nach Code fragen, NICHT selbst erstellen!
4. Forms: TanStack Form + Zod-Schemas
5. State: TanStack Query für Server-State, TanStack Store für UI-State

### Testing Strategy

- **Unit Tests:** Wird AKTUELL übersprungen (temporär)
- **E2E Tests:** Wurden entfernt
- **Manual Testing:** Chrome DevTools MCP für Browser-Testing

### Commit Conventions

**Semantic Release Triggers:**

| Emoji | Typ      | Version | Verwendung       |
|-------|----------|---------|------------------|
| 💥    | Breaking | Major   | Breaking Changes |
| ✨     | Feature  | Minor   | Neue Features    |
| 🐛    | Fix      | Patch   | Bug Fixes        |
| 🚑    | Hotfix   | Patch   | Kritische Fixes  |
| 🔒    | Security | Patch   | Security Fixes   |
| ♻️    | Refactor | Patch   | Code Refactoring |

### JSDoc Requirements

- **Sprache:** Deutsch (für technische Dokumentation)
- **Coverage Check:** `pnpm --filter @bluelight-hub/backend check:jsdoc:public`
- Erkläre "warum", nicht "was"

---

## Summary Statistics

**Total Directories Scanned:** 180+
**Total Files Analyzed:** 500+
**Critical Directories Annotated:** 78
**Backend Modules:** 7
**Frontend Components:** 143 (24 atoms + 46 molecules + 73 organisms)
**Custom Hooks:** 24+
**API Endpoints:** ~60
**Database Models:** 9 (Prisma)
**Generated Files:** 91+ (Shared API Client)

**Monorepo Structure:** 3 packages (Backend, Frontend, Shared)
**Documentation Files:** 14+ (arc42 + BMM docs)
**Architecture Decision Records:** 21

**Key Technologies:**
- Backend: NestJS 11, Prisma, PostgreSQL, JWT, Swagger/OpenAPI
- Frontend: React 19, TanStack (Router, Query, Store, Form), Tailwind CSS, Headless UI, Leaflet, Tauri 2
- Shared: OpenAPI Generator (typescript-fetch), Zod
- Tooling: pnpm, Vite, Biome, Husky, Semantic Release

---

**END OF SOURCE TREE ANALYSIS**

This document was auto-generated by Claude Code on 2025-11-11.
For updates, re-run the source tree analysis tool.
