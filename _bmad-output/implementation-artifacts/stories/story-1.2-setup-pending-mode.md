# Story 1.2: Setup-Pending-Mode

## Story

- **ID**: 1.2
- **Epic**: Epic 1 - Secure Server Foundation & Invite-System
- **Story Key**: 1-2-setup-pending-mode
- **Title**: Setup-Pending-Mode
- **Status**: done
- **Story Points**: 5

## User Story

**Als** Server-Administrator
**moechte ich**, dass ein frisch deployter Server nur Setup-relevante Endpoints freigibt
**damit** unbefugter Zugriff vor der Initialisierung verhindert wird

## Abhaengigkeiten

**Story 1.1 (ServerAccessToken Entity & Repository)** ✅ DONE
**Story 1.1a (ServerAccessGuard & Decorator)** ✅ DONE

Diese Stories haben bereits implementiert:
- `ServerAccessToken` Aggregate mit `isValid()`, `recordUsage()`
- `IServerAccessTokenRepository` mit `findAllActive()`, `countActive()`
- `ServerAccessGuard` mit `@SkipServerAccess()` Decorator
- Guard-Registrierung Pattern in `AppModule`
- DI Token Pattern mit Symbols

## Acceptance Criteria

### AC1: Setup-Status Ermittlung

**Given** ein Server ohne Admin-User ODER ohne aktiven Access-Token
**When** der Server startet oder ein Request eingeht
**Then** ist der Server im "Setup-Pending-Mode"
**And** sobald ein User mit Rolle `ADMIN` existiert UND mindestens ein nicht-revoked Access-Token existiert, ist Setup-Pending-Mode deaktiviert

**Technische Implementierung:**
- [x] Query: `SELECT COUNT(*) FROM User WHERE role = 'ADMIN'`
- [x] Query: `SELECT COUNT(*) FROM ServerAccessToken WHERE isRevoked = false AND (expiresAt IS NULL OR expiresAt > NOW())`
- [x] Beide Bedingungen muessen erfuellt sein fuer `setupComplete = true`

### AC2: SetupPendingGuard implementieren

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an einen beliebigen Endpoint gesendet wird (ausser Whitelist)
**Then** blockiert der `SetupPendingGuard` den Request mit **503 Service Unavailable**
**And** die Response enthaelt `{ error: "SERVER_NOT_SETUP", message: "Server setup required" }`

**Technische Implementierung:**
- [x] Guard in `infrastructure/guards/setup-pending.guard.ts`
- [x] Guard implementiert `CanActivate` Interface
- [x] Guard wirft `ServiceUnavailableException` (NestJS built-in fuer 503)
- [x] Custom Error Response mit `error` und `message` Feldern

### AC3: Whitelist-Endpoints im Setup-Pending-Mode

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an folgende Endpoints gesendet wird:
- `GET /health` - Health-Check
- `POST /admin/setup` - Admin-Setup Endpoint (Story 1.3)
- `POST /auth/exchange-invite` - Invite-Token-Exchange (Story 1.6)
**Then** wird der Request durchgelassen (Guard uebersprungen)

**Technische Implementierung:**
- [x] Whitelist via `@SkipSetupCheck()` Decorator
- [x] HealthController bereits mit Decorator versehen
- [x] Zukuenftige Endpoints (admin/setup, auth/exchange-invite) dokumentieren

### AC4: SkipSetupCheck Decorator

**Given** ein Controller-Endpoint der im Setup-Mode erreichbar sein soll
**When** der Endpoint mit `@SkipSetupCheck()` dekoriert ist
**Then** ueberspringt der `SetupPendingGuard` die Pruefung
**And** der Decorator nutzt `SetMetadata('skipSetupCheck', true)`

**Technische Implementierung:**
- [x] Decorator in `infrastructure/decorators/skip-setup-check.decorator.ts`
- [x] Export `SKIP_SETUP_CHECK_KEY` Konstante
- [x] JSDoc mit Beispiel-Usage
- [x] Kann auf Klasse ODER Methode angewendet werden

### AC5: Guard-Reihenfolge

**Given** die Guard-Pipeline
**When** Guards registriert werden
**Then** ist die Reihenfolge: **SetupPendingGuard → ServerAccessGuard → JwtAuthGuard**
**And** SetupPendingGuard prueft als erstes, ob Setup abgeschlossen ist

**Technische Implementierung:**
- [x] SetupPendingGuard als erstes APP_GUARD registrieren
- [x] Reihenfolge in `AppModule` providers Array:
  1. ThrottlerGuard (Rate-Limiting)
  2. SetupPendingGuard (Setup-Check) ← NEU
  3. ServerAccessGuard (Token-Check)
  4. JwtAuthGuard (per-Endpoint)

### AC6: Setup-Status Caching (Performance)

**Given** der Setup-Status wird haeufig abgefragt
**When** ein Request eingeht
**Then** wird der Setup-Status fuer **10 Sekunden** gecacht
**And** nach Cache-Invalidierung wird der Status neu ermittelt

**Technische Implementierung:**
- [x] In-Memory Cache im Guard (private variable)
- [x] TTL: 10 Sekunden
- [x] Keine externe Cache-Dependency (Redis nicht noetig)

## Technical Notes

### Setup-Status Query Pattern

```typescript
/**
 * Ermittelt ob das Server-Setup abgeschlossen ist.
 *
 * WARUM zwei Bedingungen?
 * 1. Admin-User: Jemand muss Administration durchfuehren koennen
 * 2. Access-Token: Clients muessen sich authentifizieren koennen
 *
 * Beide sind NOTWENDIG fuer einen betriebsbereiten Server.
 */
async isSetupComplete(): Promise<boolean> {
  // 1. Prüfe ob mindestens ein Admin existiert
  const adminCount = await this.prisma.user.count({
    where: { role: 'ADMIN' }
  });

  if (adminCount === 0) return false;

  // 2. Prüfe ob mindestens ein aktiver Token existiert
  const activeTokenCount = await this.tokenRepo.countActive();
  if (activeTokenCount.isFailure) return false;

  return activeTokenCount.value! > 0;
}
```

### Guard Implementation Pattern (Referenz: ServerAccessGuard)

```typescript
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SERVER_ACCESS_TOKEN_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { SKIP_SETUP_CHECK_KEY } from '../decorators/skip-setup-check.decorator';

/**
 * Guard zur Pruefung ob Server-Setup abgeschlossen ist.
 *
 * Blockiert ALLE Requests mit 503 wenn Setup nicht komplett.
 * Whitelist-Endpoints nutzen @SkipSetupCheck() Decorator.
 *
 * **Guard-Reihenfolge:**
 * SetupPendingGuard → ServerAccessGuard → JwtAuthGuard
 *
 * **Setup ist komplett wenn:**
 * - Mindestens ein User mit role=ADMIN existiert
 * - Mindestens ein aktiver (nicht revoked, nicht expired) Access-Token existiert
 *
 * **Performance:**
 * Setup-Status wird fuer 10 Sekunden gecacht (In-Memory).
 */
@Injectable()
export class SetupPendingGuard implements CanActivate {
  private cachedSetupComplete: boolean | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 Sekunden

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IServerAccessTokenRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @SkipSetupCheck decorator
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SETUP_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipCheck) {
      return true;
    }

    // 2. Check cached setup status
    const isComplete = await this.isSetupComplete();
    if (isComplete) {
      return true;
    }

    // 3. Setup not complete - block with 503
    throw new ServiceUnavailableException({
      error: 'SERVER_NOT_SETUP',
      message: 'Server setup required',
    });
  }

  private async isSetupComplete(): Promise<boolean> {
    // Check cache
    const now = Date.now();
    if (this.cachedSetupComplete !== null && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedSetupComplete;
    }

    // Query database
    const [adminCount, activeTokenResult] = await Promise.all([
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.tokenRepo.countActive(),
    ]);

    const isComplete = adminCount > 0 &&
      activeTokenResult.isSuccess &&
      activeTokenResult.value! > 0;

    // Update cache
    this.cachedSetupComplete = isComplete;
    this.cacheTimestamp = now;

    return isComplete;
  }
}
```

### Decorator Pattern (Referenz: SkipServerAccess)

```typescript
import { SetMetadata } from '@nestjs/common';

export const SKIP_SETUP_CHECK_KEY = 'skipSetupCheck';

/**
 * Decorator zum Ueberspringen der SetupPendingGuard-Pruefung.
 *
 * Verwende diesen Decorator fuer Endpoints die waehrend des
 * Server-Setup-Prozesses erreichbar sein muessen.
 *
 * **Whitelist-Endpoints:**
 * - Health-Check (Monitoring)
 * - Admin-Setup (Initialisierung)
 * - Invite-Exchange (Onboarding)
 *
 * @example
 * ```typescript
 * @SkipSetupCheck()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 * ```
 *
 * @example
 * ```typescript
 * // Auf Klassen-Ebene (alle Methoden)
 * @SkipSetupCheck()
 * @Controller('admin/setup')
 * export class AdminSetupController { ... }
 * ```
 */
export const SkipSetupCheck = () => SetMetadata(SKIP_SETUP_CHECK_KEY, true);
```

### Guard-Registrierung in AppModule

```typescript
// app.module.ts - providers Array (REIHENFOLGE WICHTIG!)
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,      // 1. Rate Limiting (DoS Protection)
},
{
  provide: APP_GUARD,
  useClass: SetupPendingGuard,   // 2. Setup Check (NEW)
},
{
  provide: APP_GUARD,
  useClass: ServerAccessGuard,   // 3. Server Token Check
},
// JwtAuthGuard bleibt per-Endpoint (@UseGuards)
```

### Error Response Format

```typescript
// 503 Service Unavailable Response
{
  "statusCode": 503,
  "error": "SERVER_NOT_SETUP",
  "message": "Server setup required"
}
```

## Files to Create

| File | Type | Description |
|------|------|-------------|
| `infrastructure/decorators/skip-setup-check.decorator.ts` | create | SkipSetupCheck Decorator |
| `infrastructure/decorators/skip-setup-check.decorator.spec.ts` | create | Unit Tests fuer Decorator |
| `infrastructure/guards/setup-pending.guard.ts` | create | SetupPendingGuard Implementation |
| `infrastructure/guards/setup-pending.guard.spec.ts` | create | Unit Tests fuer Guard |

## Files to Modify

| File | Changes |
|------|---------|
| `app.module.ts` | SetupPendingGuard als APP_GUARD registrieren (vor ServerAccessGuard) |
| `infrastructure/health/health.controller.ts` | Add `@SkipSetupCheck()` |

## Architecture Alignment

### Hexagonal Architecture Layer Placement

```
infrastructure/
├── guards/
│   ├── server-access.guard.ts      # Story 1.1a ✅
│   └── setup-pending.guard.ts      # NEU - diese Story
├── decorators/
│   ├── skip-server-access.decorator.ts  # Story 1.1a ✅
│   └── skip-setup-check.decorator.ts    # NEU - diese Story

domain/
└── (keine Aenderungen - Guard nutzt existierende Repositories)

application/
└── (keine Aenderungen)
```

### Pattern Compliance (CLAUDE.md ACs)

- **AC1 (DI Import):** `import { IServerAccessTokenRepository }` (NICHT `import type` fuer DI)
- **AC2 (DI Tokens):** `SERVER_ACCESS_TOKEN_REPOSITORY` als Symbol
- **AC3 (Framework-spezifisch):** Guard ist explizit Infrastructure Layer (NestJS CanActivate)
- **AC6 (Test Pattern):** AAA mit Given-When-Then Kommentaren

### Security Considerations

1. **503 statt 401:** Setup-Status soll nicht Information leaken ob Token existieren
2. **Whitelist minimal:** Nur absolut notwendige Endpoints (Health, Setup, Invite-Exchange)
3. **Cache:** Verhindert DB-Flooding durch Setup-Status-Checks
4. **Kein Token-Logging:** Konsistent mit ServerAccessGuard

## Tasks / Subtasks

### Task 1: SkipSetupCheck Decorator erstellen
- [x] 1.1 Decorator in `infrastructure/decorators/skip-setup-check.decorator.ts` erstellen
- [x] 1.2 Export `SKIP_SETUP_CHECK_KEY` Konstante
- [x] 1.3 JSDoc mit Beispiel-Usage hinzufuegen
- [x] 1.4 Unit Tests erstellen (5 Tests - 1 mehr als geplant)

### Task 2: SetupPendingGuard Implementation
- [x] 2.1 Guard Grundstruktur (implements CanActivate)
- [x] 2.2 DI: PrismaService, TokenRepository, Reflector injizieren
- [x] 2.3 Decorator-Check mit Reflector implementieren
- [x] 2.4 Setup-Status Query implementieren (Admin + Token Check)
- [x] 2.5 In-Memory Caching implementieren (10s TTL)
- [x] 2.6 ServiceUnavailableException mit custom Error Response
- [x] 2.7 JSDoc mit Guard-Reihenfolge Dokumentation

### Task 3: Guard Registration
- [x] 3.1 Guard in `AppModule` als `APP_GUARD` registrieren
- [x] 3.2 Reihenfolge sicherstellen: ThrottlerGuard → SetupPendingGuard → ServerAccessGuard
- [x] 3.3 Import-Statements hinzufuegen

### Task 4: Whitelist-Endpoints
- [x] 4.1 `@SkipSetupCheck()` zu HealthController hinzufuegen
- [x] 4.2 Dokumentieren: admin/setup (Story 1.3) und auth/exchange-invite (Story 1.6) werden dort hinzugefuegt

### Task 5: Tests & Validation
- [x] 5.1 Unit Tests: Decorator (5 Tests - erfolgreich)
  - Metadata wird korrekt gesetzt ✅
  - Funktioniert auf Methoden-Level ✅
  - Funktioniert auf Klassen-Level ✅
  - SKIP_SETUP_CHECK_KEY exportiert ✅
  - getAllAndOverride Test ✅
- [x] 5.2 Unit Tests: Guard (18 Tests - alle bestanden)
  **Basis-Tests:** ✅
  - Setup komplett → Request durchlassen
  - Setup nicht komplett → 503 ServiceUnavailable
  - @SkipSetupCheck → Request durchlassen ohne Check
  - Kein Admin → Setup nicht komplett
  - Kein Token → Setup nicht komplett
  - Admin + Token → Setup komplett
  - Custom Error Response Format korrekt
  **Cache-Tests:** ✅
  - Cache funktioniert (kein erneuter DB-Aufruf innerhalb TTL)
  - Cache invalidiert nach TTL (10s)
  - Cache TTL Boundary Test (exakt 10s)
  - Cache negative result
  **Error Handling:** ✅
  - TokenRepository Fehler → Setup nicht komplett (graceful degradation)
  - PrismaService DB-Connection Fehler → Error propagiert
  - Null token count → Setup nicht komplett
  **Concurrent Requests:** ✅
  - Parallele Requests nutzen Cache (kein DB-Flooding)
  - Race Condition bei erstem Request handled
- [x] 5.3 Architecture Check: `pnpm --filter @bluelight-hub/backend check:arch` ✅ No circular deps
- [x] 5.4 Lint Check: `pnpm exec biome check` ✅
- [x] 5.5 TypeScript Compilation: `tsc --noEmit` ✅

## Code Examples

### Unit Test Pattern (Guard)

```typescript
describe('SetupPendingGuard', () => {
  let guard: SetupPendingGuard;
  let mockPrisma: DeepMockProxy<PrismaService>;
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = mockDeep<PrismaService>();
    mockTokenRepo = createMock<IServerAccessTokenRepository>();
    mockReflector = createMock<Reflector>();

    guard = new SetupPendingGuard(mockPrisma, mockTokenRepo, mockReflector);
  });

  describe('canActivate', () => {
    it('should return true when @SkipSetupCheck is present', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      // When
      const result = await guard.canActivate(context);

      // Then
      expect(result).toBe(true);
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException when no admin exists', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when no active token exists', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1); // Admin exists
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0)); // No tokens
      const context = createMockExecutionContext();

      // When & Then
      await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return true when admin and token exist', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When
      const result = await guard.canActivate(context);

      // Then
      expect(result).toBe(true);
    });

    it('should use cached result within TTL', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));
      const context = createMockExecutionContext();

      // When - First call
      await guard.canActivate(context);

      // When - Second call (should use cache)
      await guard.canActivate(context);

      // Then - DB only called once
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockTokenRepo.countActive).toHaveBeenCalledTimes(1);
    });

    it('should return correct error format in ServiceUnavailableException', async () => {
      // Given
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.user.count.mockResolvedValue(0);
      const context = createMockExecutionContext();

      // When & Then
      try {
        await guard.canActivate(context);
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const response = (error as ServiceUnavailableException).getResponse();
        expect(response).toEqual({
          error: 'SERVER_NOT_SETUP',
          message: 'Server setup required',
        });
      }
    });
  });
});
```

## Dependencies

### Upstream (benoetigt von dieser Story)
- **Story 1.1**: ServerAccessToken Entity & Repository ✅ DONE
- **Story 1.1a**: ServerAccessGuard & Decorator ✅ DONE

### Downstream (benoetigt diese Story)
- **Story 1.3**: Admin-Setup mit Token-Erstellung (nutzt @SkipSetupCheck)
- **Story 1.4**: Differenzierter Health-Endpoint
- **Story 1.6**: Invite-Code erstellen (auth/exchange-invite mit @SkipSetupCheck)

## Scope Clarification

### IN SCOPE (diese Story)
- ✅ SetupPendingGuard Implementation
- ✅ SkipSetupCheck Decorator
- ✅ Guard-Registrierung in AppModule (Reihenfolge)
- ✅ Setup-Status Query (Admin + Token Check)
- ✅ In-Memory Caching (10s TTL)
- ✅ HealthController @SkipSetupCheck

### OUT OF SCOPE (folgende Stories)
- ❌ POST /admin/setup Endpoint → **Story 1.3**
- ❌ POST /auth/exchange-invite Endpoint → **Story 1.6**
- ❌ Admin-User Erstellung → **Story 1.3**
- ❌ INSECURE_MODE fuer Entwicklung → **Story 1.5**

## Requirement Traceability

| Requirement | Type | Description |
|-------------|------|-------------|
| FR37 | Functional | Server-Setup-Status ermitteln |
| FR38 | Functional | Endpoints im Setup-Mode blockieren |
| NFR-P1 | Performance | Guard-Check <10ms (via Caching) |

## Previous Story Intelligence

### Von Story 1.1 (Entity & Repository)
- **Pattern:** `Result<T>` fuer Repository-Methoden
- **Pattern:** `countActive()` Methode existiert bereits
- **Learning:** Value Objects sind immutable, Cache-Werte koennen primitiv sein

### Von Story 1.1a (ServerAccessGuard)
- **Pattern:** Guard-Registrierung als APP_GUARD mit Provider-Array-Reihenfolge
- **Pattern:** Reflector.getAllAndOverride() fuer Decorator-Check
- **Pattern:** SetMetadata() fuer Custom Decorators
- **Learning:** Async Updates mit setImmediate() sind non-blocking
- **Learning:** HealthController hat bereits @SkipServerAccess(), jetzt auch @SkipSetupCheck()
- **Learning:** Guard-Order in AppModule: Array-Index bestimmt Ausfuehrungsreihenfolge

### Code Review Learnings (Story 1.1a)
- **H2 Fix:** `@Inject(Reflector)` ist NICHT noetig - NestJS stellt Reflector global bereit
- **H3 Fix:** Bei kurzen Strings (<8 Zeichen) Maskierung anpassen
- **Pattern:** JSDoc muss "warum" erklaeren, nicht nur "was"

## Definition of Done

- [x] Alle AC erfuellt und getestet
- [x] Unit Tests: Decorator (6 Tests) + Guard (20 Tests) = 26 Tests gesamt
- [x] Architecture Check passed (`check:arch`)
- [x] Lint Check passed (`biome check`)
- [x] TypeScript Compilation passed (`tsc --noEmit`)
- [x] JSDoc fuer Guard und Decorator (deutsch)
- [x] Guard-Reihenfolge dokumentiert
- [x] Code Review approved ✅

---

## Subagent Validation (2026-01-06)

### Validierung mit 4 Subagents

| Agent | Fokus | Ergebnis |
|-------|-------|----------|
| **bmm-requirements-analyst** | AC-Vollstaendigkeit | Datei-Lesefehler (Agent-Bug) |
| **bmm-codebase-analyzer** | Dependency-Check | **GO** ✅ |
| **bmm-test-coverage-analyzer** | Test-Strategie | 3/5 - Edge Cases fehlen |
| **bmm-pattern-detector** | Architecture-Compliance | 2 Minor Violations |

### Critical Findings: None

### Major Findings

| # | Issue | Agent | Resolution |
|---|-------|-------|------------|
| M1 | Cache-Logic gehoert in Service, nicht Guard | Pattern Detector | ⚠️ AKZEPTIERT fuer MVP - Refactoring spaeter |
| M2 | Fehlende Edge Case Tests (Cache TTL, Concurrent) | Test Coverage | ✅ Task 5.2 erweitert |
| M3 | DI-Token String statt Symbol | Pattern Detector | ✅ In Story korrigiert (verwendet DI_TOKENS) |

### Minor Findings

| # | Issue | Agent | Resolution |
|---|-------|-------|------------|
| m1 | HTTP 503 empfohlen statt 403 | Pattern Detector | ✅ Story nutzt bereits 503 |
| m2 | BaseGuard-Abstraktion moeglich | Pattern Detector | ℹ️ Deferred fuer MVP |

### Dependencies Verified (Codebase Analyzer)

| Dependency | Status | Details |
|------------|--------|---------|
| `IServerAccessTokenRepository.countActive()` | ✅ Existiert | Bereits in Story 1.1 implementiert |
| `SERVER_ACCESS_TOKEN_REPOSITORY` | ✅ Existiert | Symbol in di-tokens.ts |
| `PrismaService` | ✅ Existiert | infrastructure/database/prisma.service.ts |
| `ServerAccessGuard` Pattern | ✅ Existiert | Als Vorlage nutzbar |
| `SkipServerAccess` Decorator | ✅ Existiert | Als Vorlage nutzbar |
| `Reflector` Pattern | ✅ Existiert | NestJS Built-in |

### Test Coverage Gap Analysis

| Test-Bereich | Geplant | Empfohlen | Status |
|--------------|---------|-----------|--------|
| Guard Basis-Tests | 12 | 12 | ✅ OK |
| Cache TTL Tests | 0 | 3 | ⚠️ HINZUGEFUEGT |
| Concurrent Requests | 0 | 2 | ⚠️ HINZUGEFUEGT |
| DB Error Recovery | 0 | 2 | ⚠️ HINZUGEFUEGT |
| Decorator Tests | 4 | 4 | ✅ OK |

### Architektur-Hinweis (Pattern Detector)

**Caching im Guard vs. Service:**
- Story implementiert Caching direkt im Guard (einfacher fuer MVP)
- Best Practice waere Caching in separatem `SetupStatusService`
- **Entscheidung:** Fuer MVP akzeptabel, Refactoring in Epic 5+

### Empfehlung

**GO** - Story ist implementierungsreif nach Einarbeitung der Test-Ergaenzungen.

---

**Erstellt**: 2026-01-06
**Aktualisiert**: 2026-01-06 (Subagent Validation)
**Workflow**: create-story (YOLO Mode) + Subagent Validation
**Agent**: Scrum Master (Bob)

---

## Dev Notes

### Kritische Implementierungshinweise

1. **Guard-Reihenfolge ist KRITISCH:**
   - SetupPendingGuard MUSS vor ServerAccessGuard kommen
   - Grund: Im Setup-Mode existieren noch keine Tokens, ServerAccessGuard wuerde 401 werfen
   - SetupPendingGuard gibt 503 mit klarem Error-Code zurueck

2. **Cache-Invalidierung:**
   - Cache hat keine explizite Invalidierung
   - Nach Admin/Token-Erstellung dauert es max 10s bis Setup als "complete" erkannt wird
   - Das ist akzeptabel fuer MVP (Setup passiert einmalig)

3. **Reflector-Injektion:**
   - Reflector wird OHNE @Inject() injiziert (NestJS Built-in)
   - Siehe Story 1.1a Review Fix H2

4. **Error Response:**
   - ServiceUnavailableException akzeptiert Object als Response-Body
   - Format: `{ error: 'SERVER_NOT_SETUP', message: 'Server setup required' }`

### Project Structure Notes

- Guard in `infrastructure/guards/` (Framework-spezifisch)
- Decorator in `infrastructure/decorators/` (Metadata-Wrapper)
- Keine Domain/Application Layer Aenderungen noetig
- Repository-Interface bereits vorhanden (`countActive()`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Guard-Pipeline]
- [Source: _bmad-output/implementation-artifacts/stories/story-1.1a-serveraccessguard-decorator.md]

---

## Dev Agent Record

### Implementation Date
2026-01-06

### Implementation Notes

**Approach:**
- Implementierte SetupPendingGuard nach ServerAccessGuard-Pattern
- Nutzte existierende `countActive()` Methode aus Story 1.1
- In-Memory Caching mit 10s TTL fuer Performance
- Parallele DB-Queries (Admin + Token) fuer Effizienz

**Technische Entscheidungen:**
- ADMIN und SUPER_ADMIN Rollen werden beide als Admin betrachtet
- Cache wird NICHT invalidiert - TTL-basiert (10s max Verzoegerung akzeptabel)
- Reflector ohne @Inject() (NestJS Built-in Pattern aus Story 1.1a)

**Test-Strategie:**
- Direct instantiation statt TestingModule (wie ServerAccessGuard)
- Jest Fake Timers fuer Cache-TTL-Tests
- Promise.all fuer Concurrent Request Tests

### File List

| File | Action | Description |
|------|--------|-------------|
| `packages/backend/src/infrastructure/decorators/skip-setup-check.decorator.ts` | CREATE | SkipSetupCheck Decorator |
| `packages/backend/src/infrastructure/decorators/skip-setup-check.decorator.spec.ts` | CREATE | 5 Unit Tests |
| `packages/backend/src/infrastructure/guards/setup-pending.guard.ts` | CREATE | SetupPendingGuard Implementation |
| `packages/backend/src/infrastructure/guards/setup-pending.guard.spec.ts` | CREATE | 18 Unit Tests |
| `packages/backend/src/app.module.ts` | MODIFY | Guard Registration (nach ThrottlerGuard, vor ServerAccessGuard) |
| `packages/backend/src/infrastructure/health/health.controller.ts` | MODIFY | @SkipSetupCheck() Decorator hinzugefuegt |

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-06 | SM (Bob) | Story erstellt, Subagent Validation durchgefuehrt |
| 2026-01-06 | Dev (Amelia) | Implementation abgeschlossen, 23 Tests, Status → review |
| 2026-01-06 | Dev (Amelia) | Code Review Fixes: +3 Tests (H1, H2, L1), JSDoc verbessert (M2, M3), GWT-Pattern korrigiert (L3), Decorator-Precedence-Test (M1). 26 Tests total, Status → done |
