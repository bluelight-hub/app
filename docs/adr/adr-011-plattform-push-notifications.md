# ADR-011: Plattform-Push-Notifications via VAPID + web-push

## Status

Akzeptiert (2026-04-21)

## Kontext

Das Eigenschutz-PRD hat in FR22 die Push-Notifications aus Phase 2 in den MVP-Scope gehoben: Kritische Ereignisse (insbesondere die CBRN-Signatur-Interaktion aus Epic 3 und Sicherheits-Bekanntgaben) müssen auch dann zugestellt werden, wenn die Web- oder Tauri-Anwendung nicht im Vordergrund läuft. Die Zielgruppe sind Eigenschutz-Kräfte und Sicherheitsbeauftragte auf Einsatz-Tablets und -Laptops, typischerweise mit längerem Idle-Zeitfenster.

Architektur-Kontext (Architecture §B7, `architecture.md:565`):

- Das Produkt läuft als Web-App im Browser **und** als Tauri-Desktop-App. Die Tauri-Schale liefert ein natives Plugin für System-Notifications; der Browser nutzt die Web-Push-API mit Service-Worker.
- Ein einziger Backend-Push-Port soll beide Pfade bedienen: Der Server weiß nicht, ob sein Subscriber ein Browser oder die Tauri-Shell ist — beide registrieren sich identisch über das Web-Push-Protokoll.
- Der Server **dedupt nicht**. Dieselbe Notification kann parallel zum WebSocket-Broadcast ausgeliefert werden, weil Single-Broadcast-Tracking in einer Multi-Instance-Topologie einen Shared-State-Punkt erzwingen würde, den wir sonst nirgends haben (Architecture §B7, `architecture.md:595-603`).

Drei kandidierende Integrationen für den Server-seitigen Push-Kanal:

1. **VAPID + `web-push@^3` (Web-Push-Protokoll)** — Standardisiert (RFC 8030 / 8291 / 8292). Browser und Tauri sprechen dasselbe Protokoll über einen Push-Service des Betriebssystems / Browsers (FCM, Mozilla autopush, Edge Push). Kein direkter Vendor-Lock im Backend; Vertragliche Last liegt beim Browser/OS-Anbieter.
2. **FCM/APNs direkt** — native APIs der App-Stores. Höchste Zustellrate, aber jede Plattform (Android-Fallback, iOS für eine potenziell zukünftige Tauri-Mobile-Variante, Web) braucht ihren eigenen Kanal; Server-Code verdoppelt sich, wir koppeln uns an Firebase/Apple-Zertifikate und -Konsolen.
3. **Server-Sent Events / WebSocket-only** — kein zusätzlicher Dienst, aber kein Pushing wenn die App geschlossen ist. Das ist genau der Ausfall, den FR22 vermeiden soll.

## Entscheidung

Wir wählen **Option 1**: Plattform-Push-Notifications werden über das VAPID-signierte Web-Push-Protokoll per `web-push@^3` aus dem Backend zugestellt.

### Architektur-Platzierung

Hexagonale Layer analog zu allen anderen Services (CLAUDE.md, `architecture.md:327`):

- **Domain** (`packages/backend/src/domain/push-notifications/`) — `PushSubscription`-Entity, `PushPayload`-Interface, `IPushSubscriptionRepository`-Port. Framework-agnostisch, `Result<T>`-Pattern.
- **Infrastructure** (`packages/backend/src/infrastructure/push-notifications/`) — `PrismaPushSubscriptionRepository`, `PushNotificationsService` (kapselt `webpush.sendNotification`), `PushNotificationsModule` mit `OnModuleInit`-Hook für VAPID-Setup und Fail-Fast bei fehlendem Keypair.
- **Modules** (`packages/backend/src/modules/push-notifications/`) — `PushSubscriptionController` mit `POST /api/users/me/push-subscriptions`, DTOs mit `class-validator`, `@ApiWrappedCreatedResponse`-Decorator (CLAUDE.md AC7).

Das Layering-Spillover ist in Architecture `architecture.md:1827-1836` explizit vorgesehen.

### Persistenzmodell

Eigene Prisma-Migration `add_push_subscriptions` mit Modell `PushSubscription`:

- Felder: `id` (cuid), `userId` (FK → `User`, `onDelete: Cascade`), `endpoint` (Text, UNIQUE), `p256dh`, `auth`, `createdAt`, `updatedAt`.
- Relation in `User`: `pushSubscriptions PushSubscription[]`.
- Kein Mischen mit der Eigenschutz-Migration (`add_eigenschutz_module`, Story 1-4) — Push-Notifications sind Plattform-Feature, nicht Eigenschutz (`architecture.md:1619`).

### VAPID-Lifecycle

- Keypair wird mit `npx web-push generate-vapid-keys` erzeugt.
- **Public-Key** ist nicht geheim. Er wird im Backend über `VAPID_PUBLIC_KEY` dokumentiert und zusätzlich als `VITE_VAPID_PUBLIC_KEY` im Frontend bekannt gemacht. Story 1.2 verwendet den Wert im Service-Worker-Bootstrap.
- **Private-Key** wird ausschließlich serverseitig geladen (`VAPID_PRIVATE_KEY`) und in Produktion über `@dotenvx/dotenvx` aus einer verschlüsselten `.env.production` entschlüsselt.
- `VAPID_SUBJECT` ist eine `mailto:`- oder `https:`-URL, die der Push-Service zur Kontaktaufnahme nutzt.
- **Fail-Fast:** `PushNotificationsModule.onModuleInit()` prüft `IRuntimeConfigPort.getString(key)` für alle drei Werte. Fehlt einer, wirft das Modul beim Start mit einem DX-Hinweis auf die zu setzenden Env-Variablen — ohne den tatsächlichen Wert zu loggen.

### Fehlerpfade beim Versand

- HTTP **410 Gone** oder **404 Not Found** vom Push-Service → Subscription ist dauerhaft ungültig und wird automatisch aus der Tabelle entfernt. Das Verhalten entspricht der `web-push`-Empfehlung und verhindert, dass verwaiste Endpoints bei jedem Broadcast neu versucht werden.
- Andere Fehler (Timeout, 5xx, 429) → strukturierter Error-Log mit `userId`, `endpointHost`, `statusCode`; Subscription bleibt erhalten, weil der Fehler transient sein kann.
- Logging (AC4) enthält **niemals** `p256dh`, `auth`, `VAPID_PRIVATE_KEY` oder den vollständigen `endpoint`-Token — ausschließlich `userId`, `endpointHost`, `createdAt`, `subscriptionId`, `eventId` und ggf. `statusCode`. Eine Snapshot-Assertion im Test hält die Redaktion einsehbar.

### Dedup-Strategie (vertraglich!)

Server dedupt NICHT. Client dedupt via `eventId`-LRU-Cache (Größe ~200, NFR-R3). Das Payload-Interface `PushPayload` schreibt `eventId: string` als Pflicht vor. Jeder Caller aus Epic 3+ (z. B. `emit-critical-push.handler.ts`, Scope Epic 3 — nicht 1.1) MUSS einen stabilen `eventId` setzen. Details in Architecture `architecture.md:595-603`.

### API-Vertrag

- **Endpoint:** `POST /api/users/me/push-subscriptions` — user-scoped (gleiche Subscription gilt über alle Einsätze). Die Memory "Einsatz-Routen-Nesting" (`feedback_route_nesting`) greift hier absichtlich nicht, weil die Ressource nicht einsatz-bezogen ist (Architecture `architecture.md:1834`).
- **Semantik:** Idempotent. Wiederholtes Registrieren desselben `endpoint` rotiert `p256dh` + `auth` und liefert wieder HTTP 201 — kein 409.
- **Decorator:** `@ApiWrappedCreatedResponse(PushSubscriptionDto, …)` — Pflicht laut CLAUDE.md AC7, sonst bricht `pnpm run generate-api`.
- **DELETE:** bewusst OUT-OF-SCOPE für Story 1.1 (Comment `// TODO(platform): DELETE endpoint — not in 1.1 scope` im Controller). Ablaufende Subscriptions werden automatisch serverseitig nach 410/404 entsorgt; ein manueller Revocation-Flow folgt in einer späteren Plattform-Story, sobald ein konkreter Bedarf vorliegt.

## Konsequenzen

### Positiv

- **Ein Plattform-Port für Push.** Eigenschutz-Stories (Epic 3) und zukünftige Module rufen `PushNotificationsService.send(userId, payload)` und brauchen sich weder um Web- vs. Tauri-Empfänger noch um VAPID-Details zu kümmern.
- **Kein Vendor-Lock auf Firebase/Apple.** Wir sprechen das offene Web-Push-Protokoll; Wechsel zu einem anderen Browser-Push-Service (oder selbstgehosteten Relay) ist ohne Code-Änderung möglich.
- **Klare Zuständigkeit im Client** (Story 1.2). Der Server hält nur Subscriptions; Dedup, Deep-Links und UX-Entscheidungen bleiben im Client. Das passt zu ADR-006 (einsatz-scoped Event-Bus) und macht die Architektur symmetrisch.
- **Fail-Fast beim Boot** verhindert, dass die Anwendung mit halb konfiguriertem VAPID-Setup in Produktion läuft und Events stillschweigend verliert.
- **Automatisches Cleanup über 410/404** hält die Subscription-Tabelle ohne Cron-Job sauber.

### Negativ

- **VAPID-Key-Ops-Overhead.** Wir müssen das Keypair generieren, den Private-Key verschlüsselt ausrollen (`@dotenvx/dotenvx`), und eine Rotation formalisieren (separates Runbook in Story 1.2 oder später). Das ist mehr Ops-Arbeit als bei HTTP-basierten Systemen, die nur Bearer-Tokens nutzen.
- **Payload-Limit ~4 kB** (VAPID aes128gcm). Größere Nutzdaten müssen auf einen Deep-Link verweisen (`PushPayload.url`) und erst beim Öffnen der App nachgeladen werden.
- **Keine Empfangs-Quittung aus Push-Services.** `web-push.sendNotification` liefert nur den Zustell-Versuch zurück — ob der User die Notification wirklich gesehen hat, erfahren wir erst über das einsatz-scoped WebSocket-Event, wenn der Client die Quittierung zurückmeldet (siehe Epic 3, "Quittungsstand").
- **Server sendet at-least-once.** Der Client-Dedup-Vertrag (`eventId`-LRU) ist nicht optional — ein Caller, der `eventId` nicht setzt, erzeugt garantiert Doppelanzeigen. Linting/Tests müssen das in Epic 3 absichern.

## Alternativen

### 1. FCM/APNs direkt

Abgelehnt: Vendor-Lock auf Google/Apple-Konsolen, duplizierte Backend-Pfade für Web vs. native. Der Nutzen (höhere Zustellrate auf Mobile) materialisiert sich erst, wenn wir eine mobile Variante bauen — kein aktuelles Roadmap-Ziel.

### 2. SSE / WebSocket-only

Abgelehnt: Deckt FR22 nicht ab. Sobald das Tablet in den Standby geht oder der Browser die Tabs pausiert, reißt die Verbindung ab und kritische Events erreichen den User nicht. Genau das ist die Lücke, die Push-Notifications schließen sollen.

### 3. Eigener Relay-Server (self-hosted autopush)

Abgelehnt: unnötige Betriebskomplexität. Der Browser-Push-Service ist durch den jeweiligen Browser-Hersteller bereits gemanaged; ein Relay-Zwischenstück fügt nur mehr bewegliche Teile hinzu, ohne einen Stakeholder-Wunsch zu bedienen.

## Umsetzungshinweise

- **Prisma-Migration:** eigene Migration `add_push_subscriptions`, nicht in `add_eigenschutz_module` einmischen (Architecture `architecture.md:1619` + `architecture.md:1627`; Story 1-4).
- **DI-Imports:** `PushNotificationsService`, `PrismaPushSubscriptionRepository` sind `@Injectable()` und MÜSSEN mit `import { … }` (nicht `import type`) importiert werden (CLAUDE.md "Backend DI Import (AC1)", Pre-Commit `check:di:imports`). Ports und Payload-Interface dürfen `import type` nutzen.
- **Response-Decorator:** `POST /api/users/me/push-subscriptions` nutzt `@ApiWrappedCreatedResponse(PushSubscriptionDto, …)`; keinerlei Standard-Swagger-Response-Decorators (CLAUDE.md "Controller Response Decorators (AC7)").
- **Event-Registry:** Story 1.1 erzeugt keine Domain-Events; keine Einträge in `event-serializer`/`event-deserializer`. Erst die Brücke `emit-critical-push.handler.ts` in Epic 3 (`architecture.md:1728`) wird über den Outbox-Pfad geroutet und dort registriert.
- **Frontend:** API-Client via `pnpm run generate-api`. Manuelles Editieren von `shared/client/` ist verboten (CLAUDE.md "API Workflow").

## Referenzen

- [Architecture §B7 Web-Push + Tauri-Notifications](../../_bmad-output/planning-artifacts/architecture.md)
- [Epics — Story 1.1 Plattform Push-Notifications Backend](../../_bmad-output/planning-artifacts/epics.md)
- [ADR-006: WebSocket Event Bus einsatz-scoped](./adr-006-websocket-event-bus-einsatz-scoped.md)
- [ADR-010: Gefahrenzone referenziert Matrixzelle](./adr-010-gefahrenzone-matrixzelle-referenz.md)
- [RFC 8030 — Generic Event Delivery Using HTTP Push](https://datatracker.ietf.org/doc/html/rfc8030)
- [RFC 8291 — Message Encryption for Web Push](https://datatracker.ietf.org/doc/html/rfc8291)
- [RFC 8292 — Voluntary Application Server Identification (VAPID)](https://datatracker.ietf.org/doc/html/rfc8292)
- [`web-push` npm package](https://www.npmjs.com/package/web-push)
