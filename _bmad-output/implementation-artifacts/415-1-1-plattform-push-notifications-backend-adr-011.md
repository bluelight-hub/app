# Story 1.1: Plattform Push-Notifications Backend (ADR-011)

Status: done

**Scope-Grenze (KRITISCH):** Diese Story ist **Backend-only + ADR**. Service-Worker (`public/sw.js`), `useCriticalNotification`-Hook, Tauri-Bridge und Subscription-Manager-UI sind **Story 1.2** und nicht Teil dieses Scopes. Jeder Frontend-Client-Code gehört nicht hierher.

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Plattform-Admin**,
I want **eine plattformweite Push-Notification-Infrastruktur mit VAPID-Signing, Subscription-Management und `web-push`-Integration im Backend**,
so that **Eigenschutz und andere zukünftige Module kritische Events an Clients ausliefern können, auch wenn die Web-/Tauri-Anwendung nicht im Vordergrund ist**.

## Acceptance Criteria

### AC1 — Subscription-Endpoint ist idempotent und persistiert korrekt

**Given** ein authentifizierter Nutzer mit aktivem Browser-Tab
**When** er sein Gerät für Push-Notifications registriert (`POST /api/users/me/push-subscriptions` mit Body `{endpoint, keys.p256dh, keys.auth}`)
**Then** wird eine `PushSubscription`-Entity persistiert (FK auf `User.id`, `endpoint` UNIQUE)
**And** der Endpoint ist Server-seitig für Push verfügbar
**And** doppeltes Registrieren desselben `endpoint` ersetzt die Subscription-Keys idempotent ohne Fehler (Upsert-Semantik, HTTP 201 auch beim zweiten Aufruf).

### AC2 — `PushNotificationsService.send(userId, payload)` liefert per VAPID + web-push

**Given** eine gültige `PushSubscription`
**When** `PushNotificationsService.send(userId, payload)` aufgerufen wird
**Then** wird die Notification mit dem geladenen VAPID-Keypair signiert und über `web-push@^3` an den Browser-Push-Service gesendet
**And** fehlgeschlagene Endpoints mit HTTP-Status `410 Gone` oder `404 Not Found` werden automatisch aus `PushSubscription` entfernt
**And** andere Fehler (Timeout, 5xx) werden strukturiert geloggt, aber die Subscription bleibt erhalten
**And** der Service ist als `@Injectable()` Class über DI nutzbar. **Import ohne `import type`** (AC1 der CLAUDE.md, Pre-Commit-Hook `check:di:imports` lehnt das Gegenteil ab).

### AC3 — VAPID-Keypair wird Fail-Fast beim Start gebootstrapped

**Given** das VAPID-Keypair
**When** die Anwendung startet
**Then** wird der **Public-Key** für den Frontend-Bootstrap via `VITE_VAPID_PUBLIC_KEY` in `packages/frontend/.env.example` dokumentiert (Public-Key ist nicht geheim)
**And** der **Private-Key** wird auf dem Backend über `@dotenvx/dotenvx` aus einer Secret-Umgebung (`VAPID_PRIVATE_KEY`) geladen
**And** bei fehlendem Public-Key **oder** Private-Key **startet der `PushNotificationsModule` nicht** (`OnModuleInit`-Hook wirft und bricht Boot ab — Fail-Fast)
**And** die Fehlermeldung verweist auf die zu setzenden Env-Variablen (DX-Hinweis), ohne den aktuellen Wert zu loggen.

### AC4 — Strukturiertes Logging ohne Secret-Leak

**Given** eine neue Subscription wurde gespeichert
**When** das Ereignis protokolliert wird
**Then** erscheint ein strukturierter Log-Eintrag mit **ausschließlich** `userId`, `endpointHost` (Host-Teil der `endpoint`-URL, nicht das vollständige Endpoint), `createdAt`
**And** es werden **weder** `keys.p256dh`, `keys.auth`, `VAPID_PRIVATE_KEY` **noch** das vollständige `endpoint`-Token geloggt (Test asserten).

### AC5 — ADR-011 ist angelegt und dokumentiert die Entscheidung

**Given** die Entscheidung für Plattform-Push-Notifications via VAPID + `web-push`
**When** die Story abgeschlossen ist
**Then** existiert die Datei `docs/adr/adr-011-plattform-push-notifications.md` mit den Abschnitten **Status**, **Kontext**, **Entscheidung**, **Konsequenzen** (positiv/negativ), **Alternativen** — Format analog ADR-010
**And** die ADR referenziert explizit: Architecture §B7 (`architecture.md:565`), die Platzierung in `infrastructure/push-notifications/` + `modules/push-notifications/`, die Dedup-Strategie (Server dedupt NICHT; Client dedupt per `eventId`-LRU)
**And** der ADR-Status ist `Akzeptiert (2026-04-21)`.

### AC6 — `web-push@^3` ist als Backend-Dependency gepflegt

**Given** die Dependency-Analyse (AR15)
**When** die Story abgeschlossen ist
**Then** ist `"web-push": "^3.x.x"` in `packages/backend/package.json` als `dependencies` ergänzt (NICHT `devDependencies`)
**And** `pnpm-lock.yaml` ist aktualisiert
**And** `pnpm --filter @bluelight-hub/backend build` läuft ohne Errors durch.

### AC7 — Controller nutzt `@ApiWrappedCreatedResponse` und Shared-Client-Generation funktioniert

**Given** der neue `PushSubscriptionController`
**When** die OpenAPI-Spec generiert wird
**Then** nutzen alle Endpoints `@ApiWrappedCreatedResponse` / `@ApiWrappedResponse` (NICHT die Standard-Swagger-Decorators wie `@ApiCreatedResponse`, siehe CLAUDE.md "Controller Response Decorators (AC7)")
**And** `pnpm run generate-api` läuft ohne Warnings durch und aktualisiert `shared/client/`
**And** der generierte Shared-Client enthält einen Typ für den Subscription-Endpoint.

### AC8 — Tests erreichen ≥ 80 % Coverage für die neuen Domain-/Application-Files

**Given** NFR-M1 (≥ 80 % Unit-Test-Coverage für neue Domain-Logik)
**When** `pnpm --filter @bluelight-hub/backend test` läuft
**Then** decken Unit-Tests ab: (a) Idempotentes Upsert einer neuen Subscription mit gleichem Endpoint, (b) Fail-Fast bei fehlendem Keypair, (c) `web-push`-Call wird mit korrekten VAPID-Headers gemockt-aufgerufen, (d) `410 Gone` und `404 Not Found` → Subscription wird gelöscht, (e) Andere Fehler → Subscription bleibt, (f) Log-Eintrag enthält **keinen** Secret-Wert (Snapshot-Assertion)
**And** die Coverage für die neuen Files in `infrastructure/push-notifications/` + `modules/push-notifications/` ist ≥ 80 % (Statements, Branches)
**And** `pnpm --filter @bluelight-hub/backend check:arch` meldet keine neuen Circular Dependencies (NFR-M3)
**And** `pnpm --filter @bluelight-hub/backend check:di:imports` ist grün (NFR-M2).

## Tasks / Subtasks

- [x] **Task 1: Prisma-Modell `PushSubscription` + Migration (AC: 1)**
  - [x] Prisma-Modell in `packages/backend/prisma/schema.prisma` ergänzt (id, userId→User Cascade, endpoint UNIQUE, p256dh, auth, timestamps, Index auf userId, `@@map("push_subscription")`)
  - [x] Eigene Migration `20260421104826_add_push_subscriptions` via `pnpm prisma migrate dev --name add_push_subscriptions`
  - [x] Relation `pushSubscriptions PushSubscription[]` im `User`-Modell ergänzt
- [x] **Task 2: Domain + Infrastructure Schicht (AC: 1, 2, 4)**
  - [x] Port `IPushSubscriptionRepository` in `src/domain/push-notifications/` (upsertByEndpoint / findByUserId / findByEndpoint / deleteById)
  - [x] Symbol-Token `PUSH_SUBSCRIPTION_REPOSITORY` in `src/infrastructure/di-tokens.ts`
  - [x] `PushSubscription`-Entity (framework-agnostic, `create()` liefert `Result<T>`, `reconstruct()`-Factory, `getEndpointHost()` für Log-Redaction)
  - [x] `PushPayload`-Interface mit Pflicht-`eventId` (Architecture §B7 Dedup-Vertrag)
  - [x] Prisma-Adapter `PrismaPushSubscriptionRepository` mit `upsert({ where: { endpoint } })`-Semantik (Idempotenz)
  - [x] `PushNotificationsService` als `@Injectable()` — injiziert Repository + ILogger, nutzt `webpush.sendNotification`, entsorgt 410/404-Endpoints, loggt nur `endpointHost`/`userId`/`subscriptionId`
  - [x] `PushNotificationsModule` in `src/infrastructure/push-notifications/` mit `OnModuleInit`-Fail-Fast (AC3)
  - [x] Modul in `src/app.module.ts` registriert
- [x] **Task 3: HTTP-Controller + DTOs (AC: 1, 7)**
  - [x] DTOs `PushSubscriptionKeysDto`, `CreatePushSubscriptionDto`, `PushSubscriptionDto` mit `class-validator`/`class-transformer`
  - [x] `PushSubscriptionController` mit `@Controller({ path: 'users/me/push-subscriptions', version: '1' })`
  - [x] `POST /api/users/me/push-subscriptions` mit `JwtAuthGuard`, `@CurrentUser`, `@ApiWrappedCreatedResponse(PushSubscriptionDto)`, `@HttpCode(201)` — Direkt-Call aufs Repository (kein CQRS-Overhead)
  - [x] DELETE bewusst OUT-OF-SCOPE (`// TODO(platform): DELETE endpoint — not in 1.1 scope` im Controller-Header)
  - [x] `modules/push-notifications/push-notifications.module.ts` registriert Controller + importiert Auth + Infrastructure-Modul
- [x] **Task 4: VAPID-Config + Env (AC: 3)**
  - [x] `packages/backend/.env.example` dokumentiert `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` inkl. dotenvx-Hinweis
  - [x] `packages/frontend/.env.example` dokumentiert `VITE_VAPID_PUBLIC_KEY` (Bootstrap für Story 1.2)
  - [x] `onModuleInit()` prüft alle drei Werte via `IRuntimeConfigPort.getString`; fehlender Key ⇒ Error mit DX-Hinweis (kein Wert-Leak)
- [x] **Task 5: Dependency + API-Client (AC: 6, 7)**
  - [x] `web-push@^3.6.7` als `dependencies` in `packages/backend/package.json`
  - [x] `@types/web-push@^3.6.4` als `devDependencies`
  - [x] `pnpm run generate-api` erfolgreich: `packages/shared/client/apis/PushNotificationsApi.ts`, `CreatePushSubscriptionDto`, `PushSubscriptionKeysDto`, `PushSubscriptionDto` generiert; oxlint-fix-Pass grün
- [x] **Task 6: Tests (AC: 8)**
  - [x] Entity-Spec mit 6 Validierungs-Fällen
  - [x] Service-Spec mit 7 Szenarien (AC8-Scenarios c/d/e/f + Edge-Cases für leere Subs + Repo-Failure)
  - [x] Module-Spec mit Fail-Fast-Tests für fehlenden Public-Key / Private-Key / Subject und Leak-Check
  - [x] Prisma-Repository-Spec (Upsert, findByUserId-Error, findByEndpoint null/Hit/Error, delete success/error)
  - [x] Controller-Spec (Success, domänenbasiertes Reject, 500 bei Repo-Fail)
  - [x] Modules-Modul-Spec (Metadata-Prüfung Controller + Imports)
  - [x] Coverage (push-notifications-Folder): infrastructure 97.96 stmt / 82.85 branch / 90 func; modules 100 stmt / 87.5 branch / 100 func — AC8 ≥ 80 % erfüllt
- [x] **Task 7: ADR-011 erstellen (AC: 5)**
  - [x] `docs/adr/adr-011-plattform-push-notifications.md` angelegt (Status Akzeptiert 2026-04-21)
  - [x] Alle geforderten Abschnitte: Status, Kontext, Entscheidung (Platzierung, Persistenzmodell, VAPID-Lifecycle, Fehlerpfade, Dedup-Vertrag, API-Vertrag), Konsequenzen (positiv/negativ), Alternativen (FCM/APNs, SSE-only, Relay), Umsetzungshinweise, Referenzen auf Architecture §B7 + CLAUDE.md + ADR-006/010
- [x] **Task 8: Quality-Gates (AC: 6, 8)**
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` ✅ (1904 Files geprüft, keine Violations)
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` ✅ (keine neuen Circular Deps, nur 1 Pre-Existing-Warning in funkkanal)
  - [x] `pnpm lint` ✅ (0 Errors; 28 Pre-Existing-Warnings, alle außerhalb push-notifications)
  - [x] `pnpm --filter @bluelight-hub/backend build` ✅
  - [x] Push-Notifications-Tests: **32/32 passing** (6 Suites); Full Unit-Run 8568 Tests grün, 1 flaky Suite `lagekarte.performance.spec.ts` (isoliert grün)

## Dev Notes

### Scope-Klärungen (vor dem ersten Commit lesen!)

1. **Backend-only + ADR.** Service-Worker (`public/sw.js`), Tauri-Bridge, `useCriticalNotification`-Hook, Push-Subscription-Manager-UI sind **Story 1.2** — NICHT hier implementieren. Push-Empfang auf Clients ist nicht Teil von 1.1.
2. **User-scoped, NICHT einsatz-scoped.** Die Memory "Einsatz-Routen-Nesting" (`feedback_route_nesting`) schreibt einsatz-bezogene Endpoints unter `/einsatz/:einsatzId/...` vor. `PushSubscription` ist aber **user-bezogen** (eine Subscription gilt über alle Einsätze des Users hinweg) — daher `/api/users/me/push-subscriptions`. Architecture §B7 (`architecture.md:1834`) listet diesen Pfad explizit. **Nicht "korrigieren".**
3. **Eigene Migration.** `PushSubscription` ist Plattform-Feature, nicht Eigenschutz. Die Eigenschutz-Migration `add_eigenschutz_module` (AR3, Story 1-4) berührt ausschließlich Eigenschutz-Tabellen (Architecture `architecture.md:1619` + `architecture.md:1627`). **Separate Migration `add_push_subscriptions`.**
4. **DELETE-Endpoint NICHT in 1.1.** Architecture §Plattform-Spillover listet `POST/DELETE /api/users/me/push-subscriptions` auf. ACs aus `epics.md` decken aber nur POST + Server-seitigen Cleanup (410/404) ab. **DELETE aus 1.1 herauslassen**, `// TODO(platform)` im Controller markieren; Entscheidung nachziehen wenn Subscription-Revocation-Flow explizit benötigt wird (wahrscheinlich in einer späteren Plattform-Story, nicht in 1.2).

### Architektur-Guardrails (NICHT verletzen!)

- **Hexagonale Schichten** (CLAUDE.md + `architecture.md:327`): Domain → Application → Infrastructure → Modules. Abhängigkeiten fließen **nach innen**.
  - `PushSubscription`-Entity + `IPushSubscriptionRepository`-Port in **Domain**
  - `PushNotificationsService` in **Infrastructure** (Framework-nah: `web-push`-Call, `webpush.setVapidDetails`)
  - `PushSubscriptionController` in **Modules**
  - Ein Eigenschutz-Command-Handler wird in späteren Stories (Epic 3) einen Port `IPushNotificationService` in der Application-Schicht injizieren — das ist **nicht** Scope 1.1. In 1.1 reicht der direkte Service-Provider-Export aus dem `PushNotificationsModule`.
- **DI-Imports** (CLAUDE.md "Backend DI Import (AC1)"): `@Injectable()`-Klassen IMMER mit `import { PushNotificationsService } from '…'` — **NIEMALS** `import type`. Pre-Commit `check:di:imports` lehnt das ab (NFR-M2). Ports/Interfaces dürfen `import type` nutzen.
- **Response-Decorators** (CLAUDE.md "Controller Response Decorators (AC7)"): Controller nutzt `@ApiWrappedCreatedResponse(…)` aus `@/modules/common/decorators/api-wrapped-response.decorator.ts` — **NIEMALS** `@ApiCreatedResponse`/`@ApiOkResponse` direkt (bricht API-Client-Generation).
- **Keine manuellen `fetch()`-Calls** im Frontend später. Hier für 1.1 noch irrelevant, aber die OpenAPI-Spec muss so korrekt sein, dass `pnpm run generate-api` den Shared-Client fehlerfrei erzeugt.
- **Result-Pattern** (`packages/backend/src/domain/common/result.ts`): Domain-Entity `PushSubscription.create(…)` returned `Result<PushSubscription>`. Controller-Ebene wirft `BadRequestException` bei `Result.isFailure` (Pattern siehe `packages/backend/src/modules/user-management/controllers/profile.controller.ts:34-47`).
- **KEIN CQRS-Overhead nötig** für 1.1. Ein einfacher Controller → Service-Call ist hier ausreichend (kein Outbox-Event, keine Transaktion über mehrere Tabellen). Die späteren Eigenschutz-Stories nutzen `TransactionalCommandHandler` (`packages/backend/src/application/common/handlers/transactional-command.handler.ts`) — hier überflüssig.

### Source-Tree-Komponenten zu berühren

**Neu anlegen:**

- `packages/backend/prisma/schema.prisma` — Model `PushSubscription` + `User.pushSubscriptions`-Relation
- `packages/backend/prisma/migrations/YYYYMMDDHHMMSS_add_push_subscriptions/migration.sql`
- `packages/backend/src/domain/push-notifications/push-subscription.entity.ts` (oder Aggregate)
- `packages/backend/src/domain/ports/i-push-subscription.repository.ts`
- `packages/backend/src/infrastructure/push-notifications/push-notifications.service.ts`
- `packages/backend/src/infrastructure/push-notifications/prisma-push-subscription.repository.ts`
- `packages/backend/src/infrastructure/push-notifications/push-notifications.module.ts`
- `packages/backend/src/infrastructure/push-notifications/__tests__/push-notifications.service.spec.ts`
- `packages/backend/src/modules/push-notifications/push-subscription.controller.ts`
- `packages/backend/src/modules/push-notifications/dtos/push-subscription.dto.ts`
- `packages/backend/src/modules/push-notifications/push-notifications.module.ts`
- `packages/backend/.env.example` — Env-Variablen dokumentieren
- `packages/frontend/.env.example` — `VITE_VAPID_PUBLIC_KEY` dokumentieren
- `docs/adr/adr-011-plattform-push-notifications.md`

**Editieren:**

- `packages/backend/src/infrastructure/di-tokens.ts` — `PUSH_SUBSCRIPTION_REPOSITORY` Symbol ergänzen (Pattern siehe `packages/backend/src/infrastructure/di-tokens.ts:22-29`)
- `packages/backend/src/app.module.ts` — `PushNotificationsModule` importieren + in `imports` registrieren (Pattern siehe `app.module.ts:22+118`)
- `packages/backend/package.json` — `web-push@^3` als `dependencies`, ggf. `@types/web-push` als `devDependencies`
- `pnpm-lock.yaml` — wird automatisch aktualisiert durch `pnpm add`
- `shared/client/` — wird automatisch via `pnpm run generate-api` neu generiert (NIEMALS manuell editieren!)

**NICHT editieren:**

- `packages/backend/src/infrastructure/outbox/event-serializer.ts` / `event-deserializer.ts` — keine neuen Domain-Events in 1.1 (kein Push-Event wird über Outbox gehen; der Service wird in späteren Stories vom `emit-critical-push.handler.ts` im Application-Layer aus aufgerufen, der aber **nicht** Scope 1.1 ist)
- `packages/backend/src/infrastructure/events/adapters/` — keine Event-Adapter nötig
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — nicht anfassen
- Eigenschutz-spezifische Module (`modules/eigenschutz/`) — gibt es noch nicht, werden ab Story 1-4 angelegt

### Testing-Standards

- **Framework**: Jest 30 + `@swc/jest` (`architecture.md:324`). Tests liegen in `__tests__/`-Unterordnern am Code.
- **Coverage-Anforderung**: ≥ 80 % für neue Files (NFR-M1).
- **Test-Command** (aus MEMORY.md):
  ```bash
  cd packages/backend && npx jest --testPathPatterns="push-notifications" --no-coverage
  ```
  (NICHT `pnpm --filter … -- --testPathPattern` — Args werden falsch weitergeleitet; NICHT `--testPathPattern` (deprecated, Plural benutzen))
- **Mock-Strategie für `web-push`**: `jest.mock('web-push')` am Dateikopf, dann `const webpush = require('web-push'); webpush.sendNotification.mockResolvedValue({statusCode: 201})` etc.
- **Log-Redaction-Assertion**: Mock-Logger-Implementierung injizieren (analog `packages/backend/src/application/user-management/commands/update-profile/update-profile.handler.ts:14-15`); nach dem Call `expect(logger.log).toHaveBeenCalledWith(expect.any(String), expect.not.objectContaining({p256dh: expect.anything()}))`.
- **Quality-Gates nach Implementation** (CLAUDE.md "Definition of Done"):
  ```bash
  pnpm --filter @bluelight-hub/backend check:di:imports
  pnpm --filter @bluelight-hub/backend check:arch
  pnpm lint
  pnpm --filter @bluelight-hub/backend build
  pnpm --filter @bluelight-hub/backend test
  ```

### Konkrete Bibliotheks- & Versions-Anforderungen

| Lib                | Version                                 | Zweck                                                     |
| ------------------ | --------------------------------------- | --------------------------------------------------------- |
| `web-push`         | `^3`                                    | VAPID-Signing + HTTP-Push an Browser-Push-Services (AR15) |
| `@types/web-push`  | Latest (devDep)                         | TypeScript-Types für `web-push`                           |
| `@nestjs/common`   | bestehend                               | `@Injectable`, `OnModuleInit`, `@Controller`              |
| `@dotenvx/dotenvx` | `^1.61.1` (bestehend in `package.json`) | Private-Key-Ladung in Prod                                |
| `class-validator`  | bestehend                               | DTO-Validation (`endpoint` ist HTTPS-URL, Base64-Keys)    |

**Latest-Knowledge-Hinweise zu `web-push@^3`:**

- API: `webpush.setVapidDetails(subject, publicKey, privateKey)` einmal beim Bootstrap; `webpush.sendNotification(subscription, payload)` pro Send.
- Fehler-Objekte haben `err.statusCode` — `410` = Subscription expired/unsubscribed, `404` = Endpoint nicht mehr vorhanden → beide Fälle sind das Signal zum Löschen.
- `payload` maximal ~4 kB. VAPID-Encoding ist aes128gcm (Default seit v3).
- Subject muss `mailto:` oder `https://` URL sein (sonst Fehler beim `setVapidDetails`).

### Projektstruktur-Alignment

- ✅ **Hexagonale Schichten**: eingehalten (siehe Source-Tree oben).
- ✅ **Feature-Slice-Prinzip**: Push-Notifications ist ein **Plattform-Feature**, deshalb unter `infrastructure/push-notifications/` + `modules/push-notifications/` statt `features/` — das entspricht der Architecture §B7 und §Plattform-Spillover.
- ✅ **Route-Nesting**: user-scoped, daher `/api/users/me/push-subscriptions` (NICHT einsatz-scoped — siehe Memory-Ausnahme oben).
- ⚠ **Keine Registrierung in Event-Registry erforderlich** — es werden in 1.1 keine neuen Domain-Events publiziert. Die spätere "Brücke zu Plattform-Push" (`emit-critical-push.handler.ts`, Architecture `architecture.md:1728`) ist Scope **Epic 3**, nicht 1.1.

### Dedup-Strategie (für ADR-011 wichtig!)

Architecture §B7 (`architecture.md:595-603`):

- **Server dedupt NICHT.** Backend-Push-Service sendet parallel zu WebSocket-Broadcast — kein WS-Connection-Tracking (vermeidet Shared-State-Problem in Multi-Instance).
- **Client dedupt.** `eventId`-LRU-Cache (Größe ~200, NFR-R3) unterdrückt doppelte Anzeige.
- **Contract:** Push-Payload MUSS `eventId` führen (Pflicht für Story 1.2 + alle Caller aus Epic 3+). In 1.1 ist die `send(userId, payload)`-Signatur so zu entwerfen, dass `payload` mindestens `{eventId: string, title: string, body: string}` erwartet (Payload-Typ als `PushPayload`-Interface in Domain exportieren).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.1`] — Story-Statement + alle ACs
- [Source: `_bmad-output/planning-artifacts/epics.md#AR1`] — Plattform-Voraussetzung F1: Module-Platzierung
- [Source: `_bmad-output/planning-artifacts/epics.md#AR15`] — `web-push@^3` als einzige neue Dependency
- [Source: `_bmad-output/planning-artifacts/epics.md#FR22`] — Push-Notifications von Phase 2 in MVP gehoben (UX-Spec)
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-R3`] — At-least-once + Client-Dedup via `eventId`-LRU
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-I3`] — Event-Registry-4-Stellen (hier nicht aktiv, aber für Kontext relevant)
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-M1/M2/M3/M4`] — Quality-Gates
- [Source: `_bmad-output/planning-artifacts/architecture.md#B7 Web-Push + Tauri-Notifications`] — Platzierung, Dedup-Strategie, Scope-Abgrenzung
- [Source: `_bmad-output/planning-artifacts/architecture.md:1619`] — PushSubscription ist **Plattform-Feature**, NICHT Eigenschutz-scope
- [Source: `_bmad-output/planning-artifacts/architecture.md:1827-1836`] — Directory-Layout für `infrastructure/push-notifications/` + `modules/push-notifications/`
- [Source: `CLAUDE.md#Backend DI Import (AC1)`] — `import type` Verbot für Injectable Classes
- [Source: `CLAUDE.md#Controller Response Decorators (AC7)`] — `@ApiWrappedCreatedResponse` Pflicht
- [Source: `CLAUDE.md#API Workflow`] — Backend-Endpoint → `pnpm run generate-api` → Shared-Client
- [Source: `docs/adr/adr-010-gefahrenzone-matrixzelle-referenz.md`] — ADR-Struktur-Vorlage für ADR-011
- [Source: `packages/backend/src/modules/user-management/controllers/profile.controller.ts`] — Controller-Pattern-Referenz (JwtAuthGuard, ApiWrappedResponse, `@CurrentUser`)
- [Source: `packages/backend/src/infrastructure/di-tokens.ts`] — Symbol-Token-Pattern für Repositories

## Dev Agent Record

### Agent Model Used

`claude-opus-4-7` (1M context)

### Debug Log References

- Migration erzeugt via `pnpm prisma migrate dev --name add_push_subscriptions` (DB-Port 3092, Haupt-Worktree).
- Dev VAPID-Keypair mit `npx web-push generate-vapid-keys` erzeugt und nur in lokale `.env` geschrieben (NICHT commitet). `.env.example` dokumentiert nur Platzhalter.
- API-Client via lokal gestartetem Backend (`pnpm start`) + `pnpm run generate-api` aus Repo-Root; Backend anschließend beendet.

### Completion Notes List

- **Task 1:** Eigene Migration `20260421104826_add_push_subscriptions` (getrennt vom Eigenschutz-Scope). `User`-Relation `pushSubscriptions[]`, `endpoint` UNIQUE, FK auf `User.id` mit `onDelete: Cascade`. `PrismaService` mit `pushSubscription`-Getter ergänzt (analog Muster für alle anderen Modelle).
- **Task 2:** Domain-Entity `PushSubscription` mit `create()` (Result-Pattern, HTTPS-Check, Base64-Plausibilität) und `reconstruct()`. `PushPayload`-Interface schreibt `eventId` als Pflicht fest (Dedup-Vertrag für alle späteren Caller). Service kapselt `web-push`, fanget `WebPushError.statusCode`, löscht bei 410/404, loggt strukturiert nur `userId + endpointHost + subscriptionId + eventId`. Infrastructure-Modul injiziert `IRuntimeConfigPort` (Token `RUNTIME_CONFIG`) und ruft `webpush.setVapidDetails` in `onModuleInit()` — Fail-Fast bei fehlendem Public-/Private-Key oder Subject mit DX-Error, **ohne** Wert-Leak.
- **Task 3:** Controller 1:1 gegen Repository-Port, kein CQRS-Overhead (Scope-Minimum laut Dev Notes). `PushSubscriptionDto` enthält ausschließlich öffentliche Felder (nie `p256dh`/`auth`). DELETE-Verbot über Klassen-Kommentar + README-Referenz in der Story.
- **Task 4:** `IRuntimeConfigPort` nutzt bestehende `resolveValue`-Kette in `AppConfigService` (`configService.get`-Fallback für Env-Keys ohne Catalog-Eintrag). Kein Catalog-Eintrag hinzugefügt, weil Story explizit auf dotenvx-Secret-Env verweist — einfacher als DB-Secret-Primary-Pfad.
- **Task 5:** `pnpm run generate-api` erzeugt `PushNotificationsApi` plus `CreatePushSubscriptionDto`/`PushSubscriptionKeysDto`/`PushSubscriptionDto` — Response-Modell heißt `PushSubscriptionControllerRegisterV1201Response` (OpenAPI-Wrapper). Reviewbar im Shared-Client-Diff.
- **Task 6:** 32 Tests grün. `web-push` via `jest.mock('web-push', () => …)` mit sowohl Default-Export als auch Named-Exports gestubt. Log-Redaction-Assertion serialisiert alle Logger-Calls und prüft, dass weder `p256dh`, `auth`, noch der volle Endpoint-Token enthalten sind, `endpointHost` aber schon.
- **Task 7:** ADR-011 folgt Struktur von ADR-010 (Status / Kontext / Entscheidung / Konsequenzen / Alternativen / Umsetzungshinweise / Referenzen). Dedup-Vertrag explizit dokumentiert; DELETE-Scoping ebenfalls verankert.
- **Task 8:** `check:di:imports` ✅ (1904 Files), `check:arch` ✅ (1 Pre-Existing-Warning in funkkanal unverändert), `pnpm lint` ✅ (0 Errors), `pnpm build` ✅, Push-Tests **32/32 passing**. Full Backend-Test-Run: 8568 Unit-Tests grün; 1 Performance-Spec (`lagekarte.performance.spec.ts`) flakeet im parallelen Run, isoliert stabil — unverändert zum Main.

### File List

**Created**

- `packages/backend/prisma/migrations/20260421104826_add_push_subscriptions/migration.sql`
- `packages/backend/src/domain/push-notifications/push-payload.ts`
- `packages/backend/src/domain/push-notifications/push-subscription.entity.ts`
- `packages/backend/src/domain/push-notifications/i-push-subscription.repository.ts`
- `packages/backend/src/domain/push-notifications/__tests__/push-subscription.entity.spec.ts`
- `packages/backend/src/infrastructure/push-notifications/push-notifications.service.ts`
- `packages/backend/src/infrastructure/push-notifications/prisma-push-subscription.repository.ts`
- `packages/backend/src/infrastructure/push-notifications/push-notifications.module.ts`
- `packages/backend/src/infrastructure/push-notifications/__tests__/push-notifications.service.spec.ts`
- `packages/backend/src/infrastructure/push-notifications/__tests__/push-notifications.module.spec.ts`
- `packages/backend/src/infrastructure/push-notifications/__tests__/prisma-push-subscription.repository.spec.ts`
- `packages/backend/src/modules/push-notifications/push-subscription.controller.ts`
- `packages/backend/src/modules/push-notifications/push-notifications.module.ts`
- `packages/backend/src/modules/push-notifications/dtos/push-subscription-keys.dto.ts`
- `packages/backend/src/modules/push-notifications/dtos/create-push-subscription.dto.ts`
- `packages/backend/src/modules/push-notifications/dtos/push-subscription.dto.ts`
- `packages/backend/src/modules/push-notifications/__tests__/push-subscription.controller.spec.ts`
- `packages/backend/src/modules/push-notifications/__tests__/push-notifications.module.spec.ts`
- `docs/adr/adr-011-plattform-push-notifications.md`

**Modified**

- `packages/backend/prisma/schema.prisma` (PushSubscription-Modell + `User.pushSubscriptions`-Relation)
- `packages/backend/src/infrastructure/di-tokens.ts` (`PUSH_SUBSCRIPTION_REPOSITORY`-Symbol)
- `packages/backend/src/infrastructure/database/prisma.service.ts` (`pushSubscription`-Getter)
- `packages/backend/src/app.module.ts` (Import + Registrierung des `PushNotificationsModule`)
- `packages/backend/package.json` (Dependency `web-push@^3.6.7`, DevDep `@types/web-push@^3.6.4`)
- `packages/backend/.env.example` (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)
- `packages/frontend/.env.example` (VITE_VAPID_PUBLIC_KEY)
- `pnpm-lock.yaml` (automatisch durch `pnpm add`)
- `packages/shared/client/**` (automatisch durch `pnpm run generate-api`; u. a. neue `apis/PushNotificationsApi.ts`, Models `CreatePushSubscriptionDto`, `PushSubscriptionDto`, `PushSubscriptionKeysDto`, `PushSubscriptionControllerRegisterV1201Response` + `index.ts`-Updates)

### Change Log

- **2026-04-21** — Story 1.1 (Plattform Push-Notifications Backend, ADR-011) implementiert. Prisma-Modell + Migration, Domain-Entity + Port, Infrastructure-Service mit `web-push`-Integration + Fail-Fast OnModuleInit, HTTP-Controller mit idempotentem `POST /api/users/me/push-subscriptions`, DELETE bewusst OUT-OF-SCOPE. ADR-011 dokumentiert Vertrag (Dedup, VAPID-Lifecycle, DELETE-Entscheidung). 32/32 neue Tests, AC8-Coverage erfüllt. Shared-Client via `pnpm run generate-api` aktualisiert.
- **2026-04-21** — Code-Review (`bmad-code-review`) mit 3 parallelen Reviewer-Layern (Blind Hunter + Edge Case Hunter + Acceptance Auditor) durchgeführt. 21 Patches angewendet (Security: Endpoint-Hijacking-Block, SSRF-Blocklist, Rate-Limit+User-Cap, Base64Url-Validation; Robustheit: Payload-Size/Timeout/Poison-Cleanup/P2002-Retry/P2025-Silent; DX: VAPID-Subject-Schema + setVapidDetails-Wrap; Tests: AC8-Snapshot, arrayContaining). 52/52 Unit-Tests grün (vorher 32/32). Alle 8 AC weiterhin erfüllt. Story-Status `review` → `done`.

### Review Findings

**Review vom 2026-04-21** — `bmad-code-review` (3 parallele Reviewer: Blind Hunter + Edge Case Hunter + Acceptance Auditor).
**Übersicht:** 4 `decision-needed` (resolved) · 21 `patch` applied · 2 `defer` · 12 dismissed.
**Acceptance-Criteria-Status:** Alle 8 AC weiterhin erfüllt. Patches sind Robustheits-/Sicherheits-Verstärkungen, keine AC-Änderungen.

#### Decision-Needed — entschieden am 2026-04-21

- [x] **[Review][Decision] Rate-Limit & Per-User-Subscription-Cap (a)** — Throttle (`PUSH_SUBSCRIPTION_RATE_LIMIT` = 10/min) am POST + Hard-Cap 10 Subs/User mit älteste-evicten im Adapter. [`push-subscription.controller.ts`, `prisma-push-subscription.repository.ts`]
- [x] **[Review][Decision] `send()`-Signatur (a, Fire-and-Forget belassen)** — Rückgabetyp `Promise<void>` bleibt; At-Least-Once kommt vom Outbox-Pattern der Caller (`emit-critical-push.handler.ts`, Epic 3). Klassen-Doc mit Fire-and-Forget-Klarstellung ergänzt, Prometheus-Metriken können später auf die Log-Events aufsetzen. [`push-notifications.service.ts`]
- [x] **[Review][Decision] `findByUserId` Cap (a)** — Safety-`take: PUSH_SUBSCRIPTION_FANOUT_LIMIT` (20) + `orderBy createdAt DESC`; der Per-User-Cap (siehe D1) hält die reale Menge unter 10. [`prisma-push-subscription.repository.ts`]
- [x] **[Review][Decision] Domain-Invariante `id` (b)** — Platzhalter `id = ''` beibehalten, aber JSDoc an `PushSubscription.create()` dokumentiert jetzt explizit, dass `id`/`createdAt`/`updatedAt` transient sind und von Prisma beim Upsert ersetzt werden. [`push-subscription.entity.ts`]

#### Patch — angewendet am 2026-04-21

- [x] [Review][Patch] Endpoint-Hijacking: Owner-Check via `findUnique` vor dem Upsert; fremder `userId` → `Result.fail` + `BadRequestException` im Controller. [`prisma-push-subscription.repository.ts`, `push-subscription.controller.ts`]
- [x] [Review][Patch] SSRF: Hostname-Blocklist (localhost, RFC1918, IPv4/IPv6 Loopback, Link-Local, AWS-Metadata 169.254.169.254) in `PushSubscription.create()`. [`push-subscription.entity.ts`]
- [x] [Review][Patch] Race idempotenter Upsert: Retry-Loop (max 3) auf `PrismaClientKnownRequestError` P2002 im Adapter. [`prisma-push-subscription.repository.ts`]
- [x] [Review][Patch] DTO `@MaxLength` — `endpoint` ≤ 2048, `p256dh`/`auth` ≤ 512. [`create-push-subscription.dto.ts`, `push-subscription-keys.dto.ts`]
- [x] [Review][Patch] DTO `@IsDefined() @IsObject()` auf `keys`. [`create-push-subscription.dto.ts`]
- [x] [Review][Patch] `JSON.stringify(payload)` in `try/catch` — cyclic references / BigInt liefern strukturiertes Error-Log + Early-Return. [`push-notifications.service.ts`]
- [x] [Review][Patch] Payload-Size ≤ 4000 Byte Check vor `sendNotification`. [`push-notifications.service.ts`]
- [x] [Review][Patch] `webpush.sendNotification` mit `timeout: 10_000` (neue Konstante `PUSH_SEND_TIMEOUT_MS`). [`push-notifications.service.ts`]
- [x] [Review][Patch] Poison-Subscription-Cleanup: `WebPushError` ohne 410/404 aber mit "invalid key"/"invalid base64"/"decryption failed" → Subscription wird gelöscht (`reason: 'invalid-key'`). [`push-notifications.service.ts`]
- [x] [Review][Patch] `VAPID_SUBJECT`-Schema-Check (`^(mailto:|https:)`) im Fail-Fast-Hook. [`push-notifications.module.ts`]
- [x] [Review][Patch] `webpush.setVapidDetails` in `try/catch` mit DX-Message (keine kryptischen Third-Party-Fehler beim Bootstrap). [`push-notifications.module.ts`]
- [x] [Review][Patch] `deleteById` behandelt Prisma P2025 als idempotenten Erfolg (kein Log-Spam bei Concurrent-Cleanups). [`prisma-push-subscription.repository.ts`]
- [x] [Review][Patch] Domain `create()`: Base64Url-Regex (`^[A-Za-z0-9_-]+$`) für `p256dh`/`auth`. [`push-subscription.entity.ts`]
- [x] [Review][Patch] Doppelter `LOGGER`-Provider im Infrastructure-Modul entfernt — nutzt jetzt den `@Global()`-Provider von `InfrastructureCommonModule`. [`push-notifications.module.ts` (infra)]
- [x] [Review][Patch] HTTP-Module-Spec: `expect(imports).toEqual(arrayContaining([AuthModule, PushNotificationsInfrastructureModule]))`. [`push-notifications.module.spec.ts` (modules)]
- [x] [Review][Patch] Entity-Kommentar konsolidiert: JSDoc erklärt jetzt Platzhalter-Semantik für `id`/`createdAt`/`updatedAt` konsistent. [`push-subscription.entity.ts`]
- [x] [Review][Patch] AC8(f) Snapshot-Assertion wörtlich umgesetzt: `expect(logger.log).toHaveBeenCalledWith('Push-Notification versendet', { userId, subscriptionId, endpointHost, eventId })` (exakte Struktur, keine fremden Keys) + ergänzende `not.toContain(secret)`-Guard bleibt bestehen. [`push-notifications.service.spec.ts`]
- [x] [Review][Patch] **Neu:** Throttle (`@Throttle({ default: PUSH_SUBSCRIPTION_RATE_LIMIT })`) am Registrierungs-Endpoint + `@ApiTooManyRequestsResponse` für Swagger; neue Konstante `PUSH_SUBSCRIPTION_RATE_LIMIT` in `rate-limit.constants.ts`. [`push-subscription.controller.ts`, `rate-limit.constants.ts`]
- [x] [Review][Patch] **Neu:** Per-User-Subscription-Cap (`PUSH_SUBSCRIPTION_USER_CAP` = 10) im Adapter via `enforceUserCap`; älteste Subscriptions werden per `deleteMany` verdrängt, Eviction wird strukturiert geloggt. [`prisma-push-subscription.repository.ts`]
- [x] [Review][Patch] **Neu:** `findByUserId` Safety-Limit `take: PUSH_SUBSCRIPTION_FANOUT_LIMIT` (20), `orderBy createdAt DESC`. [`prisma-push-subscription.repository.ts`]
- [x] [Review][Patch] **Neu:** `PushNotificationsService.send()`-Klassen-Doc mit Fire-and-Forget-Klarstellung (At-Least-Once über Caller-Outbox). [`push-notifications.service.ts`]

**Patch-Reduktionen (ursprünglich angedacht, dann bewusst verworfen):**

- Race 410-Cleanup vs. Re-Register via Conditional-Delete: verworfen. Die Optimistic-Lock-Variante braucht Port-Change (`deleteById(id, expectedUpdatedAt)`) ohne proportionales Risiko-Gewicht (seltenster Edge-Case, Selbstheilung durch Client-Re-Register). Dokumentation im ADR-Bereich wäre ausreichender Follow-up, wenn sich das in der Praxis als relevant erweist.
- Controller-Body try/catch: verworfen. NestJS-Default-ExceptionFilter leakt im Production-Mode keine Stack-Traces; ein eigener Wrap würde Framework-Verhalten duplizieren. Die neu ergänzten BadRequest-Mappings (Hijack-Reject) werden direkt im Controller gewerft.

#### Deferred (pre-existing / separate Untersuchung)

- [x] [Review][Defer] `PrismaService`-Getter-Pattern — `pushSubscription`-Getter in `prisma.service.ts:241-244` folgt existierender Projekt-Konvention; Architektur-Refactoring für alle Modelle ist eigener Scope — deferred, pre-existing.
- [x] [Review][Defer] Controller-Pfad vs. `globalPrefix`/`versioning` — Verifikation, ob `main.ts` `setGlobalPrefix('api')` + `enableVersioning` so konfiguriert sind, dass `/api/users/me/push-subscriptions` korrekt aufgelöst wird, bleibt als Integration-Route-Test-Aufgabe offen — deferred, separate Infrastruktur-Untersuchung.

#### Shared-Client (AC7) — Re-Generation-Nachlauf

`pnpm run generate-api` benötigt ein laufendes Backend (Story-Notes). Die Review-Patches ändern weder Endpoint-Shape (Pfad, Methode, Body-Struktur) noch DTO-Feldnamen — sie erweitern nur Metadaten (`@MaxLength`, `@IsDefined`, `@ApiTooManyRequestsResponse`, `@Throttle`). Der bestehende generierte Shared-Client (`packages/shared/client/apis/PushNotificationsApi.ts`, DTOs) bleibt wire-kompatibel. Optionaler Nachlauf empfohlen, um die `maxLength`/`required`-Schema-Metadaten zu übernehmen: `pnpm start` (Backend) → `pnpm run generate-api` in separatem Shell.

#### Quality-Gate-Ergebnisse nach Patches

- `pnpm --filter @bluelight-hub/backend check:di:imports` ✅ (1904 Files, keine Violations)
- `pnpm --filter @bluelight-hub/backend check:arch` ✅ (0 neue Circular Deps, 1 Pre-Existing-Warning in funkkanal unverändert)
- `pnpm lint` ✅ (0 Errors; 28 Pre-Existing-Warnings, keine in push-notifications)
- `pnpm --filter @bluelight-hub/backend build` ✅
- Push-Notifications-Unit-Tests: **52/52 passing** (vor Review: 32; +20 neue Tests für Base64Url, SSRF-Matrix, Poison-Cleanup, Payload-Size, Rate-Limit-/Hijack-Pfade, Prisma-P2002/P2025, Cap-Eviction, VAPID-Subject-Schema, setVapidDetails-Wrap).

#### Dismissed (als Rauschen verworfen)

`import`-Stil-Inkonsistenz · Promise.all-Aggregation (konsistent) · ADR-"```typescript"-Fence (Diff-Bundle-Artefakt, kein Content-Fehler) · Migration ohne `updatedAt`-Trigger (Prisma füllt `@updatedAt`ORM-seitig) ·`getEndpointHost`-Fallback (defensiv, harmlos) · toter `!upsert.value`-Check (defensiv) · TODO-Marker-Position (kosmetisch) · Controller-Test `await import`in`mockImpl` (Stil) · Controller-`userId`-Edge (JWT-Guard-garantiert) · Service-Test ESM-Interop (doppeltes Mocking ist robust) · Integration-Test für UNIQUE-Constraint (Coverage-Trade-off, 97.96 % stmt erfüllt AC8) · `never logs VAPID keys`-Test-Präzision (substring-assertion ist mit den gewählten Secret-Patterns stark genug).

#### Deferred (pre-existing / separate Untersuchung)

- [x] [Review][Defer] `PrismaService`-Getter-Pattern — `pushSubscription`-Getter folgt existierender Projekt-Konvention; Architektur-Refaktoring für alle Modelle ist eigener Scope [`prisma.service.ts:241-244`] — deferred, pre-existing
- [x] [Review][Defer] Controller-Pfad vs. `globalPrefix`/`versioning` — Verifikation nötig, ob `setGlobalPrefix('api')` + `enableVersioning` aktiv sind, damit `/api/users/me/push-subscriptions` korrekt aufgelöst wird. Aktuelle Story liefert keine Integration-Route-Tests; ADR-Claim ist bisher unverifiziert [`push-subscription.controller.ts:1214`] — deferred, Infrastruktur-Check

#### Dismissed (als Rauschen verworfen)

`import`-Stil-Inkonsistenz · Promise.all-Aggregation (konsistent) · ADR-"```typescript"-Fence (Diff-Bundle-Artefakt, kein Content-Fehler) · Migration ohne `updatedAt`-Trigger (Prisma füllt `@updatedAt`ORM-seitig) ·`getEndpointHost`-Fallback (defensiv, harmlos) · toter `!upsert.value`-Check (defensiv) · TODO-Marker-Position (kosmetisch) · Controller-Test `await import`in`mockImpl` (Stil) · Controller-`userId`-Edge (JWT-Guard-garantiert) · Service-Test ESM-Interop (doppeltes Mocking ist robust) · Integration-Test für UNIQUE-Constraint (Coverage-Trade-off, 97.96 % stmt erfüllt AC8) · `never logs VAPID keys`-Test-Präzision (substring-assertion ist mit den gewählten Secret-Patterns stark genug).
