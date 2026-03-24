# Deep-Dive: Externe System-Schnittstellen

> **Generiert:** 2026-01-05
> **Letzte Aktualisierung:** 2026-02-19
> **Quelle:** Projekt-Scan v1.2.0
> **Scan-Level:** Exhaustive
> **Dateien analysiert:** 78
> **Lines of Code:** ~5.800 LOC

---

## 1. Überblick

Das Bluelight-Hub Backend integriert sich mit folgenden externen Systemen:

| System | Zweck | Protokoll | Authentifizierung |
|--------|-------|-----------|-------------------|
| **HiOrg-Server** | Personalverwaltung (Kräfte-Synchronisation) | REST (JSON:API) | OAuth2 + PKCE |
| **Nominatim (OSM)** | Geocoding (Adresse <-> Koordinaten) | REST (JSON) | User-Agent Header |
| **HIBP (Have I Been Pwned)** | Passwort-Kompromittierungsprüfung | REST (Text) | User-Agent Header |

Zusätzlich nutzt das Frontend lokale Plattform-APIs für Benachrichtigungen:

| System | Zweck | Protokoll | Verfügbarkeit |
|--------|-------|-----------|---------------|
| **Tauri Notification Plugin** | Native OS-Benachrichtigungen | IPC (Tauri Plugin) | Desktop (Tauri) |
| **Web Notification API** | Browser-Benachrichtigungen | Browser API | Web (Fallback) |
| **Navigator Badge API** | App-Badge-Counter | Browser API | Web + PWA |

Die Integration folgt der **Hexagonal Architecture** mit klarer Trennung:
- **Domain Layer:** Ports (Interfaces) definieren Contracts
- **Application Layer:** Use Cases orchestrieren Business-Logik
- **Infrastructure Layer:** Adapters implementieren externe API-Calls
- **Module Layer:** REST Controller exponieren Admin-API

---

## 2. Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REST API (Module Layer)                         │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────┐ │
│  │  OAuthCallbackController │  │  AdminHiOrgIntegrationController      │ │
│  │  GET /oauth/hiorg/callback│  │  GET/POST /admin/integrations/hiorg/*│ │
│  └────────────┬─────────────┘  └──────────────────┬────────────────────┘ │
└───────────────┼───────────────────────────────────┼─────────────────────┘
                │                                   │
                ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Application Layer (Use Cases)                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐│
│  │ InitiateOAuth   │ │ ProcessCallback │ │ TestHiOrgConnection         ││
│  │ FlowHandler     │ │ Handler         │ │ Handler                     ││
│  └────────┬────────┘ └────────┬────────┘ └────────────┬────────────────┘│
│           │                   │                       │                  │
│  ┌────────┴───────────────────┴───────────────────────┴────────────────┐│
│  │                   HiOrgTokenRefreshService                          ││
│  │           (Automatischer Token-Refresh bei Ablauf)                  ││
│  └─────────────────────────────┬───────────────────────────────────────┘│
│                                │                                         │
│  ┌─────────────────┐ ┌─────────┴───────┐ ┌─────────────────────────────┐│
│  │ PreviewHiOrg    │ │ ImportSelected  │ │ AutoMatchQualifikationen    ││
│  │ PersonsHandler  │ │ PersonsHandler  │ │ Handler                     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
                │                   │                   │
                ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Domain Layer (Ports)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ IOAuth2Port  │ │IHiOrgServer  │ │IEncryption   │ │IHiOrgOAuthConfig│ │
│  │              │ │Port          │ │Port          │ │Port             │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └────────┬────────┘ │
│         │                │                │                  │          │
│  ┌──────┴────────────────┴────────────────┴──────────────────┴────────┐ │
│  │                    Domain Entities & Repositories                   │ │
│  │  IntegrationCredential │ OAuth2State │ QualifikationMapping         │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────┐                                                    │
│  │ IGeocodingPort  │ (für Lagekarte + allg. Geocoding)                  │
│  └──────┬──────────┘                                                    │
└─────────┼───────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer (Adapters)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ OAuth2Adapter│ │HiOrgServer   │ │AesEncryption │ │HiOrgOAuthConfig │ │
│  │              │ │Adapter       │ │Adapter       │ │Adapter          │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────────┘ └─────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                                      │
│  │ Nominatim    │ │ HibpService  │                                      │
│  │ Geocoding    │ │ (Passwort-   │                                      │
│  │ Adapter      │ │  Check)      │                                      │
│  └──────┬───────┘ └──────┬───────┘                                      │
│         │                │                                               │
│         ▼                ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Externe Systeme (HTTP)                            ││
│  │  ┌─────────────────────────────┐  ┌───────────────────────────────┐ ││
│  │  │ HiOrg-Server API            │  │ Nominatim API                 │ ││
│  │  │ https://api.hiorg-server.de │  │ https://nominatim.openstreetmap.org │ ││
│  │  │ OAuth2 + JSON:API           │  │ REST + JSON                   │ ││
│  │  └─────────────────────────────┘  └───────────────────────────────┘ ││
│  │  ┌─────────────────────────────┐                                    ││
│  │  │ HIBP Pwned Passwords API    │                                    ││
│  │  │ https://api.pwnedpasswords.  │                                    ││
│  │  │ com/range/{prefix}           │                                    ││
│  │  │ K-Anonymity + Text Response  │                                    ││
│  │  └─────────────────────────────┘                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

Frontend Notification Layer (lokal, keine Backend-Abhängigkeit):
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌───────────────────┐  ┌───────────────────┐ │
│  │ NotificationService │  │ NotificationSetup │  │ BefehlNotification│ │
│  │ (send, permission)  │  │ (Channels, Actions│  │ Hook (Badge, Push)│ │
│  └──────────┬──────────┘  │  Handler)         │  └───────────────────┘ │
│             │             └───────────────────┘                         │
│             ▼                                                           │
│  ┌─────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │ Tauri Notification Plugin   │  │ Web Notification API (Fallback)   │ │
│  │ @tauri-apps/plugin-notif.   │  │ window.Notification               │ │
│  │ Native OS Notifications     │  │ Browser Notifications             │ │
│  └─────────────────────────────┘  └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Layer

### 3.1 Ports (Interfaces)

#### IEncryptionPort
**Zweck:** AES-256-GCM Verschlüsselung für API-Tokens

```typescript
interface IEncryptionPort {
  encrypt(plainText: string): string;  // -> "{iv}:{authTag}:{cipherText}"
  decrypt(cipherText: string): string;
}
```

**Sicherheit:**
- Algorithmus: AES-256-GCM (Authenticated Encryption)
- IV: 16 Bytes, pro Verschlüsselung neu generiert
- Key: ENV `INTEGRATION_ENCRYPTION_KEY` (64 hex chars = 32 bytes)

---

#### IOAuth2Port
**Zweck:** OAuth2 Authorization Code Flow mit PKCE (RFC 7636)

```typescript
interface IOAuth2Port {
  generateAuthorizationUrl(options: {
    authorizationUrl: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
  }): OAuth2AuthorizationUrlResponse;

  exchangeCodeForTokens(options: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  }): Promise<Result<OAuth2TokenResponse>>;

  refreshAccessToken(options: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  }): Promise<Result<OAuth2TokenResponse>>;
}
```

**Sicherheit:**
- PKCE mit S256 (SHA-256) Code Challenge
- State Token für CSRF-Schutz (64 hex chars)
- Code Verifier: 43-128 Zeichen (RFC 7636)

---

#### IHiOrgServerPort
**Zweck:** HiOrg-Server REST API Client

```typescript
interface IHiOrgServerPort {
  testConnection(token: string): Promise<Result<HiOrgConnectionInfo>>;
  fetchPersons(token: string, options?: HiOrgFetchOptions): Promise<Result<HiOrgPersonDto[]>>;
}
```

**API-Endpoints:**
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/core/v1/organisation/selbst/stammdaten` | GET | Organisations-Info (Connection Test) |
| `/core/v1/personal` | GET | Alle Personen laden |
| `/core/v1/personal/{id}/ausbildungen` | GET | Ausbildungen pro Person |

**Rate Limiting:** 30 req/min (2s Mindestabstand)

---

#### IHiOrgOAuthConfigPort
**Zweck:** OAuth2 Client Credentials aus Umgebungsvariablen

```typescript
interface IHiOrgOAuthConfigPort {
  isConfigured(): boolean;
  getClientCredentials(): HiOrgOAuthClientCredentials | undefined;
  getClientId(): string | undefined;
  getRedirectUri(): string;  // {APP_URL}/api/oauth/hiorg/callback
}
```

**Konfiguration:**
- `HIORG_OAUTH_CLIENT_ID`
- `HIORG_OAUTH_CLIENT_SECRET`
- `APP_URL` (Default: `http://localhost:3091`)

---

#### IGeocodingPort
**Zweck:** Geocoding-Service für Adress-Koordinaten-Umwandlung

```typescript
interface IGeocodingPort {
  geocodeAddress(address: Address): Promise<Result<GeoCoordinate>>;
  reverseGeocode(coordinate: GeoCoordinate): Promise<Result<Address>>;
}
```

**Implementierungen:**
- `NominatimGeocodingAdapter` (Infrastructure Layer) - Hexagonale Implementierung mit Result Pattern
- `GeocodingService` (Lagekarte Module Layer) - Direkte Nominatim-Nutzung via `HttpService`

---

### 3.2 Entities

#### IntegrationCredential
**Zweck:** OAuth2-Zugangsdaten (verschlüsselt gespeichert)

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `id` | string | CUID Primary Key |
| `type` | IntegrationType | z.B. "HIORG_SERVER" |
| `isActive` | boolean | Integration aktiv? |
| `encryptedAccessToken` | string? | AES-256-GCM verschlüsselt |
| `encryptedRefreshToken` | string? | AES-256-GCM verschlüsselt |
| `accessTokenExpiresAt` | Date? | Token-Ablaufzeit |
| `lastTestedAt` | Date? | Letzter erfolgreicher Test |
| `lastSyncAt` | Date? | Letzte Synchronisation |

**Business Logic:**
- `isAccessTokenExpired`: Prüft mit 5-Min-Buffer vor echtem Ablauf
- Tokens werden NIEMALS in API-Responses exponiert

---

#### OAuth2State
**Zweck:** Temporärer State für OAuth2 CSRF-Schutz (max. 10 Min)

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `state` | string | CSRF-Token (min. 32 Zeichen) |
| `codeVerifier` | string | PKCE Verifier (43-128 Zeichen) |
| `integrationType` | string | z.B. "HIORG_SERVER" |
| `redirectUri` | string | Callback URI |
| `expiresAt` | Date | Ablaufzeit (+10 Min) |

**Lifecycle:**
1. Erstellt bei OAuth-Start
2. Validiert bei Callback
3. Gelöscht nach Token-Exchange (One-Time-Use)

---

#### QualifikationMapping
**Zweck:** Mapping externe -> interne Qualifikationen

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `externalName` | string | z.B. "Gruppenführer" (aus HiOrg) |
| `externalSource` | IntegrationType | z.B. "HIORG_SERVER" |
| `qualifikationId` | string? | Gemappte interne Qualifikation |
| `isAutoMatched` | boolean | Automatisch via Levenshtein? |
| `confidence` | number? | Match-Konfidenz (0-100) |

**Auto-Match Konfiguration:**
```typescript
const AUTO_MATCH_CONFIG = {
  EXACT_MATCH_SCORE: 100,
  LEVENSHTEIN_THRESHOLD: 0.85,  // 85% Ähnlichkeit
  SHORT_NAME_BONUS: 10,
  MIN_CONFIDENCE_FOR_SUGGESTION: 70,
};
```

---

### 3.3 Error Codes

```typescript
const INTEGRATION_ERROR_CODES = {
  CREDENTIALS_NOT_FOUND: 'INTEGRATION_001',
  CONNECTION_FAILED: 'INTEGRATION_002',
  INVALID_TOKEN: 'INTEGRATION_003',
  FEATURE_LOCKED: 'INTEGRATION_004',
  RATE_LIMITED: 'INTEGRATION_005',
  ENCRYPTION_FAILED: 'INTEGRATION_007',
  DECRYPTION_FAILED: 'INTEGRATION_008',
  OAUTH_STATE_INVALID: 'INTEGRATION_010',
  OAUTH_CODE_EXCHANGE_FAILED: 'INTEGRATION_011',
  OAUTH_TOKEN_REFRESH_FAILED: 'INTEGRATION_012',
  OAUTH_NOT_CONFIGURED: 'INTEGRATION_013',
  IMPORT_FAILED: 'INTEGRATION_017',
  MAPPING_NOT_FOUND: 'INTEGRATION_018',
  // ... 22 Codes insgesamt
};
```

---

## 4. Application Layer

### 4.1 Commands

| Command | Input | Output | Beschreibung |
|---------|-------|--------|--------------|
| `InitiateOAuthFlowCommand` | `integrationType`, `userId` | `authorizationUrl` | Startet OAuth2 Flow |
| `ProcessOAuthCallbackCommand` | `code`, `state` | `void` | Verarbeitet OAuth Callback |
| `TestHiOrgConnectionCommand` | `userId` | `HiOrgConnectionInfo` | Testet Verbindung |
| `SaveQualifikationMappingCommand` | `mappingId`, `qualifikationId` | `UpdateMappingResult` | Speichert Mapping |
| `AutoMatchQualifikationenCommand` | `source`, `onlyUnmapped` | `AutoMatchResult` | Auto-Matching |
| `BatchSaveQualifikationMappingsCommand` | `mappings[]` | `{ saved, ignored }` | Batch-Save |
| `ImportSelectedPersonsCommand` | `usernames[]`, `duplicateStrategy` | `ImportResult` | Person-Import |

### 4.2 Queries

| Query | Input | Output | Beschreibung |
|-------|-------|--------|--------------|
| `GetHiOrgCredentialsQuery` | - | `HiOrgCredentialsDto` | OAuth-Status abfragen |
| `GetQualifikationMappingsQuery` | `source`, `onlyUnmapped` | `MappingsResponse` | Mappings laden |
| `PreviewHiOrgPersonsQuery` | `activeOnly` | `PersonsPreview` | Personen-Vorschau |

### 4.3 Services

#### HiOrgTokenRefreshService
**Zweck:** Automatischer OAuth2 Token-Refresh

```typescript
class HiOrgTokenRefreshService {
  async getValidAccessToken(): Promise<Result<ValidTokenResult>>;
}

interface ValidTokenResult {
  accessToken: string;           // Entschlüsseltes, gültiges Token
  credential: IntegrationCredential;
  wasRefreshed: boolean;         // War Token gerade refreshed?
}
```

**Logik:**
1. Credentials laden
2. Prüfen ob Access Token abgelaufen
3. Bei Ablauf: Refresh Token nutzen, neue Tokens speichern
4. Access Token entschlüsseln und zurückgeben

---

## 5. Infrastructure Layer

### 5.1 Adapters

#### OAuth2Adapter
**Implementiert:** `IOAuth2Port`

**Externe Endpoints:**
- Token Exchange: `POST {tokenUrl}` (Form-encoded)
- Token Refresh: `POST {tokenUrl}` (Form-encoded)

**PKCE Implementation:**
```typescript
// Code Verifier: 43-128 Zeichen, Base64URL
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Code Challenge: SHA-256 Hash des Verifiers
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

---

#### HiOrgServerAdapter
**Implementiert:** `IHiOrgServerPort`

**API-Konfiguration:**
- Base URL: `https://api.hiorg-server.de/core/v1`
- Content-Type: `application/vnd.api+json` (JSON:API)
- Auth: `Authorization: Bearer {accessToken}`
- Timeout: 10 Sekunden
- Rate Limit: 2000ms zwischen Requests

**Error Mapping:**
| HTTP Status | Error Code |
|-------------|------------|
| 401 | `INVALID_TOKEN` |
| 403 | `CONNECTION_FAILED` |
| 423 | `FEATURE_LOCKED` |
| 429 | `RATE_LIMITED` |
| 5xx | `CONNECTION_FAILED` |

---

#### NominatimGeocodingAdapter
**Implementiert:** `IGeocodingPort`

**API-Konfiguration:**
- Base URL: `https://nominatim.openstreetmap.org`
- User-Agent: `Bluelight-Hub/1.0 (contact@bluelight-hub.app)` (PFLICHT!)
- Rate Limit: 1 req/sec (1000ms Mindestabstand)
- Timeout: 5 Sekunden
- Retry: Exponential Backoff bei HTTP 429 (max. 3 Versuche)
- Lifecycle: Implementiert `OnModuleDestroy` für sauberes Timeout-Cleanup

**Endpoints:**
- Geocoding: `GET /search?q={address}&format=json&countrycodes=de`
- Reverse: `GET /reverse?lat={lat}&lon={lon}&format=json&addressdetails=1`

**Hinweis:** Zusätzlich existiert ein `GeocodingService` im Lagekarte-Modul (`modules/lagekarte/services/geocoding.service.ts`), der Nominatim direkt via `HttpService` (axios) nutzt. Dieser Service bietet nur Forward-Geocoding und verwendet `@Throttle` für Rate-Limiting. Langfristig sollte er auf den hexagonalen `NominatimGeocodingAdapter` migriert werden.

---

#### HibpService (NEU seit 2026-01-16)
**Zweck:** Passwort-Kompromittierungsprüfung via Have I Been Pwned API

**API-Konfiguration:**
- Base URL: `https://api.pwnedpasswords.com/range/`
- User-Agent: `bluelight-hub-password-check`
- Timeout: 10 Sekunden
- Kein API-Key erforderlich

**K-Anonymity Protokoll (Datenschutz):**
1. SHA-1 Hash des Passworts erstellen (nur lokal)
2. Nur die ersten 5 Zeichen des Hashes an HIBP senden
3. HIBP antwortet mit allen Hash-Suffixen die mit diesem Prefix beginnen
4. Lokaler Vergleich des vollständigen Hashes mit der Antwort

**Sicherheitshinweise:**
- Das Passwort oder sein vollständiger Hash verlässt **niemals** den Server
- SHA-1 wird hier bewusst und sicher eingesetzt (HIBP API-Spezifikation, nicht für Passwort-Speicherung)
- Passwörter werden separat mit bcrypt gehasht und gespeichert
- NIST SP 800-63B-4 Compliance: Prüfung ist OPTIONAL -- API-Fehler blockieren die Validierung nicht
- Padding-Header (`Add-Padding: true`) für zusätzliche Privatsphäre

**Response Format:**
```
// Request: GET /range/21BD1 (erste 5 Zeichen des SHA-1 Hashes)
// Response (Text, eine Zeile pro Match):
0018A45C4D1DEF81644B54AB7F969B88D65:15
00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2
...
// Format: HASH_SUFFIX:OCCURRENCE_COUNT
```

**Fehlerbehandlung:**
| Situation | Verhalten |
|-----------|-----------|
| API nicht erreichbar | `isCompromised: false` + `error` (kein Block) |
| HTTP Fehler (4xx/5xx) | `isCompromised: false` + `error` (kein Block) |
| Timeout | `isCompromised: false` + `error` (kein Block) |
| Passwort gefunden | `isCompromised: true` + `occurrences: N` |

---

#### AesEncryptionAdapter
**Implementiert:** `IEncryptionPort`

**Konfiguration:**
- Algorithmus: `aes-256-gcm`
- Key: ENV `INTEGRATION_ENCRYPTION_KEY` (64 hex = 32 bytes)
- IV: 16 bytes (random pro Verschlüsselung)
- Auth Tag: 16 bytes

**Output Format:** `{base64(iv)}:{base64(authTag)}:{base64(cipherText)}`

**Sicherheit:**
- Hard-Fail bei fehlender/ungültiger Key-Konfiguration
- Keine Fallbacks - App startet nicht ohne Key

---

### 5.2 Repositories (Prisma)

| Repository | Prisma Model | Unique Constraint |
|------------|--------------|-------------------|
| `PrismaIntegrationCredentialRepository` | `IntegrationCredential` | `type` |
| `PrismaOAuth2StateRepository` | `OAuth2State` | `state` |
| `PrismaQualifikationMappingRepository` | `QualifikationMapping` | `(externalName, externalSource)` |

### 5.3 Scheduled Tasks

| Task | Schedule | Funktion |
|------|----------|----------|
| `OAuth2StateCleanupTask` | EVERY_HOUR | Löscht abgelaufene OAuth2 States |

---

## 6. Module Layer (REST API)

### 6.1 HiOrg-Integration Endpoints

| Method | Endpoint | Auth | Rate | Beschreibung |
|--------|----------|------|------|--------------|
| GET | `/oauth/hiorg/callback` | - | - | OAuth2 Callback (Redirect) |
| GET | `/admin/integrations/hiorg/credentials` | Admin | 30/min | Credentials-Status |
| POST | `/admin/integrations/hiorg/test` | Admin | 10/min | Verbindung testen |
| POST | `/admin/integrations/hiorg/oauth/initiate` | Admin | 10/min | OAuth Flow starten |
| GET | `/admin/integrations/hiorg/persons` | Admin | 30/min | Personen-Vorschau |
| GET | `/admin/integrations/hiorg/qualifikation-mappings` | Admin | 30/min | Mappings laden |
| POST | `/admin/integrations/hiorg/qualifikation-mappings` | Admin | 10/min | Mapping speichern |
| POST | `/admin/integrations/hiorg/qualifikation-mappings/auto-match` | Admin | 10/min | Auto-Match |
| POST | `/admin/integrations/hiorg/qualifikation-mappings/batch` | Admin | 10/min | Batch-Save |
| POST | `/admin/integrations/hiorg/import` | Admin | 10/min | Personen importieren |

### 6.2 WebSocket Gateway: Befehle (NEU seit 2026-02)

**Namespace:** `/befehle`
**Room-Pattern:** `einsatz:{einsatzId}:befehle`

Der Befehl-WebSocket-Gateway ermöglicht Echtzeit-Kommunikation für das Befehlsmanagement im Einsatz. Er ist zwar keine externe Schnittstelle im engeren Sinne, aber eine relevante Kommunikationsschnittstelle zwischen Frontend und Backend.

**Events:**

| Event | Richtung | Payload | Beschreibung |
|-------|----------|---------|--------------|
| `join:einsatz` | Client -> Server | `{ einsatzId }` | Room beitreten |
| `leave:einsatz` | Client -> Server | `{ einsatzId }` | Room verlassen |
| `befehl.erstellt` | Server -> Client | `BefehlErstelltPayload` | Neuer Befehl erstellt |
| `befehl.zugestellt` | Server -> Client | `BefehlZugestelltPayload` | Befehl zugestellt |
| `befehl.statusGeaendert` | Server -> Client | `BefehlStatusGeaendertPayload` | Status geändert. ⚠️ Wird vom Backend emittiert, aber vom Frontend derzeit nicht abonniert. |
| `befehl.kommentarHinzugefuegt` | Server -> Client | `BefehlKommentarHinzugefuegtPayload` | Kommentar hinzugefügt |
| `befehl.quittiert` | Server -> Client | `BefehlQuittiertPayload` | Befehl quittiert |

**Security:**
- CORS: Nur `FRONTEND_URL` erlaubt (kein Wildcard)
- Authentication: JWT Token bei Connection (WsJwtAuthGuard)
- Authorization: einsatzId wird als UUID v4 validiert (verhindert Room Traversal)
- Input Validation: `JoinEinsatzDto` mit class-validator

**Client-Konfiguration (Frontend):**
- Transport: WebSocket mit Polling-Fallback
- Reconnection: Exponential Backoff (1s - 10s, max. 10 Versuche)
- Deduplizierung: Event-IDs Set (max. 500 Einträge)
- Cache-Invalidierung: TanStack Query `invalidateQueries` bei Events

### 6.3 Security

- **Auth Guards:** `JwtAuthGuard` + `RolesGuard`
- **Rollen:** `ADMIN`, `SUPER_ADMIN`
- **Rate Limiting:** 30/min (GET), 10/min (POST)
- **Token-Schutz:** Tokens werden NIEMALS in Responses zurückgegeben

---

## 7. Frontend: Notification-Schnittstellen (NEU seit 2026-01)

### 7.1 Notification Service

**Datei:** `packages/frontend/src/features/reminders/services/notification.service.ts`

Der Notification Service implementiert ein Dual-Layer-System für OS-Benachrichtigungen:

**Schicht 1: Tauri Native Notifications (Desktop)**
- Plugin: `@tauri-apps/plugin-notification`
- IPC-basiert (Tauri Plugin System)
- Channels mit High Importance (Priorität 4)
- Action Types für Deep Link Navigation

**Schicht 2: Web Notification API (Browser-Fallback)**
- Standard `window.Notification` API
- Auto-Close nach 5 Sekunden (Erinnerungen)
- `requireInteraction: true` (Befehle)

**Badge Count (separat vom NotificationService):**
- Implementiert in der `updateAppBadge()`-Hilfsfunktion in `use-befehl-notifications.ts`
- Tauri: `setBadgeCount()` via `@tauri-apps/plugin-notification`
- Web: `navigator.setAppBadge()` / `navigator.clearAppBadge()`
- Der NotificationService selbst implementiert nur `send`, `sendBefehlNotification`, `sendErinnerungNotification` etc.

**Notification-Typen:**

| Methode | Zweck | Channel (Tauri) | Tag (Web) |
|---------|-------|----------------|-----------|
| `sendErinnerungNotification()` | Fällige Erinnerung | `erinnerungen` | `erinnerung` |
| `sendIntensifiedNotification()` | Überfällige Erinnerung (30s) | `erinnerungen` | `erinnerung` |
| `sendAssignmentNotification()` | Zugewiesene Erinnerung | `erinnerungen` | `erinnerung` |
| `sendBefehlNotification()` | Neuer Befehl | `befehle` | `befehl-{id}` |

### 7.2 Notification Setup Service

**Datei:** `packages/frontend/src/features/reminders/services/notification-setup.service.ts`

Initialisierung beim App-Start:
1. Channel `erinnerungen` erstellen (High Importance, Vibration, Lights)
2. Channel `befehle` erstellen (High Importance, Vibration, Lights)
3. Action Types registrieren (`erinnerung-action`, `befehl-action`)
4. onAction Handler registrieren (Deep Link Navigation)

**Deep Link Navigation:**
- Zod-validierte `extra` Daten (Discriminated Union über `type` Feld)
- Race Condition Handling: Pending Navigation Queue für Events vor Callback-Registrierung
- Rückwärtskompatibilität: Legacy-Schemas ohne `type` Feld unterstützt

### 7.3 Befehl Notifications Hook

**Datei:** `packages/frontend/src/features/befehl/api/use-befehl-notifications.ts`

- Filtert Events: Nur wenn aktueller User Empfänger ist
- Keine Notification für eigene erstellte Befehle
- Badge Count für unquittierte Befehle (Tauri + Web Fallback)
- Badge wird auf 0 zurückgesetzt beim Unmount

---

## 8. Data Flow

### 8.1 OAuth2 Flow

```
┌─────────┐     1. Initiate      ┌─────────────────┐
│ Frontend│ ────────────────────>│ InitiateHandler │
│ (Admin) │                      │                 │
└────┬────┘                      └────────┬────────┘
     │                                    │
     │   2. Redirect to HiOrg             ▼
     │<──────────────────────────  authorizationUrl
     │
     ▼
┌──────────────────┐
│ HiOrg OAuth Page │
│ (User Login)     │
└────────┬─────────┘
         │
         │ 3. Redirect with code+state
         ▼
┌────────────────────┐   4. Validate    ┌─────────────────┐
│ OAuthCallback      │ ────────────────>│ ProcessCallback │
│ Controller         │                  │ Handler         │
└────────────────────┘                  └────────┬────────┘
                                                 │
                                                 │ 5. Exchange code
                                                 ▼
                                        ┌─────────────────┐
                                        │ HiOrg Token API │
                                        │ (access+refresh)│
                                        └────────┬────────┘
                                                 │
                                                 │ 6. Encrypt + Save
                                                 ▼
                                        ┌─────────────────┐
                                        │ IntegrationCred │
                                        │ Repository      │
                                        └─────────────────┘
```

### 8.2 Person Import Flow

```
┌─────────┐  1. Select persons  ┌─────────────────────┐
│ Frontend│ ───────────────────>│ ImportSelected      │
│ (Admin) │  usernames[]        │ PersonsHandler      │
└─────────┘                     └──────────┬──────────┘
                                           │
                                           │ 2. Get valid token
                                           ▼
                                ┌─────────────────────┐
                                │ TokenRefreshService │
                                │ (auto-refresh)      │
                                └──────────┬──────────┘
                                           │
                                           │ 3. Fetch persons
                                           ▼
                                ┌─────────────────────┐
                                │ HiOrg-Server API    │
                                │ /core/v1/personal   │
                                └──────────┬──────────┘
                                           │
                                           │ 4. Load mappings
                                           ▼
                                ┌─────────────────────┐
                                │ QualifikationMapping│
                                │ Repository          │
                                └──────────┬──────────┘
                                           │
                                           │ 5. Create StammPerson
                                           │    with mapped Qualifikationen
                                           ▼
                                ┌─────────────────────┐
                                │ StammPerson         │
                                │ Repository          │
                                └─────────────────────┘
```

### 8.3 HIBP Passwort-Prüfung Flow (NEU)

```
┌─────────┐  1. Passwort setzen  ┌─────────────────────┐
│ Frontend│ ───────────────────> │ Passwort-Validierung│
│ (User)  │  plaintext password  │ (Application Layer) │
└─────────┘                      └──────────┬──────────┘
                                            │
                                            │ 2. SHA-1 Hash + Prefix
                                            ▼
                                 ┌──────────────────────┐
                                 │ HibpService           │
                                 │ K-Anonymity Check     │
                                 └──────────┬───────────┘
                                            │
                                            │ 3. GET /range/{5-char-prefix}
                                            ▼
                                 ┌──────────────────────┐
                                 │ HIBP Pwned Passwords  │
                                 │ API v3                │
                                 └──────────┬───────────┘
                                            │
                                            │ 4. Hash-Suffix-Liste
                                            ▼
                                 ┌──────────────────────┐
                                 │ Lokaler Vergleich     │
                                 │ (vollst. Hash lokal)  │
                                 └──────────┬───────────┘
                                            │
                                            │ 5. isCompromised: true/false
                                            ▼
                                 ┌──────────────────────┐
                                 │ Warnung an User       │
                                 │ (nicht blockierend)   │
                                 └──────────────────────┘
```

### 8.4 Befehl-Notification Flow (NEU)

```
┌─────────────────┐  1. Befehl erstellen   ┌─────────────────────┐
│ Frontend        │ ─────────────────────> │ Backend             │
│ (Befehlsgeber)  │  POST /befehle         │ BefehlController    │
└─────────────────┘                        └──────────┬──────────┘
                                                      │
                                                      │ 2. Event emittieren
                                                      ▼
                                           ┌──────────────────────┐
                                           │ BefehlGateway (WS)   │
                                           │ Room: einsatz:{id}:  │
                                           │       befehle        │
                                           └──────────┬───────────┘
                                                      │
                                                      │ 3. befehl.erstellt
                                                      ▼
                                           ┌──────────────────────┐
                                           │ useBefehlWebSocket   │
                                           │ (alle Empfänger)     │
                                           └──────────┬───────────┘
                                                      │
                                            4. Callback an Hook   │
                                                      ▼
                                           ┌──────────────────────┐
                                           │ useBefehlNotifications│
                                           │ - Filter: nur eigene │
                                           │   Empfänger          │
                                           │ - Badge-Update       │
                                           └──────────┬───────────┘
                                                      │
                                                      │ 5. OS Notification
                                                      ▼
                                           ┌──────────────────────┐
                                           │ NotificationService  │
                                           │ (Tauri oder Web)     │
                                           └──────────────────────┘
```

---

## 9. Konfiguration

### 9.1 Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `HIORG_OAUTH_CLIENT_ID` | Ja* | OAuth2 Client ID |
| `HIORG_OAUTH_CLIENT_SECRET` | Ja* | OAuth2 Client Secret |
| `INTEGRATION_ENCRYPTION_KEY` | Ja | AES-256 Key (64 hex chars) |
| `APP_URL` | Nein | Basis-URL (Default: localhost:3091) |
| `NOMINATIM_API_URL` | Nein | Nominatim Base URL (Default: https://nominatim.openstreetmap.org) |

\* Nur erforderlich wenn HiOrg-Integration aktiviert

**Keine Konfiguration erforderlich für:**
- HIBP API (kein API-Key, kein Account)
- Tauri Notifications (Plugin-Konfiguration in `tauri.conf.json`)
- Web Notifications (Browser-native API)

### 9.2 Key-Generierung

```bash
# AES-256 Key generieren
openssl rand -hex 32
# oder
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 10. Sicherheitsaspekte

### 10.1 OAuth2 Security

| Massnahme | Beschreibung |
|----------|--------------|
| **PKCE** | Schutz vor Authorization Code Interception (S256) |
| **State Token** | CSRF-Schutz (64 hex chars, 10 Min Ablauf) |
| **One-Time-Use** | State wird nach Verwendung sofort gelöscht |
| **Token-Verschlüsselung** | AES-256-GCM für gespeicherte Tokens |

### 10.2 API Security

| Massnahme | Beschreibung |
|----------|--------------|
| **Auth Guards** | JWT + Role-Based Access Control |
| **Rate Limiting** | 30/min (GET), 10/min (POST) |
| **Token-Schutz** | Tokens werden nie in Responses exponiert |
| **Audit Trail** | Alle Mutationen mit User-ID geloggt |

### 10.3 Encryption Security

| Massnahme | Beschreibung |
|----------|--------------|
| **Hard-Fail** | App startet nicht ohne gültigen Key |
| **AEAD** | Authenticated Encryption (Integrität + Vertraulichkeit) |
| **Unique IV** | Neuer IV pro Verschlüsselung |

### 10.4 HIBP Security (NEU)

| Massnahme | Beschreibung |
|----------|--------------|
| **K-Anonymity** | Nur 5 von 40 Hash-Zeichen werden übertragen |
| **Padding** | `Add-Padding: true` Header für Traffic-Analyse-Schutz |
| **Non-Blocking** | API-Fehler blockieren Passwort-Änderung nicht |
| **Kein API-Key** | Keine Credentials notwendig, kein Account erforderlich |

### 10.5 WebSocket Security (NEU)

| Massnahme | Beschreibung |
|----------|--------------|
| **JWT Auth** | WsJwtAuthGuard bei Connection |
| **CORS** | Nur Frontend-URL erlaubt (kein Wildcard) |
| **Input Validation** | UUID v4 Format für einsatzId (Room Traversal Schutz) |
| **Zod Validation** | Runtime-Validierung der Notification `extra` Daten |

### 10.6 Notification Security

| Massnahme | Beschreibung |
|----------|--------------|
| **Permission-Gated** | Notifications nur mit expliziter User-Berechtigung |
| **Graceful Degradation** | Fallback Web -> kein Crash bei fehlender Permission |
| **Deep Link Validation** | Zod-Schema-Validierung aller Navigation-Daten |

---

## 11. Testing

### 11.1 Unit Tests

```bash
# Alle Integration-Tests
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=integrations

# Spezifische Handler
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=initiate-oauth
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=process-oauth-callback
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=hiorg-token-refresh
```

### 11.2 Vorhandene Tests

| Test-Datei | Beschreibung |
|------------|--------------|
| `initiate-oauth-flow.handler.spec.ts` | OAuth Flow Initiierung |
| `process-oauth-callback.handler.spec.ts` | Callback Verarbeitung |
| `test-hiorg-connection.handler.spec.ts` | Connection Test |
| `hiorg-token-refresh.service.spec.ts` | Token Refresh |
| `oauth2.adapter.spec.ts` | OAuth2 Adapter |
| `hiorg-server.adapter.spec.ts` | HiOrg API Adapter |
| `aes-encryption.adapter.spec.ts` | Encryption |
| `nominatim-geocoding.adapter.integration.spec.ts` | Nominatim Geocoding (mit gemocktem fetch) |
| `befehl.gateway.spec.ts` | Befehl WebSocket Gateway |
| `notification.service.spec.ts` | Notification Service |

---

## 12. Risiken & Gotchas

### 12.1 Bekannte Risiken

| Risiko | Mitigation |
|--------|------------|
| HiOrg Rate Limit (30/min) | 2s Mindestabstand zwischen Requests |
| Token-Ablauf während Import | TokenRefreshService prüft vor jedem API-Call |
| Nominatim Rate Limit (1/sec) | Exponential Backoff + Retry |
| Encryption Key Verlust | Alle gespeicherten Tokens unbrauchbar |
| HIBP API nicht erreichbar | Non-blocking Fallback (Passwort wird trotzdem akzeptiert) |
| WebSocket Disconnect | Auto-Reconnect mit Exponential Backoff (max. 10 Versuche) |
| Notification Permission denied | Graceful Degradation, kein App-Crash |

### 12.2 Gotchas

1. **OAuth Callback URL muss exakt matchen** - HiOrg validiert `redirect_uri`
2. **JSON:API Format beachten** - HiOrg nutzt nicht Standard-JSON
3. **Nominatim User-Agent Pflicht** - Requests ohne User-Agent werden blockiert
4. **Qualifikationen hierarchisch** - Niedrigere `position` = höherer Rang
5. **Zwei Nominatim-Implementierungen** - `NominatimGeocodingAdapter` (hexagonal, Infrastructure Layer) und `GeocodingService` (direkt, Lagekarte Module) -- langfristig konsolidieren. **Achtung:** Die beiden Implementierungen verwenden unterschiedliche User-Agents: der `GeocodingService` sendet `BluelightHub/1.0`, während der hexagonale `NominatimGeocodingAdapter` den konformeren `Bluelight-Hub/1.0 (contact@bluelight-hub.app)` nutzt.
6. **HIBP SHA-1 ist kein Sicherheitsproblem** - SHA-1 wird nur für K-Anonymity Lookup verwendet, nicht für Passwort-Speicherung (CodeQL False Positive)
7. **Tauri Notification Channels** - `createChannel()` ist nicht auf allen Plattformen verfügbar (z.B. macOS), Fehler werden abgefangen
8. **Notification Race Condition** - Events können vor Callback-Registrierung eintreffen, daher Pending Navigation Queue

---

## 13. Weiterführende Dokumentation

- [API-Referenz](./project-documentation/04-api-referenz.md) - REST Endpoints
- [Backend-Architektur](./project-documentation/02-backend-architektur.md) - Hexagonal Architecture
- [HiOrg-Server API Docs](https://wiki.hiorg-server.de/doku.php/rest-api) - Externe Dokumentation
- [HIBP API v3 Docs](https://haveibeenpwned.com/API/v3#PwnedPasswords) - Pwned Passwords API
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) - Rate-Limiting Regeln
- [Tauri Notification Plugin](https://v2.tauri.app/plugin/notification/) - Native Notification API

---

## Changelog

| Datum | Änderung |
|-------|----------|
| 2026-01-05 | Initiale Generierung (HiOrg-Server + Nominatim) |
| 2026-02-19 | HIBP Passwort-Check ergänzt (hinzugefügt 2026-01-16) |
| 2026-02-19 | Befehl WebSocket Gateway dokumentiert (neu in Sprint) |
| 2026-02-19 | Frontend Notification-Schnittstellen dokumentiert (Tauri + Web) |
| 2026-02-19 | IGeocodingPort und duale Nominatim-Implementierungen dokumentiert |
| 2026-02-19 | Sicherheitsaspekte erweitert (HIBP, WebSocket, Notifications) |
| 2026-02-19 | Risiken & Gotchas aktualisiert |

---

*Deep-Dive generiert am 2026-01-05, aktualisiert am 2026-02-19*
