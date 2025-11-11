# Critical Integration Points

## Backend → Frontend (REST API)

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

## Frontend → Backend (Data Fetching)

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

## Cross-Part Data Flow

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
