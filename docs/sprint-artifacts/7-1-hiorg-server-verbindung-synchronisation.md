# Story 7.1: HiOrg-Server Verbindung & Synchronisation

Status: Ready for Review

## Story

Als **Admin (Maria)**,
möchte ich **Personaldaten aus HiOrg-Server importieren**,
damit **ich nicht alle Personen manuell anlegen muss**.

## Hintergrund

HiOrg-Server ist eine weit verbreitete Mitgliederverwaltungssoftware für Hilfsorganisationen (DRK, THW, Feuerwehr, DLRG) in Deutschland. Die Integration ermöglicht den automatischen Import von Personaldaten und reduziert den manuellen Erfassungsaufwand erheblich.

**Epic 7:** HiOrg-Server Integration
**Depends on:** Epic 1 (Qualifikationen), Epic 2 (Ziel für Import)
**Enables:** Epic 4 profitiert (mehr Stammdaten für QR-Lookup)

**FRs covered:** FR38, FR39, FR40
**NFRs:** NFR16 (HiOrg-Server API-Fehler unterbrechen nicht den Hauptworkflow), NFR18 (Externe Integrationen als austauschbare Adapter)

---

## Acceptance Criteria

### AC1: HiOrg-Server Credentials konfigurieren

- [ ] **Given** ich bin in den System-Einstellungen
- [ ] **When** ich HiOrg-Server Organisations-Kürzel und API-Token eingebe und auf "Verbindung testen" klicke
- [ ] **Then** wird die Verbindung validiert und Status "Verbunden ✓" angezeigt
- [ ] **Or** bei Fehler erscheint "Verbindung fehlgeschlagen: [Fehlergrund]"

### AC2: Personen-Import starten

- [ ] **Given** HiOrg-Server ist verbunden
- [ ] **When** ich auf "Personen synchronisieren" klicke
- [ ] **Then** werden alle Personen aus HiOrg-Server geladen (mit Name, Vorname, Qualifikationen, Ausbildungen)
- [ ] **And** ich sehe eine Vorschau mit Anzahl "42 Personen gefunden"

### AC3: Automatische Duplikatserkennung

- [ ] **Given** Person existiert bereits in Bluelight Hub (via `username` oder `mitgliednr`)
- [ ] **When** der Import läuft
- [ ] **Then** wird die Person als "Bereits vorhanden (wird aktualisiert)" markiert
- [ ] **And** vorhandene Daten werden überschrieben (mit Bestätigung)

### AC4: Credentials verschlüsselt speichern (Security)

- [ ] **Given** ich speichere HiOrg-Server Credentials
- [ ] **When** die Daten in der DB persistiert werden
- [ ] **Then** wird das API-Token mit AES-256-GCM verschlüsselt gespeichert (Key aus ENV)
- [ ] **And** Organisations-Kürzel wird im Klartext gespeichert
- [ ] **And** das Token wird NIEMALS in Logs oder API-Responses zurückgegeben

### AC5: Credentials nur für Admins zugänglich

- [ ] **Given** ein normaler User versucht auf `/api/admin/integrations/hiorg` zuzugreifen
- [ ] **When** der Request ohne Admin-Rolle gesendet wird
- [ ] **Then** antwortet das Backend mit 403 Forbidden

---

## Tasks / Subtasks

### Task 0: Prisma Schema für Integration-Credentials (Foundation)

- [ ] **0.1** Entity `IntegrationCredential` in Prisma Schema hinzufügen:
  ```prisma
  model IntegrationCredential {
    id               String   @id @default(cuid())
    type             String   // "HIORG_SERVER"
    orgKuerzel       String   // HiOrg Organisations-Kürzel
    encryptedToken   String   // AES-256-GCM verschlüsselt
    isActive         Boolean  @default(true)
    lastTestedAt     DateTime?
    lastSyncAt       DateTime?
    createdAt        DateTime @default(now())
    createdBy        String?
    updatedAt        DateTime @updatedAt
    updatedBy        String?

    @@unique([type])
  }
  ```
- [ ] **0.2** Migration erstellen: `pnpm --filter @bluelight-hub/backend prisma:migrate`

### Task 1: Admin Role Guard (Auth Layer) - NEU ERSTELLEN

- [ ] **1.1** Erstelle Guard: `src/modules/auth/guards/admin-role.guard.ts`
  ```typescript
  @Injectable()
  export class AdminRoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      if (!user?.roles?.includes('admin')) {
        throw new ForbiddenException('Admin access required');
      }
      return true;
    }
  }
  ```
- [ ] **1.2** Export in `src/modules/auth/guards/index.ts`
- [ ] **1.3** Unit Test für AdminRoleGuard

### Task 2: Encryption Service (Infrastructure Layer)

- [ ] **2.1** Erstelle Port-Interface: `src/domain/common/ports/encryption.port.ts`
  ```typescript
  export interface IEncryptionPort {
    encrypt(plainText: string): string;
    decrypt(cipherText: string): string;
  }
  ```
- [ ] **2.2** Erstelle Adapter: `src/infrastructure/security/aes-encryption.adapter.ts`
  - AES-256-GCM Verschlüsselung (Node.js crypto)
  - Key aus ENV: `INTEGRATION_ENCRYPTION_KEY` (64 hex chars = 32 bytes)
  - IV generieren pro Verschlüsselung (16 bytes)
  - Format: `{iv}:{authTag}:{cipherText}` (alle Base64)
  - Key-Validierung beim App-Start (OnModuleInit)
- [ ] **2.3** DI Token hinzufügen in `di-tokens.ts`:
  ```typescript
  INTEGRATIONS: {
    ENCRYPTION_PORT: Symbol('IEncryptionPort'),
    HIORG_SERVER_PORT: Symbol('IHiOrgServerPort'),
    CREDENTIAL_REPOSITORY: Symbol('IIntegrationCredentialRepository'),
  }
  ```
- [ ] **2.4** ENV-Validation in ConfigModule:
  ```typescript
  INTEGRATION_ENCRYPTION_KEY: Joi.string().length(64).required()
  ```
- [ ] **2.5** Unit Tests für Encryption Adapter (encrypt/decrypt roundtrip)

### Task 3: HiOrg-Server API Client (Infrastructure Layer)

- [ ] **3.1** Erstelle Port-Interface: `src/domain/common/ports/hiorg-server.port.ts`
  ```typescript
  export interface IHiOrgServerPort {
    testConnection(orgKuerzel: string, token: string): Promise<Result<HiOrgConnectionInfo>>;
    fetchPersons(orgKuerzel: string, token: string, options?: HiOrgFetchOptions): Promise<Result<HiOrgPersonDto[]>>;
  }

  export interface HiOrgFetchOptions {
    updatedSince?: Date;  // Inkrementeller Sync
    status?: ('aktiv' | 'eingeschraenkt' | 'gesperrt' | 'extern')[];
  }

  export interface HiOrgPersonDto {
    username: string;           // Eindeutiger Identifier
    mitgliednr?: string;        // Alternative ID
    vorname: string;
    nachname: string;
    email?: string;
    handy?: string;
    telpriv?: string;
    teldienst?: string;
    gruppen_namen: string[];
    qualifikationen: HiOrgQualifikation[];
    ausbildungen: HiOrgAusbildung[];
  }

  export interface HiOrgQualifikation {
    position: number;           // Hierarchie-Stufe
    liste_id: number;
    rang?: string;
    name: string;
    name_kurz?: string;
    erwerb_datum?: string;
  }

  export interface HiOrgAusbildung {
    id: string;
    bezeichnung: string;
    datum?: string;
    gueltig_bis?: string;
    lehrgangsnummer?: string;
  }
  ```
- [ ] **3.2** Erstelle Adapter: `src/infrastructure/integrations/hiorg-server.adapter.ts`
  - **KRITISCH:** JSON:API Format - Header `Accept: application/vnd.api+json`
  - Base URL: `https://api.hiorg-server.de/core/v1`
  - OAuth2 Token im Authorization Header
  - Endpoints:
    - `GET /personal` - Alle Personen (mit Filter-Support)
    - `GET /personal/{userid}/ausbildungen` - Ausbildungen
    - `GET /organisation/selbst/stammdaten` - Org-Info für Connection Test
  - Rate Limiting (30 Requests/Minute) mit exponential backoff
  - Timeout: 10s
  - Error Handling: 401 → Token invalid, 403 → No permission, **423 → Feature locked/not licensed**
- [ ] **3.3** Unit Tests (Mocked HTTP mit nock)

### Task 4: Integration-Credentials Domain (Domain Layer)

- [ ] **4.1** Erstelle Entity: `src/domain/integrations/entities/integration-credential.entity.ts`
- [ ] **4.2** Erstelle Repository Interface: `src/domain/integrations/repositories/i-integration-credential.repository.ts`
- [ ] **4.3** Erstelle Error Codes: `src/domain/integrations/common/integration-error-codes.ts`
  ```typescript
  export const INTEGRATION_ERROR_CODES = {
    CREDENTIALS_NOT_FOUND: 'INTEGRATION_001',
    CONNECTION_FAILED: 'INTEGRATION_002',
    INVALID_TOKEN: 'INTEGRATION_003',
    FEATURE_LOCKED: 'INTEGRATION_004',  // HTTP 423
    RATE_LIMITED: 'INTEGRATION_005',
  } as const;
  ```

### Task 5: Application Layer (Commands & Queries)

- [ ] **5.1** Command: `SaveHiOrgCredentialsCommand` + Handler
  - Standard `@Injectable()` Handler (keine Domain Events)
  - Verschlüsselt Token via EncryptionPort
  - Validiert Org-Kürzel Format
- [ ] **5.2** Command: `TestHiOrgConnectionCommand` + Handler
  - Ruft HiOrgServerPort.testConnection() auf
  - Aktualisiert `lastTestedAt` bei Erfolg
- [ ] **5.3** Query: `GetHiOrgCredentialsQuery` + Handler
  - Gibt Credentials OHNE Token zurück
  - `hasToken: boolean` Flag statt Token-Wert
- [ ] **5.4** Query: `PreviewHiOrgPersonsQuery` + Handler
  - Lädt Personen-Vorschau für Import-Dialog
  - Nutzt `filter[status]=aktiv` für aktive Mitglieder
  - **NOTE:** Tatsächlicher Import erst in Story 7.2

### Task 6: Prisma Repository Implementation

- [ ] **6.1** Erstelle: `src/infrastructure/integrations/repositories/prisma-integration-credential.repository.ts`
- [ ] **6.2** Injiziere EncryptionPort für Token-Handling im Mapper
- [ ] **6.3** Integration Tests mit Test-DB

### Task 7: Admin Controller (API Layer)

- [ ] **7.1** Erstelle Controller: `src/modules/admin/controllers/admin-hiorg-integration.controller.ts`
- [ ] **7.2** Endpoints:
  ```
  POST   /api/admin/integrations/hiorg/credentials    - Credentials speichern
  GET    /api/admin/integrations/hiorg/credentials    - Credentials abrufen (ohne Token)
  POST   /api/admin/integrations/hiorg/test           - Verbindung testen
  GET    /api/admin/integrations/hiorg/preview        - Personen-Vorschau laden
  ```
- [ ] **7.3** Guards: `@UseGuards(JwtAuthGuard, AdminRoleGuard)` auf Controller-Ebene
- [ ] **7.4** Rate Limiting: `@Throttle({ default: { limit: 10, ttl: 60000 } })` auf sensitive Endpoints
- [ ] **7.5** OpenAPI Decorators (PFLICHT!):
  - `@ApiTags('admin-integrations')`
  - `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`
- [ ] **7.6** DTOs mit class-validator + @ApiProperty:
  ```typescript
  // Response DTO - NIEMALS Token zurückgeben
  export class HiOrgCredentialsResponseDto {
    @ApiProperty() orgKuerzel: string;
    @ApiProperty() hasToken: boolean;  // NICHT token!
    @ApiPropertyOptional() lastTestedAt?: Date;
    @ApiPropertyOptional() lastSyncAt?: Date;
  }
  ```

### Task 8: Frontend - Settings Page

- [ ] **8.1** Erstelle Feature: `features/admin/integrations/hiorg/`
- [ ] **8.2** Hooks:
  - `useHiOrgCredentials()` - Query
  - `useSaveHiOrgCredentials()` - Mutation
  - `useTestHiOrgConnection()` - Mutation
  - `useHiOrgPersonsPreview()` - Query
- [ ] **8.3** Komponente: `HiOrgSettingsForm.tsx`
  - Org-Kürzel, API-Token Felder
  - "Verbindung testen" Button
  - Status-Anzeige (Verbunden/Fehler/Feature gesperrt)
  - TanStack Form + Zod Validierung
  - Token-Feld: Placeholder "••••••••" bei bestehendem Credential
- [ ] **8.4** Komponente: `HiOrgSyncPreviewCard.tsx`
  - Zeigt Anzahl gefundener Personen
  - Unterscheidet: Neu / Zu aktualisieren
  - "Synchronisieren" Button (Story 7.2)

### Task 9: Frontend - Integration in Admin-Bereich

- [ ] **9.1** Route: `/app/admin/integrations/hiorg`
- [ ] **9.2** Navigation in Admin-Sidebar hinzufügen
- [ ] **9.3** Breadcrumb: Admin → Integrationen → HiOrg-Server

### Task 10: Verifikation

- [ ] **10.1** `pnpm --filter @bluelight-hub/backend lint:check` → 0 Errors
- [ ] **10.2** `pnpm --filter @bluelight-hub/frontend lint:check` → 0 Errors
- [ ] **10.3** `pnpm --filter @bluelight-hub/backend build` → Success
- [ ] **10.4** `pnpm --filter @bluelight-hub/frontend build` → Success
- [ ] **10.5** Unit Tests: Encryption, HiOrg Adapter, Handlers, AdminRoleGuard
- [ ] **10.6** Integration Tests: Repository mit verschlüsseltem Token
- [ ] **10.7** Manuelle Tests: Credentials speichern, Verbindung testen
- [ ] **10.8** API-Client generieren: `pnpm run generate-api`

---

## Dev Notes

### Architektur-Patterns

**Port/Adapter Pattern:**
- Ports in: `src/domain/common/ports/*.port.ts`
- Adapter in: `src/infrastructure/*/adapters/*.adapter.ts`
- Vorlage: `NestLoggerAdapter` implementiert `ILoggerPort`

**Handler Pattern:**
- Standard `@Injectable()` Handler (KEIN TransactionalCommandHandler für diese Story)
- Result Pattern für Fehler-Handling
- Commands/Queries in separaten Verzeichnissen

**Admin Controller Pattern:**
- Existierend: `AdminStammPersonenController`, `AdminQualifikationenController`
- Guards: `@UseGuards(JwtAuthGuard, AdminRoleGuard)` - AdminRoleGuard muss erstellt werden (Task 1)
- Response Wrapper: `@ApiWrappedResponse` (PFLICHT für korrekte OpenAPI-Generierung)

**DI Token Pattern:**
```typescript
// di-tokens.ts - Neue Tokens hinzufügen
INTEGRATIONS: {
  ENCRYPTION_PORT: Symbol('IEncryptionPort'),
  HIORG_SERVER_PORT: Symbol('IHiOrgServerPort'),
  CREDENTIAL_REPOSITORY: Symbol('IIntegrationCredentialRepository'),
}
```

### HiOrg-Server API

**KRITISCH - JSON:API Format:**
```typescript
// Alle Requests benötigen:
headers: {
  'Accept': 'application/vnd.api+json',
  'Authorization': `Bearer ${token}`
}
```

**Base URL:** `https://api.hiorg-server.de/core/v1`

**Endpoints:**

| Endpoint | Beschreibung | Filter |
|----------|--------------|--------|
| `GET /personal` | Alle Personen | `filter[updated_since]`, `filter[status]` |
| `GET /personal/{userid}/ausbildungen` | Ausbildungen einer Person | - |
| `GET /organisation/selbst/stammdaten` | Org-Info (Connection Test) | - |

**Filter-Parameter:**
```typescript
// Inkrementeller Sync - nur geänderte Personen
GET /personal?filter[updated_since]=2022-07-21T17:32:28Z

// Status-Filter (comma-separated)
GET /personal?filter[status]=aktiv,eingeschraenkt
```

**HTTP Status Codes:**
| Code | Bedeutung | Handling |
|------|-----------|----------|
| 200 | OK | Success |
| 401 | Unauthorized | Token ungültig/abgelaufen |
| 403 | Forbidden | Keine Berechtigung |
| **423** | **Locked** | **Feature deaktiviert/nicht lizenziert!** |
| 500 | Internal Error | Retry mit Backoff |

**Qualifikationen vs Ausbildungen:**
- `qualifikationen[]` - Hierarchisches System (med./tech./sonst.), Position = Rang
- `ausbildungen[]` - Einzelne Lehrgänge mit Ablaufdatum (z.B. "Erste Hilfe", gültig bis...)

**OAuth2 Credentials erhalten:**
- E-Mail an `support@hiorg-server.de`
- Angeben: Anwendungsname, Beschreibung, OV-Kürzel

**Dokumentation:**
- REST API: https://api.hiorg-server.de/docs (OpenAPI Spec verfügbar!)
- OAuth2: https://wiki.hiorg-server.de/admin/oauth2

### Security Checklist

- [ ] Token mit AES-256-GCM verschlüsseln (IV pro Verschlüsselung)
- [ ] `INTEGRATION_ENCRYPTION_KEY` in ENV (64 hex chars)
- [ ] Key-Validierung beim App-Start
- [ ] Token NIEMALS in Logs
- [ ] Token NIEMALS in API-Responses (nur `hasToken: boolean`)
- [ ] AdminRoleGuard auf allen `/admin/integrations/*` Endpoints
- [ ] Rate Limiting auf sensitive Endpoints

### Duplikatserkennung

**Primäre Matching-Strategie:**
1. `username` (eindeutig in HiOrg)
2. `mitgliednr` (falls vorhanden)
3. Fallback: `vorname + nachname` (mit Konflikt-Dialog)

### Wichtige Hinweise

1. **Guard erstellen:** `AdminRoleGuard` existiert noch nicht - Task 1 implementieren!
2. **JSON:API Format:** Content-Type `application/vnd.api+json` ist PFLICHT
3. **HTTP 423:** Feature kann in HiOrg deaktiviert sein - Error-Handling implementieren
4. **Inkrementeller Sync:** `filter[updated_since]` für Performance nutzen
5. **Qualifikationen ≠ Ausbildungen:** Beide importieren für vollständiges Profil

---

## References

| Dokument | Pfad |
|----------|------|
| Epics + Story Definition | `docs/epics.md#Epic-7` |
| Architecture ADR | `docs/adr/ADR-025-hexagonal-architecture.md` |
| Logger Adapter (Pattern) | `packages/backend/src/infrastructure/common/adapters/nest-logger.adapter.ts` |
| Admin Controller (Pattern) | `packages/backend/src/modules/admin/controllers/admin-stamm-personen.controller.ts` |
| DI Tokens | `packages/backend/src/infrastructure/di-tokens.ts` |
| Project Context | `docs/project-context.md` |

---

## Dev Agent Record

### Context Reference

Erstellt via BMad create-story Workflow (YOLO-Modus) mit 3 parallelen Subagents.
Validiert und verbessert via validate-create-story mit 4 parallelen Subagents.

### Agent Model Used

Claude Opus 4.5 (SM Agent)

### Completion Notes List

**2026-01-02 - Story erstellt:**
- 3 parallele Subagents für umfassende Kontext-Analyse
- Architektur-Patterns aus existierender Codebase extrahiert
- HiOrg-Server API via Web-Recherche dokumentiert
- Encryption-Pattern für sichere Credentials-Speicherung designed
- 10 Tasks mit detaillierten Subtasks definiert
- Security-Fokus: AES-256-GCM, Admin-Guard, keine Tokens in Responses

**2026-01-02 - Validierung & Verbesserung:**
- 4 parallele Subagents für Quality Review
- 6 kritische Issues behoben (Guard, Pfade, API-Docs, DI-Tokens)
- 5 Enhancements hinzugefügt (Filter-Parameter, ENV-Validation, Rate-Limit)
- 4 Optimierungen (JSON:API Format, Duplikatserkennung, HTTP 423, Qualifikationen vs Ausbildungen)
- Korrektur: AdminRoleGuard muss erstellt werden (neuer Task 1)
- Korrektur: Port-Pfade zu `src/domain/common/ports/`
- Korrektur: Standard Handler Pattern (kein TransactionalCommandHandler)

---

## Code Review Action Items

**Review Date:** 2026-01-02
**Reviewed by:** 4 parallel Code-Review Subagents (Amelia/Dev Agent)
**Overall Grade:** B+ (85/100)

### 🚨 CRITICAL Issues (Must Fix Before Merge)

#### CR-1: Guard-Pattern Inkonsistenz
- **Severity:** CRITICAL
- **File:** `packages/backend/src/modules/integrations/controllers/admin-hiorg-integration.controller.ts:95`
- **Problem:** Controller verwendet `AdminJwtAuthGuard` statt dem Codebase-Standard `RolesGuard`
- **Fix:**
  ```typescript
  // ❌ Aktuell:
  @UseGuards(AdminJwtAuthGuard)

  // ✅ Erwartet (Codebase-Pattern):
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  ```
- [x] **Action:** Guard-Pattern vereinheitlichen ✅ Fixed 2026-01-02

#### CR-2: `import type` für DI-Injectable Interfaces (AC1 Violation)
- **Severity:** ~~CRITICAL~~ → **FALSE POSITIVE**
- **Problem:** `import type` für Port-Interfaces bricht NestJS DI zur Laufzeit
- **Analysis:** Nach Prüfung ist dies **KEIN Problem** weil:
  - DI verwendet **Symbols** (`INTEGRATIONS.ENCRYPTION_PORT`), nicht die Interfaces
  - Interfaces werden nur für **TypeScript Type-Annotations** verwendet
  - `import type` für reine Type-Definitions ist **korrekt**
- [x] **Action:** Kein Fix nötig - FALSE POSITIVE ✅ Verified 2026-01-02

### ⚠️ MEDIUM Issues (Should Fix)

#### CR-3: NestJS Logger in Application Layer (AC3 Violation)
- **Severity:** MEDIUM
- **File:** `packages/backend/src/application/integrations/commands/process-oauth-callback/process-oauth-callback.handler.ts:18,39`
- **Problem:** Framework-Abhängigkeit (`Logger`) in Application Layer
- **Fix:**
  ```typescript
  // ❌ FALSCH:
  import { Logger } from '@nestjs/common';
  private readonly logger = new Logger(ProcessOAuthCallbackHandler.name);

  // ✅ RICHTIG:
  import { ILoggerPort } from '@domain/ports/i-logger.port';
  @Inject(LOGGER) private readonly logger: ILoggerPort,
  ```
- [x] **Action:** Logger durch ILogger Port ersetzen ✅ Fixed 2026-01-02

#### CR-4: ConfigService in Application Layer (AC3 Violation)
- **Severity:** MEDIUM
- **File:** `packages/backend/src/application/integrations/commands/process-oauth-callback/process-oauth-callback.handler.ts:20,50`
- **Problem:** Framework-Abhängigkeit (`ConfigService`) in Application Layer
- **Fix Implemented:** Option A - `IHiOrgOAuthConfigPort` erstellt
  - Port: `src/domain/ports/i-hiorg-oauth-config.port.ts`
  - Adapter: `src/infrastructure/config/hiorg-oauth-config.adapter.ts`
  - DI Token: `INTEGRATIONS.HIORG_OAUTH_CONFIG_PORT`
- [x] **Action:** ConfigService durch Port/Adapter ersetzen ✅ Fixed 2026-01-02

### ✅ Positive Findings

| Check | Status | Notes |
|-------|--------|-------|
| Token-Verschlüsselung (AES-256-GCM) | ✅ PASS | IV + AuthTag korrekt |
| Token-Schutz (Logs/Responses) | ✅ PASS | Nur `hasToken: boolean` |
| AC7 Controller Decorators | ✅ PASS | `@ApiWrappedResponse` verwendet |
| AC2 DI Token Constants | ✅ PASS | Alle als `Symbol()` |
| AC4 Result Pattern | ✅ PASS | Konsistent in allen Handlern |
| Domain Layer Clean | ✅ PASS | Framework-agnostisch |
| Rate Limiting | ✅ PASS | ADMIN_RATE_LIMIT + ADMIN_MUTATION_RATE_LIMIT |
| DTOs Validation | ✅ PASS | class-validator + @ApiProperty |

### Estimated Fix Effort

| Issue | Priority | Effort |
|-------|----------|--------|
| CR-1 | 🔴 High | ~5 min |
| CR-2 | 🔴 High | ~10 min |
| CR-3 | 🟡 Medium | ~15 min |
| CR-4 | 🟡 Medium | ~20 min |
| **Total** | | **~50 min** |

---

### ✅ Code Review Fixes Applied (2026-01-02)

**Fixed by:** Dev Agent (Amelia) mit Subagents

| Issue | Status | Fix Details |
|-------|--------|-------------|
| **CR-1** | ✅ FIXED | Controller Guard: `AdminJwtAuthGuard` → `JwtAuthGuard + RolesGuard` + `@Roles('ADMIN', 'SUPER_ADMIN')` |
| **CR-2** | ✅ FALSE POSITIVE | `import type` für Interfaces ist KORREKT - DI nutzt Symbols, nicht Interfaces |
| **CR-3** | ✅ FIXED | Handler Logger: `new Logger()` → `@Inject(LOGGER) private readonly logger: ILogger` |
| **CR-4** | ✅ FIXED | Handler ConfigService: → `@Inject(INTEGRATIONS.HIORG_OAUTH_CONFIG_PORT) private readonly oauthConfig: IHiOrgOAuthConfigPort` |

**Neue Dateien erstellt:**
- `src/domain/ports/i-hiorg-oauth-config.port.ts` - Framework-agnostischer OAuth Config Port
- `src/infrastructure/config/hiorg-oauth-config.adapter.ts` - NestJS ConfigService Adapter

**Geänderte Dateien:**
- `src/modules/integrations/controllers/admin-hiorg-integration.controller.ts` - Guard + Logger DI
- `src/application/integrations/commands/process-oauth-callback/process-oauth-callback.handler.ts` - Logger + Config Port DI
- `src/infrastructure/di-tokens.ts` - Neuer Token `INTEGRATIONS.HIORG_OAUTH_CONFIG_PORT`
- `src/infrastructure/integrations/integrations-infrastructure.module.ts` - Port Provider/Export

**Verification:**
- ✅ TypeScript: Keine Fehler
- ✅ Biome Lint: Nur bestehende Warnings (noNonNullAssertion)
- ✅ Unit Tests: 85 Suites, 1736 Tests passed

---

### ✅ Code Review #2 Fixes Applied (2026-01-02)

**Fixed by:** Dev Agent (Amelia) mit 5 parallelen Subagents

| Issue | Priority | Status | Fix Details |
|-------|----------|--------|-------------|
| **H1** | HIGH | ✅ FIXED | Unit Tests für Handler: AES Encryption (16), SaveCredentials (9), TestConnection (10) = **35 Tests** |
| **H2** | HIGH | ✅ FIXED | Token Logging Risk: `this.logger.error(msg, error)` → `this.logger.error(msg, { message, name })` |
| **H3** | HIGH | ✅ FIXED | Rate Limiting: `enforceRateLimit()` mit 2s Mindestabstand (max 30 req/min) |
| **H4** | HIGH | ✅ FIXED | Encryption Key Validation: Warning → Hard-Fail mit `throw new Error()` |
| **H5** | HIGH | ✅ FIXED | OAuth State Cleanup: Cron-Job `@Cron(EVERY_HOUR)` für abgelaufene States |

**Neue Dateien erstellt:**
- `src/infrastructure/security/__tests__/aes-encryption.adapter.spec.ts` - 16 Unit Tests
- `src/application/integrations/commands/save-hiorg-credentials/__tests__/save-hiorg-credentials.handler.spec.ts` - 9 Unit Tests
- `src/application/integrations/commands/test-hiorg-connection/__tests__/test-hiorg-connection.handler.spec.ts` - 10 Unit Tests
- `src/infrastructure/integrations/tasks/oauth2-state-cleanup.task.ts` - Hourly Cleanup Cron-Job

**Geänderte Dateien:**
- `src/infrastructure/security/aes-encryption.adapter.ts` - Hard-Fail bei Key-Validierung
- `src/infrastructure/integrations/hiorg-server.adapter.ts` - Rate Limiting + Safe Error Logging
- `src/infrastructure/integrations/integrations-infrastructure.module.ts` - ScheduleModule + CleanupTask

**Verification:**
- ✅ TypeScript: Keine Fehler
- ✅ Unit Tests: 35 neue Tests für HiOrg Integration (alle passed)
- ✅ Biome Lint: Keine neuen Errors

---

### File List

**Zu erstellen (Backend):**
- `packages/backend/prisma/migrations/*/add_integration_credentials.sql`
- `packages/backend/src/modules/auth/guards/admin-role.guard.ts` (NEU!)
- `packages/backend/src/domain/common/ports/encryption.port.ts`
- `packages/backend/src/domain/common/ports/hiorg-server.port.ts`
- `packages/backend/src/domain/integrations/entities/integration-credential.entity.ts`
- `packages/backend/src/domain/integrations/repositories/i-integration-credential.repository.ts`
- `packages/backend/src/domain/integrations/common/integration-error-codes.ts`
- `packages/backend/src/infrastructure/security/aes-encryption.adapter.ts`
- `packages/backend/src/infrastructure/integrations/hiorg-server.adapter.ts`
- `packages/backend/src/infrastructure/integrations/repositories/prisma-integration-credential.repository.ts`
- `packages/backend/src/application/integrations/commands/save-hiorg-credentials/*`
- `packages/backend/src/application/integrations/commands/test-hiorg-connection/*`
- `packages/backend/src/application/integrations/queries/get-hiorg-credentials/*`
- `packages/backend/src/application/integrations/queries/preview-hiorg-persons/*`
- `packages/backend/src/modules/admin/controllers/admin-hiorg-integration.controller.ts`

**Zu erstellen (Frontend):**
- `packages/frontend/src/features/admin/integrations/hiorg/*`
- `packages/frontend/src/routes/app/admin/integrations/hiorg.tsx`

**Zu erweitern:**
- `packages/backend/prisma/schema.prisma` (IntegrationCredential Model)
- `packages/backend/src/infrastructure/di-tokens.ts` (INTEGRATIONS.*)
- `packages/backend/src/modules/auth/guards/index.ts` (AdminRoleGuard export)
- `packages/backend/.env.example` (INTEGRATION_ENCRYPTION_KEY)
