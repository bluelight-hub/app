# Critical Directories Annotated

## Backend Critical Directories (27 directories)

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

## Frontend Critical Directories (48 directories)

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

## Shared Critical Directories (3 directories)

| Directory           | Purpose                              | Files | Integration Point   |
|---------------------|--------------------------------------|-------|---------------------|
| `client/apis/`      | 🤖 Generated API client (10 classes) | 11    | Backend API         |
| `client/models/`    | 🎯 Generated TypeScript types (70+)  | 70+   | API contracts       |
| `src/validation/`   | Manual Zod schemas                   | 2     | Shared validation   |

---
