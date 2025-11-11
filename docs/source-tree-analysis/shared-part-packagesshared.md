# Shared Part (packages/shared/)

**Typ:** Shared library (TypeScript types + API client)
**Generated:** Yes (via OpenAPI Generator)
**Source:** Backend OpenAPI specification
**WICHTIG:** **NIEMALS manuell ändern!** Alle Änderungen werden überschrieben.

## Shared-Struktur

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

## Shared-Zusammenfassung

**Generation Command:** `pnpm run generate-api` (from root)
**Backend OpenAPI Spec:** `http://localhost:3000/api-docs-json`
**Generated Files:** 91+ TypeScript files (10 API classes, 70+ models, runtime helpers)
**Manual Code:** Only `src/` directory (validation schemas, websocket types)

**WICHTIG:** Alle Dateien in `client/` werden bei jedem `generate-api`-Aufruf überschrieben!

**Consumed By:**
- Frontend: `BackendApi` singleton in `packages/frontend/src/api/api.ts`
- TanStack Query Hooks: All hooks in `packages/frontend/src/hooks/`

---
