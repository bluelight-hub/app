# Existing Documentation Inventory - Bluelight Hub

**Generated:** 2025-01-10T20:50:00Z
**Total Files:** 57+ discovered

**⚠️ User Context:** Existing documentation may not be current - likely promises more than actually implemented. Ground truth will be derived from actual codebase analysis.

## Architecture Documentation (arc42) - 37 files

### Main Chapters (12)
- [01 Introduction & Goals](../docs/architecture/01-introduction-goals.adoc)
- [02 Constraints](../docs/architecture/02-constraints.adoc)
- [03 Context](../docs/architecture/03-context.adoc)
- [04 Solution Strategy](../docs/architecture/04-solution-strategy.adoc)
- [05 Building Block View](../docs/architecture/05-building-block-view.adoc)
- [06 Runtime View](../docs/architecture/06-runtime-view.adoc)
- [07 Deployment View](../docs/architecture/07-deployment-view.adoc)
- [08 Concepts](../docs/architecture/08-concepts.adoc)
- [09 Architecture Decisions](../docs/architecture/09-architecture-decisions.adoc)
- [10 Quality Requirements](../docs/architecture/10-quality-requirements.adoc)
- [11 Risks](../docs/architecture/11-risks.adoc)
- [12 Glossary](../docs/architecture/12-glossary.adoc)
- [90 Documentation Lifecycle](../docs/architecture/90-documentation-lifecycle.adoc)
- [99 Architecture Canvas](../docs/architecture/99-architecture-canvas.adoc)

### Architecture Decision Records (21)
1. [ADR 001: Verbindungskonzept](../docs/architecture/adr/001-verbindungskonzept.adoc)
2. [ADR 002: CRDTs Datensynchronisation](../docs/architecture/adr/002-crdts-datensynchronisation.adoc)
3. [ADR 003: Monolith vs Microservice](../docs/architecture/adr/003-monolith-vs-microservice.adoc)
4. [ADR 004: Tauri Desktop App](../docs/architecture/adr/004-tauri-desktop-app.adoc)
5. [ADR 005: Event Sourcing Einsatztagebuch](../docs/architecture/adr/005-event-sourcing-einsatztagebuch.adoc)
6. [ADR 006: Docker Deployment](../docs/architecture/adr/006-docker-deployment.adoc)
7. [ADR 007: JWT Authentifizierung](../docs/architecture/adr/007-jwt-authentifizierung.adoc)
8. [ADR 008: Offene Entscheidungen](../docs/architecture/adr/008-offene-entscheidungen.adoc)
9. [ADR 009: Dashboard Architektur](../docs/architecture/adr/009-dashboard-architektur.adoc)
10. [ADR 009: Logger Konventionen](../docs/architecture/adr/009-logger-konventionen.adoc)
11. [ADR 010: MFA Removal](../docs/architecture/adr/010-mfa-removal.adoc)
12. [ADR 011: Admin Roles System](../docs/architecture/adr/011-admin-roles-system.adoc)
13. [ADR 012: API Versioning Strategy](../docs/architecture/adr/012-api-versioning-strategy.adoc)
14. [ADR 013: Tailwind Migration](../docs/architecture/adr/013-tailwind-migration.adoc)
15. [ADR 015: ETB Filter Implementation](../docs/architecture/adr/015-etb-filter-implementation.adoc)
16. [ADR 016: Unified Authentication](../docs/architecture/adr/016-unified-authentication.adoc)
17. [ADR 017: No Delete Policy Einsätze](../docs/architecture/adr/017-no-delete-policy-einsaetze.adoc)
18. [ADR 018: Minimale Einsatzerstellung](../docs/architecture/adr/018-minimale-einsatzerstellung.adoc)
19. [ADR 019: Computed Fields Einsatzdaten](../docs/architecture/adr/019-computed-fields-einsatzdaten.adoc)
20. [ADR 020: Optimistic UI Updates](../docs/architecture/adr/020-optimistic-ui-updates.adoc)
21. [ADR 021: BMAD Documentation Integration](../docs/architecture/adr/021-bmad-documentation-integration.adoc)

### Additional Architecture Docs (4)
- [Domain Model Analyse](../docs/architecture/domain-model-analyse.md) - 1476 lines, Gap-Analyse DDD vs. Implementierung
- [arc42 Index](../docs/index.adoc) - Master index including all chapters

## Package Documentation - 8 files

### Backend
- [Backend README](../packages/backend/README.md) - Setup, Swagger, Testing
- [Rate Limiting Documentation](../out/production/bluelight-hub/common/utils/RATE_LIMITING.md) - Distributed rate limiting with Redis
- [Audit Module README](../old-projects/backend/src/modules/audit/README.md) - Audit logging capabilities
- [Backend Testing Guide (DEPRECATED)](../old-projects/backend/TESTING.md) - Tests temporarily disabled

### Frontend
- [Frontend README](../packages/frontend/README.md) - React + Tauri + Atomic Design
- [ETB API Client Usage](../packages/frontend/src/hooks/ETB_USAGE.md) - TanStack Query patterns for ETB
- [MGRS Integration](../packages/frontend/src/components/organisms/lagekarte/modals/MGRS_INTEGRATION.md) - MGRS coordinates in POI form
- [Lagekarte Utilities](../packages/frontend/src/utils/lagekarte/README.md) - MGRS coordinate conversion

### Shared
- [Shared Package README](../packages/shared/README.md) - OpenAPI TypeScript client generation

## Root Documentation - 5 files

- [Main README](../README.md) - Project overview and structure
- [LICENSE](../LICENSE.md) - Non-commercial license
- [CHANGELOG](../CHANGELOG.md) - Release notes (v1.0.0-alpha.32)

## AI Documentation - 3 files

- [CLAUDE.md](../CLAUDE.md) - Breaking Rules, API-Client Generation, Built-in Agents, Code Patterns
- [advice.md](../advice.md) - Cursor Development Rules & AI Collaboration Guide
- [commit-guidelines.md](../ai-docs/commit-guidelines.md) - Semantic commit format with emojis

## CI/CD & Deployment - 10+ files

### Docker
- [Dockerfile](../Dockerfile) - Multi-stage build
- [docker-compose.yml](../docker-compose.yml) - Local development environment

### GitHub Workflows
- `.github/workflows/` - 8+ CI/CD workflow files
- `.github/ISSUE_TEMPLATE/` - Bug report and feature request templates

## Documentation Status Notes

**Known Issues:**
- Testing documentation marked as deprecated (backend tests disabled)
- Some docs in `old-projects/` may be outdated
- Domain Model Analysis identifies gap between DDD requirements and actual implementation
- User warning: Documentation may overpromise features not yet implemented

**Ground Truth Source:**
During exhaustive scan, actual codebase will be analyzed to verify:
- Documented features vs. actual implementation
- Architectural promises vs. reality
- API endpoints documented vs. existing
- Modules/features mentioned vs. present in code
