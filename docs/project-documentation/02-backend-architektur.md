# 2 — Backend-Architektur

> NestJS 11 + Prisma + PostgreSQL · Hexagonale Architektur + CQRS + DDD · Transactional Outbox · WebSocket-Gateway

---

## 2.1 Layer-Topologie

```
┌───────────────────────────────────────────────────────────────┐
│  modules/   (HTTP + WebSocket Inbound-Adapter)                │
│   Controllers · DTOs · Guards · Pipes · Gateway               │
├───────────────────────────────────────────────────────────────┤
│  application/   (Use-Cases, CQRS, DTO-Mapping)                │
│   @CommandHandler · @QueryHandler · TransactionalCommandHandler│
├───────────────────────────────────────────────────────────────┤
│  domain/   (Business-Core, Framework-agnostisch)              │
│   Aggregates · Entities · Value Objects · Events · Ports      │
│   Result<T> · Domain Services                                 │
├───────────────────────────────────────────────────────────────┤
│  infrastructure/   (Outbound-Adapter, Treiber)                │
│   Prisma-Repositories · Outbox-Publisher · HiOrg-Client       │
│   JWT-Strategies · Socket.io-Gateway · Scheduler · Exporter   │
└───────────────────────────────────────────────────────────────┘
```

**Abhängigkeitsregel:** `modules` → `application` → `domain` ← `infrastructure`. Die Domain kennt keine Frameworks, Infrastructure implementiert ausschließlich Domain-Ports. Prüfung per `madge` (Circular-Deps) und `oxlint` (Layer-Regeln) — Pre-Commit und CI-Check (`pnpm --filter @bluelight-hub/backend check:arch`).

---

## 2.2 Domain Layer (`packages/backend/src/domain/`)

### 2.2.1 Aggregate Roots (7)

| Aggregat                | Zweck                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Einsatz**             | Zentrale Einsatz-Entity mit State-Machine `ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT`. NO-DELETE (10-Jahre-Aufbewahrung).      |
| **Befehl**              | Befehlsvergabe mit Status-Transitions `ERTEILT → ZUGESTELLT → QUITTIERT`. Append-Only, GoBD-konform. Anonymisierung zur Archivierung.       |
| **EtbEintrag**          | Event-sourced Logbuch-Eintrag mit Snapshot-Optimierung. Discriminated-Union-Kontexte (ADR-005).                                            |
| **User**                | RBAC mit `SUPER_ADMIN / ADMIN / USER`. Min-1-SUPER_ADMIN. Account-Locking reversibel, Soft-Delete final. Operative Rollen orthogonal.      |
| **Lagekarte**           | Geografische State-Verwaltung mit POIs, taktischen Zeichen, Gefahrenzonen.                                                                 |
| **InviteCode**          | Code-basierte User-Einladung mit Ablauf und Revocation. 8 Zeichen `A-Z0-9`.                                                                |
| **ServerAccessToken**   | Server-zu-Server-Auth mit Revision-Tracking und Revocation.                                                                                |

### 2.2.2 Weitere Domain-Entities (Auswahl)

- **Erinnerung** — State-Machine `GEPLANT → AUSGELOEST → ACKNOWLEDGED → SNOOZED/ESKALIERT → ERLEDIGT`, Multi-Eskalation, Wiederkehr, Serien.
- **BefehlEmpfaenger / BefehlKommentar** — Zustellungs-Tracking, Diskussionsfaden.
- **EinsatzRollenZuweisung** — Einsatzleiter, Gruppenführer, Truppenführer.
- **ComplianceReport** — Audit / GoBD-Reporting.
- **POI** — Points of Interest auf Lagekarte.
- Weitere unter `domain/erinnerung-konfiguration/`, `gefahr/`, `notiz/`, `kategorie/`, `taktische-zeichen/`, `fuehrungsrhythmus/`, `integrations/`, `geo/`, `kraefte/`.

### 2.2.3 Value Objects (74)

| Kategorie     | Beispiele                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| IDs           | `EinsatzId`, `BefehlId`, `EtbId`, `ErinnerungId`, `UserId`, `EtbEntryId` (CUID2-basiert)               |
| State-Enums   | `EinsatzStatus`, `BefehlStatus`, `EtbStatus`, `EtbKategorie`, `ErinnerungStatus`, `FunkPrioritaet`      |
| Business-VOs  | `Address`, `EinheitenTyp`, `EinsatzRolle`, `BefehlNummer`, `ErinnerungTitel`, `AufbewahrungsKonfiguration` |
| Komplex       | `EtbSnapshot` (Event-Sourcing-Snapshot), `Eintrag-Kontext` (Discriminated Union, ADR-005)              |

### 2.2.4 Domain Events (73)

- **Basisklasse:** `DomainEvent` mit automatisch generierter `eventId` (CUID2), `occurredAt` (Date), `static eventVersion()`.
- **Namenskonvention:** Vergangenheitsform (`EinsatzCreatedEvent`, **nicht** `CreateEinsatzEvent`).
- **Thematische Gruppen:**
  - **Einsatz:** `EinsatzCreated/Updated/StatusChanged/Completed/Archived`
  - **Befehl:** `erstellt / zugestellt / quittiert / kommentar-hinzugefügt / anonymisiert / geloescht`
  - **Erinnerung:** `erstellt / aktualisiert / ausgeloest / acknowledged / snoozed / eskaliert / intensiviert / erledigt / assigned / retrigger / serie-gestoppt`
  - **System:** `aufbewahrungs-konfiguration-geaendert`, `permission-granted/revoked`, `user-created/deleted/locked`, `server-migrated`, `invite-code-created/revoked`
  - **ETB:** `created / locked / eintrag-added / eintrag-updated`
  - **Alarmierung:** `empfaenger-hinzugefuegt / zugestellt / quittiert / zeitpunkt-fms-gesetzt / abgeschlossen`

### 2.2.5 Ports & Repositories

**Outbound Ports (12):** `ILogger`, `IJwtAuthService`, `IEncryption`, `IOAuth2`, `IHiorgServer`, `IHiorgOAuthConfig`, `IAddressSuche`, `IPlzLookup`, `IRuntimeConfig`, `IEventHandler`, `IEventPublisher`, `ICircuitBreakerReader`.

**Repository Interfaces (28):** `IEinsatzRepository`, `IBefehlRepository`, `IEtbRepository`, `IUserRepository`, `ILagekarteRepository`, `IInviteCodeRepository`, `IServerAccessTokenRepository`, `IErinnerungRepository`, `IAlarmierungRepository`, `IOutboxRepository`, Statistik-Read-Repos (`IErinnerungStatistik`, `IFuehrungsrhythmusStatistik`, `IZeitverlaufStatistik`, `IEskalationsAnalyse`, `IReaktionszeitStatistik`, `IEinsatzVergleich`, `IRohdatenExport`) u. a.

**Pattern:** Alle Methoden `async`, Rückgabe `Result<T>` für erwartete Fehler. Kein `delete()` bei Compliance-sensitiven Aggregates — stattdessen Soft-Delete / Archivierung.

### 2.2.6 Result Pattern (`domain/common/result.ts`, 38 LOC)

```ts
Result.ok<T>(value?: T)       // Erfolg
Result.fail<T>(error: string) // Fehler
// Properties: isSuccess, isFailure, value, error
```

- **Domain Layer:** Validierungen, Invariant-Verstöße → `Result.fail()`.
- **Application Layer:** Commands wrappen Ergebnisse; Business-Fehler niemals als Exception durch den Stack.
- **Unerwartete Fehler** (DB-Ausfall, Programmierfehler) bleiben Exceptions und werden vom Interceptor/Filter behandelt.

---

## 2.3 Application Layer (`packages/backend/src/application/`)

### 2.3.1 CQRS-Topologie

- **Command-Handler:** ≈ 178 Dateien, gruppiert unter `application/<modul>/commands/<use-case>/`.
- **Query-Handler:** ≈ 105 Dateien, gruppiert unter `application/<modul>/queries/<read>/`.
- **Pattern:** `@CommandHandler(…)` / `@QueryHandler(…)` (`@nestjs/cqrs` 11).

### 2.3.2 TransactionalCommandHandler (`application/common/handlers/`, 301 LOC)

Basisklasse für alle mutierenden Commands. Kapselt:

1. **Prisma-Transaktion** (`maxWait: 5000ms`, `timeout: 10000ms`).
2. **Aggregat-Laden → Mutation → Speichern.**
3. **Domain-Events** werden gesammelt und in die **Outbox-Tabelle** geschrieben (gleiche Transaktion → Transactional Outbox, kein Lost-Event).
4. **Rollback-Semantik:** `Result.fail()` wird intern in Exception umgewandelt → Prisma rollback → danach wieder zu `Result.fail()` hochgereicht.
5. **Framework-agnostischer `TransactionContext`** (Domain sieht keinen Prisma-Client).

### 2.3.3 Handler-Verteilung (Auswahl)

| Modul                      | Commands | Queries |
| -------------------------- | -------: | ------: |
| kraefte                    |       44 |      30 |
| einsatz                    |       10 |      20 |
| erinnerung                 |       13 |      14 |
| admin                      |       14 |       3 |
| funkkanal                  |       12 |       3 |
| user-management            |       10 |       6 |
| lagekarte                  |        9 |       6 |
| integrations               |        9 |       4 |
| taktische-zeichen          |        6 |       4 |
| alarmierung                |        6 |       4 |
| etb                        |        6 |       7 |
| erinnerungsvorlage         |        6 |       0 |
| fuehrungsrhythmus-template |        6 |       0 |
| befehl                     |        5 |       4 |
| einsatz-beitritt           |        3 |       1 |
| aufbewahrung               |        3 |       3 |
| notiz                      |        3 |       1 |
| einsatz-teilnehmer         |        2 |       2 |
| kategorie                  |        2 |       1 |
| gefahr                     |        1 |       1 |
| monitoring                 |        0 |       1 |

`auth` hat eigenen, nicht-CQRS-basierten Flow (direkte Services + Passport).

### 2.3.4 Validation

- **`@ValidateWithZod(schema)`** Decorator (`application/common/validation/`) auf DTOs.
- **Zod-Schemas** aus `@bluelight-hub/shared/schemas` (z. B. `usernameSchema`, `passwordSchema`, `inviteCodeSchema`, `serverUrlSchema`) bleiben **einzige Wahrheit** für Frontend und Backend.
- Backend-Value-Objects (z. B. `InviteCodeValue`) müssen manuell mit ihren Schemas synchronisiert bleiben (dokumentiert in `packages/shared/ARCHITECTURE.md`).

---

## 2.4 Modules Layer (`packages/backend/src/modules/`)

### 2.4.1 Module-Katalog (26 Module)

| Modul                         | Zweck                                                                         | Controller | Endpoints |
| ----------------------------- | ----------------------------------------------------------------------------- | ---------: | --------: |
| admin                         | Systemkonfiguration, Token, Invites, Rollen-Definitionen                      |          6 |        18 |
| alarmierung                   | Einsatz-Alarmierungen, Empfänger, Nachalarm, FMS-Integration (ADR-009)        |          2 |       ~12 |
| aufbewahrung                  | DSGVO / GoBD-Aufbewahrungsrichtlinien, Compliance-Reporting                   |          1 |         4 |
| auth                          | Login, JWT-Refresh, Admin-Setup                                               |          1 |        12 |
| befehl                        | Befehlsvergabe, Kommentierung, Quittierung                                    |          2 |        16 |
| common                        | Shared (Logger, Guards, Interceptors, Decorators)                             |          — |         — |
| einsatz                       | Einsatz-CRUD, Status, Archivierung                                            |          1 |        18 |
| einsatz-beitritt              | Beitrittsanfragen-Workflow (offen → genehmigt / abgelehnt)                    |          1 |         6 |
| einsatz-teilnehmer            | Teilnehmer-Verwaltung, Rollen-Zuweisung                                       |          1 |         8 |
| erinnerung                    | Multi-Eskalation, Snooze, Serien, Automatisierung                             |          2 |        14 |
| erinnerungsvorlage            | Templates für wiederkehrende Erinnerungen                                     |          1 |         6 |
| etb                           | Einsatztagebuch (CQRS-Controller)                                             |          1 |         8 |
| fuehrungsrhythmus-template    | Führungsrhythmen (Lagebesprechungen)                                          |          1 |         6 |
| funkkanal                     | Kanal-Aggregat (ADR-007), Zuordnung (ADR-008), Rufnamen-Vorschläge, Export    |          4 |        24 |
| gefahr                        | Gefahrenmatrix (ADR-010)                                                      |          1 |         6 |
| geo                           | PLZ-Lookup, Adress-Suche                                                      |          2 |         4 |
| integrations                  | HiOrg-OAuth2, Personen-Import, Integration-Verwaltung                         |          3 |        12 |
| kategorie                     | Einsatz-Kategorisierung                                                       |          1 |         6 |
| kraefte                       | Dominanteste Domäne — Fahrzeuge, Personen, Einheiten, Rollen, Qualifikationen |         15 |        64 |
| lagekarte                     | POIs, taktische Zeichen, Geo-State                                            |          4 |        16 |
| monitoring                    | Health, Metrics                                                               |          — |         — |
| notiz                         | Freitext-Notizen                                                              |          1 |         6 |
| taktische-zeichen             | Symbolkatalog, Platzierung auf Lagekarte                                      |          1 |         8 |
| user-management               | User-CRUD, Rollen, Berechtigungen, Sperrung                                   |          5 |        20 |

**Summe:** 58 Controller-Dateien, **≈ 272 HTTP-Operationen**.

### 2.4.2 Auth-Guards (Übersicht)

| Guard                   | Zweck                                                            | Einsatz    |
| ----------------------- | ---------------------------------------------------------------- | ---------- |
| `JwtAuthGuard`          | Standard für authentifizierte User                               | 26 Stellen |
| `AdminJwtAuthGuard`     | Admin / SUPER_ADMIN-Operationen (eigene Passport-Strategie)      | 14 Stellen |
| `RolesGuard`            | Rollen-basierte ACLs (kombinierbar mit JwtAuthGuard)             | 15 Stellen |
| `OperativeRoleGuard`    | Einsatz-Rollen (Führungskraft / Einsatzkraft / Externe)          | 2 Stellen  |
| `BefehlRollenGuard`     | Befehl-spezifische Rollen                                        | 1 Stelle   |
| `WsJwtAuthGuard`        | WebSocket-Auth via Cookie-Token                                  | Gateway    |

### 2.4.3 Response-Decorators (AC7)

Controller **müssen** `@ApiWrappedResponse(Dto)` / `@ApiWrappedCreatedResponse(Dto)` aus `modules/common/decorators/api-wrapped-response.decorator.ts` nutzen. Das Wrapper-Schema lautet:

```ts
{
  data: T,
  meta: { timestamp: string, version: 'alpha' | '1', requestId: string },
  pagination?: { page, limit, total, totalPages }  // nur Listen
}
```

Verstoß bricht die OpenAPI-Generierung (Swagger liefert kein `{data,meta}`-Wrapping, Clients sehen falsche Typen).

---

## 2.5 Infrastructure Layer (`packages/backend/src/infrastructure/`)

### 2.5.1 Subsysteme

| Bereich               | Inhalt                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `outbox/`             | **Transactional Outbox Pattern.** `event-serializer.ts` (1.691 LOC, 107 Cases), `event-deserializer.ts`, `OutboxPublisher`-Service. |
| `database/`           | Prisma-Client, Raw-SQL-Helpers, Migration-Management.                                                    |
| `repositories/`       | 11 zentrale Adapter + modul-spezifische Repos in `kraefte/`, `etb/`, `einsatz/`, `funkkanal/` etc.       |
| `auth/`               | Passport-Strategien (`jwt`, `admin-jwt`, `jwt-refresh`), `TokenServiceAdapter`, Bcrypt-Hashing.          |
| `guards/`             | Konkrete Implementierung der Auth-Guards (JWT, Admin-JWT, Roles, OperativeRole, WsJwtAuth).              |
| `events/`             | ≈ 20+ `@OnEvent`-Handler (z. B. ETB-Auto-Creation, Lagekarte-Auto-Creation).                             |
| `websocket/`          | `EinsatzEventsGateway` (Socket.io). Rooms `einsatz:{einsatzId}`. Publisher für Domain-Events.            |
| `integrations/`       | HiOrg OAuth2-Client, Personen-Import, QualifikationMapper.                                               |
| `geocoding/`          | Nominatim-Adapter, PLZ-Lookup.                                                                           |
| `config/`             | `AppConfig`, `RuntimeConfig`, `SecurityConfig`, JWT-Secrets-Handling.                                    |
| `decorators/`         | `@SkipSetupCheck`, `@SkipServerAccess`, `@SkipTransform`, `@ApiWrappedResponse`.                         |
| `password/`           | Bcrypt + Password-Strength, HIBP-Adapter.                                                                |
| `security/`           | AES-Verschlüsselung (Secrets-at-Rest), CORS.                                                             |
| `export/`             | PDF / CSV / JSON-Exporter für Einsatz, Befehl, ETB.                                                      |
| `scheduler/`          | Cron-Jobs (Erinnerungs-Trigger, Archiv-Cleanup).                                                         |
| `resilience/`         | Circuit-Breaker, Retry, Timeout.                                                                         |
| `metrics/`            | Prometheus-Exporter, Performance-Tracking.                                                               |
| `health/`             | HealthChecks (DB, Redis falls konfiguriert).                                                             |

### 2.5.2 Transactional Outbox

```
Command-Handler (@Transactional)
  ├── Aggregat mutieren
  ├── Events sammeln → EventSerializer (107 Cases)
  ├── OutboxRepository.save(SerializedEvent)    ┐
  └── Prisma-Transaction commit                 │ eine DB-Tx
                                                ┘
Polling-Service (OutboxPublisher)
  ├── SELECT … WHERE published=false
  ├── EventDeserializer → Domain-Event
  └── Handler-Invocation (@OnEvent)
```

**Kritische Dateien bei neuen Events (Registrierung an 4 Stellen):**

1. `infrastructure/outbox/event-serializer.ts`
2. `infrastructure/outbox/event-deserializer.ts`
3. `infrastructure/adapters/…` (modul-spezifischer Adapter)
4. `infrastructure/adapters/index.ts` (Export)

(Siehe `CLAUDE.md` Memory: *„Neue Events erfordern Registrierung an 4 Stellen“*.)

### 2.5.3 DI-Tokens (`infrastructure/di-tokens.ts`, 629 LOC)

- **Repository-Tokens** als `Symbol`: `USER_REPOSITORY`, `EINSATZ_REPOSITORY`, `ETB_REPOSITORY`, `OUTBOX_REPOSITORY`, `LAGEKARTE_REPOSITORY`, `ERINNERUNG_REPOSITORY`, …
- **Nested:** `KRAEFTE_REPOSITORIES = { QUALIFIKATION, FAHRZEUGTYP, STAMM_FAHRZEUG, STAMM_PERSON, EINSATZ_FAHRZEUG, EINSATZ_PERSON, ROLLEN_BESETZUNG, EINSATZ_EINHEIT }`.
- **Service-Tokens:** `JWT_AUTH_SERVICE`, `LOGGER`, `RUNTIME_CONFIG`, `PDF_EXPORT_SERVICE`, `CSV_EXPORT_SERVICE`, `BEFEHL_CSV_SERVICE`, `ALERT_SERVICE`, `EVENT_PUBLISHER`, `TRANSACTION_MANAGER`.
- **Event-Handler-Tokens:** `ETB_AUTO_CREATION`, `LAGEKARTE_AUTO_CREATION`, zahlreiche `ERINNERUNG_*` und `ETB_*`-Handler.

### 2.5.4 WebSocket-Gateway

**`EinsatzEventsGateway`** (`infrastructure/websocket/einsatz-events.gateway.ts`):

- **Namespace:** `/ws/einsatz-events`
- **Server:** Socket.io 5.x
- **Auth:** `WsJwtAuthGuard` (validiert JWT aus Cookie, wie HTTP-Flow)
- **Rooms:** `einsatz:{einsatzId}` für Broadcast an Einsatz-Teilnehmer
- **Nutzung:** Live-Sync Funkverkehr, Funkkanal, Kartenänderungen, Gefahrenmatrix, Notfall-Alerts (ADR-006)
- **Lifecycle:** `OnGatewayConnection` / `OnGatewayDisconnect` mit Logger

**SSE:** nicht implementiert; WebSocket deckt alle Push-Anwendungsfälle ab.

---

## 2.6 Authentifizierung

| Komponente                      | Details                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Access Token Strategy**       | `jwt.strategy.ts` — extrahiert HTTP-only Cookie `accessToken`. ValidatedUser: `userId, email, role, operativeRole`. |
| **Refresh Token Strategy**      | `jwt-refresh.strategy.ts` — Cookie `refreshToken`, Token-Rotation.                                               |
| **Admin Strategy**              | `admin-jwt.strategy.ts` — eigene benannte Strategie für Admin-Endpunkte.                                         |
| **Passwort-Hashing**            | Bcrypt (`infrastructure/password/`). Zusätzlich HIBP-Check (Pwned Passwords, siehe Integrationen).               |
| **HiOrg-OAuth2**                | `infrastructure/integrations/` — Authorization Code Flow, State-Management, Credential-Speicher (AES-verschlüsselt). |
| **Einsatz-scoped Ops. Rollen**  | Orthogonal zum RBAC: Führungskraft / Einsatzkraft / Externe — geprüft durch `OperativeRoleGuard`.                |

---

## 2.7 API-Versionierung (ADR-001)

- URI-basiert: `/api/alpha/…` (instabil, experimentell) und `/api/v1/…` (stabil).
- Zwei getrennte OpenAPI-Dokumente: `/api/alpha-json` und `/api/v1-json`.
- WebSocket-Namespace ist derzeit unversioniert (`/ws/einsatz-events`).
- Deprecation-Timeline in `docs/api-versioning.md`.

---

## 2.8 Wichtige Dateien (Quick-Reference)

| Pfad                                                                                | Inhalt                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------- |
| `packages/backend/src/domain/common/result.ts`                                      | Result-Pattern-Implementierung               |
| `packages/backend/src/application/common/handlers/*.ts`                             | `TransactionalCommandHandler`-Basisklasse    |
| `packages/backend/src/infrastructure/di-tokens.ts`                                  | Alle DI-Symbols (629 LOC)                    |
| `packages/backend/src/infrastructure/outbox/event-serializer.ts`                    | 107 Event-Serialisierungs-Cases              |
| `packages/backend/src/infrastructure/outbox/event-deserializer.ts`                  | Rekonstruktion der Domain-Events             |
| `packages/backend/src/infrastructure/websocket/einsatz-events.gateway.ts`           | Socket.io-Gateway                            |
| `packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts`  | API-Response-Wrapper                         |
| `packages/backend/prisma/schema.prisma`                                             | 58 Prisma-Modelle (siehe Kapitel 6)          |

---

## 2.9 Backend Code-Review-Checkliste

- [ ] Neue Events sind an **4 Stellen** registriert (Serializer, Deserializer, Adapter, Adapter-Index).
- [ ] Controller nutzen `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`.
- [ ] Einsatz-bezogene Endpoints hängen unter `/einsatz/:einsatzId/…` (Memory-Notiz).
- [ ] Injectable Classes werden mit `import` (nicht `import type`) importiert.
- [ ] Business-Fehler werden über `Result.fail()` propagiert — nicht als Exception geworfen.
- [ ] Mutationen nutzen `TransactionalCommandHandler`.
- [ ] Aggregates sind Framework-agnostisch (kein Prisma-Import in Domain).
- [ ] `pnpm --filter @bluelight-hub/backend check:arch` grün (Madge + OXLint).
- [ ] `pnpm --filter @bluelight-hub/backend check:di:imports` grün.
- [ ] Bei Compliance-relevanten Aggregates (Einsatz, ETB, Befehl): kein `delete` — Soft-Delete / Archivierung.
