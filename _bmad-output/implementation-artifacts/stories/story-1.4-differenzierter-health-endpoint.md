# Story 1.4: Differenzierter Health-Endpoint

## Story

- **ID**: 1.4
- **Epic**: Epic 1 - Secure Server Foundation & Invite-System
- **Story Key**: 1-4-differenzierter-health-endpoint
- **Title**: Differenzierter Health-Endpoint
- **Status**: done
- **Story Points**: 3
- **Depends On**: Story 1.1 (done), Story 1.2 (done)

## User Story

**Als** Client-Entwickler
**moechte ich** vom Health-Endpoint unterschiedliche Informationen je nach Token-Status erhalten
**damit** ich den Server-Status ohne Authentifizierung pruefen, aber keine sensiblen Daten leaken kann

## Acceptance Criteria

### AC1: Health ohne Token

**Given** ein Request an `GET /health` ohne `X-Server-Access-Token` Header
**When** der Server antwortet
**Then** enthaelt die Response nur:
```json
{
  "status": "ok",
  "setupComplete": true,
  "version": "1.0.0-alpha.37"
}
```
**And** keine weiteren System-Informationen werden preisgegeben (kein database, uptime, memory, etc.)

**Technische Implementierung:**
- [ ] Neue minimale Response-Struktur fuer unauthentifizierte Requests
- [ ] Token-Pruefung manuell im Controller (Guard ist geskippt via @SkipServerAccess)
- [ ] Version aus package.json oder ConfigService beziehen

### AC2: Health mit gueltigem Token

**Given** ein Request an `GET /health` mit gueltigem `X-Server-Access-Token`
**When** der Server antwortet
**Then** enthaelt die Response erweiterte Informationen:
```json
{
  "status": "ok",
  "setupComplete": true,
  "version": "1.0.0-alpha.37",
  "database": "connected",
  "uptime": 12345
}
```
**And** zusaetzlich koennen Memory/Disk Details enthalten sein (optional)

**Technische Implementierung:**
- [ ] Token manuell validieren via IServerAccessTokenRepository.findByTokenHash()
- [ ] Bei gueltigem Token: Erweiterte Terminus-Checks ausfuehren
- [ ] Uptime via process.uptime() berechnen

### AC3: Health im Setup-Pending-Mode

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an `GET /health` gesendet wird
**Then** ist `setupComplete: false`
**And** der Endpoint ist auch ohne Token erreichbar (Whitelist)

**Technische Implementierung:**
- [ ] setupComplete von SetupPendingGuard-Logik wiederverwenden
- [ ] Cache-Wert (10s TTL) nutzen fuer Performance

### AC4: Guard-Bypass fuer Health

**Given** der Health-Controller
**When** der `/health` Endpoint definiert wird
**Then** ist er mit `@SkipServerAccess()` und `@SkipSetupCheck()` dekoriert
**And** die Token-Pruefung erfolgt manuell im Controller (optional enhanced response)

**Technische Implementierung:**
- [ ] Bestehende Decorators beibehalten (@SkipServerAccess, @SkipSetupCheck, @SkipTransform)
- [ ] Manuelle Token-Extraktion aus Request Header
- [ ] Token-Validierung ohne Guard-Exception bei ungueltigem Token

### AC5: Rueckwaertskompatibilitaet

**Given** ein bestehender Client der `/health` aufruft
**When** die Aenderungen deployed werden
**Then** funktioniert der Health-Check weiterhin ohne Breaking Changes
**And** das Basis-Response-Schema bleibt stabil

**Technische Implementierung:**
- [ ] Bestehende Terminus-Checks bleiben fuer /health/liveness, /health/readiness, /health/db
- [ ] Nur GET /health wird differenziert
- [ ] Neue Felder sind additiv (kein Breaking Change)

## Technical Notes

### Bestehende Health-Implementierung

**Aktuelle Dateien:**
- `packages/backend/src/infrastructure/health/health.controller.ts` (354 Zeilen)
- `packages/backend/src/infrastructure/health/health.module.ts`
- `packages/backend/src/infrastructure/health/prisma-health.indicator.ts`

**Aktuelle Endpoints:**
| Endpoint | Zweck | Aenderung |
|----------|-------|-----------|
| `GET /health` | Umfassender Health-Check | **MODIFY** - Differenzierung |
| `GET /health/liveness` | K8s Liveness | Keine |
| `GET /health/readiness` | K8s Readiness | Keine |
| `GET /health/db` | DB-Details | Keine |

**Aktuelle Decorators auf Controller:**
```typescript
@SkipTransform() // Health nutzt Terminus-Format, nicht WrappedResponse
@SkipServerAccess() // Health ohne Token erreichbar
@SkipSetupCheck() // Health auch waehrend Setup verfuegbar
@Controller({ path: 'health', version: VERSION_NEUTRAL })
```

### Implementierungsansatz

**Option A: Separater Endpoint (Nicht empfohlen)**
- Neuer `GET /health/simple` fuer unauthentifiziert
- Problem: Breaking Change fuer Clients die `/health` erwarten

**Option B: Differenzierung im bestehenden Endpoint (Empfohlen)**
- GET /health prueft manuell auf Token
- Ohne Token: Minimale Response
- Mit Token: Vollstaendige Terminus-Response

**Manuelle Token-Pruefung im Controller:**
```typescript
@Get()
async check(@Req() request: Request) {
  const token = request.headers['x-server-access-token'] as string;
  const isAuthenticated = token ? await this.validateToken(token) : false;

  if (isAuthenticated) {
    return this.getDetailedHealth(); // Bestehende Terminus-Checks
  } else {
    return this.getBasicHealth(); // Nur status, setupComplete, version
  }
}
```

### Setup-Complete Logik (aus SetupPendingGuard)

**Quelle:** `packages/backend/src/infrastructure/guards/setup-pending.guard.ts:60-85`

Setup ist complete wenn:
1. Mindestens ein aktiver Admin-User existiert (role: ADMIN oder SUPER_ADMIN)
2. Mindestens ein aktiver Server-Access-Token existiert

**Performance:** 10-Sekunden In-Memory-Cache verhindert DB-Flooding

### Response DTOs

**Neue DTOs erstellen in:** `packages/backend/src/infrastructure/health/dto/`

```typescript
// basic-health.dto.ts
export class BasicHealthDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({ example: true })
  setupComplete!: boolean;

  @ApiProperty({ example: '1.0.0-alpha.37' })
  version!: string;
}

// detailed-health.dto.ts (extends oder separate)
export class DetailedHealthDto extends BasicHealthDto {
  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  database!: 'connected' | 'disconnected';

  @ApiProperty({ example: 12345, description: 'Uptime in seconds' })
  uptime!: number;

  // Optional: Memory, Disk, CPU (aus bestehenden Terminus-Checks)
}
```

### Wichtige Patterns (aus CLAUDE.md)

**DI Token Usage (AC2):**
```typescript
import { DI_TOKENS } from '@/infrastructure/di-tokens';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';

@Inject(DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN)
private readonly tokenRepo: IServerAccessTokenRepository
```

**Kein @ApiWrappedResponse fuer Health:**
- Health-Endpoints behalten `@SkipTransform()`
- Terminus-Format ist Standard fuer Health-Checks
- Kein Breaking Change fuer bestehende Monitoring-Tools

### Testanforderungen

**Unit Tests:** `health.controller.spec.ts`
- Test: Request ohne Token -> BasicHealthDto Response
- Test: Request mit gueltigem Token -> DetailedHealthDto Response
- Test: Request mit ungueltigem Token -> BasicHealthDto Response (kein Error!)
- Test: Setup-Pending -> setupComplete: false
- Test: Setup-Complete -> setupComplete: true

**Test Pattern (AAA mit Given-When-Then):**
```typescript
describe('HealthController.check()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return basic health without token', async () => {
    // Given
    const mockRequest = { headers: {} } as Request;

    // When
    const result = await controller.check(mockRequest);

    // Then
    expect(result).toEqual({
      status: 'ok',
      setupComplete: expect.any(Boolean),
      version: expect.any(String),
    });
    expect(result.database).toBeUndefined(); // Keine Details
  });
});
```

### Project Structure Notes

**Dateien zu erstellen/modifizieren:**

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `infrastructure/health/dto/basic-health.dto.ts` | CREATE | Minimale Health-Response |
| `infrastructure/health/dto/detailed-health.dto.ts` | CREATE | Erweiterte Health-Response |
| `infrastructure/health/dto/index.ts` | CREATE | Barrel Export |
| `infrastructure/health/health.controller.ts` | MODIFY | Token-Differenzierung |
| `infrastructure/health/health.module.ts` | MODIFY | Token-Repository injecten |
| `infrastructure/health/health.controller.spec.ts` | CREATE/MODIFY | Unit Tests |

### Security Considerations

- **Keine sensiblen Daten ohne Token:** Database-Details, Memory-Usage, Disk-Usage nur mit Token
- **Token-Validierung fail-safe:** Bei ungueltigem Token -> Basic Response (kein 401!)
- **Timing-Safe:** Token-Vergleich sollte konstante Zeit haben (bcrypt.compare ist bereits timing-safe)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: CLAUDE.md#Code Review Checklist]
- [Source: packages/backend/src/infrastructure/health/health.controller.ts]
- [Source: packages/backend/src/infrastructure/guards/setup-pending.guard.ts]

## Tasks / Subtasks

### Task 1: DTOs erstellen
- [x] 1.1 `BasicHealthDto` in `infrastructure/health/dto/basic-health.dto.ts`
- [x] 1.2 `DetailedHealthDto` in `infrastructure/health/dto/detailed-health.dto.ts`
- [x] 1.3 Barrel Export in `infrastructure/health/dto/index.ts`

### Task 2: Health Controller erweitern
- [x] 2.1 Token-Repository via DI injecten
- [x] 2.2 Setup-Status Service/Logik wiederverwenden oder injecten
- [x] 2.3 Private Methode `validateToken(token: string): Promise<boolean>`
- [x] 2.4 Private Methode `getBasicHealth(): BasicHealthDto`
- [x] 2.5 `check()` Methode: Differenzierung basierend auf Token
- [x] 2.6 OpenAPI-Schema aktualisieren (beide Response-Varianten dokumentieren)
- [x] 2.7 **[CR-FIX]** Private Methode `getDetailedHealth(): DetailedHealthDto` hinzugefuegt
- [x] 2.8 **[CR-FIX]** AC1 Security: `getBasicHealth()` gibt IMMER status='ok' zurueck (keine DB-Info Disclosure)
- [x] 2.9 **[CR-FIX]** Version dynamisch aus `process.env.npm_package_version` statt hardcoded
- [x] 2.10 **[CR-FIX]** Cache-Invalidierung bei Fehlern in `isSetupComplete()`

### Task 3: Health Module aktualisieren
- [x] 3.1 IServerAccessTokenRepository via DI_TOKENS importieren
- [x] 3.2 Repository als Provider registrieren (oder von InfrastructureModule importieren)

### Task 4: Tests schreiben
- [x] 4.1 Unit Test: Basic Health ohne Token
- [x] 4.2 Unit Test: Detailed Health mit gueltigem Token
- [x] 4.3 Unit Test: Basic Health mit ungueltigem Token
- [x] 4.4 Unit Test: setupComplete true/false
- [x] 4.5 Lint Check: `pnpm --filter @bluelight-hub/backend lint:check`
- [x] 4.6 TypeScript Compilation Check
- [x] 4.7 **[CR-FIX]** Unit Test: AC1 Security - status='ok' auch bei DB-Fehler
- [x] 4.8 **[CR-FIX]** Unit Test: Cache-Behavior (TTL, Invalidierung)

### Task 5: Manuelle Validierung
- [x] 5.1 Health ohne Token testen (curl/httpie)
- [x] 5.2 Health mit gueltigem Token testen
- [x] 5.3 Health im Setup-Pending-Mode testen (DB zuruecksetzen)

## Dev Notes

### Aus vorherigen Stories gelernt (1.3, 1.3a)

**Backend Patterns:**
- TransactionalCommandHandler Pattern fuer atomare Operations
- NIEMALS `import type` fuer Injectable Classes (bricht DI!)
- DI_TOKENS als Constants, nicht inline Strings
- Result Pattern fuer Business-Errors, keine Exceptions

**Testing:**
- AAA Pattern mit Given-When-Then Kommentaren
- `jest.clearAllMocks()` in beforeEach()
- `jest.Mocked<T>` fuer Service Mocks

**Code Review Checklist (AC1-AC7 aus CLAUDE.md):**
- [ ] AC1: DI Import Check (kein `import type` fuer Injectables)
- [ ] AC2: DI Token Constants Check
- [ ] AC3: Framework-Agnostizitaet (nur @Injectable in Application Layer)
- [ ] AC4: Result Pattern (nicht anwendbar - kein Application Handler)
- [ ] AC5: Outbox Integration (nicht anwendbar - keine Events)
- [ ] AC6: Test Pattern Check (AAA + Given-When-Then)
- [ ] AC7: Controller Response Decorator (hier: @SkipTransform bleibt!)

### Definition of Done

- [x] AC1-AC5 implementiert und getestet
- [x] Unit Tests geschrieben und bestanden (17/17)
- [x] Lint Check passed
- [x] TypeScript Compilation passed
- [x] Manuelle Tests erfolgreich
- [x] Code Review approved (self-review via adversarial CR workflow)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via Dev Agent (Amelia)

### Implementation Notes

**Code Review durchgefuehrt:** 2026-01-07

**Gefundene Issues und Fixes:**

1. **CRIT-2/CRIT-3: AC2 nicht implementiert** - `check()` gab `HealthCheckResult` (Terminus) zurueck statt `DetailedHealthDto`
   - Fix: Neue `getDetailedHealth()` Methode erstellt die korrekt `DetailedHealthDto` mit database, uptime, memory, loadAverage zurueckgibt

2. **HIGH-1: Information Disclosure (AC1)** - `getBasicHealth()` gab DB-Status an unauthentifizierte Clients
   - Fix: `status` ist jetzt IMMER `'ok'` fuer unauthentifizierte Requests

3. **HIGH-2: Hardcoded Version** - Version war hardcoded als `'1.0.0-alpha.37'`
   - Fix: Dynamisch aus `process.env.npm_package_version`

4. **HIGH-3: Cache-Bug** - Bei DB-Fehlern wurde Cache nicht invalidiert
   - Fix: `cachedSetupComplete = null; cacheTimestamp = 0;` im catch-Block

5. **HIGH-4: Fehlende Tests** - Cache-Behavior und AC1 Security Tests fehlten
   - Fix: 2 neue Test-Suiten hinzugefuegt (Security, Cache Behavior)

6. **Cleanup:** Unused Methods entfernt (checkCpuStatus, checkInternetStatus, etc.) da nicht mehr verwendet

**Test Results:**
- 17/17 Tests PASSED
- TypeScript Compilation OK
- Lint Check OK (7 files, no issues)

### File List

| File | Action | Description |
|------|--------|-------------|
| `packages/backend/src/infrastructure/health/health.controller.ts` | MODIFY | Token-Differenzierung, getDetailedHealth(), getBasicHealth() Security, Cache-Fix |
| `packages/backend/src/infrastructure/health/health.controller.spec.ts` | MODIFY | Neue Tests: AC2 DetailedHealthDto, AC1 Security, Cache-Behavior |
| `packages/backend/src/infrastructure/health/dto/basic-health.dto.ts` | EXISTS | BasicHealthDto (bereits korrekt) |
| `packages/backend/src/infrastructure/health/dto/detailed-health.dto.ts` | EXISTS | DetailedHealthDto (bereits korrekt) |
| `packages/backend/src/infrastructure/health/dto/index.ts` | EXISTS | Barrel Export (bereits korrekt) |
| `packages/backend/src/infrastructure/health/health.module.ts` | EXISTS | DI bereits konfiguriert |

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-07 | SM (Bob) | Story erstellt mit Subagent-Analyse (3 parallele Agents) |
| 2026-01-07 | Dev Agent (Amelia) | Code Review: 6 Issues gefunden (3 CRIT, 4 HIGH) |
| 2026-01-07 | Dev Agent (Amelia) | Alle Issues gefixt, Tests aktualisiert, 17/17 PASSED |
| 2026-01-07 | Dev Agent (Amelia) | Story als DONE markiert |
