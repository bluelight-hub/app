# 9 — Integrationen & externe Systeme

> HiOrg-Server (OAuth2) · Nominatim (Geocoding) · HIBP (Password-Check) · WebSocket Einsatz-Events · Shared API-Client · Tauri Native-Bridges

---

## 9.1 Überblick

Bluelight Hub kommuniziert über klar getrennte Adapter mit externen Systemen. Die **Ports** leben in `packages/backend/src/domain/ports/`, die konkreten **Adapter** in `packages/backend/src/infrastructure/`.

```
Domain-Ports                    Infrastructure-Adapter
─────────────────────────────   ──────────────────────────────────────
IOAuth2, IHiorgServer       ─→  infrastructure/integrations/hiorg/
IAddressSuche, IPlzLookup   ─→  infrastructure/geocoding/
IEncryption                 ─→  infrastructure/security/
Password-Breach-Check       ─→  infrastructure/password/ (HIBP)
IEventPublisher             ─→  infrastructure/websocket/ (Socket.io)
ITokenService               ─→  infrastructure/auth/
```

---

## 9.2 HiOrg-Server (DRK)

### 9.2.1 Zweck

HiOrg-Server ist ein Mitgliederverwaltungs-System im DRK-Umfeld. Bluelight Hub synchronisiert von dort:

- Personen-Stammdaten (Name, Kontakt, Qualifikationen)
- Qualifikations-Mapping (extern → lokal)

### 9.2.2 OAuth2-Flow

1. **Admin authentifiziert** (AdminJwtAuthGuard) und startet OAuth2-Flow (`POST /api/v1/integrations/hiorg/connect`).
2. **Backend generiert** `state` (CUID2) → `OAuth2State`-Tabelle.
3. **Redirect** zum HiOrg-Auth-Endpoint mit `client_id`, `redirect_uri`, `state`.
4. **Callback** (`GET /api/v1/integrations/hiorg/callback`) tauscht `code` gegen Access + Refresh Token.
5. **Credential-Speicherung** in `IntegrationCredential` — `encryptedPayload` mit `MASTER_SECRET` (AES) verschlüsselt.
6. **Token-Refresh** automatisch bei Ablauf.

### 9.2.3 Personen-Import

- Admin-gesteuert: `POST /api/v1/integrations/hiorg/personen/preview` lädt Liste + Differenz-Snapshot.
- `POST /api/v1/integrations/hiorg/personen/import` übernimmt ausgewählte Personen als `StammPerson`.
- **Qualifikations-Mapping** (`QualifikationMapping`) dokumentiert, wie HiOrg-Qualifikationen auf lokale `Qualifikation`-Stammdaten abgebildet werden.

### 9.2.4 Konfiguration

Umgebungsvariablen (Backend):

```env
HIORG_CLIENT_ID=…
HIORG_CLIENT_SECRET=…
HIORG_AUTH_URL=…
HIORG_TOKEN_URL=…
HIORG_API_BASE_URL=…
HIORG_REDIRECT_URI=https://<host>/api/v1/integrations/hiorg/callback
```

---

## 9.3 Nominatim (Geocoding)

- **Zweck:** Adress-zu-Koordinaten-Auflösung für Einsatz-Stichwörter, Kartenmarker und POIs.
- **Port:** `IAddressSuche`, `IPlzLookup`.
- **Adapter:** `infrastructure/geocoding/` — HTTP-Adapter mit Retry (Circuit-Breaker aus `infrastructure/resilience/`).
- **Rate-Limiting:** Client-seitiger Throttle, zusätzliches Caching über `@nestjs/cache-manager`.
- **Datenschutz:** Nur öffentliche Adressbestandteile werden gesendet (keine personenbezogenen Daten).

---

## 9.4 Have-I-Been-Pwned (HIBP)

- **Zweck:** Passwort-Stärke-Prüfung gegen bekannte Leaks.
- **Adapter:** `infrastructure/password/` (k-Anonymity-API: nur Hash-Präfix wird gesendet).
- **Aufruf:** während `User`-Registrierung + `change-password`-Command.
- **Fail-Open-Strategie:** bei API-Ausfall wird Registrierung nicht blockiert (konfigurierbar).

---

## 9.5 WebSocket-Integration (`/ws/einsatz-events`)

### 9.5.1 Server-Seite (Backend)

- **Gateway:** `infrastructure/websocket/einsatz-events.gateway.ts`
- **Guard:** `WsJwtAuthGuard` — JWT-Cookie-Validierung.
- **Room-Modell:** `einsatz:{einsatzId}` (Join nach Authorisierungs-Check).
- **Publisher:** `EinsatzEventPublisher` (aus Infrastructure) emittiert Events an die jeweiligen Rooms.
- **Event-Quelle:** `OutboxPublisher` → Deserialized Domain Events → Publisher.

### 9.5.2 Client-Seite (Frontend)

- **Lib:** `socket.io-client 4.8`.
- **Verbindung:** lokal im Feature `funkverkehr/` (und kartenbezogen im `lagekarte/`) beim Einsatz-Detail-Route-Mount.
- **Auth:** Cookie-basiert — Socket.io schickt Cookies automatisch (gleiche Origin).
- **Pattern:**
  ```ts
  const socket = io('/ws/einsatz-events', { withCredentials: true });
  socket.on('funkkanal.created', (payload) => { /* Query invalidieren */ });
  ```

### 9.5.3 Konsumierte Events (ADR-006)

| Bereich              | Events (Auswahl)                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Funkkanal            | `FunkkanalCreated / Closed / PrioritaetChanged`, `FunkkanalZuordnungAdded / Removed`       |
| Funkspruch (ETB)     | `EtbEintragAdded` (Kategorie `FUNKSPRUCH`)                                                  |
| Kartenänderungen     | `LagekarteStateUpdated`, `TaktischesZeichenPlaced / Updated / Removed`                     |
| Gefahrenmatrix       | `GefahrenmatrixBewertungChanged` (ADR-010)                                                 |
| Befehle              | `BefehlErteilt / Zugestellt / Quittiert / KommentarHinzugefuegt`                           |
| Alarmierungen        | `AlarmierungEmpfaengerZugestellt / Quittiert / FmsZeitpunktGesetzt`                        |
| Erinnerungen         | `ErinnerungAusgeloest / Eskaliert / Acknowledged`                                          |

> **Dokumentations-Lücke:** Ein vollständiger und kuratierter WebSocket-Event-Katalog mit Payloads wäre eine sinnvolle Ergänzung. Als temporäre Referenz dient der Event-Serializer (107 Cases in `infrastructure/outbox/event-serializer.ts`).

---

## 9.6 Shared API-Client (OpenAPI)

### 9.6.1 Ziel

Vollständig typsicherer Kommunikationskanal zwischen Frontend (Tauri/Web) und Backend. Kein manueller `fetch()` im Frontend.

### 9.6.2 Struktur

```
packages/shared/
├── openapitools.json
├── scripts/generate-openapi-client.mjs
├── client/            # Alpha (generiert aus /api/alpha-json)
├── client-v1/         # V1 (generiert aus /api/v1-json)
├── src/schemas/       # Zod-Schemas (auth/, ggf. weitere)
├── src/validation/    # Plain-JS-Validatoren (ohne Zod)
├── ARCHITECTURE.md
├── INTEGRATION_EXAMPLES.md
├── QUICK_REFERENCE.md
└── SHARED_SCHEMAS_SUMMARY.md
```

### 9.6.3 Pipeline

```bash
pnpm run generate-api           # ruft in shared: generate-api:all auf
# ├── Spec laden (alpha + v1)
# ├── typescript-fetch Generator
# ├── oxlint + oxfmt auf generierten Code
# └── TS-Kompilat → dist/
```

- **527 TS-Dateien** im Alpha-Client (52 API-Klassen, 475 Modelle).
- **Verwendung:** `api.einsatz().einsatzControllerFindAllVAlpha({...})` (Fluent API pro Tag).

### 9.6.4 Frontend-Bridge

```
packages/frontend/src/shared/api/
├── api.ts                  # Baut API-Instanzen pro Tag mit fetchApi: fetchWithRefresh
├── fetchWithRefresh.ts     # 401 → Token-Refresh-Queue → Retry
├── serverStore.ts          # Multi-Server-Support (aktiver Server)
└── configuration.ts        # baseUrl, credentials: 'include'
```

**Token-Accessor:** `shared/lib/server-access-token.ts` (`getServerAccessToken()`, Fehler-Erkennung: `Invalid or revoked server access token`).

### 9.6.5 Zod-Schemas (geteilt)

Aus `packages/shared/src/schemas/auth/`:

- `usernameSchema`, `passwordSchema`, `inviteCodeSchema` (+ normalisierte Variante), `serverUrlSchema`.
- **Backend:** `@ValidateWithZod(schema)` auf DTOs.
- **Frontend:** direkt im TanStack Form + `zodValidator`.

Weitere Zod-Schemas leben **feature-lokal** in `packages/frontend/src/features/*/schemas/`.

---

## 9.7 Tauri Native-Bridges

| Bridge                             | Zweck                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| `tauri-plugin-store` / Stronghold  | Lokale, verschlüsselte Key-Value-Persistenz (siehe `frontend-tauri-plugin-store-setup.md`) |
| `tauri-plugin-deep-link`           | `bluelight://…`-Scheme (für eingehende Links)                  |
| `tauri-plugin-notification`        | Desktop-Benachrichtigungen für Erinnerungen / Alarmierungen   |
| `tauri-plugin-http`                | HTTP-Bridge (umgeht CORS-Probleme im Desktop-Modus)           |
| `tauri-plugin-barcode-scanner`     | Nur Mobile (QR-Code für Einsatz-Beitritt)                     |
| Custom `play_sound` / Tray-Commands | Audio-Alerts (Rodio) + System-Tray                            |

**Plattform-Entscheidung (ADR Platform Storage):** Desktop-Apps nutzen Stronghold, Web-Apps nutzen `localStorage`/`IndexedDB` — gekapselt in `docs/development-guide/code-conventions.md` (Platform Storage Adapter Pattern).

---

## 9.8 Push-, SMS-, Tauri-Benachrichtigungen

Im Backend existiert `infrastructure/integrations/` für externe Publisher. Aktuelle Stellen:

- **Integration-Verwaltung:** Admin-UI für aktive Integrationen.
- **Event-Adapter:** Domain-Events werden über Integrations-Adapter nach extern publiziert (Pattern dokumentiert in `docs/backend/patterns/event-adapters.md`).

> Genaue Kanäle (SMS-Provider, Push-Gateway) werden projektabhängig konfiguriert — aktuell nicht hart-verdrahtet.

---

## 9.9 Dateneingänge / -ausgänge

| Richtung | Technologie                                           | Zweck                                              |
| -------- | ----------------------------------------------------- | -------------------------------------------------- |
| Eingang  | OAuth2 (HiOrg)                                        | Personen-Import                                    |
| Eingang  | Nominatim HTTP                                        | Geocoding                                          |
| Eingang  | HIBP HTTP                                             | Passwort-Breach-Check                              |
| Ausgang  | WebSocket (Socket.io)                                 | Live-Sync an Clients                                |
| Ausgang  | Export (PDF / CSV / JSON)                             | Einsatz-/Befehl-/ETB-Exporte (`infrastructure/export/`) |
| Ausgang  | Tauri Native Notification / Sound                     | Erinnerungen, Alarmierungen                        |

---

## 9.10 Sicherheit bei Integrationen

- **Secret-at-Rest:** `IntegrationCredential.encryptedPayload` via AES (`infrastructure/security/`).
- **OAuth2 `state`:** CUID2, einmalig verbrauchbar.
- **Input-Validation:** Zod-Schemas + Domain-Invarianten.
- **Circuit-Breaker / Retry:** für externe Aufrufe (`infrastructure/resilience/`).
- **Request-Logging:** Mit `requestId` (CUID2) konsistent über den Call-Stack (Meta-Feld im Response-Envelope, siehe Kapitel 4).

---

## 9.11 Referenzen

- **Deep-Dive Externe Systeme (2026-01):** `docs/deep-dive-externe-system-schnittstellen.md`
- **Deep-Dive Frontend/Backend-Integration:** `docs/deep-dive-frontend-backend-integration.md`
- **API-Versionierung:** `docs/api-versioning.md`
- **Shared-Package:** `packages/shared/ARCHITECTURE.md`, `INTEGRATION_EXAMPLES.md`, `QUICK_REFERENCE.md`, `SHARED_SCHEMAS_SUMMARY.md`
- **Tauri Store:** `docs/frontend-tauri-plugin-store-setup.md`
- **Platform Storage Research:** `docs/frontend/platform-storage-research.md`
- **ADR-002** (Runtime-Konfig / Secrets), **ADR-006** (WebSocket), **ADR-007/008** (Funkkanal / Zuordnung)
