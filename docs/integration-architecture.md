# BlueLight-Hub Integration Architecture

**Generated:** 2025-01-11 by BMM Document-Project Workflow v1.2.0

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Communication Patterns](#communication-patterns)
3. [Backend → Frontend Integration](#backend--frontend-integration)
4. [Frontend → Backend Integration](#frontend--backend-integration)
5. [Authentication Flow](#authentication-flow)
6. [API Generation Workflow](#api-generation-workflow)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [State Management Integration](#state-management-integration)

---

## Architecture Overview

BlueLight-Hub follows a **monorepo architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo Root                             │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Backend   │  │  Frontend  │  │  Shared (Generated) │   │
│  │  (NestJS)  │  │(React+Tauri)│  │  (OpenAPI Client)   │   │
│  │            │  │            │  │                     │   │
│  │  REST API  │◄─┤  HTTP      │◄─┤  TypeScript Types   │   │
│  │  OpenAPI   ├─►│  Requests  ├─►│  API Functions      │   │
│  │  Swagger   │  │            │  │                     │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│         │                │                    ▲              │
│         │                │                    │              │
│         ▼                ▼                    │              │
│  ┌────────────┐  ┌────────────┐              │              │
│  │ PostgreSQL │  │ TanStack   │              │              │
│  │ (Prisma)   │  │  Query     │──────────────┘              │
│  └────────────┘  └────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points

| Integration Point | Protocol | Implementation |
|------------------|----------|----------------|
| **Backend → Database** | PostgreSQL wire protocol | Prisma ORM |
| **Backend → Frontend** | HTTP REST + JSON | NestJS Controllers |
| **Frontend → Backend** | HTTP REST + JSON | Generated OpenAPI Client |
| **Frontend State** | In-memory + Optimistic UI | TanStack Query/Store |
| **Authentication** | JWT in httpOnly Cookies | Passport.js + Cookie-Parser |
| **File Uploads** | multipart/form-data | Multer (Backend) + Fetch API (Frontend) |

---

## Communication Patterns

### 1. Request-Response (REST)

**Pattern:** Synchronous HTTP requests for CRUD operations

**Example Flow:**
```
Frontend                  Backend                   Database
   │                         │                          │
   ├─── GET /api/einsaetze ─►│                          │
   │                         ├─── SELECT * FROM Einsatz ►│
   │                         │◄────────────────────────┤
   │◄─── 200 OK + JSON ──────┤                          │
   │                         │                          │
```

**Usage:**
- User management (GET /api/users, POST /api/users)
- Einsatz CRUD (GET /api/einsaetze/:id, PATCH /api/einsaetze/:id)
- ETB operations (POST /api/etb/:id/eintraege)
- Lagekarte POI management (POST /api/lagekarten/:id/pois)

### 2. Optimistic Updates

**Pattern:** Update UI immediately, sync with backend asynchronously

**Example Flow:**
```
Frontend (TanStack Query)           Backend
   │                                   │
   ├─ User clicks "Archive"            │
   ├─ UI updates instantly (optimistic)│
   ├─ POST /api/einsaetze/:id/archive ►│
   │                                   ├─ Validate + Update DB
   │◄─ 200 OK ─────────────────────────┤
   ├─ Confirm optimistic update        │
   │   OR revert on error              │
```

**Usage:**
- ETB entry creation (instant feedback)
- POI position updates on map
- Einsatz status changes
- User activation/deactivation

### 3. Cookie-Based Authentication

**Pattern:** JWT tokens stored in httpOnly cookies (no localStorage)

**Advantages:**
- XSS protection (tokens not accessible via JavaScript)
- CSRF protection (sameSite: strict)
- Automatic token refresh
- Secure transmission (HTTPS in production)

---

## Backend → Frontend Integration

### REST API Exposure

**Backend (NestJS):**
- Controllers expose RESTful endpoints
- OpenAPI decorators generate Swagger documentation
- DTOs validate request/response payloads
- Guards enforce authentication/authorization

**Example Controller:**
```typescript
// Backend: packages/backend/src/einsaetze/einsaetze.controller.ts
@Controller('einsaetze')
@ApiTags('Einsaetze')
export class EinsaetzeController {
  @Get()
  @ApiOperation({ summary: 'Get all Einsätze' })
  @ApiResponse({ status: 200, type: [EinsatzResponseDto] })
  async findAll(): Promise<EinsatzResponseDto[]> {
    return this.einsaetzeService.findAll();
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive Einsatz' })
  @ApiResponse({ status: 200, type: EinsatzResponseDto })
  async archive(@Param('id') id: string): Promise<EinsatzResponseDto> {
    return this.einsaetzeService.archive(id);
  }
}
```

**Swagger UI:**
- Accessible at `http://localhost:3000/api` (development)
- Interactive API documentation
- Test endpoints directly from browser

**OpenAPI JSON:**
- Generated at `http://localhost:3000/api-json`
- Input for OpenAPI Generator (generates TypeScript client)

### CORS Configuration

**Backend:** Configures allowed origins for cross-origin requests

```typescript
// packages/backend/src/main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
```

**Environment:**
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Frontend → Backend Integration

### Generated OpenAPI Client

**Location:** `packages/shared/client/apis/`

**Generation Command:**
```bash
pnpm run generate-api
```

**Process:**
1. Backend exposes OpenAPI spec at `/api-json`
2. OpenAPI Generator CLI reads spec
3. Generates TypeScript client with:
   - Type-safe API functions
   - Request/response DTOs
   - Enum definitions
   - Error handling

**Example Generated Client:**
```typescript
// packages/shared/client/apis/EinsaetzeApi.ts
export class EinsaetzeApi {
  async einsaetzeControllerFindAll(
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<EinsatzResponseDto[]>> {
    return axios.get('/api/einsaetze', options);
  }

  async einsaetzeControllerArchive(
    id: string,
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<EinsatzResponseDto>> {
    return axios.post(`/api/einsaetze/${id}/archive`, {}, options);
  }
}
```

### TanStack Query Integration

**Frontend:** Wraps generated client in Query hooks for caching + reactivity

**Example Hook:**
```typescript
// packages/frontend/src/hooks/queries/useEinsaetze.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useEinsaetze = () => {
  return useQuery({
    queryKey: ['einsaetze'],
    queryFn: async () => {
      const response = await api.einsaetze().einsaetzeControllerFindAll();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const useArchiveEinsatz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.einsaetze().einsaetzeControllerArchive(id);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['einsaetze'] });
    },
  });
};
```

**Component Usage:**
```typescript
// packages/frontend/src/components/organisms/EinsatzList.tsx
import { useEinsaetze, useArchiveEinsatz } from '@/hooks/queries/useEinsaetze';

export const EinsatzList = () => {
  const { data: einsaetze, isLoading } = useEinsaetze();
  const archiveMutation = useArchiveEinsatz();

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {einsaetze?.map((einsatz) => (
        <li key={einsatz.id}>
          {einsatz.alarmstichwort}
          <button onClick={() => archiveMutation.mutate(einsatz.id)}>
            Archive
          </button>
        </li>
      ))}
    </ul>
  );
};
```

---

## Authentication Flow

### JWT Cookie-Based Authentication

**Security Features:**
- httpOnly cookies (not accessible via JavaScript)
- sameSite: strict (CSRF protection)
- secure: true (HTTPS only in production)
- Automatic token refresh

### 1. Unified Auth Flow (Login/Auto-Registration)

```
┌────────────┐                 ┌────────────┐                 ┌────────────┐
│  Frontend  │                 │  Backend   │                 │ PostgreSQL │
└─────┬──────┘                 └─────┬──────┘                 └─────┬──────┘
      │                              │                              │
      ├─── POST /api/auth/unified ──►│                              │
      │    { username: "user123" }   │                              │
      │                              ├─── SELECT FROM User ────────►│
      │                              │    WHERE username=?           │
      │                              │◄─────────────────────────────┤
      │                              │                              │
      │                              ├─ User exists?                │
      │                              │  YES: Generate JWT           │
      │                              │  NO:  Create user + JWT      │
      │                              │                              │
      │                              ├─ Set cookies:                │
      │                              │  - accessToken (15min)       │
      │                              │  - refreshToken (7 days)     │
      │                              │                              │
      │◄─── 200 OK ──────────────────┤                              │
      │    Set-Cookie: accessToken   │                              │
      │    Set-Cookie: refreshToken  │                              │
      │    { user: {...}, isNewUser }│                              │
      │                              │                              │
      ├─ Store user in TanStack ─────┤                              │
      │  Store (local state)         │                              │
      │                              │                              │
```

**Frontend Code:**
```typescript
// packages/frontend/src/hooks/useAuth.ts
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const useUnifiedAuth = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (username: string) => {
      const response = await api.auth().authControllerUnifiedAuth({ username });
      return response.data;
    },
    onSuccess: (data) => {
      // Cookies are automatically set by backend
      setUser(data.user);
      if (data.isNewUser) {
        toast.success('Willkommen! Ihr Account wurde erstellt.');
      } else {
        toast.success('Willkommen zurück!');
      }
    },
  });
};
```

### 2. Admin Login Flow (Password-Based)

```
Frontend                  Backend                   Database
   │                         │                          │
   ├─ POST /api/auth/admin ─►│                          │
   │  { password: "..." }    │                          │
   │                         ├─ Verify admin password   │
   │                         ├─ Generate JWT            │
   │                         ├─ Set cookies             │
   │◄─ 200 OK + cookies ────┤                          │
   │                         │                          │
```

### 3. Authenticated Request Flow

```
Frontend                  Backend                   Database
   │                         │                          │
   ├─ GET /api/einsaetze ───►│                          │
   │  Cookie: accessToken    │                          │
   │                         ├─ Verify JWT signature    │
   │                         ├─ Check token expiration  │
   │                         ├─ Extract user from token │
   │                         ├─ Query Einsaetze ───────►│
   │                         │◄─────────────────────────┤
   │◄─ 200 OK + data ────────┤                          │
   │                         │                          │
```

### 4. Token Refresh Flow

```
Frontend                  Backend
   │                         │
   ├─ GET /api/einsaetze ───►│
   │  Cookie: accessToken    │
   │  (expired)              ├─ 401 Unauthorized
   │◄────────────────────────┤
   │                         │
   ├─ POST /api/auth/refresh ►│
   │  Cookie: refreshToken   │
   │                         ├─ Verify refresh token
   │                         ├─ Generate new accessToken
   │                         ├─ Set new cookie
   │◄─ 200 OK ───────────────┤
   │  Set-Cookie: accessToken│
   │                         │
   ├─ Retry GET /api/einsaetze ►│
   │  Cookie: new accessToken│
   │◄─ 200 OK + data ────────┤
   │                         │
```

**Frontend Auto-Refresh:**
```typescript
// packages/frontend/src/lib/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Send cookies
});

// Interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## API Generation Workflow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Backend Development                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Developer adds new endpoint with OpenAPI decorators        │ │
│  │ Example: @ApiOperation({ summary: 'Get Einsatz by ID' })  │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Start Backend (Swagger Auto-Generation)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ pnpm --filter @bluelight-hub/backend dev                   │ │
│  │ NestJS generates OpenAPI spec at /api-json                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Generate API Client (Shared Package)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ pnpm run generate-api                                       │ │
│  │ OpenAPI Generator reads /api-json                           │ │
│  │ Generates TypeScript client in packages/shared/client/      │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Frontend Uses Generated Client                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ import { api } from '@/lib/api';                            │ │
│  │ const response = await api.einsaetze().findOne(id);        │ │
│  │ // Type-safe, auto-completion works!                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration Files

**Backend OpenAPI Config:**
```typescript
// packages/backend/src/main.ts
const config = new DocumentBuilder()
  .setTitle('BlueLight Hub API')
  .setDescription('Emergency response management API')
  .setVersion('1.0')
  .addBearerAuth()
  .addCookieAuth('accessToken')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);

// Expose JSON for code generation
app.use('/api-json', (req, res) => {
  res.json(document);
});
```

**Shared Package Generation Script:**
```json
// packages/shared/package.json
{
  "scripts": {
    "generate-api": "openapi-generator-cli generate -i http://localhost:3000/api-json -g typescript-axios -o client --additional-properties=useSingleRequestParameter=true"
  }
}
```

### Generated Files

```
packages/shared/client/
├── apis/
│   ├── AuthApi.ts              # Auth endpoints
│   ├── EinsaetzeApi.ts         # Einsatz CRUD
│   ├── EinsatztagebuchApi.ts   # ETB management
│   ├── LagekarteApi.ts         # Lagekarte + POIs
│   ├── UsersApi.ts             # User management
│   └── ...
├── models/
│   ├── EinsatzResponseDto.ts   # Response types
│   ├── CreateEinsatzDto.ts     # Request types
│   ├── UserResponseDto.ts
│   └── ...
└── index.ts                    # Re-exports all APIs
```

**Usage in Frontend:**
```typescript
// packages/frontend/src/lib/api.ts
import { Configuration, EinsaetzeApi, AuthApi, UsersApi } from '@bluelight-hub/shared/client';

const config = new Configuration({
  basePath: import.meta.env.VITE_API_URL,
});

export const api = {
  einsaetze: () => new EinsaetzeApi(config),
  auth: () => new AuthApi(config),
  users: () => new UsersApi(config),
  // ... other APIs
};
```

---

## Data Flow Diagrams

### Complete Request Flow (Example: Create ETB Entry)

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│ Component│       │TanStack  │       │Generated │       │  Backend │
│  (UI)    │       │  Query   │       │ API Client│       │  (NestJS)│
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                   │
     ├─ onClick() ──────►                   │                   │
     │                  │                   │                   │
     │                  ├─ mutate(data) ────►                   │
     │                  │                   │                   │
     │                  │                   ├─ POST /api/etb/:id/eintraege ─►
     │                  │                   │   Cookie: accessToken
     │                  │                   │   Body: { text, priority }
     │                  │                   │                   │
     │                  │                   │                   ├─ Validate JWT
     │                  │                   │                   ├─ Validate DTO
     │                  │                   │                   ├─ Save to DB
     │                  │                   │                   │
     │                  │                   │◄─ 201 Created ────┤
     │                  │                   │   { id, text, ... }
     │                  │◄──────────────────┤                   │
     │                  │                   │                   │
     │                  ├─ onSuccess() ─────►                   │
     │                  ├─ Invalidate cache │                   │
     │                  ├─ Refetch query ───┼───────────────────►
     │                  │                   │                   │
     │◄─ UI updates ────┤                   │                   │
     │  (new entry)     │                   │                   │
     │                  │                   │                   │
```

### File Upload Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│ Component│       │ File     │       │ Backend  │       │Filesystem│
│  (UI)    │       │ Input    │       │ (Multer) │       │          │
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                   │
     ├─ Select file ────►                   │                   │
     │                  │                   │                   │
     ├─ FormData ────────►                   │                   │
     │  .append('file', file)                │                   │
     │                  │                   │                   │
     ├─ POST /api/upload ┼───────────────────►                   │
     │  Content-Type: multipart/form-data    │                   │
     │                  │                   │                   │
     │                  │                   ├─ Parse multipart ─►│
     │                  │                   ├─ Save to disk ─────►
     │                  │                   │◄──────────────────┤
     │                  │                   │                   │
     │◄─────────────────┼───────────────────┤                   │
     │  { url, filename }                   │                   │
     │                  │                   │                   │
```

---

## State Management Integration

### TanStack Query (Server State)

**Purpose:** Cache and synchronize server data

**Key Features:**
- Automatic caching with configurable staleTime
- Background refetching
- Optimistic updates
- Query invalidation
- Infinite scrolling support

**Example:**
```typescript
// packages/frontend/src/hooks/queries/useEinsaetze.ts
export const useEinsaetze = () => {
  return useQuery({
    queryKey: ['einsaetze'],
    queryFn: () => api.einsaetze().findAll(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    refetchOnWindowFocus: true,
  });
};
```

### TanStack Store (Client State)

**Purpose:** Manage local UI state (non-server data)

**Example:**
```typescript
// packages/frontend/src/stores/einsatzStore.ts
import { Store } from '@tanstack/react-store';

export const einsatzStore = new Store({
  selectedEinsatzId: null as string | null,
  mapViewport: { lat: 51.1657, lng: 10.4515, zoom: 6 },
  filterStatus: 'ALLE' as EinsatzStatus | 'ALLE',
});

// Usage in component
export const EinsatzMap = () => {
  const viewport = einsatzStore.useStore((state) => state.mapViewport);
  const setViewport = (viewport) => einsatzStore.setState({ mapViewport: viewport });

  return <Map center={viewport} onViewportChange={setViewport} />;
};
```

### State Synchronization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Server State (TanStack Query)                               │
│  - Einsätze, ETB entries, Users, POIs                        │
│  - Cached with automatic invalidation                        │
│  - Source of truth: Backend database                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Invalidate on mutations
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Client State (TanStack Store)                               │
│  - Selected items, UI filters, map viewport                  │
│  - Form state (temporary, before submission)                 │
│  - Source of truth: Local component state                    │
└─────────────────────────────────────────────────────────────┘
```

**Best Practices:**
1. **Server state in TanStack Query:** Never duplicate server data in local state
2. **Client state in TanStack Store:** Only for UI-specific state (selections, filters)
3. **Form state in TanStack Form:** Use Zod schemas for validation
4. **Optimistic updates:** Update UI immediately, revert on error

---

## Integration Checklist

When adding new features, ensure:

- [ ] Backend endpoint has OpenAPI decorators
- [ ] DTO classes use `class-validator` and `@ApiProperty()`
- [ ] Run `pnpm run generate-api` after backend changes
- [ ] Frontend uses generated client (no manual `fetch()` calls)
- [ ] TanStack Query hook wraps API call for caching
- [ ] Mutations invalidate related queries
- [ ] Authentication guard applied to protected endpoints
- [ ] CORS allows frontend origin
- [ ] Error handling for network failures
- [ ] Loading states in UI components

---

## Additional Resources

- **Backend API Documentation:** [.bmm-backend-api-contracts.md](./.bmm-backend-api-contracts.md)
- **Frontend State Management:** [.bmm-frontend-state-management.md](./.bmm-frontend-state-management.md)
- **Frontend API Integration:** [.bmm-frontend-api-integration.md](./.bmm-frontend-api-integration.md)
- **Development Guide:** [.bmm-development-guide.md](./.bmm-development-guide.md)
- **Architecture Documentation:** [architecture/index.adoc](./architecture/index.adoc)

---

**Last Updated:** 2025-01-11
**Workflow Version:** BMM v1.2.0 (Exhaustive Scan)
