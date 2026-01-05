# Frontend-Backend-Shared Integration - Deep Dive Dokumentation

**Generiert:** 2026-01-05
**Scope:** API-Integration zwischen Frontend (React/TanStack), Backend (NestJS) und Shared (Generierter Client)
**Files Analyzed:** 150+
**Workflow Mode:** Exhaustive Deep-Dive

## Overview

Diese Dokumentation beschreibt das komplette Zusammenspiel der drei Packages im BlueLight Hub Monorepo:
- **packages/backend** - NestJS REST API mit Swagger/OpenAPI
- **packages/shared** - Auto-generierter TypeScript API-Client
- **packages/frontend** - React mit TanStack Query Hooks

**Key Integration Pattern:** Contract-First API Development mit OpenAPI Code-Generierung

## Vollständiger Datenfluss

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INTEGRATION ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

BACKEND (NestJS)                    SHARED (Generated)                 FRONTEND (React)
─────────────────                   ──────────────────                 ────────────────

1. Controller + DTOs
   @Controller('einsatz')
   @ApiWrappedResponse(EinsatzDto)
              │
              ▼
2. Swagger/OpenAPI Spec            3. Code-Generator
   http://localhost:3091/api-json  ──► openapi-generator-cli
                                   ──► typescript-fetch
                                              │
                                              ▼
                                   4. Generated Client               5. TanStack Query Hooks
                                   /apis/EinsatzApi.ts     ────────►  useEinsaetzeQuery()
                                   /models/EinsatzDto.ts              useCreateEinsatz()
                                   /runtime.ts (Configuration)
                                              │
                                              ▼
                                   5. Singleton API                  6. React Components
                                   BackendApi class        ────────►  <EinsatzList />
                                   fetchWithRefresh                   <EinsatzDetail />
```

---

## 1. Backend: REST Controller Layer

### Architektur-Übersicht

Das Backend folgt der **Hexagonal Architecture** mit **CQRS Pattern**:

```
modules/
├── auth/controllers/          # Authentifizierung (PUBLIC + JWT)
├── einsatz/controllers/       # Einsatz-Verwaltung (JWT)
├── etb/controllers/           # Einsatztagebuch (JWT)
├── kraefte/controllers/       # Kräfte-Management (JWT + Admin)
├── lagekarte/controllers/     # Lagekarte/POIs (JWT)
├── integrations/controllers/  # HiOrg-Server OAuth (Admin)
└── user-management/controllers/ # User-Verwaltung (Admin)
```

### Controller-Pattern

```typescript
// Beispiel: einsatz.controller.ts
@ApiTags('Einsatz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'einsatz', version: 'alpha' })
export class EinsatzController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Neuen Einsatz erstellen' })
  @ApiWrappedCreatedResponse(EinsatzDto)  // CRITICAL: Custom Decorator!
  async create(@Body() dto: CreateEinsatzDto): Promise<EinsatzDto> {
    const result = await this.commandBus.execute(CreateEinsatzCommand.create(...));
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }
}
```

### Custom Swagger Decorators

**WICHTIG:** Das Projekt verwendet **Custom Decorators** für korrekte OpenAPI-Schema-Generierung:

```typescript
// modules/common/decorators/api-wrapped-response.decorator.ts

// Für HTTP 200 OK Responses
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste aller Einsätze' })

// Für HTTP 201 Created Responses
@ApiWrappedCreatedResponse(EinsatzDto, { description: 'Einsatz erstellt' })
```

**Generiertes Schema:**
```json
{
  "data": { ... },           // DTO oder Array
  "meta": {
    "timestamp": "ISO-8601",
    "version": "alpha",
    "requestId": "uuid"
  },
  "pagination": {            // Optional bei Arrays
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Endpoint-Statistik

| Modul | Controller | Endpoints | Auth |
|-------|-----------|-----------|------|
| auth | AuthController | 11 | Mixed (Public + JWT) |
| einsatz | EinsatzController | 14 | JwtAuthGuard |
| etb | EtbCqrsController | 7 | JwtAuthGuard |
| kraefte | 11 Controller | 40+ | JWT + AdminJwt |
| lagekarte | 3 Controller | 10+ | JwtAuthGuard |
| integrations | 2 Controller | 10 | AdminJwtAuthGuard |
| user-management | 2 Controller | 9 | AdminJwtAuthGuard |

**Gesamt:** ~95+ REST-Endpoints

---

## 2. Shared: Generierter API-Client

### Generierungs-Workflow

```bash
# 1. Backend muss laufen (Port 3091)
pnpm --filter @bluelight-hub/backend dev

# 2. API-Client generieren
pnpm run generate-api
# Entspricht: openapi-generator-cli generate -g typescript-fetch -i http://localhost:3091/api-json -o ./client
```

### Generierte Struktur

```
packages/shared/client/
├── apis/                    # API-Klassen (eine pro Controller-Tag)
│   ├── EinsatzApi.ts        # 14 Methoden
│   ├── AuthApi.ts           # 11 Methoden
│   ├── ETBApi.ts            # 7 Methoden
│   └── ...                  # 27 API-Dateien gesamt
├── models/                  # TypeScript DTOs
│   ├── EinsatzDto.ts
│   ├── CreateEinsatzDto.ts
│   ├── ApiMeta.ts
│   └── ...                  # 100+ Model-Dateien
├── runtime.ts               # Configuration, BaseAPI, Fetch-Wrapper
└── index.ts                 # Re-exports
```

### API-Klassen-Pattern

```typescript
// Generiert: apis/EinsatzApi.ts
export class EinsatzApi extends BaseAPI {

  // GET /api/v-alpha/einsatz
  async einsatzControllerFindAllVAlpha(
    requestParameters: EinsatzControllerFindAllVAlphaRequest = {}
  ): Promise<EinsatzControllerFindAllVAlpha200Response> {
    // ... generierter Code
  }

  // POST /api/v-alpha/einsatz
  async einsatzControllerCreateVAlpha(
    requestParameters: EinsatzControllerCreateVAlphaRequest
  ): Promise<EinsatzControllerCreateVAlpha201Response> {
    // ... generierter Code
  }
}
```

### Configuration & Runtime

```typescript
// runtime.ts
export class Configuration {
  basePath: string;           // API Base URL
  fetchApi?: FetchAPI;        // Custom Fetch (für Token-Refresh)
  credentials?: RequestCredentials;  // 'include' für Cookies
  accessToken?: string;       // Bearer Token
}

export class BaseAPI {
  constructor(protected configuration = DefaultConfig) {}

  protected async request(context: RequestOpts): Promise<Response> {
    // ... Middleware-Chain, Error-Handling
  }
}
```

---

## 3. Frontend: API-Client Integration

### BackendApi Singleton

```typescript
// packages/frontend/src/shared/api/api.ts

class BackendApi {
  private readonly configuration: Configuration;
  private readonly einsatzApi: EinsatzApi;
  private readonly authApi: AuthApi;
  // ... weitere API-Instanzen

  constructor() {
    this.configuration = new Configuration({
      basePath: getBaseUrl(),        // VITE_API_URL || 'http://localhost:3091'
      fetchApi: fetchWithRefresh,    // Custom Fetch mit Token-Refresh
      credentials: 'include',        // Cookies mitsenden
    });

    // APIs einmalig instanziieren (gecacht)
    this.einsatzApi = new EinsatzApi(this.configuration);
    this.authApi = new AuthApi(this.configuration);
  }

  // Getter für typsichere Nutzung
  einsatz(): EinsatzApi { return this.einsatzApi; }
  auth(): AuthApi { return this.authApi; }
}

export const api = new BackendApi();
```

### Token-Refresh Mechanismus

```typescript
// packages/frontend/src/shared/api/fetchWithRefresh.ts

class TokenRefreshQueue {
  private refreshPromise: Promise<boolean> | null = null;

  async startRefresh(refreshFn: () => Promise<boolean>): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;  // Warte auf laufenden Refresh
    }
    this.refreshPromise = refreshFn().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }
}

export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let response = await fetch(input, { ...init, credentials: 'include' });

  if (response.status === 401) {
    const refreshSuccess = await tokenRefreshQueue.startRefresh(refreshAccessToken);
    if (refreshSuccess) {
      response = await fetch(input, { ...init, credentials: 'include' });
    }
  }

  return response;
}
```

---

## 4. TanStack Query Integration

### Query Keys Pattern

```typescript
// packages/frontend/src/features/einsatz/api/queries.ts

export const EINSATZ_QUERY_KEYS = {
  all: ['einsatz'] as const,

  // Listen
  lists: () => [...EINSATZ_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: EinsatzQueryFilters) =>
    [...EINSATZ_QUERY_KEYS.lists(), filters].filter(v => v !== undefined),

  // Infinite Scroll
  infinite: (filters?: EinsatzQueryFilters) =>
    [...EINSATZ_QUERY_KEYS.all, 'infinite', filters].filter(v => v !== undefined),

  // Details
  details: () => [...EINSATZ_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string | null) => [...EINSATZ_QUERY_KEYS.details(), id] as const,

  // Nested Resources
  fahrzeuge: (einsatzId: string) =>
    [...EINSATZ_QUERY_KEYS.detail(einsatzId), 'fahrzeuge'] as const,
  personen: (einsatzId: string) =>
    [...EINSATZ_QUERY_KEYS.detail(einsatzId), 'personen'] as const,
} as const;
```

### Query Hook Pattern

```typescript
// packages/frontend/src/features/einsatz/api/use-einsaetze-query.ts

export const useEinsaetzeQuery = (filters?: EinsatzQueryFilters) => {
  return useQuery<EinsatzControllerFindAllVAlpha200Response, ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.list(filters),
    queryFn: async () => {
      return await api.einsatz().einsatzControllerFindAllVAlpha({
        limit: filters?.limit,
        page: filters?.page,
        search: filters?.search,
        status: filters?.status,
        orderBy: filters?.orderBy,
        orderDirection: filters?.orderDirection,
      });
    },
    staleTime: 30_000,  // 30 Sekunden
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
  });
};
```

### Mutation Hook Pattern mit Optimistic Updates

```typescript
// packages/frontend/src/features/einsatz/api/use-create-einsatz.ts

export const useCreateEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation<EinsatzDto, Error, CreateEinsatzDto>({
    mutationFn: (dto: CreateEinsatzDto) =>
      api.einsatz().einsatzControllerCreateVAlpha({ createEinsatzDto: dto }),

    onMutate: async (newEinsatz) => {
      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey: EINSATZ_QUERY_KEYS.lists() });

      // Snapshot für Rollback
      const previousData = queryClient.getQueryData(EINSATZ_QUERY_KEYS.lists());

      // Optimistic Update (optional)
      queryClient.setQueryData(EINSATZ_QUERY_KEYS.lists(), (old) => ({
        ...old,
        data: [{ ...newEinsatz, id: 'temp-id', status: 'ANGELEGT' }, ...old.data],
      }));

      return { previousData };
    },

    onError: (err, newEinsatz, context) => {
      // Rollback bei Fehler
      queryClient.setQueryData(EINSATZ_QUERY_KEYS.lists(), context?.previousData);
    },

    onSettled: () => {
      // Refetch für finale Konsistenz
      queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.all });
    },
  });
};
```

---

## 5. Feature-Hooks Übersicht

### Auth Feature (9 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useCurrentUser | Query | authControllerCheckAuth | ['auth', 'check'] |
| useAdminAuth | Query | Wrapper um useCurrentUser | ['auth', 'check'] |
| useUsers | Query | userControllerFindAllBasicVAlpha | ['users'] |
| usePublicUsers | Query | authControllerPublicUsers | ['auth', 'public-users'] |
| useUnifiedAuth | Mutation | authControllerUnifiedAuth | - |
| useAdminLogin | Mutation | authControllerAdminLogin | - |
| useLogout | Mutation | authControllerLogout | - |
| useAdminLogout | Mutation | authControllerAdminLogout | - |
| useAdminSetup | Mutation | authControllerAdminSetup | - |

### Einsatz Feature (18 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useEinsaetzeQuery | Query | einsatzControllerFindAllVAlpha | ['einsatz', 'list', filters] |
| useEinsaetzeInfiniteQuery | InfiniteQuery | einsatzControllerFindAllVAlpha | ['einsatz', 'infinite', filters] |
| useEinsatzDetail | Query | einsatzControllerFindOneVAlpha | ['einsatz', 'detail', id] |
| useActiveEinsaetzeWithCounts | Query | getActiveEinsaetzeWithCounts | ['einsatz', 'activeWithCounts'] |
| useEinsatzStatusCounts | Query | getStatusCountsVAlpha | ['einsatz', 'statusCounts'] |
| useCreateEinsatz | Mutation | einsatzControllerCreateVAlpha | - |
| useUpdateEinsatz | Mutation | einsatzControllerUpdateVAlpha | - |
| useArchiveEinsatz | Mutation | einsatzControllerArchiveVAlpha | - |
| useEinsatzFahrzeuge | Query | einsatzFahrzeugeControllerFindAll | ['einsatz', 'detail', id, 'fahrzeuge'] |
| useStammFahrzeuge | Query | stammFahrzeugeControllerFindAll | ['stamm-fahrzeuge'] |
| useFahrzeugtypen | Query | fahrzeugtypenControllerFindAll | ['fahrzeugtypen', 'aktiv'] |
| useErfasseFahrzeugAusStammdaten | Mutation | erfasseAusStammdatenVAlpha | - |
| useErfasseTemporalesFahrzeug | Mutation | erfasseTemporalesVAlpha | - |
| useUpdateFmsStatus | Mutation | updateFmsStatusVAlpha | - |
| useEinsatzPersonen | Query | einsatzPersonenControllerFindAll | ['einsatz', 'detail', id, 'personen'] |
| useRegistrierePersonViaQr | Mutation | registriereViaQrVAlpha | - |
| useWeisePersonZuFahrzeugZu | Mutation | weiseZuFahrzeugVAlpha | - |
| useEntfernePersonVonFahrzeug | Mutation | entferneVonFahrzeugVAlpha | - |

### ETB Feature (7 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useEtb | Query | getEtbByEinsatzIdVAlpha | ['etb', 'einsatz', einsatzId] |
| useEtbHistory | Query | getEtbHistoryVAlpha | ['etb', etbId, 'history'] |
| useTextbausteine | Query | getTextbausteine | ['etb', 'textbausteine'] |
| useCreateEtbEntry | Mutation | addEintragVAlpha | - |
| useUpdateEtbEntry | Mutation | updateEintragVAlpha | - |
| useDeleteEtbEntry | Mutation | deleteEintragVAlpha | - |
| useLockEtb | Mutation | lockEtbVAlpha | - |

### Lagekarte Feature (6 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useLagekarte | Query | lagekarteControllerGetLagekarteVAlpha | ['lagekarte', 'einsatz', einsatzId] |
| usePois | Query | getPoisVAlpha | ['pois', lagekarteId] |
| useCreatePoi | Mutation | createPoiVAlpha | - |
| useUpdatePoi | Mutation | updatePoiVAlpha | - |
| useDeletePoi | Mutation | deletePoiVAlpha | - |
| useGeocodeAddress | Mutation | geocodeAddressVAlpha | - |

### Kräfte Feature (4 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useTaktischeStaerke | Query | getTaktischeStaerkeVAlpha | ['kraefte', einsatzId, 'staerke'] |
| useRollenBesetzungen | Query | rollenBesetzungControllerFindAll | ['kraefte', einsatzId, 'rollen'] |
| useBesetzeRolle | Mutation | besetzeRolleVAlpha | - |
| useFreigebeRolle | Mutation | freigebeRolleVAlpha | - |

---

## 6. Dependency Graph

```
                     ┌──────────────────┐
                     │    COMPONENTS    │
                     │  (React Views)   │
                     └────────┬─────────┘
                              │ uses
                              ▼
                     ┌──────────────────┐
                     │  TANSTACK QUERY  │
                     │     HOOKS        │
                     │  (useXxxQuery)   │
                     └────────┬─────────┘
                              │ calls
                              ▼
                     ┌──────────────────┐
                     │   BackendApi     │
                     │   (Singleton)    │
                     └────────┬─────────┘
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    GENERATED CLIENT                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  EinsatzApi │  │   AuthApi   │  │ Configuration   │  │
│  │  ETBApi     │  │   UsersApi  │  │ + fetchWithRefresh│
│  │  LagekarteApi  ...          ...                    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                    @bluelight-hub/shared/client         │
└────────────────────────────┬────────────────────────────┘
                             │ generated from
                             ▼
                    ┌──────────────────┐
                    │  OpenAPI Spec    │
                    │  /api-json       │
                    └────────┬─────────┘
                             │ exposed by
                             ▼
                    ┌──────────────────┐
                    │  NestJS Backend  │
                    │  (Controllers)   │
                    └──────────────────┘
```

---

## 7. Integration Points

### APIs Consumed (Frontend → Backend)

| Endpoint-Gruppe | Beschreibung | Auth |
|-----------------|--------------|------|
| /api/auth/* | Authentifizierung, Token-Refresh | Public + JWT |
| /api/v-alpha/einsatz/* | Einsatz CRUD | JWT |
| /api/v-alpha/etb/* | Einsatztagebuch | JWT |
| /api/v-alpha/einsaetze/:id/fahrzeuge/* | Fahrzeug-Management | JWT |
| /api/v-alpha/einsaetze/:id/personen/* | Personen-Management | JWT |
| /api/v-alpha/einsatz/:id/lagekarte/* | Lagekarte & POIs | JWT |
| /api/v-alpha/kraefte/* | Stammdaten (read-only) | JWT |
| /api/v-alpha/admin/* | Admin-Funktionen | AdminJWT |

### Shared State (Frontend)

| State | Location | Beschreibung |
|-------|----------|--------------|
| selectedEinsatzId | einsatzStore | Aktuell ausgewählter Einsatz |
| authState | TanStack Query Cache | Auth-Status (isAuthenticated, isAdmin) |
| queryCache | QueryClient | Alle API-Responses (staleTime-basiert) |

### Events/Side Effects

| Trigger | Aktion | Invalidiert |
|---------|--------|-------------|
| useCreateEinsatz.onSuccess | Query invalidieren | einsatz.lists() |
| useUpdateEinsatz.onSuccess | Detail + Listen | einsatz.detail(id), einsatz.lists() |
| useCreateEtbEntry.onSuccess | ETB Queries | etb.byEinsatz(einsatzId) |
| useWeisePersonZuFahrzeug.onSuccess | Personen + Fahrzeuge + ETB | einsatz.personen, einsatz.fahrzeuge, etb.* |
| useLogout.onSuccess | Alle Queries clearen | QueryClient.clear() |

---

## 8. Configuration

### Umgebungsvariablen

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3091
```

**Backend (.env):**
```env
BACKEND_PORT=3091
APP_URL=http://localhost:3091
```

### Default-Konfigurationen

| Setting | Wert | Beschreibung |
|---------|------|--------------|
| staleTime | 30s | Zeit bis Daten als "stale" gelten |
| gcTime | 5min | Zeit bis inaktive Daten aus Cache entfernt |
| retry | 3 | Anzahl Retry-Versuche bei Fehlern |
| retryDelay | Exponential | 1s, 2s, 4s, 8s, 16s, max 30s |
| credentials | 'include' | Cookies bei allen Requests |

---

## 9. Error Handling

### Response-Fehler-Typen

```typescript
// Aus generiertem Client
export class ResponseError extends Error {
  response: Response;
  status: number;
  message: string;
}

export class FetchError extends Error {
  cause: Error;  // Netzwerk-Fehler
}

export class RequiredError extends Error {
  field: string;  // Fehlender Parameter
}
```

### Error-Handling in Hooks

```typescript
// Query-Fehler
const { error, isError } = useEinsaetzeQuery(filters);
if (isError) {
  toast.error(getApiErrorMessage(error));
}

// Mutation-Fehler
const { mutate } = useCreateEinsatz();
mutate(data, {
  onError: (error) => {
    if (error instanceof ResponseError && error.status === 409) {
      toast.error('Einsatz existiert bereits');
    } else {
      toast.error('Unbekannter Fehler');
    }
  },
});
```

---

## 10. Modification Guidance

### Neuen Endpoint hinzufügen

1. **Backend:** Controller mit DTO und Swagger-Decorators erstellen
   ```typescript
   @Post()
   @ApiWrappedCreatedResponse(NewFeatureDto)
   async createFeature(@Body() dto: CreateNewFeatureDto): Promise<NewFeatureDto> {
     // ...
   }
   ```

2. **API regenerieren:**
   ```bash
   pnpm run generate-api
   ```

3. **Frontend Hook erstellen:**
   ```typescript
   export const useCreateNewFeature = () => {
     return useMutation({
       mutationFn: (dto) => api.newFeature().createFeatureVAlpha({ dto }),
       onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newFeature'] }),
     });
   };
   ```

### Query Key ändern

1. Zentrale Query-Keys in `features/*/api/queries.ts` anpassen
2. Alle Hooks prüfen, die diese Keys nutzen
3. Invalidierungen in Mutations anpassen

### Neues Feature-Modul erstellen

```
features/new-feature/
├── api/
│   ├── index.ts           # Re-exports
│   ├── queries.ts         # Query Keys Factory
│   ├── use-xxx-query.ts   # Query Hooks
│   └── use-create-xxx.ts  # Mutation Hooks
├── ui/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── pages/
├── stores/                # TanStack Store (optional)
└── schemas/               # Zod Validation
```

---

## 11. Testing Checklist for Changes

- [ ] Backend-Endpoint mit Swagger-Decorators (@ApiWrappedResponse)
- [ ] API regenerieren: `pnpm run generate-api`
- [ ] Query Key in queries.ts definiert
- [ ] Hook mit korrektem queryKey/queryFn
- [ ] staleTime und retry konfiguriert
- [ ] Optimistic Update bei Mutations (optional)
- [ ] Cache-Invalidierung bei Mutations
- [ ] Error-Handling mit getApiErrorMessage()
- [ ] TypeScript-Typen korrekt (ResponseError, generierte DTOs)
- [ ] E2E-Test für kritische Pfade

---

## 12. Known Issues & Technical Debt

1. **Legacy POI Controller:** `PoiController` ist als DEPRECATED markiert, Migration zu CQRS-Pattern ausstehend
2. **Query Key Hierarchie:** Einige ältere Hooks nutzen flache Keys statt hierarchischer Struktur
3. **Token-Refresh Race Condition:** Bei sehr schnellen parallelen Requests kann es zu doppelten Refreshes kommen
4. **Generated Code Comments:** Generierte API-Dateien haben englische JSDoc-Kommentare (Backend ist Deutsch)

---

_Generiert von `document-project` workflow (deep-dive mode)_
_Base Documentation: docs/project-documentation/_
_Scan Date: 2026-01-05_
_Analysis Mode: Exhaustive_
