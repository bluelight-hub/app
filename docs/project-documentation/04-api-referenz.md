# 4 — API-Referenz

> **Basis-URL (Dev):** `https://127.0.0.1:3091/api` · **Swagger (Alpha):** `/api/alpha-json` · **Swagger (V1):** `/api/v1-json`
> **Protokoll:** HTTPS (self-signed, mkcert) · **Auth:** HTTP-only Cookies (`accessToken`, `refreshToken`)
> **WebSocket:** `wss://…/ws/einsatz-events`

---

## 4.1 API-Versionierung (ADR-001)

- **URI-Segment** in der Basis-Route: `/api/alpha/…` (experimentell, kann brechen) und `/api/v1/…` (stabil).
- **Zwei getrennte OpenAPI-Dokumente:** `/api/alpha-json` und `/api/v1-json`.
- **Generierter Client** bedient beide Varianten (`@bluelight-hub/shared/client` = Alpha, `@bluelight-hub/shared/client-v1` = V1).
- **WebSocket-Namespace** ist derzeit **nicht versioniert** — `/ws/einsatz-events`.

Deprecation-Timeline und Migrationsstrategie: `docs/api-versioning.md`.

---

## 4.2 Response-Envelope

Alle Responses werden über die Custom Decorators `@ApiWrappedResponse(Dto)` / `@ApiWrappedCreatedResponse(Dto)` (`packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts`) in folgendes Envelope verpackt:

```ts
{
  data: T,
  meta: {
    timestamp: string,   // ISO 8601
    version: 'alpha' | '1',
    requestId: string    // CUID2
  },
  pagination?: {         // nur bei Listen
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

Der OpenAPI-Generator (`typescript-fetch`) erzeugt daraus korrekt typisierte Response-Klassen — Controller, die Standard-`@ApiOkResponse` nutzen, brechen diese Pipeline (AC7-Regel in `CLAUDE.md`).

---

## 4.3 Endpoint-Katalog (≈ 272 Operationen, 58 Controller)

| Modul                         | Endpoints | Primärer Guard              | Kurzbeschreibung                                                   |
| ----------------------------- | --------: | --------------------------- | ------------------------------------------------------------------ |
| `health`                      |       1   | Public                      | Liveness-Check                                                     |
| `auth`                        |      12   | Public / JwtAuthGuard       | Login, Register, Token-Refresh, Admin-Setup                        |
| `admin`                       |      18   | AdminJwtAuthGuard           | System-Konfiguration, Invites, Rollen-Definitionen, Migration      |
| `einsatz`                     |      18   | JwtAuthGuard (+ Roles)      | CRUD, Status, Archivierung, Teilnehmer-Aggregation                 |
| `einsatz-beitritt`            |       6   | JwtAuthGuard                | Beitrittsanfragen-Workflow                                         |
| `einsatz-teilnehmer`          |       8   | JwtAuthGuard (+ OperativeRole) | Teilnehmer-Rollen, Zuweisung                                    |
| `etb`                         |       8   | JwtAuthGuard                | Einsatztagebuch (CQRS, Snapshots)                                  |
| `befehl`                      |      16   | JwtAuthGuard + BefehlRollen | Erteilen, Empfänger, Quittierung, Kommentar, Anonymisierung        |
| `alarmierung`                 |     ~12   | JwtAuthGuard                | Alarmierungen, Empfänger, Nachalarm (ADR-009)                      |
| `aufbewahrung`                |       4   | AdminJwtAuthGuard           | Aufbewahrungsrichtlinien, Compliance-Reports                       |
| `erinnerung`                  |      14   | JwtAuthGuard                | Multi-Eskalation, Snooze, Serien                                   |
| `erinnerungsvorlage`          |       6   | JwtAuthGuard                | Vorlagen-CRUD                                                      |
| `fuehrungsrhythmus-template`  |       6   | JwtAuthGuard                | Führungsrhythmen-Templates                                         |
| `funkkanal`                   |      24   | JwtAuthGuard                | Kanal-Aggregat (ADR-007), Zuordnung (ADR-008), Rufname, Export     |
| `gefahr`                      |       6   | JwtAuthGuard                | Gefahrenmatrix (ADR-010)                                           |
| `geo`                         |       4   | Public / JwtAuthGuard       | PLZ-Lookup, Adress-Suche                                           |
| `integrations`                |      12   | AdminJwtAuthGuard           | HiOrg-OAuth2-Connect, Personen-Import                              |
| `kategorie`                   |       6   | JwtAuthGuard                | Einsatz-Kategorisierung                                            |
| `kraefte`                     |      64   | JwtAuthGuard (+ Roles)      | Größte API-Oberfläche — Fahrzeuge, Personen, Einheiten, Qualifikationen |
| `lagekarte`                   |      16   | JwtAuthGuard                | POIs, Taktische Zeichen, Karte-State                               |
| `notiz`                       |       6   | JwtAuthGuard                | Freitext-Notizen                                                   |
| `taktische-zeichen`           |       8   | JwtAuthGuard                | Symbolkatalog, Platzierung                                         |
| `user-management`             |      20   | AdminJwtAuthGuard           | User-CRUD, Rollen, Berechtigungen, Sperrung                        |

> **Hinweis zur Einsatz-Nesting-Regel (Memory):** Einsatz-bezogene Endpoints hängen immer unter `/einsatz/:einsatzId/…` (z. B. `/einsatz/:einsatzId/etb/…`, `/einsatz/:einsatzId/befehl/…`, `/einsatz/:einsatzId/alarmierung/…`). Top-Level-Pfade wie `/etb/:id` ohne Einsatz-Kontext sind untersagt.

---

## 4.4 Auth-Flow

### 4.4.1 Login

1. `POST /api/v1/auth/login` (Zod-validiertes Payload: `usernameSchema`, `passwordSchema` aus `@bluelight-hub/shared/schemas`).
2. Backend setzt HTTP-only Cookies `accessToken` + `refreshToken`.
3. Frontend verwendet `credentials: 'include'` im Fetch-Wrapper — Browser/Tauri schicken Cookies automatisch.

### 4.4.2 Token-Refresh

- Access-Token-TTL kurz; Refresh-Token-TTL länger.
- Beim 401 ruft `fetchWithRefresh.ts` `POST /api/v1/auth/refresh` auf. Ein `TokenRefreshQueue` verhindert parallele Refresh-Requests.
- Nach erfolgreichem Refresh wird der ursprüngliche Request erneut ausgeführt.

### 4.4.3 Admin-Auth

- Separate Passport-Strategie `admin-jwt`.
- Schutz aller `/api/*/admin/*` und vieler `/api/*/user-management/*`-Routen via `AdminJwtAuthGuard`.

### 4.4.4 Operative Rollen

- Orthogonal zum RBAC (`SUPER_ADMIN / ADMIN / USER`).
- Einsatz-Scope: `Führungskraft`, `Einsatzkraft`, `Externe` → `OperativeRoleGuard`.

---

## 4.5 WebSocket

### 4.5.1 Gateway

- **Namespace:** `/ws/einsatz-events`
- **Server:** Socket.io 5.x (Backend), `socket.io-client` 4.8 (Frontend)
- **Auth:** `WsJwtAuthGuard` — Cookie-basierte JWT-Validierung (gleicher Flow wie HTTP).
- **Room-Modell:** `einsatz:{einsatzId}` — Broadcast an alle verbundenen Einsatz-Teilnehmer (ADR-006).

### 4.5.2 Event-Flow

```
Domain-Event (z. B. FunkspruchCreated)
  → Outbox (Transactional)
  → OutboxPublisher
  → EinsatzEventPublisher.broadcast(einsatzId, event)
  → Socket.io Server → Room: einsatz:{einsatzId}
  → Frontend-Listener → TanStack-Query-Invalidation / Store-Update
```

Verwendete Live-Streams:
- Funkverkehr (Kanäle, Funksprüche)
- Kartenänderungen (Polygon-Sync, Zeichen)
- Gefahrenmatrix (Warnstufen-Live-Sync, ADR-010)
- Befehle / ETB-Einträge
- Notfall-Alerts / Alarmierungen

> Ein dedizierter **WebSocket-Event-Katalog** fehlt noch (Dokumentations-Lücke). Als Quelle dient aktuell der Event-Serializer (107 Cases in `infrastructure/outbox/event-serializer.ts`).

---

## 4.6 Generierter API-Client (Shared)

### 4.6.1 Struktur

```
packages/shared/
├── openapitools.json         # Konfiguration
├── scripts/
│   └── generate-openapi-client.mjs   # Download Spec → Generator → Lint
├── client/                   # Alpha (527 TS-Dateien, 52 APIs, 475 Modelle)
├── client-v1/                # V1
├── src/
│   ├── schemas/              # Zod-Schemas (auth/, …)
│   └── validation/           # Plain-JS-Validatoren
├── ARCHITECTURE.md           # Datenfluss, Schema-Lifecycle
├── INTEGRATION_EXAMPLES.md   # TanStack Form + NestJS DTO
├── QUICK_REFERENCE.md
└── SHARED_SCHEMAS_SUMMARY.md
```

### 4.6.2 Generator-Pipeline

**Tool:** `@openapitools/openapi-generator-cli` (`v2.31.1`, Generator-Spec `v7.10.0`).
**Generator-Template:** `typescript-fetch`.
**Base-URL konfigurierbar:** `BLUELIGHT_OPENAPI_BASE_URL` / `OPENAPI_GENERATOR_BASE_URL` (Standard: `https://localhost:3091`).

**Package-Scripts (`packages/shared/`):**

| Script                       | Wirkung                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `pnpm run generate-api:alpha` | Spec laden → Alpha-Client generieren → oxlint + oxfmt       |
| `pnpm run generate-api:all`   | Alpha + V1 parallel                                         |
| `pnpm run build`              | TypeScript-Kompilation ohne Regeneration                    |
| `pnpm run build:with-api`     | Regenerate + Build                                          |

### 4.6.3 Verwendung im Frontend

```ts
const { data } = useQuery<EinsatzControllerFindAllVAlpha200Response, ResponseError>({
  queryKey: EINSATZ_QUERY_KEYS.list(filters),
  queryFn: () => api.einsatz().einsatzControllerFindAllVAlpha({ page, limit, filters }),
  staleTime: 30_000,
  retry: 3,
});
```

- `api` wird in `packages/frontend/src/shared/api/api.ts` gebaut — pro Tag eine API-Instanz mit `Configuration({ fetchApi: fetchWithRefresh, credentials: 'include' })`.
- Server-Auflösung über `serverStore` (Multi-Server-Support: Welcher Server ist aktuell aktiv?).
- Token-Lookup über `getServerAccessToken()` aus `shared/lib/server-access-token.ts`.

---

## 4.7 Zod-Schemas (Shared)

Verfügbare Schemas in `packages/shared/src/schemas/auth/`:

| Schema                          | Regel                                                                |
| ------------------------------- | -------------------------------------------------------------------- |
| `usernameSchema`                | 3–20 Zeichen, `[a-zA-Z0-9_-]`                                        |
| `passwordSchema`                | 8–128 Zeichen, Komplexitätsregeln (Groß, Klein, Ziffer, Symbol)      |
| `inviteCodeSchema`              | Exakt 8 Zeichen, `[A-Z0-9]` (Backend-strikt)                         |
| `inviteCodeSchemaNormalized`    | Frontend-UX-Variante mit Auto-Uppercase                              |
| `serverUrlSchema`               | Nur `http://` / `https://` (Fail-fast bei anderem Protokoll)         |

**Import:** `@bluelight-hub/shared/schemas` (nicht direkt aus `src/`).
**Backend-Nutzung:** `@ValidateWithZod(schema)` auf DTOs.
**Synchronisation:** Backend-Value-Objects (z. B. `InviteCodeValue`) müssen **manuell** mit Shared-Schemas abgeglichen werden — dokumentiert in `packages/shared/ARCHITECTURE.md` (Zeile ≈ 419–441).

---

## 4.8 Error-Handling

### Response-Format bei Fehler

```ts
{
  statusCode: number,
  error: string,      // HTTP-Statusname
  message: string | string[],  // Fehlerbeschreibung(en)
  requestId: string,
  timestamp: string
}
```

Typische Fälle:

| HTTP | Bedeutung                                   | Quelle                                       |
| ---- | ------------------------------------------- | -------------------------------------------- |
| 400  | Validation / Business-Regel                 | Zod-Pipe, `Result.fail()` aus Domain/App     |
| 401  | Kein Token oder abgelaufen                  | `JwtAuthGuard` → Frontend ruft Refresh       |
| 403  | Rolle fehlt                                 | `RolesGuard`, `AdminJwtAuthGuard`, `OperativeRoleGuard` |
| 404  | Aggregat nicht gefunden                     | `*Repository.findById` → `Result.fail(NOT_FOUND)` |
| 409  | State-Konflikt (z. B. Einsatz bereits archiviert) | Domain-Invariant → `Result.fail`     |
| 500  | Unerwartet                                  | Exception-Filter                             |

> Ein kohärentes **Error-Handling-Pattern-Doc** ist noch zu erstellen (Dokumentations-Lücke laut Doku-Recherche).

---

## 4.9 API-Workflow (kritisch)

```
Backend-Endpoint
  ↓ (mit @ApiWrappedResponse + korrektem DTO)
pnpm run generate-api
  ↓ (regeneriert 475 Modelle + 52 API-Klassen)
@bluelight-hub/shared/client
  ↓ (Import im Frontend-Feature)
TanStack Query Hook
  ↓ (Query-Key-Factory)
React-Komponente
```

**Untersagt:** manuelle `fetch()`-Aufrufe, manuelle Response-Type-Definitionen, Bypass des Shared-Clients. Verstoß gegen AC-Regel in `CLAUDE.md`.

---

## 4.10 Quick-Reference-Dateien

| Pfad                                                                               | Inhalt                        |
| ---------------------------------------------------------------------------------- | ----------------------------- |
| `packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts` | Wrapper-Decorators            |
| `packages/shared/openapitools.json`                                                | Generator-Konfiguration       |
| `packages/shared/scripts/generate-openapi-client.mjs`                              | Generator-Script              |
| `packages/frontend/src/shared/api/fetchWithRefresh.ts`                             | Fetch-Wrapper mit Token-Refresh |
| `packages/frontend/src/shared/api/api.ts`                                          | API-Instanzen pro Tag         |
| `packages/frontend/src/shared/lib/server-access-token.ts`                          | Token-Accessor                |
| `packages/shared/ARCHITECTURE.md`                                                  | Schema-Lifecycle              |
| `packages/shared/INTEGRATION_EXAMPLES.md`                                          | Form + DTO-Beispiele          |
| `docs/api-versioning.md`                                                           | Versionierungs-Strategie      |
