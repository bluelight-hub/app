# ADR-006: WebSocket-Event-Bus einsatz-scoped

## Status

Akzeptiert (2026-04-15)

## Kontext

Der Funkprotokoll-Tab und die Kanalplan-Tabelle müssen live aktualisiert werden, sobald ein anderer Nutzer Funksprüche erfasst oder Kanäle ändert. Bisher läuft die Frontend-Aktualisierung ausschließlich über TanStack Query mit klassischer Poll-/Refetch-Semantik. Das skaliert für chat-artige Live-Ansichten nicht, und wiederholte Refetches belasten die DB ohne Nutzen, wenn sich nichts geändert hat.

Es gibt in der Code-Basis bisher keinen produktiven WebSocket-Kanal, nur vereinzelte Infrastruktur-Bausteine (`MonitoringGateway`). Ein systemweites Event-Bus-Design fehlt.

## Entscheidung

Wir führen ein einsatz-scoped WebSocket-Gateway ein:

- **Namespace:** `/ws/einsatz-events`
- **Room-Pattern:** `einsatz:{einsatzId}` — Clients treten genau den Räumen bei, auf deren Einsatz sie aktuell arbeiten
- **Transport:** socket.io via `@nestjs/websockets`
- **Auth:** JWT-Handshake mit bestehender Session-Auth (Bearer-Token aus Cookie-Session oder Header); pro Einsatz wird die Membership geprüft, bevor der Beitritt zum Room erlaubt wird
- **Semantik:** Broadcasts enthalten **Notifications**, keinen State. Clients invalidieren daraufhin TanStack-Query-Caches und laden via HTTP neu. Die einzigen Rich-Data-Payloads sind Notfall-Alerts (`funk:notfall-alert` mit Text + Absender), damit Toasts ohne Zusatz-Request erscheinen können.
- **Reconnect:** Client-seitig mit exponentiellem Backoff (Start 500 ms, Cap 10 s). Während der Trennung erscheint ein Offline-Banner; nach Reconnect werden betroffene Queries invalidiert.
- **Publisher:** Infrastructure-Adapter (z. B. `EinsatzEventPublisher`) hören auf Domain-Events (`FunkkanalErstellt`, `EintragAdded`, `NotfallAlertRequested`) und leiten ins Gateway weiter.

## Konsequenzen

### Positiv

- Klare Trennung: Domain-Events sind Source of Truth, WebSocket ist reine Broadcast-Schicht.
- Kein Cache-Consistency-Problem: Clients refetchen nach jedem Signal, keine Divergenz zwischen WS-Payload und HTTP-State.
- Room-Scope verhindert Cross-Einsatz-Leckagen.
- Reconnect-Strategie ist lokal am Client — Gateway bleibt stateless.

### Negativ

- Zwei Runden (Notification + Refetch) pro Event — höhere Latenz als Rich-Payloads, dafür Konsistenz.
- Notfall-Alerts sind die Ausnahme-Payload-Variante — Risiko, die "nur Notifications"-Regel zu verwässern. Policy: Ausnahmen müssen explizit im ADR-Anhang dokumentiert werden.
- JWT-Handshake braucht eigenes Onboarding für Nicht-Browser-Clients (Tauri nutzt Session-Cookies).

## Alternativen

### 1. Server-Sent Events (SSE)

Abgelehnt: keine Bidirektionalität, schlechtere Browser-Verhaltensgarantien bei Proxies, weniger Ecosystem-Support (NestJS + Tauri) als socket.io.

### 2. Poll-only (TanStack Query `refetchInterval`)

Abgelehnt: für chat-artige Protokoll-Ansichten unzumutbare Latenz + Last. Auch mit `staleTime` laufen Polls auf jede offene Session.

### 3. Einzelne namespaces pro Aggregat (`/ws/funkkanal`, `/ws/etb`)

Abgelehnt: Client bräuchte mehrere Connections, Room-Auth dupliziert sich. Ein Namespace mit typisiertem Event-Diskriminator ist einfacher.

## Referenzen

- [Plan: Funkverkehr Kanalplan & Funkprotokoll](../superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md)
- [NotfallAlertRequestedEvent](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/events/notfall-alert-requested.event.ts)
