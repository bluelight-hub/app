# Deep-Dive: Externe System-Schnittstellen

> **Generiert:** 2026-01-05
> **Workflow:** BMad Document-Project v1.2.0
> **Scan-Level:** Exhaustive
> **Dateien analysiert:** 62
> **Lines of Code:** ~4.500 LOC

---

## 1. Überblick

Das Bluelight-Hub Backend integriert sich mit zwei externen Systemen:

| System | Zweck | Protokoll | Authentifizierung |
|--------|-------|-----------|-------------------|
| **HiOrg-Server** | Personalverwaltung (Kräfte-Synchronisation) | REST (JSON:API) | OAuth2 + PKCE |
| **Nominatim (OSM)** | Geocoding (Adresse ↔ Koordinaten) | REST (JSON) | User-Agent Header |

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
└─────────────────────────────────────────────────────────────────────────┘
                │                   │                   │
                ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer (Adapters)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ OAuth2Adapter│ │HiOrgServer   │ │AesEncryption │ │HiOrgOAuthConfig │ │
│  │              │ │Adapter       │ │Adapter       │ │Adapter          │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────────┘ └─────────────────┘ │
│         │                │                                               │
│         ▼                ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Externe Systeme (HTTP)                            ││
│  │  ┌─────────────────────────────┐  ┌───────────────────────────────┐ ││
│  │  │ HiOrg-Server API            │  │ Nominatim API                 │ ││
│  │  │ https://api.hiorg-server.de │  │ https://nominatim.osm.org     │ ││
│  │  │ OAuth2 + JSON:API           │  │ REST + JSON                   │ ││
│  │  └─────────────────────────────┘  └───────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Layer

### 3.1 Ports (Interfaces)

#### IEncryptionPort
**Zweck:** AES-256-GCM Verschlüsselung für API-Tokens

```typescript
interface IEncryptionPort {
  encrypt(plainText: string): string;  // → "{iv}:{authTag}:{cipherText}"
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
**Zweck:** Mapping externe → interne Qualifikationen

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
- Retry: Exponential Backoff bei HTTP 429

**Endpoints:**
- Geocoding: `GET /search?q={address}&format=json&countrycodes=de`
- Reverse: `GET /reverse?lat={lat}&lon={lon}&format=json&addressdetails=1`

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

### 6.1 Endpoints

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

### 6.2 Security

- **Auth Guards:** `JwtAuthGuard` + `RolesGuard`
- **Rollen:** `ADMIN`, `SUPER_ADMIN`
- **Rate Limiting:** 30/min (GET), 10/min (POST)
- **Token-Schutz:** Tokens werden NIEMALS in Responses zurückgegeben

---

## 7. Data Flow

### 7.1 OAuth2 Flow

```
┌─────────┐     1. Initiate      ┌─────────────────┐
│ Frontend│ ────────────────────▶│ InitiateHandler │
│ (Admin) │                      │                 │
└────┬────┘                      └────────┬────────┘
     │                                    │
     │   2. Redirect to HiOrg             ▼
     │◀──────────────────────────  authorizationUrl
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
│ OAuthCallback      │ ────────────────▶│ ProcessCallback │
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

### 7.2 Person Import Flow

```
┌─────────┐  1. Select persons  ┌─────────────────────┐
│ Frontend│ ───────────────────▶│ ImportSelected      │
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

---

## 8. Konfiguration

### 8.1 Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `HIORG_OAUTH_CLIENT_ID` | Ja* | OAuth2 Client ID |
| `HIORG_OAUTH_CLIENT_SECRET` | Ja* | OAuth2 Client Secret |
| `INTEGRATION_ENCRYPTION_KEY` | Ja | AES-256 Key (64 hex chars) |
| `APP_URL` | Nein | Basis-URL (Default: localhost:3091) |

\* Nur erforderlich wenn HiOrg-Integration aktiviert

### 8.2 Key-Generierung

```bash
# AES-256 Key generieren
openssl rand -hex 32
# oder
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 9. Sicherheitsaspekte

### 9.1 OAuth2 Security

| Maßnahme | Beschreibung |
|----------|--------------|
| **PKCE** | Schutz vor Authorization Code Interception (S256) |
| **State Token** | CSRF-Schutz (64 hex chars, 10 Min Ablauf) |
| **One-Time-Use** | State wird nach Verwendung sofort gelöscht |
| **Token-Verschlüsselung** | AES-256-GCM für gespeicherte Tokens |

### 9.2 API Security

| Maßnahme | Beschreibung |
|----------|--------------|
| **Auth Guards** | JWT + Role-Based Access Control |
| **Rate Limiting** | 30/min (GET), 10/min (POST) |
| **Token-Schutz** | Tokens werden nie in Responses exponiert |
| **Audit Trail** | Alle Mutationen mit User-ID geloggt |

### 9.3 Encryption Security

| Maßnahme | Beschreibung |
|----------|--------------|
| **Hard-Fail** | App startet nicht ohne gültigen Key |
| **AEAD** | Authenticated Encryption (Integrität + Vertraulichkeit) |
| **Unique IV** | Neuer IV pro Verschlüsselung |

---

## 10. Testing

### 10.1 Unit Tests

```bash
# Alle Integration-Tests
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=integrations

# Spezifische Handler
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=initiate-oauth
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=process-oauth-callback
pnpm --filter @bluelight-hub/backend test -- --testPathPattern=hiorg-token-refresh
```

### 10.2 Vorhandene Tests

| Test-Datei | Beschreibung |
|------------|--------------|
| `initiate-oauth-flow.handler.spec.ts` | OAuth Flow Initiierung |
| `process-oauth-callback.handler.spec.ts` | Callback Verarbeitung |
| `test-hiorg-connection.handler.spec.ts` | Connection Test |
| `hiorg-token-refresh.service.spec.ts` | Token Refresh |
| `oauth2.adapter.spec.ts` | OAuth2 Adapter |
| `hiorg-server.adapter.spec.ts` | HiOrg API Adapter |
| `aes-encryption.adapter.spec.ts` | Encryption |

---

## 11. Risiken & Gotchas

### 11.1 Bekannte Risiken

| Risiko | Mitigation |
|--------|------------|
| HiOrg Rate Limit (30/min) | 2s Mindestabstand zwischen Requests |
| Token-Ablauf während Import | TokenRefreshService prüft vor jedem API-Call |
| Nominatim Rate Limit (1/sec) | Exponential Backoff + Retry |
| Encryption Key Verlust | Alle gespeicherten Tokens unbrauchbar |

### 11.2 Gotchas

1. **OAuth Callback URL muss exakt matchen** - HiOrg validiert `redirect_uri`
2. **JSON:API Format beachten** - HiOrg nutzt nicht Standard-JSON
3. **Nominatim User-Agent Pflicht** - Requests ohne User-Agent werden blockiert
4. **Qualifikationen hierarchisch** - Niedrigere `position` = höherer Rang

---

## 12. Weiterführende Dokumentation

- [API-Referenz](./project-documentation/04-api-referenz.md) - REST Endpoints
- [Backend-Architektur](./project-documentation/02-backend-architektur.md) - Hexagonal Architecture
- [HiOrg-Server API Docs](https://wiki.hiorg-server.de/doku.php/rest-api) - Externe Dokumentation

---

*Deep-Dive generiert durch BMad Document-Project Workflow v1.2.0*
