# Architecture Decisions

**Current Reference:** [Architecture Documentation](./architecture.md#11-architecture-decisions-adr-validation)

## Core Decisions (Verified Against Implementation)

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
