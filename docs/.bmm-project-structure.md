# Bluelight Hub - Project Structure

**Generated:** 2025-01-10T20:47:00Z
**Repository Type:** Monorepo (pnpm workspaces)

## Parts Overview

### Backend (`@bluelight-hub/backend`)
- **Type:** backend
- **Root Path:** `/packages/backend`
- **Primary Technology:** NestJS v11 + TypeScript 5.9 + Prisma v6.19
- **Database:** PostgreSQL 17
- **Key Features:**
  - REST API with OpenAPI/Swagger documentation
  - JWT + Passport authentication
  - WebSocket support
  - Domain-driven module structure
  - Health checks and throttling

### Frontend (`@bluelight-hub/frontend`)
- **Type:** web + desktop
- **Root Path:** `/packages/frontend`
- **Primary Technology:** React v19 + Vite v7 + Tauri v2
- **UI Framework:** Tailwind CSS v4 + Headless UI v2
- **State Management:** TanStack Stack (Router v1.135, Query v5.90, Store v0.8, Form v1.23)
- **Architecture Pattern:** Atomic Design
- **Key Features:**
  - Desktop-first application (Tauri-wrapped)
  - Type-safe routing with TanStack Router
  - Form handling with Zod validation
  - Leaflet maps with Geoman

### Shared (`@bluelight-hub/shared`)
- **Type:** library (API client generator)
- **Root Path:** `/packages/shared`
- **Primary Technology:** TypeScript 5.9 + OpenAPI Generator
- **Purpose:** Auto-generated type-safe API client from backend OpenAPI spec
- **Generation:** `pnpm run generate-api` (from http://localhost:3000/api-json)

## Technology Stack Summary

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend Framework | React | 19.x |
| Frontend Build | Vite + SWC | 7.x |
| Desktop Wrapper | Tauri | 2.x |
| Backend Framework | NestJS | 11.x |
| Database | PostgreSQL | 17 |
| ORM | Prisma | 6.19 |
| UI Styling | Tailwind CSS | 4.x |
| UI Components | Headless UI | 2.x |
| API Client | OpenAPI Generated | Auto |
| Package Manager | pnpm | 10.20 |

## Monorepo Indicators
- `pnpm-workspace.yaml` with `packages/*` workspace
- Root `package.json` with workspace scripts
- Shared dependency management via pnpm workspaces
- Coordinated builds across packages

## Development Workflow
1. Backend exposes OpenAPI/Swagger specification
2. Shared package generates TypeScript client from spec
3. Frontend consumes type-safe API client
4. Atomic Design component architecture in frontend
5. Hot-reload development environment across all packages
