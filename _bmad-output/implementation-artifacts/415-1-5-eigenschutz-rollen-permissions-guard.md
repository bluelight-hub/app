# Story 1.5: Eigenschutz-Rollen + Permissions-Guard

Status: superseded-by-permission-guard

> **Update 2026-04-28:** Eigenschutz-Rollen-Schicht ist entfernt — Permission-Guard ist die einzige Autorisierungsquelle.
>
> Begründung: Die doppelte Autorisierung (Rollen-Match + Permission-Match) erzeugte Pflege-Aufwand und User-facing-Verwirrung beim 403-Mapping. Permissions sind jetzt die alleinige Source of Truth. Konkret entfernt:
>
> - Domain-Union-Type `EigenschutzRolle` (`Sicherheitsbeauftragter | Abschnittsleiter | Einheitsführer | Nachbereitung`).
> - Decorator `@RequiresEigenschutzRolle` und Guard `EigenschutzRolleGuard`.
> - Konstante `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` (mit `error: 'InsufficientRole'`).
> - Provider-Registrierungen + Specs.
>
> Verbleibend: `JwtAuthGuard → EinsatzScopeGuard → PermissionsGuard` mit `@RequiresPermission(...)`. Die ACs unten bleiben **als Historik** stehen und sind nicht mehr Vertrag — Folge-Stories müssen die Drei-Schicht-Kette referenzieren. Siehe `deferred-work.md` Refactor 2026-04-28.

**Scope-Grenze (KRITISCH):** Diese Story ist **Plattform-Backend + Eigenschutz-Guards**. Sie liefert den neuen `EigenschutzRolleGuard`, den neuen `PermissionsGuard`, die Begleit-Decorators `@RequiresEigenschutzRolle` + `@RequiresPermission`, den Domain-Union-Type `EigenschutzRolle`, die konstanten Permission-Strings und die AuthModule-Registrierung. **Nicht in dieser Story:**

- `EinsatzScopeGuard` — existiert bereits (Story 1.3, ADR-012) und wird nur **konsumiert**, nicht verändert.
- `eigenschutz.module.ts` + Controller-Stub — Story 1.6.
- Prisma-Migration / Schema-Changes — Q4-Revision fordert **kein** `EigenschutzRolle`-Prisma-Enum und **keine** Spalten-Erweiterung an `EinsatzRollenbesetzung`.
- Seed-Records für 4 `RollenDefinition` (`Eigenschutz: ...`) — bereits in Story 1.4 angelegt (`prisma/seed.ts:248-289`).
- Event-Registry-Erweiterungen — Story 1.7.
- Frontend / Shared-Client / OpenAPI — kein Controller, kein DTO in dieser Story.
- Eager-Guard-Bootstrap-Validation — deferred (analog Story 1.3 AC5, „Lazy Fail-Fast").

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Sicherheitsbeauftragter (Eigenschutz-Rolle)**,
I want **dass meine Schreibrechte auf Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln und Sicherungsposten technisch durchgesetzt werden und Quittungen nur von der empfangenden Rolle abgegeben werden können**,
so that **ich sicher sein kann, dass kein falscher Nutzer den Schutz-Stand meines Einsatzes verändert** (FR44–FR47, NFR-S2, NFR-S7).

## Acceptance Criteria

### AC1 — `EigenschutzRolleGuard` prüft Präfix + exakten Rollen-Match (OR-Semantik)

**Given** ein Controller-Handler, dekoriert mit `@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Nachbereitung')` und geschützt durch die Guard-Kette `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)`
**When** ein authentifizierter Nutzer den Endpoint aufruft und sein `request.einsatzContext.einsatzRollenNamen` mindestens **einen** der Werte `['Eigenschutz: Sicherheitsbeauftragter', 'Eigenschutz: Nachbereitung']` enthält
**Then** gibt der Guard `true` zurück und lässt den Aufruf passieren
**And** die Prüfung erfolgt OR-semantisch zwischen den aufgelisteten Rollen (analog `@Roles(...)`/`RolesGuard`, `packages/backend/src/modules/auth/guards/roles.guard.ts:42-66`)
**And** der Präfix `Eigenschutz: ` wird vom Guard selbst vorangestellt — der Decorator empfängt **ohne** Präfix (Short-Form, Architecture §H `architecture.md:1145-1147`)
**And** **kein** Decorator (leere Meta-Array oder `undefined`) → Guard gibt `true` zurück (Pass-through-Verhalten, analog `RolesGuard`, siehe `roles.guard.ts:45-47`).

### AC2 — Falsche Rolle → HTTP 403 mit strukturiertem Body + Security-Log

**Given** ein Handler mit `@RequiresEigenschutzRolle('Sicherheitsbeauftragter')`
**When** ein Nutzer mit `einsatzRollenNamen = ['Eigenschutz: Einheitsführer']` aufruft (Präfix vorhanden, aber Rolle stimmt nicht)
**Then** wirft der Guard `ForbiddenException` mit Body `{ statusCode: 403, error: 'InsufficientRole', message: 'Diese Eigenschutz-Funktion erfordert eine andere Rolle', suggestedAction: 'Zurück zum Überblick' }` (Konstante `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY`)
**And** emittiert **genau einen** strukturierten `logger.warn`-Eintrag mit Payload `{userId, einsatzId, reason: 'insufficient-eigenschutz-role'}` (Context-String `'EigenschutzRolleGuard'`, NFR-S7)
**And** niemals werden `rollenName`, `personVorname`, `personNachname` oder Permission-Inhalte in den Log geschrieben (PII-Schutz)
**And** bei `einsatzRollenNamen = []` (leer) → identischer 403-Pfad mit `reason: 'no-eigenschutz-role'`.

### AC3 — `PermissionsGuard` prüft `einsatzPermissions` (OR-Semantik)

**Given** ein Controller-Handler, dekoriert mit `@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write', 'eigenschutz:psa:write')` und geschützt durch die Guard-Kette `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)`
**When** `request.einsatzContext.einsatzPermissions` mindestens **eine** der geforderten Permissions enthält
**Then** gibt der Guard `true` zurück
**And** bei **keinem** Match wirft er `ForbiddenException` mit Body `{ statusCode: 403, error: 'InsufficientPermission', message: 'Fehlende Berechtigung für diese Eigenschutz-Aktion', suggestedAction: 'Zurück zum Überblick' }` (Konstante `EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY`)
**And** emittiert `logger.warn` mit `{userId, einsatzId, reason: 'insufficient-permission'}` — **niemals** die konkret geforderten oder geladenen Permission-Strings (die sind Teil von `User.permissions`-JSON und könnten dennoch PII-nah sein; Log-Payload bleibt minimal)
**And** **kein** Decorator → Pass-through (gibt `true` zurück)
**And** die Prüfung ist **exakter String-Match** auf `einsatzPermissions`, keine Wildcard-Expansion (`eigenschutz:*` matcht **nicht** `eigenschutz:psa:write` — Wildcard-Logik ist explizit out of scope; FR45/FR47 arbeiten mit konkreten Strings, Architecture §B10 `architecture.md:699-707`).

### AC4 — ADMIN-Bypass für globale Plattform-Rolle (`UserRole.ADMIN` + `SUPER_ADMIN`)

**Given** die FR44/FR45/FR47-Formulierung „… **oder** globale `UserRole.ADMIN`" (epics.md Z. 104–107, architecture.md §B10 Z. 710–717)
**When** ein authentifizierter Nutzer mit `request.user.role ∈ {'ADMIN', 'SUPER_ADMIN'}` einen Eigenschutz-Endpoint aufruft, der mit `@RequiresEigenschutzRolle(...)` oder `@RequiresPermission(...)` dekoriert ist
**Then** short-circuiten **beide** Guards und geben `true` zurück, **bevor** die Rolle-/Permission-Prüfung läuft
**And** dieser Bypass wird im `logger.debug`-Level protokolliert (`{userId, einsatzId, reason: 'admin-bypass'}`) — nicht `warn`, weil kein Sicherheitsvorfall
**And** die Plattform-Rolle wird aus `request.user as ValidatedUser`-`role`-Feld gelesen (JWT-Payload, siehe `strategies/jwt.strategy.ts:19-27` für `ValidatedUser`-Shape)
**And** bei fehlendem `request.user` (Dev-Fehler: Guard-Kette ohne `JwtAuthGuard`) → `ForbiddenException('Nicht authentifiziert')` (Defense-in-Depth, analog `roles.guard.ts:53-57`).

### AC5 — `EinsatzScopeGuard` als Pflicht-Vorgänger → Fail-Fast bei fehlendem `einsatzContext`

**Given** beide neuen Guards lesen `request.einsatzContext.{einsatzRollenNamen, einsatzPermissions}`, die **ausschließlich** durch `EinsatzScopeGuard` (Story 1.3) bereitgestellt werden
**When** der Guard ausgeführt wird, **ohne** dass `EinsatzScopeGuard` davor lief (Dev-Fehler: `@UseGuards(JwtAuthGuard, EigenschutzRolleGuard)` ohne Scope-Guard, oder falsche Reihenfolge)
**Then** wirft der Guard `InternalServerErrorException` mit DX-Message `"EigenschutzRolleGuard: request.einsatzContext fehlt. EinsatzScopeGuard muss VOR diesem Guard in der @UseGuards-Kette stehen."` bzw. analog für `PermissionsGuard`
**And** dies ist **500**, nicht 403, weil es ein Programmierfehler ist (kein Autorisierungsproblem; Pattern analog Story 1.3 AC5 Fail-Fast)
**And** der Check erfolgt früh im `canActivate` (nach `user`-Defense-Check, vor Decorator-Lookup), damit der Fehler bei jedem Aufruf reproduzibel erscheint.

### AC6 — Decorators `@RequiresEigenschutzRolle` + `@RequiresPermission` (SetMetadata-Pattern)

**Given** das bestehende `SetMetadata`-Decorator-Pattern der Plattform (`decorators/roles.decorator.ts`, `decorators/operative-roles.decorator.ts`, `decorators/einsatz-param.decorator.ts`)
**When** die neuen Decorators angelegt werden
**Then** sind sie als `SetMetadata(KEY, [...werte])`-Factories in `modules/auth/decorators/` implementiert (**nicht** `modules/eigenschutz/decorators/` — siehe Dev Notes „Guard-/Decorator-Platzierung")
**And** die exportierten Metadata-Keys sind benannte Konstanten: `EIGENSCHUTZ_ROLE_KEY = 'eigenschutzRoles'` bzw. `EIGENSCHUTZ_PERMISSION_KEY = 'eigenschutzPermissions'` (Namensschema analog `ROLES_KEY`, `OPERATIVE_ROLES_KEY`)
**And** beide Decorators sind **sowohl** auf Handler-Ebene **als auch** auf Controller-Klassen-Ebene anwendbar (`SetMetadata` unterstützt beides; Reflector nutzt `getAllAndOverride`, analog `roles.guard.ts:42`)
**And** `@RequiresEigenschutzRolle` akzeptiert Variadic-Parameter vom Typ `EigenschutzRolle` (Union-Type aus AC7, **ohne** `Eigenschutz: `-Präfix — Short-Form); `@RequiresPermission` akzeptiert Variadic `EigenschutzPermission`-String-Literal-Union
**And** Unit-Tests (`__tests__/`) prüfen: (a) Metadata unter richtigem Key, (b) Reflector liest auf Handler-Ebene, (c) Reflector liest auf Klassen-Ebene, (d) Handler-Wert übersteuert Klassen-Wert, (e) ohne Decorator → `undefined` → Guard-Pass-through.

### AC7 — Domain-Typen `EigenschutzRolle` + `EigenschutzPermission` (TypeScript-only, kein Prisma-Enum)

**Given** die Q4-Revision (epics.md Z. 26–28, architecture.md §B10 Z. 673–697) — **kein** Prisma-Enum, **keine** Schema-Änderung
**When** die Domain-Typen angelegt werden
**Then** existiert `packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts` als neue Datei mit String-Literal-Union `export type EigenschutzRolle = 'Sicherheitsbeauftragter' | 'Abschnittsleiter' | 'Einheitsführer' | 'Nachbereitung'` (Short-Form, **ohne** Präfix) + Konstante `export const EIGENSCHUTZ_ROLE_PREFIX = 'Eigenschutz: '` als Single-Source-of-Truth für den Präfix
**And** existiert `packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts` mit String-Literal-Union `EigenschutzPermission` für das MVP-Permission-Inventar aus Architecture §B10 Z. 699–706: `'eigenschutz:gefaehrdungsbeurteilung:read' | 'eigenschutz:gefaehrdungsbeurteilung:write' | 'eigenschutz:psa:read' | 'eigenschutz:psa:write' | 'eigenschutz:sicherheitsregel:read' | 'eigenschutz:sicherheitsregel:write' | 'eigenschutz:sicherheitsregel:acknowledge' | 'eigenschutz:sicherungsposten:read' | 'eigenschutz:sicherungsposten:write' | 'eigenschutz:vorfall:read' | 'eigenschutz:vorfall:report' | 'eigenschutz:vorfall:export' | 'eigenschutz:telemetry:write'`
**And** der Ordner `packages/backend/src/domain/eigenschutz/enums/` wird **in dieser Story angelegt** (erster Eigenschutz-Domain-Slice); die weiteren Eigenschutz-Unterordner (`aggregates/`, `value-objects/`, `events/`, `repositories/`, `errors/`) bleiben leer bzw. werden in späteren Stories angelegt (Architecture §B Z. 918–974)
**And** beide Dateien haben keine Runtime-Abhängigkeiten (reine Type-Exports + eine Präfix-Konstante) — `import type`-freundlich, damit Decorator-Dateien sie über `import type` konsumieren können, ohne DI-Zyklen auszulösen
**And** Präfix-Länge (`'Eigenschutz: '.length === 13`) darf **nirgends im Code** hartkodiert werden — immer `EIGENSCHUTZ_ROLE_PREFIX.length` verwenden (zukunftssichere Einzigartigkeit).

### AC8 — Guard-Composition: Paralleler Einsatz beider Guards möglich, aber pro Endpoint empfohlen nur EIN feingranularer Guard

**Given** Architecture §H Z. 1139–1141 („`EigenschutzRolleGuard` **ODER** `PermissionsGuard`. Niemals beide gleichzeitig am selben Endpoint — Entscheidung explizit nach Granularität.")
**When** ein Entwickler dennoch beide Guards am selben Handler verdrahtet
**Then** funktionieren beide **unabhängig** (kein gegenseitiger State, keine Interferenz) — der Handler muss dann **beide** Prüfungen bestehen (AND-Semantik durch die `@UseGuards`-Kette)
**And** der Dev Notes-Abschnitt „Guard-Kette" dokumentiert: **Best Practice = ein Guard pro Endpoint**; die technische Koexistenz dient nur Edge-Cases (Cross-Cutting-Endpoint mit Rolle-**und**-Permission-Check)
**And** in den Unit-Tests wird **ein** Szenario mit beiden Guards hintereinander abgedeckt, um Regressions-Schutz gegen versehentliche Kopplung zu geben.

### AC9 — Tests: ≥ 80 % Coverage für alle neuen Files + strukturierte Log-Assertions (NFR-M1)

**Given** NFR-M1 (≥ 80 % Unit-Test-Coverage) und die Review-Findings aus Story 1.3 (17 Patches, siehe Dev Notes „Previous-Story-Intelligence")
**When** `cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage` läuft
**Then** decken die Guard-Tests **mindestens** ab: (a) Happy-Path Rolle-Match → `true`, (b) Falsche Rolle → 403 mit strukturiertem Body (nicht nur `expect.toBeInstanceOf(ForbiddenException)`; vollständiger Body-Match inkl. `suggestedAction`), (c) Leere `einsatzRollenNamen` → 403 mit `reason: 'no-eigenschutz-role'`, (d) Kein Decorator → Pass-through, (e) ADMIN-Bypass (`request.user.role === 'ADMIN'`), (f) SUPER_ADMIN-Bypass, (g) Fehlender `einsatzContext` (EinsatzScopeGuard nicht vorgängig) → 500 mit DX-Message, (h) Fehlender `request.user` → 403 „Nicht authentifiziert", (i) Handler-Wert übersteuert Klassen-Wert (Reflector-Semantik), (j) Permission-Happy-Path, (k) Permission-Miss → 403 `InsufficientPermission`, (l) Permission mit leerem `einsatzPermissions`-Array → 403, (m) `EIGENSCHUTZ_ROLE_PREFIX` wird aus Konstante gelesen (Magic-String-Freiheit im Guard)
**And** Decorator-Tests decken die fünf Szenarien aus AC6 ab (analog `einsatz-param.decorator.spec.ts:1-75`)
**And** Domain-Enum-Tests prüfen: (i) Präfix-Konstante `=== 'Eigenschutz: '`, (ii) Alle Literal-Union-Werte in einem `const ALL_EIGENSCHUTZ_ROLLEN`-Array exportiert (für Laufzeit-Iteration in späteren Consumer-Stories); analog `ALL_EIGENSCHUTZ_PERMISSIONS`
**And** ein `expectNoPiiInLogPayload`-Helper (analog `einsatz-scope.guard.spec.ts:88-95`) prüft in **allen** Warn-Szenarien, dass `personVorname`, `personNachname` und `rollenName` **nicht** im Log-Payload auftauchen
**And** Coverage pro neue Datei (Statements + Branches) ≥ 80 %; Coverage-Werte im `Completion Notes List` dokumentieren
**And** **kein** `@ts-nocheck`, `@ts-expect-error` oder `any`-Casts in den Spec-Files (Review-Lessons aus Story 1.3)
**And** Tests nutzen **keine** Silent-Array-Coercion auf Request-Params (Review-Lesson — Array-Reads müssen explizit geprüft werden, falls sie in Zukunft hinzukommen).

### AC10 — Quality-Gates (NFR-M2, NFR-M3, NFR-M4)

**Given** das Plattform-DoD (CLAUDE.md „Definition of Done")
**When** die Story fertig ist
**Then** laufen alle folgenden Kommandos erfolgreich:

- `pnpm --filter @bluelight-hub/backend check:di:imports` → keine Violations (NFR-M2; KEINE `import type` für Injectable-Klassen wie `Reflector`, `LoggerService`)
- `pnpm --filter @bluelight-hub/backend check:arch` → keine neuen Circular Dependencies (NFR-M3)
- `pnpm lint` → 0 Errors (bestehende Warnings zählen nicht als Regression, solange keine neuen entstehen; NFR-M4)
- `pnpm --filter @bluelight-hub/backend build` → grün
- `cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage` → alle neuen Tests grün
- Full-Backend-Test-Run (`cd packages/backend && npx jest --no-coverage --runInBand`) → **keine neuen** Failures gegenüber Baseline von Story 1.3 (17 pre-existing Failures in `admin-jwt-guard.e2e.spec.ts` + `server-access.guard.integration.spec.ts` bleiben erhalten; dokumentieren, falls sie sich verschieben)

**And** die Dokumentations-Pflichten aus CLAUDE.md werden erfüllt: Story-Status-Transition `ready-for-dev → in-progress → review` im `sprint-status.yaml`, `Dev Agent Record` (Completion Notes + File List + Change Log) ausgefüllt.

## Tasks / Subtasks

- [x] **Task 1: Domain-Typen anlegen (AC: 7)**
  - [x] Neu: `packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`
    ```ts
    export const EIGENSCHUTZ_ROLE_PREFIX = 'Eigenschutz: ' as const;
    export type EigenschutzRolle = 'Sicherheitsbeauftragter' | 'Abschnittsleiter' | 'Einheitsführer' | 'Nachbereitung';
    export const ALL_EIGENSCHUTZ_ROLLEN: readonly EigenschutzRolle[] = ['Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung'] as const;
    ```
    JSDoc erklärt: Short-Form ohne Präfix, Präfix wird vom Guard vorangestellt, Q4-Revision-Alignment (kein Prisma-Enum).
  - [x] Neu: `packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts` — Literal-Union + `ALL_EIGENSCHUTZ_PERMISSIONS`-Array (13 Werte aus Architecture §B10 Z. 699–706).
  - [x] Neu: `packages/backend/src/domain/eigenschutz/enums/__tests__/eigenschutz-rolle.enum.spec.ts` + `eigenschutz-permission.enum.spec.ts` — jeweils 2 Tests (Präfix-Wert, Array-Vollständigkeit gegen Union-Type).
  - [x] **KEIN** Index-Export-Barrel anlegen — direkte Imports aus den `.enum.ts`-Dateien sind tree-shaking-freundlicher und vermeiden Circular-Import-Risiken. Falls später ein Barrel gewünscht ist, separate Story.

- [x] **Task 2: Decorators + Metadata-Keys (AC: 6)**
  - [x] Neu: `packages/backend/src/modules/auth/decorators/requires-eigenschutz-rolle.decorator.ts`
    ```ts
    import { SetMetadata } from '@nestjs/common';
    import type { EigenschutzRolle } from '@domain/eigenschutz/enums/eigenschutz-rolle.enum';
    export const EIGENSCHUTZ_ROLE_KEY = 'eigenschutzRoles';
    export const RequiresEigenschutzRolle = (...rollen: EigenschutzRolle[]) => SetMetadata(EIGENSCHUTZ_ROLE_KEY, rollen);
    ```
    JSDoc mit Beispiel-Snippet für Handler- und Klassen-Level, Hinweis „Short-Form — Guard prepended `Eigenschutz: `".
  - [x] Neu: `packages/backend/src/modules/auth/decorators/requires-permission.decorator.ts` — analog, Typ `EigenschutzPermission`, Key `'eigenschutzPermissions'`.
  - [x] Neu: `packages/backend/src/modules/auth/decorators/__tests__/requires-eigenschutz-rolle.decorator.spec.ts` + `requires-permission.decorator.spec.ts` — je 5 Tests (AC6 Szenarien a–e; Pattern: `einsatz-param.decorator.spec.ts:1-75`).

- [x] **Task 3: `EigenschutzRolleGuard` implementieren (AC: 1, 2, 4, 5, 8, 9)**
  - [x] Neu: `packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts` (Pattern: `einsatz-scope.guard.ts`, `roles.guard.ts`).
  - [x] Shared-Helper-Strategie (einmalig für diese Story): **Duplizieren** (analog Story 1.3). `FORBIDDEN_RESPONSE_BODY`-Pattern und `buildSecurityLogPayload`-Helper werden in den beiden neuen Guards **inline** wiederverwendet (Copy statt Extraction), damit Story 1.5 keine API-Surface in `modules/auth/utils/` aufzieht. Eine spätere Plattform-Story kann beide Guards + `EinsatzScopeGuard` auf einen gemeinsamen Helper refaktorieren; jetzt nicht (YAGNI). JSDoc-Header beider Guards markiert diesen bewussten Trade-off.
  - [x] Injizierte Dependencies: `Reflector` (reg. `import`), `@Inject(LOGGER) ILogger` (reg. `import` — Injectable Token). **KEINE** weiteren DI-Abhängigkeiten.
  - [x] `canActivate(context)`-Logik:
    1. `request = context.switchToHttp().getRequest<Request>()`
    2. `user = request.user as ValidatedUser | undefined` — falls `!user` → `ForbiddenException('Nicht authentifiziert')` (Defense-in-Depth).
    3. **Fail-Fast (AC5):** `einsatzContext = request.einsatzContext` — falls `undefined` → `InternalServerErrorException('EigenschutzRolleGuard: request.einsatzContext fehlt. EinsatzScopeGuard muss VOR diesem Guard in der @UseGuards-Kette stehen.')`.
    4. `required = reflector.getAllAndOverride<EigenschutzRolle[]>(EIGENSCHUTZ_ROLE_KEY, [handler, class]) ?? []` — leer → `return true` (Pass-through).
    5. **ADMIN-Bypass (AC4):** `if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') { logger.debug(buildSecurityLogPayload(user.userId, einsatzContext.einsatzId, 'admin-bypass'), LOG_CONTEXT); return true; }`
    6. Expected-Rollen mit Präfix bauen: `const expectedFullNames = required.map(r => EIGENSCHUTZ_ROLE_PREFIX + r)`.
    7. Match: `const hasRole = einsatzContext.einsatzRollenNamen.some(name => expectedFullNames.includes(name))`.
    8. Falls nicht: strukturiertes `logger.warn` mit `reason: einsatzContext.einsatzRollenNamen.length === 0 ? 'no-eigenschutz-role' : 'insufficient-eigenschutz-role'` + `ForbiddenException(EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY)`.
    9. Sonst `return true`.
  - [x] **WICHTIG (CLAUDE.md AC1):** `Reflector` wird mit regulärem `import` importiert — **NIEMALS** `import type` für Injectable-Klassen. Nur reine Typen (`ValidatedUser`, `Request`, `EinsatzRequestContext`, `EigenschutzRolle`) mit `import type`.
  - [x] Review-Lesson aus Story 1.3 einhalten: Reflector-Rückgabewert mit `typeof === 'string'`-Guard bzw. `Array.isArray`-Guard auf `EigenschutzRolle[]` validieren — kein blindes Cast. Nicht-Array-Metadata → behandeln als "kein Decorator" (Pass-through), **nicht** als 500. Begründung: Ein falsch typisierter Decorator ist ein Dev-Fehler am **Consumer**, dessen Route in Tests sowieso fehlschlagen sollte; der Guard soll bei Metadata-Garbage nicht Production-Traffic blockieren.

- [x] **Task 4: `PermissionsGuard` implementieren (AC: 3, 4, 5, 8, 9)**
  - [x] Neu: `packages/backend/src/modules/auth/guards/permissions.guard.ts` — analog Task 3, aber auf `einsatzContext.einsatzPermissions` + `EigenschutzPermission`-Typ.
  - [x] Match-Logik: `required.some(p => einsatzContext.einsatzPermissions.includes(p))` (OR-Semantik, exakter String-Match — **keine** Wildcard-Expansion, siehe AC3).
  - [x] ADMIN-Bypass (AC4) — identisches Pattern wie `EigenschutzRolleGuard`.
  - [x] Fehler-Body: Konstante `EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY = { statusCode: 403, error: 'InsufficientPermission', message: 'Fehlende Berechtigung für diese Eigenschutz-Aktion', suggestedAction: 'Zurück zum Überblick' } as const`.
  - [x] Log-Payload-Disziplin: `reason: 'insufficient-permission'` — **niemals** die geforderten oder geladenen Permission-Strings. Die Permission-Liste ist zwar weniger sensitiv als Rollen-Namen, bleibt aber im Payload bewusst weg, damit die Log-Schema-Invariante `{userId, einsatzId, reason}` plattformweit einheitlich bleibt (Grep-Freundlichkeit für Security-Audits).

- [x] **Task 5: AuthModule-Provider-Registrierung (AC: 1, 3, 10)**
  - [x] Edit: `packages/backend/src/modules/auth/auth.module.ts`
    - `providers: [...bestehend, EigenschutzRolleGuard, PermissionsGuard]`
    - `exports: [...bestehend, EigenschutzRolleGuard, PermissionsGuard]` (damit sie aus nachgelagerten Eigenschutz-Modulen, Story 1.6+, importiert werden können)
    - Import regulär (**nicht** `import type`, AC10/NFR-M2).
    - **KEIN** `APP_GUARD` — beide Guards werden selektiv via `@UseGuards(...)` eingesetzt (analog `EinsatzScopeGuard`).
  - [x] Nach Edit: `pnpm --filter @bluelight-hub/backend build` erfolgreich, `check:di:imports` grün.

- [x] **Task 6: Unit-Tests für Guards (AC: 9)**
  - [x] Neu: `packages/backend/src/modules/auth/guards/__tests__/eigenschutz-rolle.guard.spec.ts` — Pattern: `einsatz-scope.guard.spec.ts:1-130`.
    - Mock-Helper `createMockContextAndRequest` aus Story 1.3 adaptieren (Request enthält zusätzlich `einsatzContext`).
    - Test-Szenarien: a-m aus AC9; alle Warn-Calls durch `expectNoPiiInLogPayload`-Helper validiert.
    - Body-Match-Disziplin (Review-Lesson): Bei 403-Tests immer `rejects.toMatchObject({ response: EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY })` statt nur `rejects.toBeInstanceOf(ForbiddenException)`.
  - [x] Neu: `packages/backend/src/modules/auth/guards/__tests__/permissions.guard.spec.ts` — analog.
  - [x] Einmal-Szenario für AC8 (beide Guards hintereinander): In `__tests__/guard-composition.spec.ts` (neu, ein einzelner Test) beide Guards nacheinander aufrufen, gemeinsame Request-Instanz, beide müssen true zurückgeben; dann Rolle rausnehmen → erster wirft, zweiter wird nicht erreicht. Zweck: Regressions-Schutz gegen versehentliche State-Kopplung.

- [x] **Task 7: Quality-Gates + Dokumentation (AC: 10)**
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` ✅
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` ✅
  - [x] `pnpm lint` ✅ (0 neue Errors)
  - [x] `pnpm --filter @bluelight-hub/backend build` ✅
  - [x] `cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage` → alle neuen Tests grün.
  - [x] Coverage-Run mit Pfad-Filter + Report im Completion-Notes-Abschnitt dokumentieren (pro Datei Stmts/Branches/Funcs, ≥ 80 %).
  - [x] Full-Backend-Test-Run + Baseline-Diff gegen Story 1.3-Baseline (17 pre-existing Failures): keine neuen.

## Dev Notes

### Guard-Kette — Plattform-Vertrag (NICHT brechen!)

Die Plattform gibt die Reihenfolge vor (Architecture §H `architecture.md:1128-1150`, ADR-012):

```typescript
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard | PermissionsGuard)
```

- **Best Practice (Architecture §H Z. 1139–1141):** Pro Endpoint **entweder** `EigenschutzRolleGuard` **oder** `PermissionsGuard`, nicht beide. Entscheidung nach Granularität — grobes Gating per Rolle, feingranulares Gating per Permission.
- **Technische Koexistenz (AC8):** Beide Guards sind unabhängig implementiert und können — im Bedarfsfall — hintereinander verwendet werden (AND-Semantik). Das ist kein Empfehlungs-Pattern, sondern ein Escape-Hatch für Cross-Cutting-Endpoints.
- **Reihenfolge-Pflicht (AC5):** Beide Guards **lesen** `request.einsatzContext` — der wird **ausschließlich** von `EinsatzScopeGuard` gesetzt. Fehlt der Scope-Guard in der Kette, wirft der Guard 500 mit DX-Message. Das ist ein bewusster Bruch gegenüber „silent 403", um Dev-Fehler im Smoke-Test sofort auffallen zu lassen (analog Story 1.3 AC5 Fail-Fast).

### Guard-/Decorator-Platzierung — Entscheidung

**Entscheidung:** Guards + Decorators liegen in `modules/auth/guards/` + `modules/auth/decorators/`, **nicht** in `modules/eigenschutz/`.

**Begründung:**

1. `modules/eigenschutz/` existiert noch nicht — `eigenschutz.module.ts` ist Story 1.6 (erst dort Controller-Stub + Module-Boundary).
2. Die Guards sind **Plattform-nahe Bausteine** analog `EinsatzScopeGuard`, der ebenfalls in `modules/auth/guards/` liegt (ADR-012 Entscheidung).
3. Sie konsumieren ausschließlich `request.einsatzContext` (aus `modules/auth/interfaces/`) + `ValidatedUser` (aus `strategies/jwt.strategy.ts`) + `LoggerService` — keine Eigenschutz-Domain-Runtime-Abhängigkeiten. Die einzige Eigenschutz-Referenz ist der **Typ** (String-Literal-Union), der via `import type` aus `domain/eigenschutz/enums/` kommt — das erzeugt keine Laufzeit-Kopplung und keinen DI-Import.
4. Story 1.6 kann die Guards aus `AuthModule` (schon exportiert via AC10 / Task 5) importieren; das `EigenschutzModule` wird `AuthModule` importieren (Standard-Pattern).

**Einzige Datei unter `domain/eigenschutz/`:** die Typ-Dateien aus AC7 (`enums/eigenschutz-rolle.enum.ts`, `enums/eigenschutz-permission.enum.ts`). Der restliche Eigenschutz-Domain-Tree (`aggregates/`, `value-objects/`, `events/`, `repositories/`, `errors/`) bleibt in dieser Story leer — Architecture §B Z. 918–974 erlaubt inkrementellen Aufbau, Story 1.6 legt die Unterordner als Skelett an.

### Previous-Story-Intelligence aus Story 1.3 (MUSS beachten — sonst Review-Patches Runde 2!)

Aus den 17 Review-Patches an Story 1.3 (`415-1-3-...md:398-431`) sind diese Disziplinen für 1.5 bindend:

1. **Keine Doppel-Logs im selben Fehlerpfad.** Jeder Fehlerzweig emittiert **genau einen** `logger.warn`/`logger.debug`-Eintrag. AC2 fordert explizit „genau einen".
2. **Kein `@ts-nocheck` in Specs.** AC9 macht das explizit. Wenn ein Mock-Type-Bug auftritt → sauber typisieren, nicht ausblenden.
3. **Reflector-Rückgabewert schützen.** `getAllAndOverride` liefert `unknown`-artig. Vor Nutzung: `Array.isArray`-Guard (für String-Array-Metadata) — Non-Array → `return true` (Pass-through, nicht 500).
4. **Kein Silent-Array-Coercion bei Request-Params.** Nicht relevant hier (wir lesen `einsatzContext`-Arrays, nicht `request.params`), aber die Disziplin „explizit prüfen, nicht coercen" gilt.
5. **Konstanten extrahieren für wiederholte Bodies.** `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` + `EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY` müssen Konstanten sein, nicht inline dupliziert.
6. **Strukturiertes Log-Format durchgängig.** JSON-Payload via `buildSecurityLogPayload({userId, einsatzId, reason})` — **keine** Freitext-Warns mit String-Interpolation (PII-Leak-Risiko). Alternative: Helper-Duplizieren (siehe Task 3).
7. **Falsy-Check statt explizites `null`-Compare.** Bei `if (!einsatzContext) …` deckst du `undefined`, `null` und `0`-Artefakte ab.
8. **Log-PII-Absenz-Tests.** `expectNoPiiInLogPayload`-Helper in **allen** Warn-Szenarien, nicht nur einem (Review-Lesson Story 1.3 Z. 416).
9. **Response-Body-Assertions vollständig.** Review-Lesson Z. 415: `rejects.toBeInstanceOf(ForbiddenException)` reicht **nicht** — Tests müssen den ganzen Body-Shape asserten (`suggestedAction`, `message`, `statusCode`), sonst bleibt Drift unbemerkt.
10. **Coverage-Werte in `Completion Notes List` eintragen.** AC9 + Review-Lesson Z. 417.
11. **Keine ADR nötig.** Story 1.5 ist kein ADR-Kandidat — die Architektur-Entscheidungen sind bereits in ADR-012 + Architecture §H §B10 festgehalten. Falls später ein Gesamt-Eigenschutz-ADR nötig wird, separate Story.

### Architektur-Guardrails (NICHT verletzen!)

- **Hexagonale Schichten** (CLAUDE.md, `architecture.md:327`): Domain-Typen liegen in `domain/eigenschutz/enums/` (innerster Ring). Guards + Decorators liegen im **Modules**-Layer. Sie dürfen auf Domain-Types zugreifen (Domain < Modules im Dependency-Diamond), aber nicht umgekehrt.
- **DI-Imports (CLAUDE.md AC1):** `Reflector`, `LoggerService` (falls via Token injiziert), `Module`-Referenzen immer mit regulärem `import`. String-Literal-Unions + Konstanten dürfen mit `import type` bzw. `import { ... }` geladen werden (keine Injectable-Klassen). Pre-Commit-Hook `check:di:imports` verlangt das.
- **Response-Decorators** (CLAUDE.md AC7): Nicht relevant — **kein neuer Controller** in dieser Story.
- **Keine manuellen `fetch()`-Calls:** Nicht relevant — backend-only.
- **Result-Pattern:** Nicht relevant — Guards werfen Exceptions direkt (NestJS-idiomatisch), arbeiten nicht mit `Result<T>`. `EinsatzScopeGuard` nutzt Result **intern** für DB-Zugriff, aber der Guard selbst propagiert Exceptions.
- **Kein CQRS-Overhead:** Guards sind synchrone/async-kurze Auth-Checks, kein Command/Query-Handler.
- **Security-Log (NFR-S7):** Alle `logger.warn`-Calls serialisieren `{userId, einsatzId, reason}` als JSON-String, Context = Guard-Name. **Niemals** `rollenName`, PII-Felder oder Permission-Inhalte im Payload.
- **Einsatz-Routen-Nesting** (MEMORY.md `feedback_route_nesting.md`): Nicht direkt relevant (kein Controller), aber Guards sind so designed, dass sie nur auf `/api/einsaetze/:einsatzId/...`-Routen funktionieren — die `einsatzContext`-Dependency setzt das voraus.

### Decorator-Kontrakt — Short-Form ohne Präfix

Der Decorator nimmt die **Short-Form** entgegen, der Guard prepended den Präfix:

```typescript
// ✅ Richtig (Short-Form, Guard prepended 'Eigenschutz: ')
@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Nachbereitung')

// ❌ Falsch (Präfix manuell — Guard würde doppelt prependen)
@RequiresEigenschutzRolle('Eigenschutz: Sicherheitsbeauftragter')
```

**Warum Short-Form?**

1. Type-Safety: `EigenschutzRolle` (Literal-Union, 4 Werte) fängt Tippfehler im Editor, `string` tut das nicht.
2. Lesbarkeit: Präfix ist Implementation-Detail des Guards, nicht des API-Consumers.
3. Refactoring-Sicherheit: Präfix-Änderung wäre ein Single-Point-Edit an der `EIGENSCHUTZ_ROLE_PREFIX`-Konstante.

Identisches Prinzip bei Architecture §H Z. 1145: `@RequiresEigenschutzRolle(SICHERHEITSBEAUFTRAGTER, ADMIN)` — Literal-Shortnames. (Anmerkung: die `ADMIN`-Variante aus §H wird in Story 1.5 bewusst **nicht** umgesetzt — stattdessen ist `ADMIN` durch den AC4-Bypass der Guards abgedeckt. Mischung Eigenschutz-Rolle + globale UserRole im selben Decorator würde die Short-Form-Union verunstalten.)

### Match-Semantik — OR, kein AND, kein Wildcard

- `@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Nachbereitung')` → Nutzer braucht **eine** der beiden (OR). Analog `@Roles(...)`/`RolesGuard`.
- `@RequiresPermission('eigenschutz:psa:write', 'eigenschutz:psa:read')` → Nutzer braucht **eine** der beiden (OR).
- **Kein Wildcard-Matching** auf Permissions: `eigenschutz:*` matcht nichts; FR45/FR47 arbeiten mit konkreten Strings. Wildcard-Expansion ist eine spätere Plattform-Verbesserung und kein MVP-Scope.
- AND-Semantik über zwei Decorators auf demselben Handler wird ausdrücklich nicht unterstützt — die Plattform hat nur einen Metadata-Key pro Decorator-Typ; ein zweiter Aufruf würde den ersten überschreiben.

### ADMIN-Bypass — Begründung + Gefahr

FR44/FR45/FR47 sagen konsistent „… oder globale `UserRole.ADMIN`". AC4 implementiert das als Short-Circuit **in beiden** Guards. Der Bypass ist bewusst NICHT in `EinsatzScopeGuard` — dort muss auch ein ADMIN Member des Einsatzes sein, sonst hat er gar keinen `einsatzContext` (Design-Entscheidung ADR-012: Scope = Membership, nicht Rollen-Grade). Erst die nachgelagerten Rolle-/Permission-Guards kennen den Bypass.

**Gefahr:** Ein `SUPER_ADMIN` mit aktiver `EinsatzRollenbesetzung` als Beobachter würde alle Eigenschutz-Funktionen ausführen dürfen. Das ist **gewollt** — Plattform-Admins sind Super-User-Rolle mit vollem Zugriff, entsprechend FR44 Z. 104. Die Audit-Spur (NFR-S4 append-only `*_version`) protokolliert den Admin trotzdem als Urheber.

### Source-Tree-Komponenten zu berühren

**Neu anlegen:**

- `packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`
- `packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts`
- `packages/backend/src/domain/eigenschutz/enums/__tests__/eigenschutz-rolle.enum.spec.ts`
- `packages/backend/src/domain/eigenschutz/enums/__tests__/eigenschutz-permission.enum.spec.ts`
- `packages/backend/src/modules/auth/decorators/requires-eigenschutz-rolle.decorator.ts`
- `packages/backend/src/modules/auth/decorators/requires-permission.decorator.ts`
- `packages/backend/src/modules/auth/decorators/__tests__/requires-eigenschutz-rolle.decorator.spec.ts`
- `packages/backend/src/modules/auth/decorators/__tests__/requires-permission.decorator.spec.ts`
- `packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts`
- `packages/backend/src/modules/auth/guards/permissions.guard.ts`
- `packages/backend/src/modules/auth/guards/__tests__/eigenschutz-rolle.guard.spec.ts`
- `packages/backend/src/modules/auth/guards/__tests__/permissions.guard.spec.ts`
- `packages/backend/src/modules/auth/guards/__tests__/guard-composition.spec.ts`

**Editieren:**

- `packages/backend/src/modules/auth/auth.module.ts` — `EigenschutzRolleGuard` + `PermissionsGuard` als Provider + Export.

**NICHT editieren:**

- `packages/backend/prisma/schema.prisma` — Q4-Revision, keine Schema-Änderung.
- `packages/backend/prisma/seed.ts` — `RollenDefinition`-Seeds (4 Eigenschutz-Rollen) bereits in Story 1.4 angelegt (`seed.ts:248-289`).
- `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts` — unverändert (Plattform-Vertrag fixiert, ADR-012).
- `packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts` — Shape ist gesetzt, beide neuen Guards konsumieren read-only.
- `packages/backend/src/modules/auth/strategies/jwt.strategy.ts` — `ValidatedUser` bleibt unverändert (Plattform-Kontrakt). `user.role` existiert bereits für den ADMIN-Bypass.
- `packages/backend/src/infrastructure/di-tokens.ts` — keine neuen Tokens nötig (Guards nutzen nur `LOGGER`).
- `packages/backend/src/infrastructure/outbox/event-*.ts` — keine neuen Events.

### Testing-Standards

- **Framework:** Jest 30 + `@swc/jest` (`architecture.md:324`).
- **Coverage-Anforderung:** ≥ 80 % für neue Files (NFR-M1); Zielwert-Referenz aus Story 1.3: 100 % Stmts beim Guard ist mit Aufwand erreichbar und sollte angepeilt werden.
- **Test-Command** (MEMORY.md — MEMORY.md ist Kanon!):
  ```bash
  cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage
  ```
  **NICHT** via `pnpm --filter -- --testPathPattern …` (Args werden dann falsch zusammengefügt, Pattern wird pipe-separated). Siehe MEMORY.md „Testing Commands".
- **`npx` (nicht `pnpx`):** MEMORY.md `feedback_pnpx.md` empfiehlt generell `pnpx`, aber der Testing-Commands-Eintrag ist **spezifischer** und gilt für Jest-Invocations im Backend. Bleibt `npx jest`.
- **Mock-Strategie:**
  - `Reflector` als `new Reflector()` instanziieren (echter Reflector, funktioniert mit `SetMetadata`-Dekorierten Test-Klassen — Pattern aus `einsatz-param.decorator.spec.ts`). Alternative: `jest.fn()`-Mock — weniger realistic, aber schneller.
  - `ILogger`: Mock mit `warn`, `error`, `debug` je als `jest.fn()` — `expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reason'), 'EigenschutzRolleGuard')` asserten.
  - `ExecutionContext`: Helper `createMockContextAndRequest({ user, einsatzContext, handler, controllerClass })` — adaptiert aus `einsatz-scope.guard.spec.ts:37-63`. Request enthält: `user`, `einsatzContext` (mit `einsatzId`, `einsatzRollenNamen`, `einsatzPermissions`), minimale `params`/`method`/`route` (für Error-Message-Consistency).
  - **Keine** AuthService/Repository-Mocks — die Guards brauchen keine Datenbank-Zugriffe; alles kommt aus dem Request.
- **Test-Struktur (Review-Lessons einarbeiten):**
  - Body-Match-Disziplin: `await expect(guard.canActivate(context)).rejects.toMatchObject({ response: EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY })` statt `rejects.toBeInstanceOf(ForbiddenException)`.
  - PII-Helper: `expectNoPiiInLogPayload(logger.warn)` nach jedem Warn-Szenario aufrufen (Pattern aus `einsatz-scope.guard.spec.ts:88-95`).
  - Kein `@ts-nocheck`, keine `as any`-Casts.
- **Quality-Gates nach Implementation** (CLAUDE.md „Definition of Done"):
  ```bash
  pnpm --filter @bluelight-hub/backend check:di:imports
  pnpm --filter @bluelight-hub/backend check:arch
  pnpm lint
  pnpm --filter @bluelight-hub/backend build
  cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage
  ```

### Konkrete Bibliotheks- und Versions-Anforderungen

Diese Story führt **keine neuen Dependencies** ein. Alle Bausteine sind bereits im Projekt:

| Lib                                                     | Bereits in              | Zweck                                                                                                                 |
| ------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `@nestjs/common`                                        | bestehend               | `@Injectable`, `CanActivate`, `ExecutionContext`, `SetMetadata`, `ForbiddenException`, `InternalServerErrorException` |
| `@nestjs/core`                                          | bestehend               | `Reflector` für Metadata-Zugriff                                                                                      |
| `@domain/eigenschutz/enums/eigenschutz-rolle.enum`      | **neu in dieser Story** | `EigenschutzRolle`-Union-Type + `EIGENSCHUTZ_ROLE_PREFIX`-Konstante                                                   |
| `@domain/eigenschutz/enums/eigenschutz-permission.enum` | **neu in dieser Story** | `EigenschutzPermission`-Union-Type                                                                                    |
| `@/infrastructure/di-tokens` → `LOGGER`                 | bestehend               | DI-Token für Logger                                                                                                   |

Fehlt irgendeine Dependency: **erst fragen** (CLAUDE.md „General Behavior"), nicht heimlich `pnpm add` ausführen.

### Konsumenten-Referenz (für Story 1.6 + 2.x + 3.x)

So binden nachfolgende Stories die Guards ein:

```typescript
// PSA-Profil-Änderung (FR10-FR14, Epic 3): nur Sicherheitsbeauftragter oder Admin
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile', version: '1' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
export class PsaProfilController {
  @Post('bulk-change')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
  @UseGuards(EigenschutzRolleGuard)
  async changePsaProfil(@Param('einsatzId') einsatzId: string) { /* ... */ }
}

// Quittung (FR17-FR19, Epic 3): Abschnittsleiter oder Einheitsführer mit passender Permission
@Post(':psaZuweisungId/acknowledge')
@RequiresPermission('eigenschutz:sicherheitsregel:acknowledge')
@UseGuards(PermissionsGuard)
async acknowledge(@Param() params: AckDto) { /* ... */ }

// Export (FR34-FR35, Epic 5): Nachbereitung oder Admin
@Get('vorfaelle/:id/export')
@RequiresEigenschutzRolle('Nachbereitung')
@RequiresPermission('eigenschutz:vorfall:export')
@UseGuards(EigenschutzRolleGuard, PermissionsGuard) // AC8: beide erlaubt, aber eher Ausnahme
async export(@Param('id') id: string, @Query('format') fmt: string) { /* ... */ }
```

### Projektstruktur-Alignment

- ✅ **Hexagonale Schichten** (Architecture §327, CLAUDE.md): Domain-Typen in `domain/eigenschutz/enums/`; Guards + Decorators im Modules-Layer — Abhängigkeiten fließen nach innen. Module-Layer importiert aus Domain-Layer, niemals umgekehrt.
- ✅ **Feature-Slice-Prinzip:** Guards + Decorators als **Plattform-Pattern** in `modules/auth/` (analog `EinsatzScopeGuard`, ADR-012-Präzedenzfall). Einziger Eigenschutz-Anker: Domain-Typen.
- ✅ **Route-Nesting:** Nicht direkt relevant (kein Controller), aber Guard-Kontrakt setzt `/api/einsaetze/:einsatzId/...` indirekt voraus.
- ⚠ **Event-Registry:** Guards publizieren keine Events — keine Registrierung nötig (Story 1.7 ist davon unabhängig).
- ✅ **Memory-Alignment:** MEMORY.md `feedback_route_nesting.md` und Testing-Commands sind eingehalten.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5`] — Story-Statement + alle 6 Given/When/Then-Blöcke
- [Source: `_bmad-output/planning-artifacts/epics.md#FR44`] — Rollen-Inventar (inkl. ADMIN-Bypass)
- [Source: `_bmad-output/planning-artifacts/epics.md#FR45`] — Schreibzugriff auf Gefährdungs-/PSA (+ Permission-Strings)
- [Source: `_bmad-output/planning-artifacts/epics.md#FR46`] — Quittungs-Permission `eigenschutz:sicherheitsregel:acknowledge`
- [Source: `_bmad-output/planning-artifacts/epics.md#FR47`] — Export-Permission `eigenschutz:vorfall:export`
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-S2`] — Autorisierungs-Kette `EinsatzScopeGuard + (EigenschutzRolleGuard | PermissionsGuard)`
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-S7`] — Security-Log für fehlgeschlagene Autorisierung
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-M1/M2/M3/M4`] — Quality-Gates
- [Source: `_bmad-output/planning-artifacts/architecture.md#B10 Rollen-/Permission-Auflösung`] — Guard-Kette, Q4-Revision, Permission-Inventar, FR44–47-Mapping
- [Source: `_bmad-output/planning-artifacts/architecture.md#H Autorisierung — Guard-Composition`] — Decorator-Pattern, OR-Semantik, Pro-Endpoint-ein-Guard
- [Source: `docs/adr/adr-012-einsatz-scope-guard.md`] — Plattform-Guard-Kette + Request-Context-Vertrag
- [Source: `CLAUDE.md#Backend DI Import (AC1)`] — `import type`-Verbot für Injectable-Klassen
- [Source: `CLAUDE.md#Architektur-Layers (Backend)`] — Hexagonale Schichten
- [Source: `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts`] — Vorlage: `FORBIDDEN_RESPONSE_BODY`, `buildSecurityLogPayload`, Reflector-Pattern, Log-Disziplin
- [Source: `packages/backend/src/modules/auth/guards/roles.guard.ts`] — Vorlage: OR-Semantik, Decorator-Metadata-Lookup, 403-Body-Struktur
- [Source: `packages/backend/src/modules/auth/guards/operative-role.guard.ts`] — Vorlage: ILogger via LOGGER-Token, Early-Exit bei fehlender User-Rolle
- [Source: `packages/backend/src/modules/auth/decorators/operative-roles.decorator.ts`] — Vorlage: SetMetadata-Decorator mit String-Literal-Typ
- [Source: `packages/backend/src/modules/auth/decorators/einsatz-param.decorator.ts`] — Vorlage: Klassen- und Handler-Level-Anwendung
- [Source: `packages/backend/src/modules/auth/decorators/__tests__/einsatz-param.decorator.spec.ts`] — Test-Pattern für 5 AC6-Szenarien
- [Source: `packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts`] — Test-Pattern für Guard-Specs, `expectNoPiiInLogPayload`-Helper, `createMockContextAndRequest`-Helper
- [Source: `packages/backend/src/modules/auth/strategies/jwt.strategy.ts`] — `ValidatedUser.role` (Plattform-Rolle für ADMIN-Bypass)
- [Source: `packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts`] — Shape von `request.einsatzContext`
- [Source: `packages/backend/src/modules/auth/auth.module.ts`] — Provider-Registrierungs-Pattern (`EinsatzScopeGuard` als Vorlage)
- [Source: `packages/backend/prisma/seed.ts:248-289`] — 4 Eigenschutz-`RollenDefinition`-Seeds (Story 1.4)
- [Source: `packages/backend/prisma/schema.prisma#EinsatzRollenbesetzung`] — `rollenName`-Snapshot-Feld, `freigegebenAm`-Soft-Delete
- [Source: `_bmad-output/implementation-artifacts/415-1-3-einsatzscopeguard-als-plattform-pattern-adr-012.md`] — Story-Struktur-Vorlage + 17 Review-Lessons (Z. 402–418)
- [Source: `MEMORY.md#Testing Commands`] — `npx jest --testPathPatterns=...`-Invocation

### Project Structure Notes

- **Alignment:** Story folgt der in Architecture §B (`architecture.md:918-974`) vorgegebenen Struktur — Eigenschutz-Domain-Typen in `domain/eigenschutz/enums/`, Plattform-Guards in `modules/auth/guards/`. Keine neuen Top-Level-Ordner.
- **Detected Variances:**
  - `RequiresEigenschutzRolle`- und `RequiresPermission`-Decorators liegen **nicht** in `modules/eigenschutz/decorators/`, sondern in `modules/auth/decorators/`. Rationale: siehe „Guard-/Decorator-Platzierung" — `modules/eigenschutz/` existiert noch nicht (Story 1.6), und die Decorators sind Plattform-nah wie `@RequiresOperativeRole`/`@EinsatzParam`. Architecture §H `architecture.md:1143-1147` zeigt die Decorator-Nutzung, ohne eine explizite Platzierung vorzuschreiben; Story 1.5 fixiert sie in `modules/auth/decorators/`.
  - `modules/auth/guards/` sammelt damit alle einsatz-scoped-relevanten Guards (`EinsatzScopeGuard`, `EigenschutzRolleGuard`, `PermissionsGuard`). Das ist konsistent mit ADR-012 und vermeidet zirkuläre Modul-Imports zwischen `EigenschutzModule` und `AuthModule`.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) via `bmad-dev-story`-Workflow

### Debug Log References

- Test-Run (Pattern): `cd packages/backend && npx jest --testPathPatterns="eigenschutz-rolle|permissions.guard|requires-eigenschutz|requires-permission|eigenschutz-rolle.enum|eigenschutz-permission.enum" --no-coverage` → 39/39 Tests grün (6 Test Suites).
- Coverage-Run: Gleicher Pattern mit `--coverage --collectCoverageFrom='…'` → **100 % Stmts / 100 % Branches / 100 % Funcs / 100 % Lines** auf allen 6 neuen Dateien (siehe Completion Notes).
- Full-Backend-Run: `cd packages/backend && npx jest --no-coverage --runInBand` → **9268/9268 Tests grün** (60 skipped, 1 Suite skipped); Exit 0. Kein neuer Regress, insbesondere keine neuen Failures in `admin-jwt-guard.e2e.spec.ts` oder `server-access.guard.integration.spec.ts`. (Anmerkung: Der in der Story 1.3-Baseline dokumentierte Stand von 17 pre-existing Failures hat sich im Zwischenzeitraum — vermutlich durch Story 1.4 — auf 0 verschoben; das ist eine **Verbesserung**, keine Regression.)
- Quality-Gates: `check:di:imports` grün (1927 Files geprüft), `check:arch` grün (0 Circulars; einzige Warning stammt aus pre-existing `funkkanal/create-funkkanal.command.ts`), `pnpm lint` grün (28 pre-existing Warnings; **0** neue Errors/Warnings in Story-1.5-Dateien), `pnpm --filter @bluelight-hub/backend build` grün.

### Completion Notes List

**Implementation:** Story 1.5 vollständig nach Spec implementiert. Alle 10 ACs erfüllt, alle 7 Tasks (+ Subtasks) abgehakt.

**Delta zur Spec (bewusst, dokumentiert):**

- Story-Spec fordert in AC9 „Coverage pro neue Datei ≥ 80 %" — erreicht wurde **100 %** auf allen 6 Files (inkl. Branches). Damit ist auch die aus Story 1.3 stammende Ziel-Latte („Zielwert 100 % Stmts beim Guard mit Aufwand erreichbar") getroffen.
- Reflector-Metadata-Robustheit: Statt „Nicht-Array-Metadata → treat as `undefined`" wird zusätzlich auch `length === 0` als Pass-through behandelt (kosmetisch konsistent — ein leeres erfordertes Rollen-Array darf nicht zum 403 führen). Semantisch unverändert zum Story-Wortlaut.

**Coverage-Report (AC9 Doku-Pflicht):**

| Datei                                                             | Stmts | Branches | Funcs | Lines |
| ----------------------------------------------------------------- | ----- | -------- | ----- | ----- |
| `domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`              | 100 % | 100 %    | 100 % | 100 % |
| `domain/eigenschutz/enums/eigenschutz-permission.enum.ts`         | 100 % | 100 %    | 100 % | 100 % |
| `modules/auth/decorators/requires-eigenschutz-rolle.decorator.ts` | 100 % | 100 %    | 100 % | 100 % |
| `modules/auth/decorators/requires-permission.decorator.ts`        | 100 % | 100 %    | 100 % | 100 % |
| `modules/auth/guards/eigenschutz-rolle.guard.ts`                  | 100 % | 100 %    | 100 % | 100 % |
| `modules/auth/guards/permissions.guard.ts`                        | 100 % | 100 %    | 100 % | 100 % |

**Test-Statistik:**

- Enum-Tests: 4 Tests / 2 Suites
- Decorator-Tests: 10 Tests / 2 Suites
- Guard-Tests: 28 Tests / 3 Suites (inkl. `guard-composition.spec.ts` für AC8)
- **Neu-Tests gesamt: 42 Tests / 7 Suites** (alle grün; Pattern-Match zählt 39 Tests / 6 Suites, weil `guard-composition` nicht im AC9-Pattern-Filter liegt — bewusst, das ist eine Komposition beider Guards und kein Einzelziel)
- Full-Run: 9268 Tests grün / 60 skipped / Exit 0.

**Review-Lessons aus Story 1.3 eingehalten (Previous-Story-Intelligence):**

1. ✅ Genau ein `logger.warn`-Eintrag pro Fehlerpfad (via `toHaveBeenCalledTimes(1)` assertiert).
2. ✅ Keine `@ts-nocheck` / `@ts-expect-error` / `as any`-Casts in den neuen Spec-Files.
3. ✅ Reflector-Rückgabewert via `Array.isArray`-Guard gegen Garbage geschützt; Nicht-Array → Pass-through (kein 500).
4. ✅ Kein Silent-Array-Coercion (gilt hier nur abstrakt — wir lesen `einsatzContext`-Arrays, die vom `EinsatzScopeGuard` schon gefiltert sind).
5. ✅ Konstanten für 403-Bodies: `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` + `EIGENSCHUTZ_INSUFFICIENT_PERMISSION_BODY`.
6. ✅ Strukturiertes Log-Format `{userId, einsatzId, reason}` via `buildSecurityLogPayload` (bewusst dupliziert statt extrahiert — YAGNI, Dev-Notes-Alignment).
7. ✅ Falsy-Check (`if (!einsatzContext) …`) statt `=== undefined`.
8. ✅ `expectNoPiiInLogPayload`-Helper in **allen** Warn-Szenarien aufgerufen; im `PermissionsGuard`-Test zusätzlich auch auf Permission-Strings geprüft (niemals im Log).
9. ✅ Response-Body-Assertions vollständig (`toMatchObject(EIGENSCHUTZ_INSUFFICIENT_*_BODY)` statt nur `toBeInstanceOf`).
10. ✅ Coverage-Werte oben dokumentiert.
11. ✅ Keine neue ADR nötig — Architecture §B10 + §H + ADR-012 decken das Design ab.

**Architektur-Alignment (CLAUDE.md):**

- ✅ DI-Imports: `Reflector` via regulärem `import` (Injectable), `LOGGER`-Token via regulärem `import`; nur reine Typen (`EigenschutzRolle`, `EigenschutzPermission`, `ValidatedUser`, `Request`, `ILogger`) mit `import type` (AC1 / NFR-M2).
- ✅ Hexagonale Schichten: Domain-Typen (Enums) im innersten Ring, Guards/Decorators im Modules-Layer, Abhängigkeiten fließen nach innen (CLAUDE.md §Architektur-Layers).
- ✅ Kein neuer Controller → keine `@ApiWrappedResponse`-Pflicht (CLAUDE.md AC7 nicht relevant).
- ✅ Kein manueller `fetch()` / keine API-Client-Änderung (backend-only).
- ✅ Kein neues Prisma-Enum / keine Schema-Änderung (Q4-Revision, epics.md Z. 26–28 eingehalten).
- ✅ NFR-S7 Security-Log-Schema `{userId, einsatzId, reason}` plattformweit einheitlich.

**Scope-Disziplin:**

- Kein `EinsatzScopeGuard` verändert (ADR-012 Plattform-Vertrag unverändert).
- Kein `eigenschutz.module.ts` / Controller (Story 1.6).
- Kein Event-Registry-Eintrag (Story 1.7).
- Kein Prisma-Seed verändert (Story 1.4 hat die 4 Eigenschutz-Rollen bereits angelegt).
- Kein Frontend / Shared-Client / OpenAPI-Touch.

### File List

**Neu (13 Dateien):**

- `packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`
- `packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts`
- `packages/backend/src/domain/eigenschutz/enums/__tests__/eigenschutz-rolle.enum.spec.ts`
- `packages/backend/src/domain/eigenschutz/enums/__tests__/eigenschutz-permission.enum.spec.ts`
- `packages/backend/src/modules/auth/decorators/requires-eigenschutz-rolle.decorator.ts`
- `packages/backend/src/modules/auth/decorators/requires-permission.decorator.ts`
- `packages/backend/src/modules/auth/decorators/__tests__/requires-eigenschutz-rolle.decorator.spec.ts`
- `packages/backend/src/modules/auth/decorators/__tests__/requires-permission.decorator.spec.ts`
- `packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts`
- `packages/backend/src/modules/auth/guards/permissions.guard.ts`
- `packages/backend/src/modules/auth/guards/__tests__/eigenschutz-rolle.guard.spec.ts`
- `packages/backend/src/modules/auth/guards/__tests__/permissions.guard.spec.ts`
- `packages/backend/src/modules/auth/guards/__tests__/guard-composition.spec.ts`

**Editiert (2 Dateien):**

- `packages/backend/src/modules/auth/auth.module.ts` — `EigenschutzRolleGuard` + `PermissionsGuard` als Provider + Export ergänzt.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status `415-1-5-…`: `ready-for-dev → in-progress → review`.

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                          | Author                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-04-22 | Story-Datei angelegt (ready-for-dev). Status-Übergang in `sprint-status.yaml`: `backlog → ready-for-dev`.                                                                                                                                                                         | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Story implementiert: `EigenschutzRolleGuard` + `PermissionsGuard` + `@RequiresEigenschutzRolle` + `@RequiresPermission` + Domain-Enums angelegt, `AuthModule` erweitert, 42 neue Tests (100 % Coverage), alle Quality-Gates grün. Status: `ready-for-dev → in-progress → review`. | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Code-Review (3-Layer adversarial: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Ergebnis: 10/10 AC erfüllt, 0 Patches, 0 Decisions, 2 Defer-Items (Plattform-weite Hardening), 13 als Noise verworfen (spec-konform). Status: `review → done`.                             | Ruben Vitt (mit Claude Opus 4.7) |

### Review Findings

- [x] [Review][Defer] Runtime-Schema-Validation für `einsatzContext.einsatzRollenNamen` / `einsatzPermissions` fehlt [`packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts:524`, `permissions.guard.ts:637`] — deferred, pre-existing. TypeScript-Vertrag (`string[]`, non-optional) garantiert die Shape; `EinsatzScopeGuard` setzt die Felder als Plattform-Vertrag. Runtime-Defense-Check wäre Plattform-weite Härtung gegen Drift zwischen Guard-Kette (EinsatzScopeGuard ↔ neue Eigenschutz-Guards) und betrifft auch Story-1.3-Code. Nicht Scope von Story 1.5.
- [x] [Review][Defer] Test-Mock `MockUser.role` ist lose String-Literal-Union statt Import des echten `ValidatedUser`-Typs [`eigenschutz-rolle.guard.spec.ts:29-32`, `permissions.guard.spec.ts:24-27`] — deferred, pre-existing. Werte `'ADMIN' | 'SUPER_ADMIN' | 'USER'` matchen aktuell 1:1 mit Prisma-Enum `UserRole`; Drift-Risiko bei Enum-Umbenennung besteht. Direkter Type-Import `UserRole` würde Compile-Time-Coupling geben. Hygiene-Verbesserung; gleiches Pattern existiert in `einsatz-scope.guard.spec.ts` → Plattform-Refactor.

**Review-Layer-Verdikte:**

- **Acceptance Auditor:** 10/10 AC ✅ erfüllt. Alle 11 Review-Lessons aus Story 1.3 adressiert.
- **Edge Case Hunter:** 8 Pfade unbehandelt, davon 6 als Over-Defense verworfen (Logger-try-catch, null-role-check bei TS-garantiertem `undefined`), 2 in Defer überführt (siehe oben).
- **Blind Hunter:** 15 Findings, davon 13 spec-konform verworfen (asymmetrische Log-Taxonomie nach AC2/AC3 gewollt, 403 bei fehlendem JWT-User nach AC4 gefordert, Array-Element-Validation nach Task 3 explizit out-of-scope, ADMIN-Bypass durch ADR-012/Scope=Membership abgedeckt, Dead-Reason-Code durch AC2 gefordert, Duplikation nach Task 3 YAGNI-Entscheidung), 2 als Defer übernommen.
