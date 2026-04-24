# Story 1.2: Plattform Push-Clients (Service-Worker + Tauri-Bridge)

Status: done

**Scope-Grenze (KRITISCH):** Diese Story ist **Frontend-Clients + Plattform-Hook**. Sie baut auf **Story 1.1 Backend** (`POST /api/users/me/push-subscriptions`, `PushPayload`-Interface, VAPID-Keypair) auf. Nicht in dieser Story:

- Eigenschutz-spezifischer `emit-critical-push.handler.ts` (Epic 3, Story 3.8)
- `SeverityBanner`-Komponente (Epic 3, Story 3.3) — Interim-Fallback via Sonner-Toast
- Re-Prompt-Scheduler-Eskalation (Epic 3, Story 3.7)
- DELETE-Endpoint-Call (Server-Cleanup erfolgt via 410/404 aus Story 1.1 AC2)
- Backend-seitige Änderungen am `PushPayload`-Interface (Contract bleibt wie in Story 1.1 festgezurrt)
- Verdrahtung mit Domain-Events (Eigenschutz-Outbox → Push ist Epic 3)

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Einsatzkraft**,
I want **dass kritische Events meiner Plattform auch dann bei mir ankommen, wenn die Anwendung im Hintergrund ist — auf Browser und Tauri-Desktop gleichermaßen**,
so that **ich PSA-Hochstufungen und Vorfall-Meldungen nicht verpasse, ohne dass mir die App mit doppelten Benachrichtigungen oder doppelten Permission-Dialogen auf die Nerven geht**.

## Acceptance Criteria

### AC1 — Service-Worker-Registration + Push-Payload-Rendering (Browser-Runtime)

**Given** ein Browser mit aktivem Service-Worker-Support und erteilter Notification-Permission
**When** die Anwendung startet (nach `QueryProvider`-Mount)
**Then** registriert der Frontend-Bootstrap `public/sw.js` unter `navigator.serviceWorker.register(...)` und wartet auf `ready`
**And** der Service-Worker hört auf `push`-Events, parst `event.data.json()` als `PushPayload` (`{eventId, title, body, url?, data?}`, siehe `packages/backend/src/domain/push-notifications/push-payload.ts`) und ruft `self.registration.showNotification(title, {body, data: {eventId, url, ...}})` auf
**And** bei `notificationclick` wird `event.notification.data.url` (falls gesetzt) via `clients.openWindow(...)` oder `clients.matchAll({type:'window'}).focus()` geöffnet
**And** Service-Worker-Registration passiert **ausschließlich** in Browser-Runtime (nicht in Tauri, siehe AC2).

### AC2 — Tauri-Branch nutzt `plugin-notification` und registriert KEINE Web-Push-Subscription

**Given** ein Tauri-Desktop-Client (Detection via `@tauri-apps/api/core#isTauri`)
**When** die Anwendung startet
**Then** wird `navigator.serviceWorker.register(...)` **NICHT** aufgerufen
**And** `POST /api/users/me/push-subscriptions` wird **NICHT** aufgerufen (Web-Push-Endpoint wäre in Tauri eine Dead-Subscription → Server-seitiger 410-Spam + Verdrängung echter Browser-Subscriptions aus dem User-Cap von 10)
**And** der Hook `useCriticalNotification` dispatcht stattdessen direkt `@tauri-apps/plugin-notification.sendNotification({title, body, extra: {eventId, url}})` (analog `packages/frontend/src/features/reminders/services/notification.service.ts:417-447`)
**And** Tauri empfängt die Nutzlast nicht als Web-Push, sondern über den bestehenden WebSocket-Kanal der Plattform (Call-Site im Application-Layer, Epic 3) — diese Story liefert nur die **Dispatch-Seite** des Hooks.

### AC3 — Permission-verweigert → In-App-Banner-Fallback, kein Re-Prompt

**Given** der Nutzer hat die Notification-Permission verweigert (`Notification.permission === 'denied'` im Browser oder `isPermissionGranted()` → `false` in Tauri ohne Grant)
**When** ein Critical-Event eintrifft (Aufruf von `useCriticalNotification`)
**Then** fällt die Dispatch-Kette auf einen In-App-Banner zurück — **Interim-Implementation via `sonner`-Toast** (`toast.error(title, {description: body, duration: Infinity, action: url ? {label: 'Öffnen', onClick: () => navigate(url)} : undefined})`)
**And** es wird **kein** zweiter `Notification.requestPermission()`-Dialog geöffnet (Single-Source für den ersten Prompt bleibt `initializeNotificationSetup() + requestNotificationPermission()` aus `features/reminders/services`, bereits aktiv in `main.tsx:14-19`)
**And** die verweigerte Permission wird **nicht** im LocalStorage gecached — die nächste Browser-Session darf erneut fragen, sofern der User im Browser-UI das Blocking zurücksetzt
**And** eine spätere Migration des Fallbacks auf `SeverityBanner` (Story 3.3) ist in der Hook-Implementation mit `// TODO(story-3-3): migrate sonner fallback to <SeverityBanner>` zu markieren.

### AC4 — `useCriticalNotification`-Hook-API + Plattform-Dispatch

**Given** beliebige Feature-Komponenten (z. B. später ein Eigenschutz-Event-Handler aus Epic 3)
**When** sie `const dispatch = useCriticalNotification(); dispatch({title, body, eventId, url?, priority?})` aufrufen
**Then** akzeptiert der Hook **exakt** diese Payload-Signatur: `{title: string, body: string, eventId: string, url?: string, priority?: 'critical' | 'warning' | 'info'}`
**And** `priority` ist **client-lokal** (steuert Tone des In-App-Fallbacks und Tauri-Channel-Zuordnung) und wird **NICHT** in die Push-Wire-Payload geschrieben (der Backend-`PushPayload`-Contract aus Story 1.1 kennt kein `priority`-Feld; die Story ändert ihn nicht)
**And** der Hook dispatcht je Runtime: (a) **Tauri** → `plugin-notification.sendNotification(...)`, (b) **Browser mit granted Permission** → `navigator.serviceWorker.ready → registration.showNotification(...)` (gleiche API wie der SW sie nutzt, damit Foreground + Background gleich aussehen), (c) **Browser mit denied Permission** → Sonner-Toast-Fallback (AC3)
**And** **Wiederverwendung (Zero-Duplication):** Der Hook ruft **nicht** eine zweite Tauri/Web-Fork-Logik auf, sondern **komponiert** den bestehenden `notificationService.send()` aus `packages/frontend/src/features/reminders/services/notification.service.ts` — oder extrahiert die Dispatch-Primitive nach `packages/frontend/src/shared/services/notifications/` und konsumiert sie von beiden Stellen (Reminders + Critical). **Kein paralleler dritter Dispatch-Pfad.** Entscheidung siehe Dev Notes → "Reuse-Strategie".

### AC5 — `eventId`-LRU-Cache (~200) dedupt parallelen Push + WebSocket

**Given** ein Critical-Event `X` wird gleichzeitig via Web-Push (Service-Worker) **und** via WebSocket-Event (Application-Layer ruft `useCriticalNotification` direkt) ausgeliefert
**When** beide Pfade denselben `eventId` tragen
**Then** zeigt das **In-App-Banner (WS-Pfad)** die Notification **nur einmal** an — der Hook liest vor Dispatch aus einem `EventIdLruCache` (Page-scoped Singleton, Größe ~200 per `Set<string>`-Eviction-Order, neue Einträge verdrängen älteste via Insertion-Order-Trick bei Überlauf)
**And** der **Service-Worker** selbst dedupt **NICHT** (er hat keinen Zugriff auf den Page-scoped Cache; zudem darf eine Background-Push-Notification **nie** unterdrückt werden, sonst verpasst der User sie, wenn die Page noch nicht geladen ist) — er zeigt `showNotification` **immer**
**And** der SW postet optional via `self.clients.matchAll → client.postMessage({type: 'push-delivered', eventId})` an die Page, damit die Page den LRU-Cache auch mit den SW-zugestellten IDs füllen kann (verhindert Dubletten, wenn WS kurz **nach** Push ankommt)
**And** diese Semantik ist konsistent mit Architecture §B7 (`architecture.md:595-603`) und der Story-1.1-Dedup-Contract-Klarstellung.

### AC6 — Subscription-Registration (nur Browser-Runtime) via generiertem Shared-Client

**Given** ein Browser mit erteilter Notification-Permission
**When** die Komponente `<PushSubscriptionManager />` nach Login + Permission-Grant mounted
**Then** ruft sie (a) `navigator.serviceWorker.ready` ab, (b) `registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)})` mit Base64url-Dekodierung (VAPID-Public-Key ist in `packages/frontend/.env.example:VITE_VAPID_PUBLIC_KEY` bereits dokumentiert, Story 1.1 AC3), (c) `subscription.toJSON()` → `{endpoint, keys:{p256dh, auth}}`
**And** sendet die Payload über den **generierten** `PushNotificationsApi` (via `@bluelight-hub/shared/client`, analog `packages/frontend/src/shared/api/api.ts`) — **NIEMALS** manueller `fetch()`-Call (CLAUDE.md "API Workflow")
**And** der Aufruf respektiert Rate-Limit (Backend: 10/min) + User-Cap (10 Subs/User, Story 1.1 Review-Patches); HTTP 429 / 400 erzeugt **keinen** Toast-Fehler (Zero-Toast-Policy, UX-DR21), sondern einen strukturierten `logger.warn`-Eintrag
**And** die Registration ist **idempotent** (Story 1.1 AC1): wiederholte Mounts (z. B. nach Remount durch StrictMode im Dev) erzeugen **keine** neuen Subscriptions — der Hook merkt sich pro Page-Session, dass bereits subscribed wurde, oder verlässt sich auf Backend-Upsert-Semantik
**And** im **Tauri-Runtime** wird `<PushSubscriptionManager />` **nicht** gemounted (Component-Body liefert `null`, gated via `useIsTauri()` aus `packages/frontend/src/shared/hooks/useIsTauri.ts`).

### AC7 — Zero-Duplication mit bestehendem `notification.service.ts` (Reminders)

**Given** `packages/frontend/src/features/reminders/services/notification.service.ts` implementiert bereits Tauri↔Web-Dispatch, Permission-Handling, Plugin-Availability-Cache und Channel-Konzept (Story 1.5)
**When** Story 1.2 den `useCriticalNotification`-Hook baut
**Then** entsteht **KEIN** paralleler Dispatch-Pfad — der Hook **komponiert** die bestehende Service-Implementation oder die Dispatch-Primitive werden nach `packages/frontend/src/shared/services/notifications/` extrahiert und von beiden Konsumenten (Reminders + Critical) genutzt
**And** die Permission-Anforderung erfolgt **nicht** aus dem Push-Flow, sondern weiter aus `main.tsx:14-19` (bestehende `initializeNotificationSetup().then(requestNotificationPermission)`-Kette) — Push-Manager liest den Status via `notificationService.checkPermission()`, fragt NICHT selbst
**And** kritische Notifications nutzen einen **eigenen** Channel-Identifier (z. B. `CRITICAL_CHANNEL_ID = 'critical-events'`, analog zu `ERINNERUNG_CHANNEL_ID` / `BEFEHL_CHANNEL_ID` in `notification-setup.service.ts`), damit Nutzer in Android die Priorität separat konfigurieren können (High Importance, Heads-up)
**And** die Dev-Notes dokumentieren die gewählte Strategie (Komposition vs Extraktion) — Extraktion ist bevorzugt, wenn der Reminder-Service unangepasst aufgerufen werden muss; Komposition ist akzeptabel, wenn die `critical-events`-Channel-Konfiguration rein zusätzlich ist.

### AC8 — Tests ≥ 80 % Coverage + Lint/Arch-Gates grün

**Given** NFR-M1 (≥ 80 % Unit-Test-Coverage) und die Quality-Gates aus CLAUDE.md
**When** `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="push-subscription-manager"` läuft
**Then** decken Unit-Tests ab:
(a) `useCriticalNotification` in Tauri-Runtime → `plugin-notification` wird aufgerufen, SW/`fetch` **nicht**
(b) `useCriticalNotification` in Browser-Runtime mit `granted` → `showNotification` wird aufgerufen
(c) `useCriticalNotification` in Browser-Runtime mit `denied` → Sonner-Toast-Fallback, **kein** `Notification.requestPermission()` und **kein** `showNotification`
(d) `PushSubscriptionManager` mountet im Browser mit `granted` → `subscribe` + `PushNotificationsApi.pushSubscriptionControllerRegisterVAlpha` mit korrekter Payload (`{endpoint, keys:{p256dh, auth}}`)
(e) `PushSubscriptionManager` in Tauri → rendert `null`, ruft **keine** API auf
(f) `EventIdLruCache`: Insert, Duplicate-Check, Eviction bei > 200 Einträgen (ältester zuerst)
(g) `useCriticalNotification` dedupliziert parallelen Dispatch desselben `eventId` via LRU
(h) `register-service-worker.ts` ruft `navigator.serviceWorker.register('/sw.js')` in Browser auf, nicht in Tauri
**And** das **Service-Worker-Skript (`public/sw.js`)** wird separat via Integration-Test oder Manual-Test-Plan in den Completion-Notes verifiziert (Vitest kann SW-Context nicht realistisch simulieren — alternative: `push-event-handler.ts` als importierbarer Helper extrahieren, dann `sw.js` ist nur der dünne Registrier-Wrapper, der den Helper ruft; der Helper wird unit-getestet)
**And** Coverage für die neuen Files in `packages/frontend/src/shared/ui/push-subscription-manager/` ist ≥ 80 % (Statements, Branches)
**And** `pnpm lint` (oxlint + oxfmt) ist grün
**And** `pnpm --filter @bluelight-hub/backend check:arch` + `check:di:imports` bleiben grün (Story berührt Backend nicht, aber PR läuft durch die Gates).

## Tasks / Subtasks

- [x] **Task 1: Vorbedingungen + Shared-Client sicherstellen (AC: 6)**
  - [x] Prüfen: `packages/shared/client/` existiert (Working-Tree-Zustand sichern — Story 1.1 Commit-Status siehe Dev Notes)
  - [x] Falls fehlend: Backend lokal starten (`pnpm --filter @bluelight-hub/backend start:dev`), dann aus Repo-Root `pnpm run generate-api` ausführen
  - [x] Verifizieren: `packages/shared/client/apis/PushNotificationsApi.ts` + Models `CreatePushSubscriptionDto`, `PushSubscriptionKeysDto`, `PushSubscriptionDto` existieren
  - [x] `VITE_VAPID_PUBLIC_KEY` in lokaler `packages/frontend/.env` setzen (Backend erzeugt Keypair via `npx web-push generate-vapid-keys`, Public-Key in beide .env-Dateien)
- [x] **Task 2: Service-Worker anlegen (AC: 1)**
  - [x] `packages/frontend/public/sw.js` — Raw-JS (kein TS), minimal: `self.addEventListener('push', handlePush)` + `self.addEventListener('notificationclick', handleClick)`
  - [x] `handlePush`: JSON-Parse, `event.waitUntil(self.registration.showNotification(title, {body, data, tag: eventId, renotify: false}))`
  - [x] `handleClick`: `event.notification.close()`, bei `data.url` → `clients.matchAll` + `focus()` oder `clients.openWindow(url)`
  - [x] Optional: `postMessage({type:'push-delivered', eventId})` an alle Clients (für LRU-Cache, AC5)
  - [x] Scope-Beschränkung: Kein Logic außerhalb Push/Click (kein Offline-Cache in dieser Story — das ist eigene Zukunfts-Story)
- [x] **Task 3: `register-service-worker.ts` Helper (AC: 1, 2)**
  - [x] `packages/frontend/src/shared/ui/push-subscription-manager/register-service-worker.ts`
  - [x] Export `registerServiceWorker(): Promise<ServiceWorkerRegistration | null>`
  - [x] Tauri-Guard: Early-Return `null` bei `isTauri()`
  - [x] Feature-Detect: Return `null`, wenn `'serviceWorker' in navigator` false (implementiert als `!navigator.serviceWorker` — tolerant gegen Test-Stubs mit `value: undefined`)
  - [x] `navigator.serviceWorker.register('/sw.js', {scope: '/'})` + `navigator.serviceWorker.ready`
  - [x] Logger: `logger.info('[push] service worker ready', {scope})`; Fehler → `logger.warn` (keine Toasts)
- [x] **Task 4: `event-id-lru.ts` (AC: 5)**
  - [x] `packages/frontend/src/shared/ui/push-subscription-manager/event-id-lru.ts`
  - [x] Klasse mit Max-Size 200 (Konstante `EVENT_ID_LRU_MAX_ENTRIES = 200`)
  - [x] Eviction: Map-basierter Insertion-Order-Trick (bei `size > max` → `delete first key via iterator.next().value`). `has()` ändert keine Reihenfolge — echter Dubletten-Check.
  - [x] Singleton-Export `eventIdLru` für Page-scope
  - [x] Unit-Tests: Insert, Duplicate-Check, Eviction bei 201 Einträgen
- [x] **Task 5: `useCriticalNotification`-Hook (AC: 4, 5, 7)**
  - [x] `packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts`
  - [x] API: `export const useCriticalNotification = () => (payload: CriticalNotificationPayload) => Promise<void>`
  - [x] `CriticalNotificationPayload` TypeScript-Interface: `{title, body, eventId, url?, priority?}`
  - [x] **Reuse-Strategie:** Option B (Komposition) — Hook komponiert `notificationService.sendCriticalNotification()` im `notification.service.ts`, Channel + Action-Type kommen aus `notification-setup.service.ts`.
  - [x] LRU-Check als erster Schritt mit `logger.debug` + frühem Return
  - [x] Dispatch: Tauri → `sendCriticalNotification` (Critical-Channel); Browser granted → `registration.showNotification` mit `tag: eventId`; Browser denied → `toast.error/warning/info` je Priorität, `duration: Number.POSITIVE_INFINITY`, optionaler `url`-Action.
  - [x] `priority` beeinflusst nur Toast-Tone (client-lokal), nicht die Web-Push-Payload
- [x] **Task 6: `<PushSubscriptionManager />`-Komponente (AC: 2, 6, 7)**
  - [x] `packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx`
  - [x] Return `null` bei `isTauri()` (Tauri-Clients registrieren keine Web-Push-Subscription)
  - [x] Return `null`, wenn kein VAPID-Public-Key in Env (Dev-Umgebung ohne Config soll nicht crashen)
  - [x] `useEffect` mit Permission-Check (via `notificationService.checkPermission()`) — bei `granted` + Page-Session-Guard: `registerServiceWorker()` → `pushManager.subscribe()` → `PushNotificationsApi.pushSubscriptionControllerRegisterV1()` via `getApi().pushNotifications()`-Fassade (generierter Operation-Name ist `V1`, nicht `VAlpha` wie in der Spec notiert — Controller hat `version: '1'`)
  - [x] Helper `urlBase64ToUint8Array` inline (Standard-VAPID-Snippet)
  - [x] Mount in `packages/frontend/src/main.tsx` innerhalb `QueryProvider`, geschwisterlich zum Router
- [x] **Task 7: Integration in `main.tsx` (AC: 1, 2)**
  - [x] `registerServiceWorker()` im Startup-Flow aufrufen (Browser-only via `isTauri()`-Check im Helper)
  - [x] `<PushSubscriptionManager />` in den React-Tree einhängen (vor `RouterProvider`, innerhalb `QueryProvider`)
  - [x] Bestehende `initializeNotificationSetup().then(requestNotificationPermission)`-Kette unverändert belassen (AC3, AC7)
- [x] **Task 8: Critical-Channel-Setup in `notification-setup.service.ts` (AC: 7)**
  - [x] `CRITICAL_CHANNEL_ID = 'critical-events'`, `CRITICAL_ACTION_TYPE_ID = 'critical-action'`, `CRITICAL_ACTION_OPEN_ID = 'open-critical'`
  - [x] `createChannel({id: CRITICAL_CHANNEL_ID, name: 'Kritische Ereignisse', importance: Importance.High, visibility: Visibility.Public, lights: true, vibration: true})` im Initialisierungs-Flow
  - [x] Action-Type-Registrierung analog zu Erinnerung/Befehl; zusätzliche Zod-Variante `typedCriticalSchema` + `pendingCriticalNavigations`-Queue + `setNavigateCriticalCallback` für Race-Condition-Handling.
- [x] **Task 9: Tests (AC: 8)**
  - [x] `__tests__/event-id-lru.spec.ts` (Insert/Dup/Evict/Clear) — 6 Tests
  - [x] `__tests__/useCriticalNotification.spec.tsx` (Tauri / Browser granted / denied / priority / LRU-Dedup / kein Priority-Leak / SW-Error-Fallback) — 7 Tests
  - [x] `__tests__/push-subscription-manager.spec.tsx` (Tauri-null, no-VAPID-null, Browser-granted, Browser-denied, HTTP-Fehler → warn, Idempotenz) — 6 Tests
  - [x] `__tests__/register-service-worker.spec.ts` (Tauri-skip, Browser-register, no-SW-Support, Fehler → warn) — 4 Tests
  - [x] **Mock-Pattern:** `@tauri-apps/plugin-notification`, `@tauri-apps/api/core`, `@/shared/lib/logger`, `@/shared/api/api`, `sonner` via `vi.mock` + `vi.hoisted` für Factory-Outer-References
  - [x] Coverage für `shared/ui/push-subscription-manager/`: Statements 92.39 %, Branches 86 %, Funcs 92.85 %, Lines 92.3 % — alle ≥ 80 %
- [x] **Task 10: Quality-Gates + Dokumentation**
  - [x] `pnpm lint` (oxlint + oxfmt) — 0 Errors (26 pre-existing warnings in unrelatedem Code)
  - [x] `pnpm --filter @bluelight-hub/frontend build` (inkl. `tsc --noEmit`) — Bundle baut ohne Typfehler
  - [x] Volle Frontend-Regression (`vitest run`) — 4611 Tests grün, 21 skipped, 0 Failures
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` — 1904 Files geprüft, 0 Errors
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` — 0 Circular-Deps, 0 Errors (1 pre-existing Warning in `funkkanal`)
  - [x] Manueller SW-Test (Browser-Flow + Push-Zustellung) verifiziert: Admin-Login → Permission granted (bereits aus Story 1.5 gecached) → `<PushSubscriptionManager />` hat Subscription registriert (Endpoint `https://fcm.googleapis.com/wp/ck2yBu3HKDE:...`, FCM/Chrome) → drei Test-Pushes via `web-push` CLI gegen die Dev-VAPID-Keys abgesetzt → alle angekommen (zunächst verzögerte Zustellung durch macOS-Notification-Queue). OS-Test via `osascript display notification` parallel grün.
  - [ ] Tauri-Smoke (`tauri:dev`) — bleibt offen (Dev-Laptop ist aktuell Browser-Setup; separate Tauri-Session empfohlen vor MVP-Release)

## Dev Notes

### Scope-Klärungen (vor dem ersten Commit lesen!)

1. **Diese Story ist Frontend-only + Plattform-Hook.** Das Backend (`POST /api/users/me/push-subscriptions`, VAPID-Keypair, `PushPayload`-Interface, Rate-Limit, SSRF-Schutz) ist in **Story 1.1** bereits fertig. Diese Story ändert den `PushPayload`-Contract **nicht** (`priority` bleibt client-lokal, siehe AC4).
2. **Tauri ≠ Web-Push-Subscription.** Ein Tauri-Webview bekommt keine Web-Push-Events. Wenn der Manager trotzdem `POST /api/users/me/push-subscriptions` aufrufen würde, entstünden Dead-Subscriptions, die dauerhaft 410 liefern (Log-Spam, User-Cap-Eviction bevorzugt echte Browser-Subscriptions aus — Story 1.1 AC6 + Review-Patches). Tauri nutzt **ausschließlich** `@tauri-apps/plugin-notification`.
3. **Permission-Request-Single-Source.** `main.tsx:14-19` startet bereits `initializeNotificationSetup().then(requestNotificationPermission)`. Push-Story darf **nicht** parallel `Notification.requestPermission()` triggern — sonst zwei OS-Dialoge in Folge. Push-Manager **liest** nur `notificationService.checkPermission()`, fragt nicht selbst.
4. **Service-Worker-Scope.** `sw.js` liefert **nur** Push-Consumption + Notification-Click-Navigation. Kein Offline-Cache, kein Background-Sync — das sind eigene Stories (Offline-First ist ADR-010, aber nicht Service-Worker-basiert).
5. **SeverityBanner existiert noch nicht.** Der Permission-denied-Fallback (AC3) nutzt **Interim Sonner-Toast**. Migration auf `SeverityBanner variant="critical" tone="assertive"` erfolgt in **Story 3.3** (Eigenschutz Epic). Explizit mit `// TODO(story-3-3): migrate to <SeverityBanner>` markieren.
6. **Shared-Client-Voraussetzung.** Das Working-Tree-Snapshot zur Zeit der Story-Erstellung zeigt `packages/shared/client/` als **gelöscht** (unstaged `D` in `git status` für alle `apis/*.ts`). Story 1.1 hat den Client via `pnpm run generate-api` regeneriert — dieser Regen-Schritt war Teil des Story-1.1-Flows (siehe Story 1.1 Task 5 + Completion-Notes). **Vor dem Start von Story 1.2 muss der Dev-Agent entweder den Working-Tree-Zustand aufräumen (Story-1.1-Commit erst abschließen) oder `pnpm run generate-api` erneut ausführen.** Ohne `PushNotificationsApi` im Client schlagen die Imports fehl.
7. **Keine DELETE-Aufrufe auf Subscription-Endpoint.** Story 1.1 hat DELETE bewusst OUT-OF-SCOPE gelassen (`// TODO(platform)` im Controller-Header, Story 1.1 Dev Notes §4). Server-seitiges Cleanup erfolgt via 410/404-Detection im `PushNotificationsService.send()`.

### Reuse-Strategie: Kein paralleler Dispatch-Code!

`packages/frontend/src/features/reminders/services/notification.service.ts` implementiert bereits:

- Tauri↔Web-Dispatch mit `isTauri()`-Gating (`notification.service.ts:95-100`)
- Plugin-Availability-Cache (`tauriPluginAvailable: boolean | null`, Zeilen 86-87, 337-354)
- Dynamic Import (`await import('@tauri-apps/plugin-notification')`, 344, 366, 387, 419, 457) — wichtig, damit Tauri-Plugin nicht in den Web-Bundle wandert
- Permission-Check + Request (`checkPermission`, `requestPermission`, Zeilen 110-145)
- Channel-Konzept (Reminders + Befehle, `notification-setup.service.ts:54-70`)

**Zwei akzeptable Umsetzungen — Dev-Agent entscheidet, dokumentiert im Completion-Notes:**

**Option A (bevorzugt): Extraktion in `packages/frontend/src/shared/services/notifications/`.**

- Move: Primitive `send()`, `checkPermission()`, `isTauriPluginAvailable()` in neuen `shared/services/notifications/notification-dispatcher.service.ts`
- Beide Konsumenten (Reminders + Critical) injizieren denselben Dispatcher; jeder fügt seine eigenen Channel-IDs/Action-Types hinzu
- Pro: saubere Schichten, Kritisch + Reminder teilen Logik
- Contra: größerer Scope-Touchpoint (Story 1.5-Tests dürfen nicht brechen)

**Option B: Komposition.**

- `useCriticalNotification` importiert `notificationService` aus `features/reminders/services` und ruft die öffentlichen Methoden auf (nach Bedarf erweitern auf z. B. `send(options, channelId)`)
- `features/reminders/services/notification-setup.service.ts` wird um `CRITICAL_CHANNEL_ID` erweitert
- Pro: kleinerer Diff, weniger Risiko an Story-1.5-Tests
- Contra: shared/ui hängt an features/reminders (Feature→Shared-Inversion — eigentlich unerwünscht nach `frontend/src/features/MIGRATION.md`)

→ Falls Option A verbindlich erscheint, aber Umfang zu groß: **Hybrid** — in dieser Story Option B, mit explizitem Follow-up-TODO für Option A in einer späteren Refactoring-Story. Entscheidung in Completion-Notes festhalten.

### Architektur-Guardrails (NICHT verletzen!)

- **Feature-Slice vs. Shared-UI (Architektur §B):** Push-Subscription-Manager ist **plattformweit**, gehört also nach `shared/ui/push-subscription-manager/` — exakt wie in Architecture `architecture.md:1843-1844` festgelegt. **Nicht** in `features/eigenschutz/` oder `features/reminders/` anlegen.
- **API-Workflow (CLAUDE.md):** Backend-Endpoint → `pnpm run generate-api` → TanStack-Query-Hook / direkter API-Call. **NIEMALS** manueller `fetch()` gegen `/api/users/me/push-subscriptions`. Der generierte `PushNotificationsApi` wird über den `@/shared`-Wrapper konsumiert (`packages/frontend/src/shared/api/api.ts` ist die Fassade, siehe Pattern-Referenz).
- **Tauri-Plugin-Imports sind dynamic:** `await import('@tauri-apps/plugin-notification')` — **niemals** Top-Level-`import`, sonst landet Tauri-Code im Browser-Bundle und der Web-Build bricht (Referenz: `notification.service.ts:344`, `notification-setup.service.ts:226`).
- **Browser-Feature-Detect vor Runtime-Check:** `'serviceWorker' in navigator` + `'PushManager' in window` vor Subscribe-Call. Ältere Browser (Safari < 16) haben keinen SW → In-App-Banner-Fallback greift.
- **Zero-Toast-Policy (UX-DR21):** Fehler in der Push-Subscription-Registration (HTTP 429, 400, Network) werden **nicht** als User-Toast angezeigt — nur `logger.warn/error`. Der User hat bereits Permission erteilt und erwartet keine API-Fehler-Dialoge.
- **Result-Pattern:** Frontend nutzt kein Domain-Result-Pattern (das ist Backend). Hier ist TanStack-Query-Standard-Pattern akzeptabel.
- **`check:di:imports` irrelevant** — ist Backend-NestJS-Regel. Frontend-Imports sind frei.

### Source-Tree-Komponenten zu berühren

**Neu anlegen:**

- `packages/frontend/public/sw.js` — Raw-JS Service-Worker (~40 LOC)
- `packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx`
- `packages/frontend/src/shared/ui/push-subscription-manager/register-service-worker.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/event-id-lru.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/push-event-handler.ts` (optional, wenn SW-Logik unit-testbar extrahiert wird)
- `packages/frontend/src/shared/ui/push-subscription-manager/index.ts` (Barrel-Export)
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/event-id-lru.spec.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/useCriticalNotification.spec.tsx`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/push-subscription-manager.spec.tsx`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/register-service-worker.spec.ts`

**Editieren:**

- `packages/frontend/src/main.tsx` — `registerServiceWorker()` im Startup + `<PushSubscriptionManager />` im Tree
- `packages/frontend/src/features/reminders/services/notification-setup.service.ts` — `CRITICAL_CHANNEL_ID` + Channel-Setup ergänzen
- `packages/frontend/src/features/reminders/services/notification.service.ts` — falls Option A (Extraktion): öffentliche Methoden so anpassen, dass Critical-Channel ebenfalls bedient wird
- `packages/frontend/src/shared/ui/index.ts` — Export des neuen `push-subscription-manager`-Moduls
- Ggf. `packages/frontend/src/shared/services/` anlegen, wenn Option A gewählt wird

**NICHT editieren:**

- `packages/backend/**` — Backend-Scope ist Story 1.1, abgeschlossen
- `packages/shared/client/**` — generiert, **NIEMALS** manuell editieren. Nur `pnpm run generate-api` triggern, wenn Contract sich ändert (tut er in dieser Story nicht!)
- `packages/frontend/src-tauri/**` — `plugin-notification` ist bereits registriert (`lib.rs:30` + `capabilities/default.json`), keine Rust-Änderung nötig
- `packages/frontend/public/sounds/**` — Sounds-Ordner ist Story 1.5; Push-Notifications nutzen optional Tauri-Channel-Sound, aber keine zusätzlichen mp3s in dieser Story

### Testing-Standards

- **Framework**: Vitest (Frontend) — **nicht** Jest (Jest ist Backend). Tests in `__tests__/`-Unterordnern am Code.
- **Test-Command** (Memory-Notiz):
  ```bash
  pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="push-subscription-manager"
  ```
- **Coverage-Ziel**: ≥ 80 % (NFR-M1)
- **Mock-Patterns — aus existierendem Code übernehmen**:
  - `@tauri-apps/plugin-notification`: `vi.mock('@tauri-apps/plugin-notification', () => ({ isPermissionGranted: vi.fn(), requestPermission: vi.fn(), sendNotification: vi.fn(), createChannel: vi.fn(), registerActionTypes: vi.fn(), onAction: vi.fn(), Importance: {High: 4}, Visibility: {Public: 1} }))` — Referenz: `packages/frontend/src/features/reminders/services/__tests__/notification.service.spec.ts:33`
  - `@tauri-apps/api/core`: `vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }))`
  - `navigator.serviceWorker`: `Object.defineProperty(navigator, 'serviceWorker', {value: {register: vi.fn().mockResolvedValue(mockRegistration), ready: Promise.resolve(mockRegistration)}, configurable: true})`
  - `PushManager.subscribe`: mockRegistration.pushManager = `{subscribe: vi.fn().mockResolvedValue(mockSubscription)}`; mockSubscription = `{toJSON: () => ({endpoint, keys:{p256dh, auth}})}`
  - `Notification.permission` / `Notification.requestPermission`: `Object.defineProperty(window.Notification, 'permission', {value: 'granted', configurable: true})`
  - `@bluelight-hub/shared/client`-`PushNotificationsApi`: `vi.mock('@/shared', async () => ({ ...(await vi.importActual('@/shared')), PushNotificationsApi: vi.fn() }))` — oder direkter Mock der `api`-Fassade
- **Sonner-Toast-Assertion**: `vi.mock('sonner', () => ({ toast: { error: vi.fn(), ... } }))` — dann `expect(toast.error).toHaveBeenCalledWith('...', expect.objectContaining({duration: Infinity}))`
- **Quality-Gates (CLAUDE.md "Definition of Done")**:
  ```bash
  pnpm lint
  pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="push-subscription-manager"
  pnpm --filter @bluelight-hub/frontend build:vite
  pnpm --filter @bluelight-hub/backend check:di:imports
  pnpm --filter @bluelight-hub/backend check:arch
  ```

### Konkrete Bibliotheks- & Versions-Anforderungen

| Lib                               | Version                                                     | Zweck                                          |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `@tauri-apps/plugin-notification` | `^2.3.3` (bestehend in `packages/frontend/package.json:51`) | Tauri-Native-Notifications für Critical-Events |
| `@tauri-apps/api`                 | `^2.10.1` (bestehend)                                       | `isTauri()` für Runtime-Detection              |
| `sonner`                          | bestehend (für Reminders + Toasts)                          | Interim Permission-denied-Fallback (siehe AC3) |
| `@bluelight-hub/shared`           | workspace                                                   | `PushNotificationsApi` aus generiertem Client  |

**Latest-Knowledge-Hinweise:**

- **Service-Worker API:** `self.registration.showNotification(title, options)` — `options.tag` ermöglicht Replace-Semantik (neuere Push mit gleichem `tag` ersetzt die vorhandene Notification). Wir nutzen `tag: eventId` damit Doppelzustellung (retry-Push) nicht zweimal erscheint.
- **PushManager.subscribe** akzeptiert `applicationServerKey` als `Uint8Array` (nicht Base64-String!). VAPID-Public-Key ist Base64url-kodiert → standard `urlBase64ToUint8Array`-Helper nötig (10 LOC; MDN-Pattern).
- **Tauri plugin-notification 2.3.3:** `sendNotification({title, body, channelId?, extra?, actionTypeId?, autoCancel?})` — `extra` ist generisches Object, erlaubt beliebige JSON-Felder (`eventId`, `url`). `channelId` nur auf Android relevant; macOS/Windows ignorieren es mit Warning (kein Fehler).
- **Vite HTTPS-Dev-Server (Port 3090):** Service-Worker braucht HTTPS oder localhost. Die bestehende Self-Signed-Zertifikats-Kette (`certs/localhost.pem`) im Vite-Config erfüllt das. **Bei Port-Konflikten in Worktrees:** `scripts/worktree-setup.sh` läuft lassen.

### Dedup-Semantik (kritisch, aus Architecture §B7 + Advisor-Klärung)

| Pfad                                | Dedup-Verantwortlich                                         | Begründung                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service-Worker (Push)**           | zeigt immer `showNotification`                               | SW hat keinen Zugriff auf Page-LRU; Hintergrund-Push darf nie unterdrückt werden (sonst verpasst User das Event, wenn die Page geschlossen ist) |
| **In-App-Banner (WS-Pfad im Hook)** | prüft Page-LRU, ignoriert Duplikate                          | Verhindert zweifachen Banner, wenn Push + WS parallel ankommen                                                                                  |
| **SW → Page-LRU-Sync**              | optional via `postMessage({type:'push-delivered', eventId})` | Hält Page-LRU warm, falls WS kurz nach Push ankommt                                                                                             |

Der Backend-`PushPayload`-Contract aus Story 1.1 garantiert `eventId` als Pflichtfeld — diese Dedup-Kette ist gültig.

### Projektstruktur-Alignment

- ✅ **Plattform-Spillover**: `shared/ui/push-subscription-manager/` — exakt wie Architecture `architecture.md:1843` vorgibt
- ✅ **Service-Worker-Pfad**: `public/sw.js` — exakt wie `architecture.md:1841`
- ✅ **API-Workflow**: Backend-Endpoint aus 1.1 → generierter Client → TanStack-Query/direct API-Call
- ✅ **Runtime-Detection-Konsistenz**: `isTauri()` bzw. `useIsTauri()` wie in `notification.service.ts:95`, `shared/hooks/useIsTauri.ts`
- ✅ **Keine neue Domain-Event-Registry-Registrierung**: Diese Story publiziert keine Domain-Events (siehe Story 1.1 Analog); Outbox-Integration ist Epic 3.

### Previous-Story-Intelligence (aus Story 1.1)

- **Story 1.1 Status:** `done` (laut `sprint-status.yaml`). Implementation liegt im Working-Tree (unstaged), inklusive Prisma-Migration, Backend-Modul, ADR-011, 52/52 Unit-Tests. Details siehe `_bmad-output/implementation-artifacts/1-1-plattform-push-notifications-backend-adr-011.md`.
- **Backend-API-Contract fixiert:**
  - Endpoint: `POST /api/users/me/push-subscriptions` (Version `v1`)
  - Request: `{endpoint: string (HTTPS-URL, MaxLen 2048), keys: {p256dh: string (Base64url, MaxLen 512), auth: string (Base64url, MaxLen 512)}}`
  - Response 201: `PushSubscriptionDto` = `{id, userId, endpoint, createdAt, updatedAt}` (keine Keys!)
  - Rate-Limit: 10/min (429 bei Überschreitung — Zero-Toast)
  - User-Cap: 10 Subs/User (Backend evicted älteste stillschweigend)
  - SSRF-Schutz: Hostname-Blocklist (localhost, RFC1918, IPv4/IPv6 Loopback, 169.254.169.254) → 400 bei Verstoß
- **`PushPayload`-Contract (Story 1.1 `push-payload.ts`):** `{eventId: string (required), title: string, body: string, url?: string, data?: Record<string, unknown>}` — diese Story ändert ihn NICHT.
- **Dedup-Vertrag:** Server dedupt NICHT. Client dedupt via `eventId`-LRU (Story 1.1 AC5 + ADR-011). Diese Story implementiert den Client-seitigen Cache.
- **Environment-Setup:** `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` im Backend; `VITE_VAPID_PUBLIC_KEY` im Frontend. Dev-Keypair via `npx web-push generate-vapid-keys`. Frontend-`.env.example` ist bereits vorbereitet (Story 1.1 Task 4).
- **DELETE-Endpoint fehlt:** Story 1.1 hat `DELETE` bewusst weggelassen. Frontend-Story 1.2 macht das konsistent — kein DELETE-Call. Subscription-Revocation erfolgt server-seitig via 410/404-Detection.

### Git-Intelligence

Letzte 5 Commits im Branch `415-eigenschutz-einsatzkraefte-sicherheit-psa`:

- `fc8cfaac3 📝(design-system): Ring-1-Tokens verfeinern und UI/UX-Übersicht ergänzen`
- `f1f3b9978 🙈(bmad): _bmad-output/ gitignoren und aus Index entfernen`
- `38e7cc176 ⚡(ci): Frontend-Tests parallelisieren und sharden`
- `ce80ec14a 🐛(ci): Shard-Flag direkt an Jest übergeben statt via pnpm --`
- `e1701c47c ⚡(ci): Backend-Unit-Tests parallelisieren und sharden`

**Working-Tree-Status:** Story 1.1 Backend-Änderungen sind **unstaged** (Prisma-Schema, Backend-Module, `.env.example`, `rate-limit.constants.ts`). **Alle** `packages/shared/client/*`-Files sind **als gelöscht** markiert — entweder Story 1.1 Commit steht noch aus oder ein separater Cleanup hat den generierten Client entfernt. **Konsequenz für Story 1.2:** Vor jedem Frontend-Implementierungsschritt via `pnpm run generate-api` den Shared-Client neu erzeugen (Task 1). Zusätzlich: Story 1.1 Working-Tree-Zustand mit dem User klären, bevor neue Commits auf dem Branch landen (gefährdet sonst die Story-1.1-Attribution).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2`] — Story-Statement + alle BDD-ACs (Epic `epics.md:471-500`)
- [Source: `_bmad-output/planning-artifacts/epics.md#AR1`] — Plattform-Voraussetzung F1 (Push-Infrastructure, Story 1.1)
- [Source: `_bmad-output/planning-artifacts/epics.md#FR22`] — Push-Notifications von Phase 2 in MVP gehoben
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-R3`] — At-least-once + `eventId`-LRU-Dedup am Client (Größe ~200)
- [Source: `_bmad-output/planning-artifacts/architecture.md:565-605`] — §B7 Web-Push + Tauri-Notifications (Platzierung, Dedup-Strategie, Scope-Abgrenzung)
- [Source: `_bmad-output/planning-artifacts/architecture.md:1826-1844`] — Plattform-Spillover Directory-Layout (`sw.js`, `shared/ui/push-subscription-manager/`)
- [Source: `_bmad-output/planning-artifacts/architecture.md:2027`] — Traceability-Matrix: `public/sw.js`, `shared/ui/push-subscription-manager/useCriticalNotification.ts`
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md:140`] — Tauri-Native-Notifications + Web-Push als MVP-Scope, In-App-Banner als Fallback
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md:1213-1215`] — Alarm-Budget max 3 assertive, Tauri-Native MVP-Scope
- [Source: `_bmad-output/implementation-artifacts/1-1-plattform-push-notifications-backend-adr-011.md`] — Backend-Contract, VAPID-Setup, Rate-Limit/Cap-Entscheidungen
- [Source: `docs/adr/adr-011-plattform-push-notifications.md`] — Architektur-Rationale, Dedup-Vertrag, DELETE-Scoping
- [Source: `CLAUDE.md#API Workflow`] — Backend-Endpoint → `pnpm run generate-api` → Shared-Client-Konsum
- [Source: `CLAUDE.md#Implementation Rules`] — Keine Standalone-HTML-Prototypen, arbeite direkt im echten Codebase
- [Source: `packages/frontend/src/features/reminders/services/notification.service.ts`] — **Referenz-Pattern für Tauri↔Web-Dispatch** (Wiederverwendung, siehe Reuse-Strategie)
- [Source: `packages/frontend/src/features/reminders/services/notification-setup.service.ts`] — Channel + Action-Type-Setup
- [Source: `packages/frontend/src/features/reminders/services/__tests__/notification.service.spec.ts`] — Mock-Pattern für Tauri-Plugin
- [Source: `packages/frontend/src/shared/hooks/useIsTauri.ts`] — Runtime-Detection-Hook
- [Source: `packages/frontend/src/main.tsx`] — Bestehende Notification-Setup-Kette (nicht duplizieren!)
- [Source: `packages/frontend/src-tauri/src/lib.rs`] — `tauri_plugin_notification::init()` bereits registriert
- [Source: `packages/frontend/src-tauri/capabilities/default.json`] — `notification:default` Capability bereits gesetzt
- [Source: `packages/frontend/package.json:51`] — `@tauri-apps/plugin-notification ^2.3.3` bereits installiert
- [Source: `packages/backend/src/domain/push-notifications/push-payload.ts`] — `PushPayload`-Contract (Story 1.1, unverändert in 1.2)
- [Source: `packages/backend/src/modules/push-notifications/push-subscription.controller.ts:27`] — Endpoint-Path `users/me/push-subscriptions` v1
- [Source: `packages/frontend/MEMORY.md` bzw. `CLAUDE.md#Testing`] — Vitest-Test-Command

## Dev Agent Record

### Agent Model Used

- Claude Opus 4.7 (1M context) via Claude Code, Story-Run 2026-04-21.

### Debug Log References

- `pnpm -w run generate-api` → Alpha-Spec (`https://localhost:3091/api/alpha-json`) → 52 Files in `packages/shared/client/` (inkl. `PushNotificationsApi.ts`).
- Vitest-Suite auf `src/shared/ui/push-subscription-manager/` mit `--coverage`: 23/23 lokale Tests grün, 4611/4632 vollständige Frontend-Tests grün (21 skipped).
- Backend-Bootstrap mit Story-1.1-Änderungen (unstaged) auf Port 3091, Migration `20260421104826_add_push_subscriptions` bereits in Dev-DB appliziert → `push_subscription`-Tabelle existiert, keine Schema-Drift.

### Completion Notes List

- **Reuse-Strategie: Option B (Komposition) gewählt.**
  Hook importiert `sendCriticalNotification` + `notificationService.checkPermission` aus `@/features/reminders/services`. Neue private Methoden `sendTauriCriticalNotification` / `sendWebCriticalNotification` in `notification.service.ts` nutzen den neuen `CRITICAL_CHANNEL_ID`. Rationale: keine Scope-Ausweitung in `shared/services/`, Story-1.5-Tests bleiben stabil (62 Reminders-Files, 1054/1054 grün). `TODO(platform-refactor)`: Dispatcher-Extraktion gehört in eine spätere Plattform-Refactoring-Story.
- **Shared-Client-Regeneration (Task 1): erfolgreich via `pnpm -w run generate-api`**, Backend auf Story-1.1-Branch gestartet. Generierter Operation-Name ist `pushSubscriptionControllerRegisterV1` (NICHT `VAlpha` wie in Spec — Controller-Version ist `'1'`). Path: `/api/v-1/users/me/push-subscriptions`. Spec ist an der Stelle überholt; PR-Beschreibung flagge ich entsprechend.
- **API-Fassade:** `BackendApi.pushNotifications()` ergänzt in `src/shared/api/api.ts` (analog zu allen anderen Modulen), damit der Manager den Shared-Client per `getApi().pushNotifications()` konsumiert — keine manuellen `fetch()`-Calls, CLAUDE.md-API-Workflow respektiert.
- **Action-Handler-Update:** `notification-setup.service.ts` hat eine dritte discriminated-union-Variante `typedCriticalSchema` (`{type: 'critical', eventId, url?}`) + `setNavigateCriticalCallback` + `pendingCriticalNavigations` erhalten. Konsistent mit Erinnerung/Befehl-Pattern. Der Default-Click im Web-Pfad nutzt `window.location.href` (kein Router-Import zur Vermeidung von Layering-Bruch); spätere Router-Integration gehört in Eigenschutz-Epic 3.
- **Dedup-Vertrag (AC5) erfüllt:**
  - `useCriticalNotification` prüft `eventIdLru.has(eventId)` vor jedem Dispatch und fügt dann hinzu — Doppel-Dispatch (WS + nachgelagerter Service-Worker-`postMessage`) wird im Foreground-Pfad stillschweigend supprimiert.
  - `sw.js` zeigt Notifications **immer** und postet `{type: 'push-delivered', eventId}` an offene Clients. Der `postMessage`-Consumer, der die Page-LRU füllt, ist bewusst **nicht** in dieser Story — der Hook selbst füllt beim Foreground-Dispatch; der reine Background-Push darf nicht unterdrückt werden (Architecture §B7). Follow-up: sobald Epic 3 den Hook vom Application-Layer konsumiert, sollte ein leichter `navigator.serviceWorker.addEventListener('message', …)` → `eventIdLru.add(...)`-Listener in `main.tsx` ergänzt werden.
- **Manueller Browser-Smoke-Test: erfolgreich ausgeführt (2026-04-21).** Flow Schritt für Schritt verifiziert:
  1. Backend auf `https://localhost:3091` gelaufen → `pnpm -w run generate-api` regenerierte Shared-Client inkl. `PushNotificationsApi`.
  2. Frontend auf `https://localhost:3090` — Admin-Login, Chrome-Permission bereits `granted` aus Story 1.5, kein neuer Dialog.
  3. `<PushSubscriptionManager />` hat automatisch abonniert; Subscription in `push_subscription`-Tabelle: FCM-Endpoint `ck2yBu3HKDE:APA91bEh...` für `userId=bjry3ioya8b2sn42ftoe1hos`.
  4. Chrome DevTools verifiziert: `sw.js` `activated`, Scope `/`, `notifPermission: 'granted'`, Subscription-Endpoint matched DB.
  5. Drei Test-Pushes via `web-push` CLI gegen die registrierte Subscription gesendet — alle Client-seitig in `reg.getNotifications()` als registrierte Entries sichtbar.
  6. macOS-Delivery-Queue hielt die OS-Banner kurzzeitig zurück (vermutlich DoNotDisturb-Restzustand oder Chrome-Quota-Throttling); nach ~Minute wurden alle Notifications sichtbar.
  - Tauri-Smoke (`tauri:dev`) wurde im Browser-Setup nicht ausgeführt — Empfehlung: vor MVP-Release in eigener Tauri-Session bestätigen, dass `@tauri-apps/plugin-notification` für Critical-Channel-Payloads dieselbe Rendering-Semantik liefert wie die bereits grüne Reminders-Smoke.
- **Follow-up-TODOs:**
  - `// TODO(story-3-3)`: Sonner-Fallback in `useCriticalNotification` auf `<SeverityBanner>` migrieren (im Code markiert).
  - `TODO(platform-refactor)`: `notification-dispatcher.service.ts`-Extraktion (Option A) in eigener Refactoring-Story, sobald Epic 3 einen dritten Dispatch-Konsumenten einführt.
- **Working-Tree-Hinweis (Story 1.1):** Das Repo enthält weiterhin unstaged Story-1.1-Backend-Änderungen plus den frisch regenerierten Shared-Client. Der User sollte **vor dem Commit** entscheiden, ob Story 1.1 separat commitet wird (empfohlen — eigene Attribution) oder zusammen mit 1.2. Die 1.2-spezifischen Änderungen sind ausschließlich in der unten stehenden File List gelistet.

### File List

**Neu (Story 1.2):**

- `packages/frontend/public/sw.js`
- `packages/frontend/src/shared/ui/push-subscription-manager/event-id-lru.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/register-service-worker.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx`
- `packages/frontend/src/shared/ui/push-subscription-manager/index.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/event-id-lru.spec.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/register-service-worker.spec.ts`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/useCriticalNotification.spec.tsx`
- `packages/frontend/src/shared/ui/push-subscription-manager/__tests__/push-subscription-manager.spec.tsx`

**Geändert (Story 1.2):**

- `packages/frontend/.env` — `VITE_VAPID_PUBLIC_KEY` gesetzt (Dev-Keypair aus Story 1.1)
- `packages/frontend/src/main.tsx` — `registerServiceWorker()` + `<PushSubscriptionManager />` im Startup
- `packages/frontend/src/shared/api/api.ts` — `PushNotificationsApi` + `pushNotifications()`-Getter + Konstruktor-Verdrahtung
- `packages/frontend/src/features/reminders/services/notification.service.ts` — `CriticalNotificationOptions`-Interface, `sendCriticalNotification()`, `sendTauriCriticalNotification()`, `sendWebCriticalNotification()` + Named Export
- `packages/frontend/src/features/reminders/services/notification-setup.service.ts` — `CRITICAL_CHANNEL_ID`/`CRITICAL_ACTION_TYPE_ID`/`CRITICAL_ACTION_OPEN_ID`, `createCriticalChannel()`, `typedCriticalSchema` (Zod), `setNavigateCriticalCallback`, `pendingCriticalNavigations`-Queue
- `packages/frontend/src/features/reminders/services/index.ts` — Re-Exports für neue Symbole (`sendCriticalNotification`, `CriticalNotificationOptions`, `setNotificationNavigateCriticalCallback`, Critical-Channel-Konstanten, `NavigateToCriticalCallback`)

**Regeneriert (Task 1, deckt Story 1.1-Contract-Restore ab — kein 1.2-Scope):**

- `packages/shared/client/**` — OpenAPI-Client neu generiert inkl. `apis/PushNotificationsApi.ts`, `models/CreatePushSubscriptionDto.ts`, `models/PushSubscriptionKeysDto.ts`, `models/PushSubscriptionDto.ts`, `models/PushSubscriptionControllerRegisterV1201Response.ts`. Inhaltlich unverändert zur Story-1.1-Ausgangslage; nur als `D`-Entries in `git status` vorhanden gewesen, jetzt re-materialisiert.

**Nicht editiert (wie gefordert):**

- `packages/backend/**` (Scope Story 1.1)
- `packages/frontend/src-tauri/**` (Plugin bereits verdrahtet)

### Change Log

- 2026-04-21 — Plattform-Push-Clients implementiert: Service-Worker (`public/sw.js`), `eventIdLru`, `useCriticalNotification`-Hook, `<PushSubscriptionManager />`, Integration in `main.tsx`, Critical-Channel-Setup in `notification-setup.service.ts` + Critical-Dispatch-Primitiven in `notification.service.ts`. Option B (Komposition) gewählt. Coverage ≥ 80 %, alle Quality-Gates grün. Generierter Endpoint-Operation-Name ist `pushSubscriptionControllerRegisterV1` (Controller-Version `'1'`; Spec-Vermutung `VAlpha` war überholt).
- 2026-04-21 — Review-Patches nach `bmad-code-review` angewendet (17 Patches + 2 Decisions aufgelöst): SW-Lifecycle mit `skipWaiting`/`clients.claim`, URL-Validierung gegen Open-Redirect/XSS in sw.js + notification.service.ts + Sonner-Toast, AC3 Tauri-denied → Sonner-Fallback (inkl. neuer Test), `eventIdLru.remove`-Rollback bei Dispatch-Fehler, `sendTauriCriticalNotification` awaited, `permissionStatus` Re-Check bei nicht-granted, `inFlightRef` gegen StrictMode-Double-Subscribes, PushManager-Feature-Detect, `new URL(payload.endpoint)` sicher gewrappt, `new Notification()`-Fallback auf `registration.showNotification` bei aktivem SW-Controller, `pendingCriticalNavigations` mit `MAX_PENDING_NAVIGATIONS=20` + try/catch pro Callback, Zod `discriminatedUnion` auf `type`-Feld statt `'eventId' in data`, Toast-Stacking via `id: eventId`, doppelter `registerServiceWorker`-Call auf Boot-Level (main.tsx) konsolidiert, `push-delivered`-Listener füllt Page-LRU (AC5 vollständig). Frontend-Regression: 4613/4634 grün, Lint 0 Errors, TSC 0, Backend DI+Arch grün.

### Review Findings

Code-Review am 2026-04-21 via `bmad-code-review` (3 parallele Layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor).

**Decision-needed (resolved 2026-04-21):**

- [x] [Review][Decision] **SW-Post `push-delivered` ohne Consumer** — Entscheidung: **Listener in `main.tsx` ergänzen** (Option 2). Siehe Patch-Eintrag „Page-LRU-Listener für SW-`push-delivered`" unten.
- [x] [Review][Decision] **SW-Lifecycle ohne `install`/`activate`** — Entscheidung: **`skipWaiting` + `clients.claim` ergänzen** (Option 1). Siehe Patch-Eintrag „SW-Lifecycle-Listener" unten.

**Patch:**

- [x] [Review][Patch] **Page-LRU-Listener für SW-`push-delivered`** [`packages/frontend/src/main.tsx`] — Resolution aus Decision D1. Der SW postet bereits `{type:'push-delivered', eventId}`, aber kein Consumer füllt den Page-LRU. Fix: `navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'push-delivered' && typeof e.data.eventId === 'string') eventIdLru.add(e.data.eventId); })` innerhalb `isTauri()`-Guard, direkt nach `registerServiceWorker()`-Call. Schließt AC5 vollständig ab (WS-nach-Push-Race).
- [x] [Review][Patch] **SW-Lifecycle-Listener (`skipWaiting` + `clients.claim`)** [`packages/frontend/public/sw.js`] — Resolution aus Decision D2. Fix: `self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));` am Anfang der Datei. Sicher, da der SW push-only ist (kein `fetch`-Handler, keine Offline-Caches).

- [x] [Review][Patch] **[SECURITY] `payload.data` Spread überschreibt `eventId`/`url`** [`packages/frontend/public/sw.js:46`] — Spread-Reihenfolge `data: { eventId, url, ...data }` erlaubt es einem manipulierten Backend-Payload, interne Felder zu überschreiben. Fix: `data: { ...data, eventId, url }`.
- [x] [Review][Patch] **[SECURITY] Open-Redirect/XSS in Web-Foreground-Notification-Click** [`packages/frontend/src/features/reminders/services/notification.service.ts:459`] — `window.location.href = url` ohne URL-Validierung; `javascript:`/`data:`/Cross-Origin möglich. Fix: Allowlist `^/` oder `^https?://same-origin` prüfen, sonst `logger.warn` + keine Navigation.
- [x] [Review][Patch] **[SECURITY] Open-Redirect/XSS im Sonner-Toast-Action** [`packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts:87`] — Gleicher Vektor wie oben im Fallback-Pfad. Fix: Gleiche URL-Validierung zentralisieren (z. B. Helper `isSafeNotificationUrl(url)`).
- [x] [Review][Patch] **[SECURITY] SW `targetUrl` ohne URL-Validierung** [`packages/frontend/public/sw.js:66`] — `event.notification.data?.url` wird ungeprüft an `client.navigate()` / `clients.openWindow()` übergeben. Fix: gleiche Allowlist wie oben, zur Sicherheit auch auf SW-Seite.
- [x] [Review][Patch] **[AC3] Tauri-denied-Pfad fällt nicht auf Sonner-Toast zurück** [`packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts:46-49`] — Der Tauri-Branch ruft unkonditional `sendCriticalNotification(...)`; bei denied Permission bricht der Service intern mit `{success:false}` + `logger.warn` ab, der vom AC3 geforderte In-App-Banner-Fallback (Sonner) wird nie ausgelöst. Fix: vor Dispatch `await notificationService.checkPermission()` prüfen; bei nicht-granted in den Sonner-Zweig verzweigen.
- [x] [Review][Patch] **[AC8] Test für Tauri-denied → Sonner-Fallback fehlt** [`packages/frontend/src/shared/ui/push-subscription-manager/__tests__/useCriticalNotification.spec.tsx`] — Keine Abdeckung für `isTauri()===true` + Permission-denied. Fix: neuen `it`-Block ergänzen, analog zum Browser-denied-Test, der `toast.error` assertet und `sendCriticalNotification` NICHT (oder nur als gescheiterten Pfad).
- [x] [Review][Patch] **Silent-Failure: `tauriSendNotification` wird nicht awaited** [`packages/frontend/src/features/reminders/services/notification.service.ts:410-417`] — `sendTauriCriticalNotification` returned `{success:true}`, bevor das Plugin-Promise settled; rejections landen unhandled. Fix: `await tauriSendNotification(...)` und Fehler in try/catch behandeln.
- [x] [Review][Patch] **Stale `permissionStatus`-Cache bei `denied`→`granted`-Wechsel** [`packages/frontend/src/features/reminders/services/notification.service.ts:376-382`] — `checkPermission()` wird nur bei `permissionStatus === 'unknown'` aufgerufen; wenn der User nach initialem `denied` via OS-Settings die Permission erlaubt hat, bleibt der Cache veraltet. Fix: Re-check auch bei `!== 'granted'` anstoßen oder auf `visibilitychange`-Event invalidieren.
- [x] [Review][Patch] **Race: StrictMode-Double-Mount erzeugt parallele Subscribes** [`packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx:47-91`] — `hasSubscribedRef.current = true` wird erst NACH `pushSubscriptionControllerRegisterV1` gesetzt. In React-Dev-StrictMode kann der zweite Effect-Run den Ref noch `false` sehen und parallel registrieren. Fix: `inFlightRef` einführen, der synchron beim Start auf `true` gesetzt wird; im finally/catch resetten. Zusätzlich: Idempotenz-Test auf echten Remount umstellen (`unmount()` + neuer `render()`), statt nur `rerender`.
- [x] [Review][Patch] **Memory-Leak: `pendingCriticalNavigations` unbeschränkt** [`packages/frontend/src/features/reminders/services/notification-setup.service.ts:211-244`] — Kein Max-Size, kein TTL, kein Clear in Error-Pfad. Bei verzögert/never gesetztem Callback wächst die Queue unbegrenzt. Fix: `MAX_PENDING_NAVIGATIONS = 20` + ältesten Eintrag verdrängen; zusätzlich try/catch pro Callback-Aufruf (sonst bricht der Loop bei erster Exception und verliert den Rest).
- [x] [Review][Patch] **`eventIdLru.add()` vor Dispatch — kein Rollback bei Fehler** [`packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts:46`] — Bei gescheitertem Dispatch ist die `eventId` trotzdem als "gesehen" markiert, Retry wird still deduped. Fix: `add()` erst nach erfolgreichem Dispatch; oder `remove(eventId)` im catch-Block.
- [x] [Review][Patch] **Toast-Stacking bei mehreren denied-Critical-Events** [`packages/frontend/src/shared/ui/push-subscription-manager/useCriticalNotification.ts:76-91`] — `duration: Infinity` ohne `id` lässt Toasts stapeln — 10 Events = 10 Toasts. Fix: `toast(…, { id: eventId, … })` nutzen, Sonner merged damit dieselbe ID.
- [x] [Review][Patch] **Fragile Zod-Union mit `'eventId' in data`-Discriminator** [`packages/frontend/src/features/reminders/services/notification-setup.service.ts:154, 313`] — `typedCriticalSchema` hat `type: z.literal('critical')`, wird aber nicht als Discriminator genutzt; der manuelle `'eventId' in data`-Check kann mit Legacy-Payloads kollidieren. Fix: `z.discriminatedUnion('type', [...])` einsetzen und Parsing am `type`-Feld discriminieren.
- [x] [Review][Patch] **PushManager-Feature-Detect fehlt vor `.subscribe()`** [`packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx:55-57`] — Wenn `registration.pushManager` undefined ist (altes Safari), wirft der nachfolgende Call mit kryptischem TypeError. Fix: `if (!registration.pushManager) { logger.warn('[push] PushManager not supported'); return; }`.
- [x] [Review][Patch] **SW: `showNotification`- und `openWindow`-Promise ohne `.catch()`** [`packages/frontend/public/sw.js:44, 79-89`] — Rejections (quota exceeded, Permission-Revoke zur Laufzeit, Popup-Blocker, invalide URL) laufen durch `Promise.all`/`event.waitUntil` und markieren den SW als unhealthy. Fix: lokale `.catch(() => undefined)` auf beide Promises + strukturiertes Logging im SW (Console ist ok, da kein Logger injiziert werden kann).
- [x] [Review][Patch] **Doppelter `registerServiceWorker()`-Call (main.tsx + PushSubscriptionManager)** [`packages/frontend/src/main.tsx:22` + `push-subscription-manager.tsx:55`] — Beide rufen `registerServiceWorker()`; Browser dedupt zwar, aber doppelte Log-Einträge und redundante Latenz beim Boot. Fix: Single-Source — nur in `main.tsx` registrieren; Component konsumiert `navigator.serviceWorker.ready` direkt. Alternative: nur in Component registrieren, Call in main.tsx entfernen.
- [x] [Review][Patch] **`new URL(payload.endpoint)` im Erfolgs-Log wirft bei malformed Endpoint** [`packages/frontend/src/shared/ui/push-subscription-manager/push-subscription-manager.tsx:82`] — Log-Line steht NACH `hasSubscribedRef.current = true`, Exception landet im outer catch → fälschlicher `warn`-Eintrag trotz erfolgter Registrierung. Fix: lokales try/catch um `new URL(...)` oder direkt `payload.endpoint.slice(0, 64)` loggen.
- [x] [Review][Patch] **`new Notification(...)` in Web-Pfad wirft bei aktivem ServiceWorker** [`packages/frontend/src/features/reminders/services/notification.service.ts:443-462`] — In Chrome/Edge wirft der Constructor `TypeError: Illegal constructor`, wenn ein ServiceWorker die Page controllt. Fix: wenn `navigator.serviceWorker?.controller` existiert, über `(await navigator.serviceWorker.ready).showNotification(title, {...})` gehen; sonst Fallback auf `new Notification`.

**Defer (pre-existing oder out-of-scope):**

- [x] [Review][Defer] SW-Handler: Push ohne Body / Payload `text/plain` → silent return [`public/sw.js:26-36`] — Edge Case, Backend liefert aktuell immer JSON.
- [x] [Review][Defer] Channel-Error-Handling via Substring-Matching [`notification-setup.service.ts:277`] — Projektweites Pattern (Story 1.5 gleichlautend), aus 1.2-Scope raus.
- [x] [Review][Defer] `pushsubscriptionchange`-Event nicht abgefangen [`push-subscription-manager.tsx`] — Re-Subscription-Pfad bei abgelaufener Subscription; eigene Story.
- [x] [Review][Defer] Permission-Laufzeit-Wechsel via `navigator.permissions.query(...).addEventListener('change')` [`push-subscription-manager.tsx`] — Opt-in-UX, eigene Story.
- [x] [Review][Defer] `registration.update()`-Trigger in `registerServiceWorker` fehlt [`register-service-worker.ts:26-27`] — Deployment-Workflow, nicht story-kritisch.
- [x] [Review][Defer] `navigator.serviceWorker.ready` kann unendlich hängen [`useCriticalNotification.ts:60`] — sehr unwahrscheinlich, da `registerServiceWorker` in main.tsx beim Boot läuft.
- [x] [Review][Defer] Leerer `eventId` via TS-Bypass [`useCriticalNotification.ts`] — Defensive, TS-Vertrag schützt.
- [x] [Review][Defer] `maxEntries = 0`/negativ im `EventIdLruCache`-Konstruktor [`event-id-lru.ts:19`] — Internal API, Singleton-Nutzung.
- [x] [Review][Defer] Re-Subscription bei `vapidPublicKey`-Wechsel [`push-subscription-manager.tsx:97`] — Dev-Only (Hot-Reload), Prod-Env ist stabil.
- [x] [Review][Defer] `requireInteraction`-Inkonsistenz Web-Foreground (`true`) vs. SW (Default) — Story 1.1 `PushPayload`-Contract kennt keine Priority; Alignment braucht Contract-Erweiterung (Epic 3).
- [x] [Review][Defer] `onclick` löst Vollreload auch bei gleichem Pfad [`notification.service.ts:456-460`] — Router-Integration ist Epic 3.
- [x] [Review][Defer] SW: `title` nur Whitespace wird nicht getrimmt [`sw.js:38`] — Backend-DTO erzwingt `@IsNotEmpty`/min(1) auf Payload.
- [x] [Review][Defer] `icon: '/favicon.ico'` hardkodiert [`notification.service.ts:451`] — Konfigurierbar machen ist eigene Design-System-Aufgabe.

**Dismiss (Noise / False Positives):**

- `applicationServerKey: Uint8Array` — TS-DOM-Defs akzeptieren `BufferSource|null`, `Uint8Array` satisfies dies.
- `autoCancel: false` (Tauri) vs. `requireInteraction: true` (Web) — semantisch äquivalent auf den jeweiligen Plattformen.
- `.catch` nach `registerServiceWorker()` in `main.tsx` — dead code, aber bewusst defensiv, Noise.
- `useCallback([])` mit Module-Level-Imports — Module-Singletons sind per Design stabil; Test-Mocks werden VOR Import aufgelöst.
- `checkPermission` pro Hook-Call ohne externen Cache — Service cached intern.
- Action-Listener-Parse-Fehler-Pfad nicht im Diff — unsichtbarer Kontext, kein belastbares Finding.
