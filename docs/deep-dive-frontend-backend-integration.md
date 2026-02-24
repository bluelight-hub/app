# Frontend-Backend-Shared Integration - Deep Dive Dokumentation

**Generiert:** 2026-02-19
**Scope:** API-Integration zwischen Frontend (React/TanStack), Backend (NestJS) und Shared (Generierter Client)
**Files Analyzed:** 180+
**Workflow Mode:** Exhaustive Deep-Dive

## Overview

Diese Dokumentation beschreibt das komplette Zusammenspiel der drei Packages im BlueLight Hub Monorepo:
- **packages/backend** - NestJS REST API mit Swagger/OpenAPI + WebSocket Gateways
- **packages/shared** - Auto-generierter TypeScript API-Client
- **packages/frontend** - React mit TanStack Query Hooks + Socket.IO Client

**Key Integration Patterns:**
- Contract-First API Development mit OpenAPI Code-Generierung (REST)
- Event-Carried State Transfer via WebSocket (Echtzeit)

## Vollstaendiger Datenfluss

### REST-Datenfluss (Request/Response)

```
BACKEND (NestJS)                    SHARED (Generated)                 FRONTEND (React)
-----------------                   ------------------                 ----------------

1. Controller + DTOs
   @Controller('einsatz')
   @ApiWrappedResponse(EinsatzDto)
              |
              v
2. Swagger/OpenAPI Spec            3. Code-Generator
   http://localhost:3091/api-json  --> openapi-generator-cli
                                   --> typescript-fetch
                                              |
                                              v
                                   4. Generated Client               5. TanStack Query Hooks
                                   /apis/EinsatzApi.ts     -------->  useEinsaetzeQuery()
                                   /apis/BefehleApi.ts     -------->  useBefehleByEinsatz()
                                   /models/EinsatzDto.ts              useCreateBefehl()
                                   /models/BefehlDto.ts
                                   /runtime.ts (Configuration)
                                              |
                                              v
                                   5. Singleton API                  6. React Components
                                   BackendApi class        -------->  <EinsatzList />
                                   fetchWithRefresh                   <BefehlsListeMitEingabe />
```

### WebSocket-Datenfluss (Echtzeit-Events) -- NEU

```
BACKEND (NestJS)                                        FRONTEND (React)
-----------------                                       ----------------

1. Domain Event (Outbox)
   BefehlErstelltEvent
              |
              v
2. Event Adapter
   BefehlEventAdapter
   (Outbox --> Gateway)
              |
              v
3. WebSocket Gateway                                   4. Socket.IO Client Hook
   BefehlGateway                                        useBefehlWebSocket()
   Namespace: /befehle                                  - connect/disconnect
   Room: einsatz:{id}:befehle                           - Event Handler
              |                                                    |
              v                                                    v
   Events:                                              5. Cache Invalidation
   - befehl.erstellt                                     queryClient.invalidateQueries()
   - befehl.zugestellt         ---------------------->   BEFEHL_QUERY_KEYS.list(einsatzId)
   - befehl.quittiert                                            |
   - befehl.kommentarHinzugefuegt                                v
   - befehl.statusGeaendert *                           6. Toast Notifications
                                                          + Push-Notifications
                                                          + Badge-Count (Tauri/Web)

   * befehl.statusGeaendert wird vom Backend emittiert,
     aber vom Frontend derzeit NICHT verarbeitet.
```

---

## 1. Backend: REST Controller Layer

### Architektur-Uebersicht

Das Backend folgt der **Hexagonal Architecture** mit **CQRS Pattern**:

```
modules/
+-- auth/controllers/          # Authentifizierung (PUBLIC + JWT)
+-- befehl/controllers/        # Befehlsverwaltung (JWT) -- NEU
+-- befehl/gateways/           # WebSocket Gateway (JWT) -- NEU
+-- einsatz/controllers/       # Einsatz-Verwaltung (JWT)
+-- etb/controllers/           # Einsatztagebuch (JWT)
+-- kraefte/controllers/       # Kraefte-Management (JWT + Admin)
+-- lagekarte/controllers/     # Lagekarte/POIs (JWT)
+-- integrations/controllers/  # HiOrg-Server OAuth (Admin)
+-- user-management/controllers/ # User-Verwaltung (Admin)
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

### Befehl-Controller (NEU)

Der `BefehlController` implementiert das Befehlsmanagement im Einsatz mit CQRS-Pattern:

```typescript
// modules/befehl/controllers/befehl.controller.ts
@ApiTags('Befehle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'befehle', version: 'alpha' })
export class BefehlController {
  constructor(
    private readonly addBefehlKommentarHandler: AddBefehlKommentarHandler,
    private readonly createBefehlHandler: CreateBefehlHandler,
    private readonly quittierenBefehlHandler: QuittierenBefehlHandler,
    @Inject(BEFEHL_REPOSITORY) private readonly befehlRepository: IBefehlRepository,
  ) {}
}
```

**Endpoints:**

| Methode | Pfad | Beschreibung | Request DTO | Response DTO |
|---------|------|-------------|-------------|--------------|
| POST | `/api/v-alpha/befehle` | Neuen Befehl erstellen | `CreateBefehlDto` | `BefehlDto` (201) |
| POST | `/api/v-alpha/befehle/:id/quittieren` | Befehl quittieren | `QuittierenBefehlDto` | `BefehlDto` (200) |
| POST | `/api/v-alpha/befehle/:id/kommentare` | Kommentar hinzufuegen | `AddBefehlKommentarDto` | `BefehlDto` (201) |
| GET | `/api/v-alpha/befehle?einsatzId=...` | Befehle eines Einsatzes | Query Params | `BefehlDto[]` (200) |

**Query-Parameter fuer GET:**
- `einsatzId` (Pflicht) - Einsatz-ID
- `empfaengerId` (Optional) - Filtert nach Empfaenger
- `hasOpenRueckfragen` (Optional, Boolean) - Filtert auf offene Rueckfragen

**Besonderheit:** `hasOpenRueckfragen` hat Vorrang vor `empfaengerId` -- bei gleichzeitiger Angabe wird nur nach offenen Rueckfragen gefiltert.

### Custom Swagger Decorators

**WICHTIG:** Das Projekt verwendet **Custom Decorators** fuer korrekte OpenAPI-Schema-Generierung:

```typescript
// modules/common/decorators/api-wrapped-response.decorator.ts

// Fuer HTTP 200 OK Responses
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste aller Einsaetze' })

// Fuer HTTP 201 Created Responses
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

### Backend DTOs: Befehl (NEU)

**BefehlDto** (Response):
```typescript
class BefehlDto {
  id: string;                       // Befehl-ID
  nummer: string;                   // Format: B{YEAR}-{CUID-8}
  einsatzId: string;                // Einsatz-Zuordnung
  auftrag: string;                  // Befehlstext
  befehlsgeberId: string;          // Befehlsgeber User-ID
  erstellerId: string;             // Ersteller User-ID
  status: 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT';
  befehlstyp: 'KURZBEFEHL' | 'EAMZW' | 'ERWEITERT';  // Computed
  zeitvorgabe?: string;             // Optional
  ereignis?: string;                // EAMZW-Feld
  mittel?: string;                  // EAMZW-Feld
  ziel?: string;                    // EAMZW-Feld
  weg?: string;                     // EAMZW-Feld
  erteiltAm: Date;                  // Erteilungs-Zeitpunkt
  empfaenger: BefehlEmpfaengerDto[];  // Empfaenger-Liste
  kommentare: BefehlKommentarDto[];   // Kommentar-Liste
  createdAt: Date;
  updatedAt: Date;
}
```

**BefehlEmpfaengerDto** (Nested in BefehlDto):
```typescript
class BefehlEmpfaengerDto {
  id: string;
  empfaengerId: string;           // User-ID des Empfaengers
  zugestelltAm?: Date;            // Zustellungs-Zeitpunkt
  quittiertAm?: Date;             // Quittierungs-Zeitpunkt
  quittierungArt?: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';
}
```

**BefehlKommentarDto** (Nested in BefehlDto):
```typescript
class BefehlKommentarDto {
  id: string;
  authorId: string;                // Autor User-ID
  text: string;                    // Kommentar-Text
  isRueckfrage: boolean;           // Ob Rueckfrage
  parentId?: string;               // Thread-Antwort via Parent-ID
  createdAt: Date;
}
```

**CreateBefehlDto** (Request):
```typescript
class CreateBefehlDto {
  einsatzId: string;               // UUID, Pflicht
  empfaengerIds: string[];         // Min. 1 Empfaenger, Pflicht
  befehlsgeberId: string;         // Pflicht
  erstellerId: string;            // Pflicht
  auftrag: string;                // Min. 3 Zeichen, Pflicht
  zeitvorgabe?: string;            // Optional
  ereignis?: string;               // Optional (EAMZW)
  mittel?: string;                 // Optional (EAMZW)
  ziel?: string;                   // Optional (EAMZW)
  weg?: string;                    // Optional (EAMZW)
}
```

**QuittierenBefehlDto** (Request):
```typescript
class QuittierenBefehlDto {
  empfaengerId: string;            // Pflicht
  quittierungArt: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';  // Pflicht
}
```

**AddBefehlKommentarDto** (Request):
```typescript
class AddBefehlKommentarDto {
  text: string;                    // Pflicht
  isRueckfrage: boolean;           // Pflicht
  parentId?: string;               // Optional (Thread-Antwort)
}
```

### Endpoint-Statistik

| Modul | Controller | Endpoints | Auth |
|-------|-----------|-----------|------|
| auth | AuthController | 11 | Mixed (Public + JWT) |
| befehl | BefehlController | 4 | JwtAuthGuard |
| einsatz | EinsatzController | 14 | JwtAuthGuard |
| etb | EtbCqrsController | 7 | JwtAuthGuard |
| kraefte | 11 Controller | 40+ | JWT + AdminJwt |
| lagekarte | 3 Controller | 10+ | JwtAuthGuard |
| integrations | 2 Controller | 10 | AdminJwtAuthGuard |
| user-management | 2 Controller | 9 | AdminJwtAuthGuard |

**Gesamt:** ~100+ REST-Endpoints

### WebSocket Gateways

| Gateway | Namespace | Auth | Events |
|---------|-----------|------|--------|
| BefehlGateway | `/befehle` | WsJwtAuthGuard | 5 Events (4 im Frontend verarbeitet, 1 nur Backend) |

---

## 1b. Backend: WebSocket Gateway Layer (NEU)

### BefehlGateway -- Echtzeit-Kommunikation

Das `BefehlGateway` implementiert Event-Carried State Transfer via Socket.IO fuer Echtzeit-Updates:

```typescript
// modules/befehl/gateways/befehl.gateway.ts
@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/befehle',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class BefehlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Room Join/Leave
  @SubscribeMessage('join:einsatz')
  handleJoinEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): void

  @SubscribeMessage('leave:einsatz')
  handleLeaveEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): void

  // Emit-Methoden (aufgerufen vom BefehlEventAdapter)
  emitBefehlErstellt(payload: BefehlErstelltPayload): void
  emitBefehlZugestellt(payload: BefehlZugestelltPayload): void
  emitBefehlStatusGeaendert(payload: BefehlStatusGeaendertPayload): void  // Backend-only, kein Frontend-Handler
  emitBefehlKommentarHinzugefuegt(payload: BefehlKommentarHinzugefuegtPayload): void
  emitBefehlQuittiert(payload: BefehlQuittiertPayload): void
}
```

### Room-Pattern

Clients treten einem Room bei, um Events fuer einen bestimmten Einsatz zu erhalten:

```
Room-Name: einsatz:{einsatzId}:befehle

Client                         Server
  |-- join:einsatz {einsatzId} -->|
  |<--- befehl.erstellt ---------|  (an alle im Room)
  |<--- befehl.zugestellt -------|
  |<--- befehl.quittiert --------|
  |<--- befehl.kommentarHinzugefuegt -|
  |<--- befehl.statusGeaendert --|  (* Backend-only, kein Frontend-Handler)
  |-- leave:einsatz {einsatzId}->|
```

### WebSocket Event Payloads

| Event | Payload | Beschreibung | Verarbeitung |
|-------|---------|-------------|--------------|
| `befehl.erstellt` | `BefehlErstelltPayload` | Neuer Befehl mit vollstaendigen Daten (ECST) | Backend + Frontend |
| `befehl.zugestellt` | `BefehlZugestelltPayload` | Zustellung an Empfaenger bestaetig | Backend + Frontend |
| `befehl.statusGeaendert` | `BefehlStatusGeaendertPayload` | Statuswechsel (old/new) | **Nur Backend** (kein Frontend-Handler) |
| `befehl.kommentarHinzugefuegt` | `BefehlKommentarHinzugefuegtPayload` | Neuer Kommentar/Rueckfrage | Backend + Frontend |
| `befehl.quittiert` | `BefehlQuittiertPayload` | Quittierung durch Empfaenger | Backend + Frontend |

**BefehlErstelltPayload** (Beispiel mit allen Feldern):
```typescript
interface BefehlErstelltPayload {
  befehlId: string;
  einsatzId: string;
  nummer: string;              // z.B. "B2026-abc123xy"
  auftrag: string;
  befehlsgeberId: string;
  befehlsgeberName: string;    // Fuer Notification ohne DB-Lookup
  erstellerId: string;
  empfaengerIds: string[];
  status: string;
  erteiltAm: string;           // ISO 8601
}
```

### Bekannte Payload-Diskrepanzen (Backend vs. Frontend)

Da WebSocket-Payloads manuell als TypeScript-Interfaces definiert werden (kein generierter Client, siehe Known Issues Nr. 5), existieren Abweichungen zwischen Backend- und Frontend-Definitionen:

**BefehlQuittiertPayload:**
| Feld | Backend | Frontend |
|------|---------|----------|
| `befehlId` | Ja | Ja |
| `einsatzId` | Ja | Ja |
| `empfaengerId` | Ja | Ja |
| `quittierungArt` | Ja | Ja |
| `quittiertAm` | Ja | Ja |
| `nummer` | **Ja** | **Nein** (fehlt) |

**BefehlKommentarHinzugefuegtPayload:**
| Feld | Backend | Frontend |
|------|---------|----------|
| `befehlId` | Ja | Ja |
| `kommentarId` | Ja | Ja |
| `authorId` | Ja | Ja |
| `text` | Ja | Ja |
| `isRueckfrage` | Ja | Ja |
| `einsatzId` | **Ja** | **Nein** (fehlt) |
| `timestamp` | **Ja** | **Nein** (fehlt) |
| `eventId` | **Nein** | **Ja** (nur Frontend) |

> **Hinweis:** Diese Diskrepanzen sind aktuell unkritisch, da das Frontend die fehlenden Felder nicht benoetigt (Cache-Invalidierung nutzt `einsatzId` aus dem Hook-Closure, nicht aus dem Payload). Fuer zukuenftige Erweiterungen sollten die Interfaces jedoch angeglichen werden.

### Security-Konzept (WebSocket)

| Aspekt | Massnahme |
|--------|-----------|
| **CORS (C1)** | Nur `FRONTEND_URL` erlaubt, kein Wildcard |
| **Authentication (C2)** | JWT Token bei Connection via `WsJwtAuthGuard` |
| **Authorization (C3)** | `einsatzId` wird als UUID v4 validiert (kein Room Traversal) |
| **Input Validation** | `JoinEinsatzDto` mit `class-validator` |

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
+-- apis/                    # API-Klassen (eine pro Controller-Tag)
|   +-- BefehleApi.ts        # 4 Methoden (NEU)
|   +-- EinsatzApi.ts        # 14 Methoden
|   +-- AuthApi.ts           # 11 Methoden
|   +-- ETBApi.ts            # 7 Methoden
|   +-- ...                  # 28 API-Dateien gesamt
+-- models/                  # TypeScript DTOs
|   +-- AddBefehlKommentarDto.ts   # NEU
|   +-- BefehlDto.ts               # NEU
|   +-- BefehlEmpfaengerDto.ts     # NEU
|   +-- BefehlKommentarDto.ts      # NEU
|   +-- BefehlControllerCreateVAlpha201Response.ts      # NEU
|   +-- BefehlControllerFindByEinsatzVAlpha200Response.ts  # NEU
|   +-- CreateBefehlDto.ts         # NEU
|   +-- QuittierenBefehlDto.ts     # NEU
|   +-- EinsatzDto.ts
|   +-- CreateEinsatzDto.ts
|   +-- ApiMeta.ts
|   +-- ...                  # 110+ Model-Dateien
+-- runtime.ts               # Configuration, BaseAPI, Fetch-Wrapper
+-- index.ts                 # Re-exports
```

### BefehleApi -- Generierter Client (NEU)

```typescript
// Generiert: apis/BefehleApi.ts
export class BefehleApi extends BaseAPI {

  // POST /api/v-alpha/befehle
  async befehlControllerCreateVAlpha(
    requestParameters: BefehlControllerCreateVAlphaRequest
  ): Promise<BefehlControllerCreateVAlpha201Response>

  // POST /api/v-alpha/befehle/{id}/quittieren
  async befehlControllerQuittierenVAlpha(
    requestParameters: BefehlControllerQuittierenVAlphaRequest
  ): Promise<BefehlControllerCreateVAlpha201Response>

  // POST /api/v-alpha/befehle/{id}/kommentare
  async befehlControllerAddKommentarVAlpha(
    requestParameters: BefehlControllerAddKommentarVAlphaRequest
  ): Promise<BefehlControllerCreateVAlpha201Response>

  // GET /api/v-alpha/befehle?einsatzId=...&empfaengerId=...&hasOpenRueckfragen=...
  async befehlControllerFindByEinsatzVAlpha(
    requestParameters: BefehlControllerFindByEinsatzVAlphaRequest
  ): Promise<BefehlControllerFindByEinsatzVAlpha200Response>
}
```

**Request-Interfaces:**
```typescript
interface BefehlControllerCreateVAlphaRequest {
  createBefehlDto: CreateBefehlDto;
}

interface BefehlControllerQuittierenVAlphaRequest {
  id: string;
  quittierenBefehlDto: QuittierenBefehlDto;
}

interface BefehlControllerAddKommentarVAlphaRequest {
  id: string;
  addBefehlKommentarDto: AddBefehlKommentarDto;
}

interface BefehlControllerFindByEinsatzVAlphaRequest {
  einsatzId: string;
  empfaengerId?: string;
  hasOpenRueckfragen?: boolean;
}
```

**Generierte Model-Typen (Befehl):**

| Model | Beschreibung |
|-------|-------------|
| `BefehlDto` | Vollstaendiges Befehl-Objekt mit Empfaengern und Kommentaren |
| `BefehlEmpfaengerDto` | Empfaenger mit Zustellungs-/Quittierungsstatus |
| `BefehlKommentarDto` | Kommentar mit Thread-Support (parentId) |
| `CreateBefehlDto` | Input fuer Befehlserstellung |
| `QuittierenBefehlDto` | Input fuer Quittierung (mit Enum: VERSTANDEN/RUECKFRAGE/NICHT_VERSTANDEN) |
| `AddBefehlKommentarDto` | Input fuer Kommentar (text, isRueckfrage, parentId) |
| `BefehlControllerCreateVAlpha201Response` | Wrapped Response (data + meta) |
| `BefehlControllerFindByEinsatzVAlpha200Response` | Wrapped Array Response (data[] + meta + pagination) |

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
  fetchApi?: FetchAPI;        // Custom Fetch (fuer Token-Refresh)
  credentials?: RequestCredentials;  // 'include' fuer Cookies
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
  private readonly befehleApi: BefehleApi;    // NEU
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
    this.befehleApi = new BefehleApi(this.configuration);  // NEU
  }

  // Getter fuer typsichere Nutzung
  einsatz(): EinsatzApi { return this.einsatzApi; }
  auth(): AuthApi { return this.authApi; }
  befehle(): BefehleApi { return this.befehleApi; }  // NEU
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

### Befehl Query Keys (NEU)

```typescript
// packages/frontend/src/features/befehl/api/queries.ts

export const BEFEHL_QUERY_KEYS = {
  all: ['befehl'] as const,
  lists: () => [...BEFEHL_QUERY_KEYS.all, 'list'] as const,
  list: (einsatzId: string) =>
    [...BEFEHL_QUERY_KEYS.lists(), einsatzId] as const,
  meineBefehle: (einsatzId: string, userId: string) =>
    [...BEFEHL_QUERY_KEYS.lists(), einsatzId, 'meine', userId] as const,
  offeneRueckfragen: (einsatzId: string) =>
    [...BEFEHL_QUERY_KEYS.lists(), einsatzId, 'offeneRueckfragen'] as const,
  details: () => [...BEFEHL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) =>
    [...BEFEHL_QUERY_KEYS.details(), id] as const,
} as const;
```

**Hierarchie-Visualisierung:**
```
['befehl']
  +-- ['befehl', 'list']
  |     +-- ['befehl', 'list', '{einsatzId}']                    <- useBefehleByEinsatz
  |     +-- ['befehl', 'list', '{einsatzId}', 'meine', '{userId}'] <- useMeineBefehle
  |     +-- ['befehl', 'list', '{einsatzId}', 'offeneRueckfragen'] <- useOffeneRueckfragen
  +-- ['befehl', 'detail']
        +-- ['befehl', 'detail', '{id}']
```

**Vorteil:** Invalidierung von `BEFEHL_QUERY_KEYS.list(einsatzId)` invalidiert automatisch auch `meineBefehle` und `offeneRueckfragen` via TanStack Query Prefix-Matching.

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

      // Snapshot fuer Rollback
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
      // Refetch fuer finale Konsistenz
      queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.all });
    },
  });
};
```

---

## 5. Feature-Hooks Uebersicht

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

### Befehl Feature (9 Hooks + WebSocket) -- NEU

| Hook | Typ | API-Methode / Quelle | Query Key |
|------|-----|---------------------|-----------|
| useBefehleByEinsatz | Query | befehlControllerFindByEinsatzVAlpha | ['befehl', 'list', einsatzId] |
| useMeineBefehle | Query | befehlControllerFindByEinsatzVAlpha (empfaengerId) | ['befehl', 'list', einsatzId, 'meine', userId] |
| useOffeneRueckfragen | Query | befehlControllerFindByEinsatzVAlpha (hasOpenRueckfragen) | ['befehl', 'list', einsatzId, 'offeneRueckfragen'] |
| useCreateBefehl | Mutation | befehlControllerCreateVAlpha | - |
| useQuittierenBefehl | Mutation | befehlControllerQuittierenVAlpha | - |
| useAddBefehlKommentar | Mutation | befehlControllerAddKommentarVAlpha | - |
| useBefehlWebSocket | WebSocket | Socket.IO `/befehle` Namespace | (invalidiert list-Keys) |
| useBefehlNotifications | Side-Effect | Push-Notifications + Badge | (liest list-Keys) |
| useOfflineSync | Side-Effect | Offline-Queue fuer Quittierungen | - |

**Befehl-Hooks im Detail:**

**useBefehleByEinsatz** -- Alle Befehle eines Einsatzes laden:
```typescript
export function useBefehleByEinsatz(einsatzId: string) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.list(einsatzId),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha({
        einsatzId,
      });
      return response.data;
    },
    enabled: !!einsatzId,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
```

**useMeineBefehle** -- Befehle gefiltert nach aktuellem User als Empfaenger:
```typescript
export function useMeineBefehle(einsatzId: string, userId: string | undefined) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.meineBefehle(einsatzId, userId ?? ''),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha({
        einsatzId,
        empfaengerId: userId,
      });
      return sortMeineBefehle(response.data, userId ?? '');
    },
    enabled: !!einsatzId && !!userId,
  });
}
// Sortierung: Unquittierte zuerst, dann erteiltAm DESC
```

**useOffeneRueckfragen** -- Befehle mit offenen Rueckfragen:
```typescript
export function useOffeneRueckfragen(einsatzId: string, enabled = true) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.offeneRueckfragen(einsatzId),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha({
        einsatzId,
        hasOpenRueckfragen: true,
      });
      return response.data;
    },
    enabled: !!einsatzId && enabled,
  });
}
```

**useCreateBefehl** -- Befehl erstellen mit Optimistic Update:
```typescript
export const useCreateBefehl = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation<BefehlDto, ResponseError, CreateBefehlDto, CreateBefehlMutationContext>({
    mutationKey: ['befehl', 'create', einsatzId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerCreateVAlpha({
        createBefehlDto: data,
      });
      return response.data;
    },
    onMutate: async (newBefehl) => {
      // Cancel + Snapshot + Optimistic Insert an Listenspitze
      await queryClient.cancelQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });
      const previousBefehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));
      queryClient.setQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId), (old) => [
        { ...newBefehl, id: `temp-${Date.now()}`, status: 'ERTEILT', ... } as BefehlDto,
        ...(old || []),
      ]);
      return { previousBefehle };
    },
    onError: (_error, _variables, context) => {
      // Rollback
      if (context?.previousBefehle) {
        queryClient.setQueryData(BEFEHL_QUERY_KEYS.list(einsatzId), context.previousBefehle);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });
    },
  });
};
```

**useQuittierenBefehl** -- Quittierung mit Optimistic Update + Offline-Queue:
```typescript
export const useQuittierenBefehl = (einsatzId: string) => {
  return useMutation<BefehlDto, ResponseError, QuittierenBefehlInput, QuittierenBefehlMutationContext>({
    mutationKey: ['befehl', 'quittieren', einsatzId],
    mutationFn: async (data) => {
      // Offline-Support: Bei fehlender Netzwerkverbindung in Queue einreihen
      if (!navigator.onLine) {
        await befehlOfflineQueue.enqueue(data);
        toast.info('Quittierung offline gespeichert');
        return { id: data.befehlId } as BefehlDto;
      }
      const response = await api.befehle().befehlControllerQuittierenVAlpha({ ... });
      return response.data;
    },
    onMutate: async (input) => {
      // Optimistic: quittiertAm + quittierungArt sofort in Cache setzen
    },
    onError: async (error, variables, context) => {
      // Rollback + Toast mit Retry-Button
    },
  });
};
```

**useAddBefehlKommentar** -- Kommentar hinzufuegen:
```typescript
export const useAddBefehlKommentar = (einsatzId: string) => {
  return useMutation<BefehlDto, ResponseError, AddBefehlKommentarInput>({
    mutationKey: ['befehl', 'kommentar', einsatzId],
    mutationFn: async (data) => {
      const response = await api.befehle().befehlControllerAddKommentarVAlpha({
        id: data.befehlId,
        addBefehlKommentarDto: data.dto,
      });
      return response.data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) });
    },
  });
};
```

**useBefehlWebSocket** -- WebSocket-Integration fuer Echtzeit-Updates:
```typescript
export function useBefehlWebSocket({
  einsatzId,
  enabled = true,
  onBefehlErstellt,
  onBefehlQuittiert,
  onKommentarHinzugefuegt,
}: UseBefehlWebSocketOptions): UseBefehlWebSocketReturn {
  // Socket.IO Verbindung zu /befehle Namespace
  // Room Join: einsatz:{einsatzId}:befehle
  // Event Handler mit:
  //   - Event-Deduplizierung (processedEventIds Set, max 500)
  //   - Mutation-Pending Check (kein Cache-Invalidierung bei laufender Mutation)
  //   - Toast-Notifications fuer Team-Events (nicht eigene)
  //   - Callbacks fuer Notification-Hook

  return { status, isConnected, connect, disconnect };
}
```

**useBefehlNotifications** -- Push-Notifications + Badge:
```typescript
export function useBefehlNotifications({ einsatzId, enabled }: UseBefehlNotificationsOptions) {
  // - Push-Notification bei neuen Befehlen (nur wenn User Empfaenger)
  // - Badge-Count fuer unquittierte Befehle (Tauri + Web API)
  // - Permission-Anfrage einmalig beim Mount

  return { onBefehlErstellt, onBefehlQuittiert, updateBadge };
}
```

**Zusammenspiel der Hooks (Komposition):**
```typescript
// Typische Verwendung in einer Seite:
function BefehlePage({ einsatzId }) {
  // 1. Notifications Hook (gibt Callbacks)
  const { onBefehlErstellt, onBefehlQuittiert } = useBefehlNotifications({ einsatzId });

  // 2. WebSocket Hook (nutzt Callbacks)
  const { status, isConnected } = useBefehlWebSocket({
    einsatzId,
    onBefehlErstellt,
    onBefehlQuittiert,
  });

  // 3. Query Hooks (profitieren von WebSocket Cache-Invalidierung)
  const { data: befehle } = useBefehleByEinsatz(einsatzId);

  // 4. Mutation Hooks (loesen WebSocket Events aus)
  const { mutate: createBefehl } = useCreateBefehl(einsatzId);
}
```

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

### Kraefte Feature (4 Hooks)

| Hook | Typ | API-Methode | Query Key |
|------|-----|-------------|-----------|
| useTaktischeStaerke | Query | getTaktischeStaerkeVAlpha | ['kraefte', einsatzId, 'staerke'] |
| useRollenBesetzungen | Query | rollenBesetzungControllerFindAll | ['kraefte', einsatzId, 'rollen'] |
| useBesetzeRolle | Mutation | besetzeRolleVAlpha | - |
| useFreigebeRolle | Mutation | freigebeRolleVAlpha | - |

---

## 6. Dependency Graph

```
                     +------------------+
                     |    COMPONENTS    |
                     |  (React Views)   |
                     +--------+---------+
                              | uses
                              v
                     +------------------+
                     |  TANSTACK QUERY  |
                     |     HOOKS        |
                     |  (useXxxQuery)   |
                     +----+-------+-----+
                          |       |
                    calls |       | invalidates
                          v       |
                     +------------------+        +-------------------+
                     |   BackendApi     |        |  WebSocket Hooks  |
                     |   (Singleton)    |        |  (useBefehlWS)    |
                     +--------+---------+        +--------+----------+
                              |                           |
                        uses  |                   socket.io-client
                              v                           |
+-------------------------------------------------------------+
|                    GENERATED CLIENT                          |
|  +-------------+  +-------------+  +-----------------+      |
|  |  EinsatzApi |  |  BefehleApi |  | Configuration   |      |
|  |  ETBApi     |  |   AuthApi   |  | + fetchWithRefresh     |
|  |  LagekarteApi  ...          ...                   |      |
|  +-------------+  +-------------+  +-----------------+      |
|                    @bluelight-hub/shared/client              |
+----------------------------+--------------------------------+
                             | generated from
                             v
                    +------------------+
                    |  OpenAPI Spec    |
                    |  /api-json       |
                    +--------+---------+
                             | exposed by
                             v
                    +------------------+       +------------------+
                    |  NestJS Backend  |       | WebSocket Gateway|
                    |  (Controllers)   +-------+ (BefehlGateway)  |
                    +------------------+       +------------------+
```

---

## 7. Integration Points

### APIs Consumed (Frontend --> Backend)

| Endpoint-Gruppe | Beschreibung | Auth |
|-----------------|--------------|------|
| /api/auth/* | Authentifizierung, Token-Refresh | Public + JWT |
| /api/v-alpha/befehle/* | Befehlsmanagement (CRUD, Quittieren, Kommentare) | JWT |
| /api/v-alpha/einsatz/* | Einsatz CRUD | JWT |
| /api/v-alpha/etb/* | Einsatztagebuch | JWT |
| /api/v-alpha/einsaetze/:id/fahrzeuge/* | Fahrzeug-Management | JWT |
| /api/v-alpha/einsaetze/:id/personen/* | Personen-Management | JWT |
| /api/v-alpha/einsatz/:id/lagekarte/* | Lagekarte & POIs | JWT |
| /api/v-alpha/kraefte/* | Stammdaten (read-only) | JWT |
| /api/v-alpha/admin/* | Admin-Funktionen | AdminJWT |

### WebSocket Connections (Frontend --> Backend) -- NEU

| Namespace | Room-Pattern | Events | Auth |
|-----------|-------------|--------|------|
| `/befehle` | `einsatz:{einsatzId}:befehle` | 5 Server-Events (4 Frontend-Handler), 2 Client-Messages | WsJwtAuthGuard |

### Shared State (Frontend)

| State | Location | Beschreibung |
|-------|----------|--------------|
| selectedEinsatzId | einsatzStore | Aktuell ausgewaehlter Einsatz |
| authState | TanStack Query Cache | Auth-Status (isAuthenticated, isAdmin) |
| queryCache | QueryClient | Alle API-Responses (staleTime-basiert) |
| meineBefehleFilter | TanStack Store | Toggle-State fuer Meine-Befehle-Filter (NEU) |
| wsStatus | useBefehlWebSocket | WebSocket-Verbindungsstatus (NEU) |

### Events/Side Effects

| Trigger | Aktion | Invalidiert |
|---------|--------|-------------|
| useCreateEinsatz.onSuccess | Query invalidieren | einsatz.lists() |
| useUpdateEinsatz.onSuccess | Detail + Listen | einsatz.detail(id), einsatz.lists() |
| useCreateEtbEntry.onSuccess | ETB Queries | etb.byEinsatz(einsatzId) |
| useWeisePersonZuFahrzeug.onSuccess | Personen + Fahrzeuge + ETB | einsatz.personen, einsatz.fahrzeuge, etb.* |
| useLogout.onSuccess | Alle Queries clearen | QueryClient.clear() |
| useCreateBefehl.onSettled | Befehle-Liste | befehl.list(einsatzId) |
| useQuittierenBefehl.onSettled | Befehle-Liste | befehl.list(einsatzId) |
| useAddBefehlKommentar.onSettled | Befehle-Liste | befehl.list(einsatzId) |
| WS: befehl.erstellt | Cache invalidieren + Toast | befehl.list(einsatzId) |
| WS: befehl.zugestellt | Cache invalidieren + Toast | befehl.list(einsatzId) |
| WS: befehl.quittiert | Cache invalidieren + Toast + Badge | befehl.list(einsatzId) |
| WS: befehl.kommentarHinzugefuegt | Cache invalidieren + Toast (Rueckfragen) | befehl.list(einsatzId) |

### WebSocket + Mutation Koordination (NEU)

Die Befehl-Hooks implementieren eine Collision-Avoidance-Strategie, damit WebSocket-Events und laufende Mutations sich nicht gegenseitig stoeren:

```
Mutation laeuft          WebSocket Event kommt
      |                          |
      v                          v
  Optimistic Update         Check: Mutation pending?
      |                     /            \
      v                   ja              nein
  API Call              Skip Cache-       Invalidate
      |                 Invalidierung     Cache
      v                 (Toast trotzdem)     |
  onSettled                                  v
      |                                 UI-Update
      v
  Invalidate Cache
      |
      v
  Finale Konsistenz
```

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
| WS reconnectionDelay | 1s | Initiale Reconnect-Verzoegerung |
| WS reconnectionDelayMax | 10s | Maximale Reconnect-Verzoegerung |
| WS reconnectionAttempts | 10 | Maximale Reconnect-Versuche |
| WS transports | websocket, polling | Socket.IO Transport-Strategie |

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

### Befehl-spezifisches Error-Handling (NEU)

```typescript
// Quittierung mit Retry-Button bei Fehler
const mutation = useQuittierenBefehl(einsatzId);
// onError intern:
onError: async (error, variables, context) => {
  // 1. Optimistic Update Rollback
  queryClient.setQueryData(BEFEHL_QUERY_KEYS.list(einsatzId), context?.previousBefehle);
  // 2. User-freundliche Fehlermeldung
  const message = await getApiErrorMessage(error, 'Quittierung fehlgeschlagen');
  toast.error('Quittierung fehlgeschlagen', {
    description: message,
    action: {
      label: 'Erneut versuchen',
      onClick: () => mutation.mutate(variables),  // Retry
    },
  });
}
```

### Offline-Handling (NEU)

Der `useQuittierenBefehl`-Hook unterstuetzt Offline-Betrieb:
- Bei `!navigator.onLine` wird die Quittierung in eine Offline-Queue eingereiht
- Toast informiert den User ("Quittierung offline gespeichert")
- Bei Wiederverbindung wird die Queue automatisch abgearbeitet (`useOfflineSync`)

---

## 10. Modification Guidance

### Neuen Endpoint hinzufuegen

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

### Neuen WebSocket Event hinzufuegen (NEU)

1. **Backend Gateway:** Emit-Methode mit Payload-Interface definieren
   ```typescript
   // In BefehlGateway
   export interface NewEventPayload { ... }
   emitNewEvent(payload: NewEventPayload): void {
     this.server.to(this.getRoomName(payload.einsatzId)).emit('befehl.newEvent', payload);
   }
   ```

2. **Backend Event Adapter:** Event-Handler der Gateway-Methode aufruft
   ```typescript
   // In BefehlEventAdapter
   handleNewDomainEvent(event: NewDomainEvent) {
     this.befehlGateway.emitNewEvent({ ... });
   }
   ```

3. **Frontend WebSocket Hook:** Event-Handler registrieren
   ```typescript
   // In useBefehlWebSocket
   socket.on('befehl.newEvent', (event) => handleNewEventRef.current(event));
   ```

4. **Cache-Invalidierung:** Im Handler `invalidateCache()` aufrufen

### Query Key aendern

1. Zentrale Query-Keys in `features/*/api/queries.ts` anpassen
2. Alle Hooks pruefen, die diese Keys nutzen
3. Invalidierungen in Mutations anpassen

### Neues Feature-Modul erstellen

```
features/new-feature/
+-- api/
|   +-- index.ts           # Re-exports
|   +-- queries.ts         # Query Keys Factory
|   +-- use-xxx-query.ts   # Query Hooks
|   +-- use-create-xxx.ts  # Mutation Hooks
|   +-- use-xxx-websocket.ts  # WebSocket Hook (optional)
+-- hooks/
|   +-- index.ts           # Client-State Hooks
+-- ui/
|   +-- atoms/
|   +-- molecules/
|   +-- organisms/
|   +-- pages/
+-- lib/                   # Utilities, Offline-Queue
+-- stores/                # TanStack Store (optional)
+-- schemas/               # Zod Validation
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
- [ ] WebSocket Events registriert (wenn Echtzeit-Feature)
- [ ] WebSocket Event-Deduplizierung implementiert
- [ ] Mutation-Pending Check fuer WebSocket Handler
- [ ] Offline-Queue fuer kritische Aktionen (optional)
- [ ] Push-Notifications fuer relevante Events (optional)
- [ ] E2E-Test fuer kritische Pfade

---

## 12. Known Issues & Technical Debt

1. **Legacy POI Controller:** `PoiController` ist als DEPRECATED markiert, Migration zu CQRS-Pattern ausstehend
2. **Query Key Hierarchie:** Einige aeltere Hooks nutzen flache Keys statt hierarchischer Struktur
3. **Token-Refresh Race Condition:** Bei sehr schnellen parallelen Requests kann es zu doppelten Refreshes kommen
4. **Generated Code Comments:** Generierte API-Dateien haben englische JSDoc-Kommentare (Backend ist Deutsch)
5. **WebSocket kein generierter Client:** Im Gegensatz zu REST-Endpunkten gibt es keinen generierten Client fuer WebSocket-Events -- Payloads werden manuell als TypeScript Interfaces definiert. Dadurch existieren Payload-Diskrepanzen zwischen Backend und Frontend (siehe Abschnitt "Bekannte Payload-Diskrepanzen" in Kapitel 1b)
6. **`befehl.statusGeaendert` ohne Frontend-Handler:** Das Backend-Gateway emittiert dieses Event korrekt, aber das Frontend registriert keinen Handler dafuer. Nur 4 von 5 Events werden vom Frontend verarbeitet (`erstellt`, `zugestellt`, `quittiert`, `kommentarHinzugefuegt`)

---

_Generiert von `document-project` workflow (deep-dive mode)_
_Base Documentation: docs/project-documentation/_
_Scan Date: 2026-02-19_
_Analysis Mode: Exhaustive_
