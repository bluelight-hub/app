# Story 1.3: `EinsatzScopeGuard` als Plattform-Pattern (ADR-012)

Status: done

> **Update 2026-04-28:** Eigenschutz-Rollen-Schicht ist entfernt — Permission-Guard ist die einzige Autorisierungsquelle. Erwähnungen von `EigenschutzRolleGuard` / `@RequiresEigenschutzRolle` unten sind historisch; produktiv gilt die Drei-Schicht-Kette `JwtAuthGuard → EinsatzScopeGuard → PermissionsGuard`. `EinsatzScopeGuard` selbst bleibt unverändert (Membership-Check).

**Scope-Grenze (KRITISCH):** Diese Story ist **Plattform-Backend + ADR**. Sie liefert den neuen Guard `EinsatzScopeGuard` in `modules/auth/guards/`, den Begleit-Decorator `@EinsatzParam`, die erweiterte Repository-Port-Methode für User-↔-Einsatz-Lookup und die ADR-012. **Nicht in dieser Story:**

- `EigenschutzRolleGuard` / `PermissionsGuard` (Story 1.5)
- Eigenschutz-Controller oder -Routen, die den Guard anwenden (Stories 1.6, 2.x, 3.x, …)
- Prisma-Migration `add_eigenschutz_module` (Story 1.4)
- Neue `EinsatzRollenbesetzung`-Schema-Änderungen (Q4-Revision hält Schema unverändert — keine Spalte, kein Enum)
- Frontend-Clients / Route-Guards — der `EinsatzScopeGuard` ist reines Backend-Pattern

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Backend-Entwickler eines einsatz-scoped Moduls**,
I want **einen wiederverwendbaren `EinsatzScopeGuard`, der `einsatzId` aus dem Request-Path extrahiert, die User-↔-Einsatz-Zugehörigkeit über aktive `EinsatzRollenbesetzung`en validiert und Einsatz-Rollen sowie User-Permissions in den Request-Kontext schreibt**,
so that **ich einsatzbezogene Endpoints (Eigenschutz, spätere Module) einheitlich absichere, ohne Inline-Membership-Checks in jedem Controller duplizieren zu müssen**.

## Acceptance Criteria

### AC1 — `EinsatzScopeGuard` extrahiert `einsatzId` + validiert aktive Rollenbesetzung

**Given** ein Controller-Endpoint mit Guard-Kette `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)` und einem Pfad-Parameter `:einsatzId` (z. B. `@Get('einsaetze/:einsatzId/sicherheit/eigenschutz/ping')`)
**When** ein authentifizierter Nutzer den Endpoint aufruft
**Then** extrahiert der Guard die `einsatzId` aus dem Request-Path (Default-Param-Name `einsatzId`, konfigurierbar via `@EinsatzParam('xyz')`, siehe AC4)
**And** lädt alle aktiven `EinsatzRollenbesetzung`-Einträge für `(userId, einsatzId)` über den erweiterten Repository-Port `IRollenBesetzungRepository.findActiveByUserIdAndEinsatzId(userId, einsatzId)` — "aktiv" = `freigegebenAm IS NULL` (Schema: kein `gueltigBis`-Feld vorhanden, Soft-Delete über `freigegebenAm`, siehe `schema.prisma:1329-1333`)
**And** nutzt dabei den 3-stufigen Join-Pfad `User.stammpersonId → StammPerson.id ← EinsatzPerson.stammId ← EinsatzRollenbesetzung.personId` (siehe `schema.prisma:67-68, 1223, 1239, 1320`) — **es gibt keinen direkten User↔Rollenbesetzung-FK**, die Repository-Methode kapselt diesen Join
**And** gibt `true` zurück, sofern ≥ 1 aktive Rollenbesetzung existiert
**And** ergänzt den Request um `request.einsatzContext = { einsatzId: string, einsatzRollenNamen: string[], einsatzPermissions: string[] }` (Snapshot-Feld `rollenName` deduped, siehe AC2).

### AC2 — Request-Context: Rollen-Namen (Snapshot) + globale User-Permissions

**Given** ein User mit mehreren aktiven `EinsatzRollenbesetzung`en im selben Einsatz (z. B. `Eigenschutz: Sicherheitsbeauftragter` + `Eigenschutz: Nachbereitung` — per DB kein Constraint gegen Mehrfach-Rollen derselben Person, UNIQUE gilt nur für `(einsatzId, rollenDefinitionId)`)
**When** der Guard die Rollen auflöst
**Then** schreibt er `einsatzRollenNamen` als **deduplizierte** Liste der `EinsatzRollenbesetzung.rollenName`-Snapshot-Felder in den Request-Kontext (nicht das live referenzierte `RollenDefinition.name` — Snapshot-Felder sind bewusst entkoppelt, siehe `schema.prisma:1322-1327`)
**And** lädt `User.permissions` (JSON-String-Feld, siehe `schema.prisma:60-63`) **einmalig pro Request** über `AuthService.findUserById(userId)` (bereits existiert, `auth.service.ts:106`), parst den JSON-String zu `string[]` und schreibt das Ergebnis als `einsatzPermissions` in den Request-Kontext
**And** leerer / null / ungültiger JSON-String liefert `einsatzPermissions: []` (kein Throw; DX-Warn-Log bei Parse-Fehler)
**And** `ValidatedUser` (JWT-Strategy) wird **NICHT** erweitert — Permissions bleiben Guard-lokal im Request, damit JWT-Payload klein bleibt und bestehende Guards unberührt sind
**And** das Request-Context-Interface ist als `EinsatzRequestContext` in `modules/auth/interfaces/einsatz-request-context.ts` typisiert und via globaler `Express.Request`-Augmentation (Declaration-Merging in derselben Datei) für Controller-Access verfügbar.

### AC3 — Fehlende, abgelaufene oder gelöschte User-Rollenbesetzung → HTTP 403 + Security-Log

**Given** ein authentifizierter Nutzer ohne gültige aktive `EinsatzRollenbesetzung` für den angeforderten Einsatz — konkret einer der Fälle: (a) keine Besetzung für `(userId, einsatzId)`, (b) alle Besetzungen haben `freigegebenAm IS NOT NULL`, (c) `User.stammpersonId = null`, (d) der User wurde zwischen JWT-Ausstellung und diesem Request gelöscht / gelockt (`isDeleted` / `isLocked`)
**When** er einen geschützten Endpoint aufruft
**Then** wirft der Guard `ForbiddenException` mit strukturiertem Body `{ statusCode: 403, error: 'Forbidden', message: 'Kein Zugriff auf diesen Einsatz', suggestedAction: 'Zurück zum Überblick' }` (Pattern analog `RolesGuard`, `packages/backend/src/modules/auth/guards/roles.guard.ts:70-75`)
**And** emittiert **einen** strukturierten `logger.warn`-Eintrag (NFR-S7 Security-Log) mit **ausschließlich** `{userId, einsatzId, reason: 'no-active-rollenbesetzung' | 'user-without-stammperson' | 'user-not-found'}` — **niemals** `rollenName`, PII oder Permission-Inhalte
**And** fängt `AuthService.findUserById` wirft `NotFoundException` (Deleted-/Locked-Handling, `auth.service.ts:108`) per `try/catch` ab und mappt ihn auf `reason: 'user-not-found'` + `ForbiddenException` (AC3-Vertrag: keine 404-Leaks an den Client, Guard ist einheitlicher 403-Exit)
**And** der Log-Context-String ist `'EinsatzScopeGuard'` (konsistent mit dem Pattern in `operative-role.guard.ts`/`roles.guard.ts`).

### AC4 — `@EinsatzParam`-Decorator konfiguriert Pfad-Parameter-Namen via `SetMetadata`

**Given** ein Controller, dessen Pfad-Parameter nicht `:einsatzId`, sondern z. B. `:id` heißt (defensiv bei Bestands-Endpoints)
**When** die Methode mit `@EinsatzParam('id')` annotiert wird und der Guard den Reflector befragt
**Then** ist `@EinsatzParam` als `SetMetadata(EINSATZ_PARAM_KEY, paramName)`-Decorator in `modules/auth/decorators/einsatz-param.decorator.ts` implementiert — **KEIN** `createParamDecorator` (anderer Mechanismus als `@CurrentUser`; der Decorator setzt Metadata für den Guard, injiziert selbst keinen Wert)
**And** der Guard liest über `Reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [handler, class])`, Fallback auf String-Literal `'einsatzId'`
**And** der Decorator ist **sowohl** auf Handler-Ebene als auch auf Controller-Klassen-Ebene anwendbar (`@SetMetadata` unterstützt beides, siehe `operative-roles.decorator.ts` als Pattern-Vorlage)
**And** das Decorator-Modul exportiert zusätzlich die Konstante `EINSATZ_PARAM_KEY = 'einsatzParam'` für Test-Assertions.

### AC5 — Fehlender Pfad-Parameter → Fail-Fast mit DX-tauglichem Error

**Given** ein Controller-Endpoint mit `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)`, bei dem der Pfad-Parameter fehlt (weder `:einsatzId` noch der per `@EinsatzParam` konfigurierte Name ist in `request.params` präsent)
**When** der Guard den Parameter extrahieren will
**Then** wirft er eine `InternalServerErrorException` mit DX-Message `"EinsatzScopeGuard: Pfad-Parameter '${paramName}' fehlt auf Route '${method} ${path}'. Entweder Route um :${paramName} ergänzen oder passenden @EinsatzParam setzen."` (klare Zuweisung der Fehlursache auf die falsche Verwendung)
**And** das ist ein **Programmier-Fehler**, kein Autorisierungs-Fehler — deshalb 500, nicht 403 (DX: Entwickler soll merken, dass Guard falsch verdrahtet ist)
**And** eine zusätzliche optionale Eager-Validation über `OnApplicationBootstrap` + `DiscoveryService` ist **NICHT** Pflicht dieser Story (Lazy-Check beim ersten Request genügt) — ein `TODO(story-future): eager validation via OnApplicationBootstrap`-Kommentar im Guard-Header markiert die Erweiterung
**And** der Error passiert **nicht**, wenn `einsatzId` im Path vorhanden und leer/ungültig ist — leere oder non-CUID-`einsatzId` → AC6 (keine Rollenbesetzung → 403).

### AC6 — Ungültige oder leere `einsatzId` → HTTP 403 (nicht 500)

**Given** ein Request mit `einsatzId: ''`, einem nicht existierenden CUID oder einer nicht-UUID-Form (User tippt Blödsinn in die URL)
**When** der Guard das Repository-`findActiveByUserIdAndEinsatzId(userId, einsatzId)` aufruft
**Then** liefert das Repository ein leeres Result (`Result.ok([])`) — **keine** FK-Verletzung, **kein** Throw; Prisma filtert einfach nichts
**And** der Guard wirft regulär `ForbiddenException` (AC3) mit `reason: 'no-active-rollenbesetzung'` — aus Sicherheits-Sicht sind unbekannte `einsatzId`s und nicht-autorisierte `einsatzId`s ununterscheidbar (keine Enumeration-Vuln)
**And** der Guard parst die `einsatzId` **NICHT** aktiv (kein CUID-Regex-Check) — Validierung ist Aufgabe der DTO-Layer bzw. Repository-Layer.

### AC7 — Tests erreichen ≥ 80 % Coverage für die 3 neuen Guard-/Decorator-/Port-Erweiterungs-Files

**Given** NFR-M1 (≥ 80 % Unit-Test-Coverage für neue Domain-Logik) und die Epic-AC-Forderung (5 Szenarien a–e)
**When** `cd packages/backend && npx jest --testPathPatterns="einsatz-scope" --no-coverage` läuft
**Then** decken Unit-Tests **mindestens** ab: (a) **Happy Path** mit aktiver Rollenbesetzung → `true`, Request-Context korrekt, (b) **Keine Rollenbesetzung** → `ForbiddenException`, Security-Log emittiert, (c) **Nur freigegebene (abgelaufene) Rollenbesetzung** → `ForbiddenException`, (d) **User ohne Stammperson-Verknüpfung** (`User.stammpersonId = null`) → `ForbiddenException` mit `reason: 'user-without-stammperson'`, (e) **Fehlender Pfad-Parameter** → `InternalServerErrorException` mit DX-Message, (f) **`@EinsatzParam`-Override** — Guard liest Reflector-Metadata und nutzt custom Param-Namen, (g) **Mehrfach-Rollenbesetzung** → `einsatzRollenNamen` dedupliziert, (h) **`User.permissions`-JSON-Parse-Fehler / null** → `einsatzPermissions: []` + Warn-Log, (i) **User zwischen JWT-Ausstellung und Request gelöscht/gelockt** (`findUserById` wirft `NotFoundException`) → `ForbiddenException` mit `reason: 'user-not-found'` (KEIN 404-Leak an den Client)
**And** Coverage für `modules/auth/guards/einsatz-scope.guard.ts`, `modules/auth/decorators/einsatz-param.decorator.ts` und die Port-Erweiterung in `domain/kraefte/repositories/i-rollen-besetzung.repository.ts` + Repo-Impl ist ≥ 80 % (Statements, Branches)
**And** `pnpm --filter @bluelight-hub/backend check:arch` meldet keine neuen Circular Dependencies (NFR-M3)
**And** `pnpm --filter @bluelight-hub/backend check:di:imports` ist grün (NFR-M2).

### AC8 — ADR-012 ist angelegt und dokumentiert das Pattern inklusive Beispiel-Einbindung

**Given** die Entscheidung für `EinsatzScopeGuard` als Plattform-Pattern
**When** die Story abgeschlossen ist
**Then** existiert die Datei `docs/adr/adr-012-einsatz-scope-guard.md` mit den Abschnitten **Status**, **Kontext**, **Entscheidung** (inkl. Guard-Kette-Verortung, User-↔-Einsatz-Join-Pfad, Decorator-Shape, Fail-Fast-Strategie), **Konsequenzen** (positiv/negativ), **Alternativen** (Inline-Check im Controller, Middleware-statt-Guard, dedizierter `EinsatzMembershipService`), **Beispiel-Einbindung** (kopierbares Code-Snippet mit `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)` + optional `@EinsatzParam` + Beispiel-Controller-Shape) — Format analog ADR-011 (`docs/adr/adr-011-plattform-push-notifications.md`)
**And** die ADR referenziert explizit: Architecture §B10 (`architecture.md:647-697`), die Platzierung in `modules/auth/guards/einsatz-scope.guard.ts`, den User-↔-Einsatz-Join-Pfad über `User.stammpersonId → StammPerson → EinsatzPerson → EinsatzRollenbesetzung`, die Q4-Revision (**keine** Schema-Änderung an `EinsatzRollenbesetzung`, **kein** Prisma-Enum `EigenschutzRolle`)
**And** der ADR-Status ist `Akzeptiert (2026-04-21)`
**And** die ADR erklärt die Aufgabentrennung zur späteren Story 1.5: `EinsatzScopeGuard` prüft **Membership** (User ist in diesem Einsatz aktiv), `EigenschutzRolleGuard` prüft **Rollen-Match** (User hat Rolle `Eigenschutz: X`), `PermissionsGuard` prüft **Permission-Flag** — drei orthogonale Layer, gemeinsam einsetzbar.

## Tasks / Subtasks

- [x] **Task 1: Repository-Port + Prisma-Adapter um User-↔-Einsatz-Lookup erweitern (AC: 1, 2, 6, 7)**
  - [x] Neue Methode am Port `IRollenBesetzungRepository` in `packages/backend/src/domain/kraefte/repositories/i-rollen-besetzung.repository.ts`:
    ```ts
    findActiveByUserIdAndEinsatzId(
      userId: string,
      einsatzId: string,
      tx?: TransactionContext,
    ): Promise<Result<RollenBesetzung[]>>;
    ```
    JSDoc mit Join-Pfad (`User → StammPerson → EinsatzPerson → EinsatzRollenbesetzung`), Soft-Delete-Filter (`freigegebenAm: null`) und Use-Case (`EinsatzScopeGuard`).
  - [x] Implementierung in `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts`:
    ```ts
    const entities = await client.einsatzRollenbesetzung.findMany({
      where: {
        einsatzId,
        freigegebenAm: null,
        person: { stamm: { userAccount: { id: userId } } },
      },
    });
    ```
    Mapper-Loop analog `findByEinsatzId` (Zeilen 167-195), Error-Handling via `handlePrismaError`, Rückgabe `Result<RollenBesetzung[]>`. Bei ungültiger `einsatzId` (kein FK-Match) ist das Ergebnis natürlich leer — kein Sonderpfad nötig (AC6).
  - [x] Unit-Tests in `prisma-rollen-besetzung.repository.spec.ts` ergänzen: (a) aktive Besetzung wird gefunden, (b) freigegebene Besetzung wird ausgefiltert, (c) Non-existent einsatzId → leeres Array, (d) User ohne stammpersonId → leeres Array.
- [x] **Task 2: `@EinsatzParam`-Decorator (AC: 4, 7)**
  - [x] Neu: `packages/backend/src/modules/auth/decorators/einsatz-param.decorator.ts`
    ```ts
    import { SetMetadata } from '@nestjs/common';
    export const EINSATZ_PARAM_KEY = 'einsatzParam';
    export const EinsatzParam = (paramName: string) => SetMetadata(EINSATZ_PARAM_KEY, paramName);
    ```
    JSDoc mit Beispiel (Handler- und Klassen-Level), Hinweis „kein `createParamDecorator` — setzt nur Metadata".
  - [x] Unit-Test `einsatz-param.decorator.spec.ts`: (a) Decorator setzt Metadata unter richtigem Key, (b) Reflector liest Wert auf Methode, (c) Reflector liest Wert auf Klasse. Pattern: siehe `operative-roles.decorator.ts` + `roles.guard.spec.ts`.
- [x] **Task 3: `EinsatzScopeGuard` implementieren (AC: 1, 2, 3, 5, 6, 7)**
  - [x] Neu: `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts` (Pattern: `roles.guard.ts`, `operative-role.guard.ts`).
  - [x] Injizierte Dependencies: `Reflector`, `@Inject(LOGGER) ILogger`, `@Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG) IRollenBesetzungRepository`, `AuthService` (bestehend — für `findUserById` zum Permission-Lesen).
  - [x] **WICHTIG (CLAUDE.md AC1):** `AuthService`, `IRollenBesetzungRepository` und `Reflector` werden mit regulärem `import` importiert — **NIEMALS** `import type` für Injectable-Klassen (Pre-Commit `check:di:imports` blockt das). Nur reine Typen / Interfaces (`ValidatedUser`, `Request`, `EinsatzRequestContext`) mit `import type`.
  - [x] `canActivate(context)`-Logik:
    1. `request = context.switchToHttp().getRequest<Request>()`
    2. `user = request.user as ValidatedUser` — falls `!user` → `ForbiddenException('Nicht authentifiziert')` (Defense-in-Depth nach `JwtAuthGuard`).
    3. Param-Name via `Reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [handler, class]) ?? 'einsatzId'`.
    4. `einsatzId = request.params[paramName]` — falls `undefined`/`null` → `InternalServerErrorException` (AC5).
    5. `besetzungenResult = await rollenBesetzungRepository.findActiveByUserIdAndEinsatzId(user.userId, einsatzId)`.
    6. Falls `Result.isFailure` → `logger.error(...)` + `InternalServerErrorException('Fehler beim Laden der Einsatz-Rollen')` (kein 403, weil Infrastruktur-Fehler).
    7. **User-Load mit Deleted/Locked-Handling (AC3-Vertrag):** `userEntity = await authService.findUserById(user.userId)` in `try/catch` — bei `NotFoundException` → `logger.warn(..., { userId, einsatzId, reason: 'user-not-found' })` + `ForbiddenException` (Guard-Kontrakt: keine 404-Leaks). Falls `userEntity.stammpersonId === null` → `reason: 'user-without-stammperson'` + `ForbiddenException`.
    8. Falls `besetzungen.length === 0` → AC3: `logger.warn(..., { userId, einsatzId, reason: 'no-active-rollenbesetzung' })` + `ForbiddenException`.
    9. `einsatzRollenNamen = [...new Set(besetzungen.map(b => b.rollenName))]` (Snapshot-Feld, dedupliziert).
    10. `einsatzPermissions = parsePermissions(userEntity.permissions)` mit `try/catch` + Warn-Log bei Parse-Fehler → `[]`.
    11. `request.einsatzContext = { einsatzId, einsatzRollenNamen, einsatzPermissions }`.
    12. `return true`.
  - [x] Optimierungs-Hinweis (nicht Pflicht): Die Reihenfolge oben (erst User laden inkl. stammpersonId-Check, dann Besetzungen abfragen) nutzt `findUserById` **einmal** und spart einen DB-Call. Permissions-Parse am Ende wiederverwertet dasselbe `userEntity`-Objekt. Finale Konsolidierung dem Dev überlassen; AC-Zusicherungen bleiben unverändert.
- [x] **Task 4: Request-Context-Typ + Express-Augmentation (AC: 1, 2)**
  - [x] Neu: `packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts`

    ```ts
    export interface EinsatzRequestContext {
      einsatzId: string;
      einsatzRollenNamen: string[];
      einsatzPermissions: string[];
    }

    declare global {
      namespace Express {
        interface Request {
          einsatzContext?: EinsatzRequestContext;
        }
      }
    }
    export {};
    ```

    Optional-Markierung (`?`), damit andere Routen ohne Guard keinen Typfehler bekommen. **Wichtig:** Datei muss **einmalig** in `main.ts` oder einem stabil importierten Modul geladen werden, damit das Declaration-Merging greift — entweder über `app.module.ts`-Import oder `side-effect-only` Import im `auth.module.ts`. Bevorzugt: Import im `modules/auth/auth.module.ts` (der Ort, zu dem das Interface gehört).

  - [x] Test: Type-Only-Check — in `einsatz-scope.guard.spec.ts` wird `request.einsatzContext` genutzt und muss typprüfend durchgehen (`tsc` im `pnpm build`).

- [x] **Task 5: `AuthModule` + Provider-Registrierung (AC: 1, 3)**
  - [x] In `packages/backend/src/modules/auth/auth.module.ts` ergänzen:
    - Import `KraefteInfrastructureModule` (oder gezielter: `{ PrismaRollenBesetzungRepository, KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG }`-Provider) **sofern nötig**, damit der DI-Token `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` dem `EinsatzScopeGuard` verfügbar ist. Wenn das Infrastructure-Modul global provided ist (`@Global()`), reicht der Import nicht zusätzlich.
    - Provider-Eintrag für `EinsatzScopeGuard` (Injectable mit eigenem Constructor). Guard **NICHT** als globalen Provider (`APP_GUARD`) registrieren — er soll selektiv via `@UseGuards(...)` eingesetzt werden.
    - `exports`: `EinsatzScopeGuard` ergänzen, damit er aus `EigenschutzModule` (Stories 1.5+) importiert werden kann.
  - [x] Sanity-Check: `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts` inspizieren und prüfen, ob `PrismaRollenBesetzungRepository` unter dem Token `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` exportiert ist. Falls nicht: den Export ergänzen (kleine, fokussierte Änderung).
  - [x] `pnpm --filter @bluelight-hub/backend build` muss danach durchlaufen; `check:di:imports` + `check:arch` grün.
- [x] **Task 6: Unit-Tests für den Guard (AC: 7)**
  - [x] Neu: `packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts` (Pattern: `roles.guard.spec.ts`). Mocks für `Reflector`, `ILogger`, `IRollenBesetzungRepository`, `AuthService`. `ExecutionContext` via `createMock<ExecutionContext>()`-Helper oder manuellem Mock, `request.params`, `request.user`, `request.einsatzContext`-Assertions.
  - [x] 9 Szenarien aus AC7 abdecken (a–i). Log-Calls via `expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('...'), expect.objectContaining({reason: 'no-active-rollenbesetzung'}))` asserten. Für Szenario (i) `authService.findUserById.mockRejectedValue(new NotFoundException(...))` verwenden und prüfen, dass der Guard **keinen** `NotFoundException` leakt, sondern `ForbiddenException` mit `reason: 'user-not-found'` wirft.
- [x] **Task 7: ADR-012 erstellen (AC: 8)**
  - [x] Neu: `docs/adr/adr-012-einsatz-scope-guard.md` mit ADR-011 als Struktur-Vorlage.
  - [x] Abschnitte: Status (Akzeptiert 2026-04-21) · Kontext (Spillover aus Eigenschutz-Epic; Gefahr der Inline-Duplikation in jedem Controller; Plattform-Bedarf für einheitliches Membership-Gate) · Entscheidung (Guard-Kette `JwtAuthGuard → EinsatzScopeGuard → [EigenschutzRolleGuard | PermissionsGuard]`; Join-Pfad User→StammPerson→EinsatzPerson→Besetzung; `@EinsatzParam` als SetMetadata-Decorator; Request-Augmentation `einsatzContext`; Lazy Fail-Fast bei fehlendem Param) · Konsequenzen (positiv: zentrales Pattern, kein Eigenschutz-Bias; negativ: 2 DB-Queries pro Request, kein Request-Cache) · Alternativen (Inline-Check, Middleware, dedizierter `EinsatzMembershipService`) · Beispiel-Einbindung (Controller-Snippet + Reader-Snippet `request.einsatzContext`) · Referenzen (architecture.md §B10, epics.md Story 1.3, ADR-011 als Format-Vorlage).
- [x] **Task 8: Quality-Gates (AC: 7)**
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` ✅ (keine Violations)
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` ✅ (keine neuen Circular Deps)
  - [x] `pnpm lint` ✅ (0 Errors — 28 pre-existing Warnings in anderen Dateien)
  - [x] `pnpm --filter @bluelight-hub/backend build` ✅
  - [x] `cd packages/backend && npx jest --testPathPatterns="einsatz-scope|einsatz-param|rollen-besetzung" --no-coverage` → alle neuen Tests grün + bestehende Rollen-Besetzung-Tests weiterhin grün (Regression-Check) — **166/166 Tests in 12 Suites grün**
  - [x] Full Backend-Test-Run: `cd packages/backend && npx jest --no-coverage --runInBand` — **17 Baseline-Failures in 2 Suites** (`admin-jwt-guard.e2e.spec.ts`, `server-access.guard.integration.spec.ts`) verifiziert als pre-existing via temporärer Auth-Module-Reset-Probe (identische 8/15 + 9/12 Failures ohne `KraefteInfrastructureModule`-Import). Alle anderen 9190 Tests grün.

## Dev Notes

### Scope-Klärungen (vor dem ersten Commit lesen!)

1. **Plattform-Feature, NICHT Eigenschutz.** Der Guard liegt in `modules/auth/guards/`, nicht in einem Eigenschutz-Modul. Der Repository-Port bleibt in `domain/kraefte/repositories/` (bestehender Plattform-Port). ADR-012 ist ein Plattform-ADR (wie ADR-011) — auch wenn der Treiber die Eigenschutz-Story ist.
2. **Kein Schema-Change, kein neuer Enum.** Die Q4-Revision (epics.md: Interpretationshinweise, architecture.md §B10, `architecture.md:673-697`) entfernt jeden `EigenschutzRolle`-Prisma-Enum **und** die früher angedachte `EinsatzRollenbesetzung.eigenschutzRolle`-Spalte. `EinsatzScopeGuard` liest ausschließlich über bestehende Felder: `rollenName` (Snapshot), `freigegebenAm` (Soft-Delete), `personId → EinsatzPerson.id`. **Kein `prisma migrate` in dieser Story.**
3. **Keine Eigenschutz-Rollen-Prüfung in diesem Guard.** Der Präfix-Match `^Eigenschutz: ` ist Aufgabe des `EigenschutzRolleGuard` in Story 1.5. `EinsatzScopeGuard` prüft ausschließlich **Membership** (User ist im Einsatz aktiv), nicht Rollen-Typ. Das ist eine bewusste Trennung — `EinsatzScopeGuard` wird auch von **Nicht-Eigenschutz-Modulen** nutzbar sein (z. B. zukünftige Einsatz-scoped Features).
4. **Kein Prisma-Enum-Cache fürs Frontend.** Frontend-Relevanz = Null. Der generierte Shared-Client (`pnpm run generate-api`) wird von dieser Story nicht berührt, weil kein Controller/DTO hinzukommt. Guard- und Decorator-Änderungen tauchen in der OpenAPI-Spec nicht auf.
5. **Tests mit `testPathPatterns` (Plural).** Aus MEMORY.md: `--testPathPattern` ist deprecated. Tests direkt in `packages/backend/` mit `npx jest --testPathPatterns="…"` ausführen — **nicht** via `pnpm --filter -- --testPathPattern …` (Args werden dann falsch zusammengefügt, Pattern wird pipe-separated).

### Architektur-Guardrails (NICHT verletzen!)

- **Hexagonale Schichten** (CLAUDE.md + `architecture.md:327`): Guard liegt im **Modules**-Layer. Er injiziert den Domain-**Port** `IRollenBesetzungRepository` über DI — **keine** direkte Prisma-Abhängigkeit im Guard selbst. Die Prisma-Query lebt im Infrastructure-Adapter, der via Symbol-Token gebunden ist. Abhängigkeiten fließen nach innen.
- **DI-Imports** (CLAUDE.md "Backend DI Import (AC1)"): `AuthService`, `Reflector` und (optional) andere Injectable-Klassen **immer** ohne `import type`. Der Port `IRollenBesetzungRepository` ist ein reines Interface und darf `import type` nutzen. Pre-Commit `check:di:imports` lehnt sonst den Commit ab.
- **Response-Decorators** (CLAUDE.md AC7): Nicht relevant — kein neuer Controller in dieser Story.
- **Keine manuellen `fetch()`-Calls**: Nicht relevant — backend-only.
- **Result-Pattern**: Die neue Port-Methode `findActiveByUserIdAndEinsatzId` returniert `Result<RollenBesetzung[]>`. Der Guard konsumiert via `.isFailure`-Check, analog dem Pattern in `modules/kraefte/controllers/rollen-besetzung.controller.ts:224`.
- **KEIN CQRS-Overhead**: Kein Command/Query-Handler, kein TransactionalCommandHandler. Ein Guard ist ein synchroner Auth-Check — Direktzugriff auf Repository + AuthService ist hier idiomatisch.
- **Security-Log (NFR-S7)**: Ausschließlich strukturierte `logger.warn`-Aufrufe mit knappen Kontext-Objekten (`{userId, einsatzId, reason}`). **Niemals** den PII-Snapshot (`personVorname`, `personNachname`) oder die geladenen `permissions` ins Log schreiben. Pattern: Story 1.1 AC4 Log-Redaction als Disziplin-Referenz.

### Source-Tree-Komponenten zu berühren

**Neu anlegen:**

- `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts`
- `packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts`
- `packages/backend/src/modules/auth/decorators/einsatz-param.decorator.ts`
- `packages/backend/src/modules/auth/decorators/__tests__/einsatz-param.decorator.spec.ts`
- `packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts`
- `docs/adr/adr-012-einsatz-scope-guard.md`

**Editieren:**

- `packages/backend/src/domain/kraefte/repositories/i-rollen-besetzung.repository.ts` — neue Methode `findActiveByUserIdAndEinsatzId`
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts` — Impl der neuen Methode + Tests
- `packages/backend/src/infrastructure/kraefte/repositories/__tests__/prisma-rollen-besetzung.repository.spec.ts` — neue Tests
- `packages/backend/src/modules/auth/auth.module.ts` — `EinsatzScopeGuard` als Provider + Export, ggf. `KraefteInfrastructureModule`-Import für Token-Verfügbarkeit
- `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts` — sofern `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` nicht exportiert ist, Export ergänzen

**NICHT editieren:**

- `packages/backend/prisma/schema.prisma` — keine Schema-Änderung (Q4-Revision)
- `packages/backend/src/infrastructure/di-tokens.ts` — bestehende Tokens reichen; `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` existiert (Zeile 136)
- `packages/backend/src/modules/auth/strategies/jwt.strategy.ts` — `ValidatedUser` wird **nicht** erweitert (Permissions bleiben Guard-lokal)
- `packages/backend/src/infrastructure/outbox/event-*.ts` — keine neuen Events
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — kein Event-Adapter
- Eigenschutz-Module — existieren noch nicht

### Join-Pfad User ↔ Einsatz (zentrale Erkenntnis — nicht ändern!)

Der Schlüssel zum Guard ist, dass **`EinsatzRollenbesetzung.personId` auf `EinsatzPerson.id` zeigt, NICHT auf `User.id`**. Das Schema hat keinen direkten FK zwischen `User` und `EinsatzRollenbesetzung`. Der Guard muss 3 Joins traversieren:

```
User.stammpersonId   @unique  →  StammPerson.id
                                         ↑
                                         │ (via EinsatzPerson.stammId)
                                         │
                              EinsatzPerson.id
                                         ↑
                                         │ (via EinsatzRollenbesetzung.personId)
                                         │
                           EinsatzRollenbesetzung
```

Prisma-Query-Form (im Adapter):

```ts
client.einsatzRollenbesetzung.findMany({
  where: {
    einsatzId,
    freigegebenAm: null,
    person: {
      // EinsatzPerson
      stamm: {
        // StammPerson (stammId ist optional!)
        userAccount: { id: userId }, // User (via User.stammpersonId @unique → StammPerson.id)
      },
    },
  },
});
```

**Kanten-Fälle, die das Ergebnis „leer" liefern:**

- `User.stammpersonId = null` — der User ist nicht an eine StammPerson gebunden (z. B. rein administrativer User). Ergebnis: leere Liste → 403 mit `reason: 'user-without-stammperson'` (Guard checkt das vorher explizit via `findUserById`, weil Prisma die Ursache im JOIN verschluckt).
- `EinsatzPerson.stammId = null` — die EinsatzPerson wurde ohne StammPerson-Link angelegt (z. B. ein externer Helfer). Der User kann diese Besetzung nicht selbst beanspruchen. Ergebnis: leere Liste für diesen User → 403.
- `freigegebenAm IS NOT NULL` — Besetzung ist soft-deleted, wird ausgefiltert.

**Wichtig:** Das Schema-Feld `gueltigBis` existiert **nicht** — obwohl Architecture §B10 sprachlich „aktiv, nicht-abgelaufen" verwendet, ist das ausschließlich `freigegebenAm IS NULL`. Nicht verleiten lassen.

### Fail-Fast-Strategie (AC5 — Implementierungs-Kommentar)

Der Guard kann **nicht** beim Module-Bootstrap wissen, ob alle Endpoints, die ihn referenzieren, einen `einsatzId`-Pfad-Parameter haben — Guards werden pro Request aufgerufen. Es gibt zwei Wege:

1. **Lazy (Pflicht in dieser Story):** Guard wirft beim ersten Request auf eine falsch konfigurierte Route `InternalServerErrorException` mit DX-Message. Dev merkt das beim ersten Smoke-Test / CI-Run.
2. **Eager (optional, nicht Pflicht):** Ein zusätzlicher `OnApplicationBootstrap`-Hook in `AuthModule` scannt via `DiscoveryService` alle Route-Handler mit `EinsatzScopeGuard` und prüft deren Route-Pfad. Bei fehlendem Param → Bootstrap-Error mit Route-Liste.

Diese Story liefert **Lazy**. Der Guard-Header markiert die Erweiterung mit `// TODO(story-future): eager validation via OnApplicationBootstrap + DiscoveryService`. Eager-Check kann in einer späteren Plattform-Verbesserung nachgezogen werden, wenn die Route-Matrix groß genug ist, dass Smoke-Tests das Lazy-Verhalten zu spät aufdecken.

### Testing-Standards

- **Framework**: Jest 30 + `@swc/jest` (`architecture.md:324`).
- **Coverage-Anforderung**: ≥ 80 % für neue Files (NFR-M1).
- **Test-Command** (aus MEMORY.md — MEMORY.md ist Kanon!):
  ```bash
  cd packages/backend && npx jest --testPathPatterns="einsatz-scope|einsatz-param|rollen-besetzung" --no-coverage
  ```
  **NICHT** `pnpm --filter … -- --testPathPattern` (Args falsch weitergeleitet) und **NICHT** `--testPathPattern` (deprecated).
- **`npx` (nicht `pnpx`) für diesen Jest-Aufruf:** MEMORY.md hat zwei Einträge, die hier kollidieren könnten: `feedback_pnpx.md` („immer pnpx statt npx") und `Testing Commands` (explizit `npx jest --testPathPatterns=…`). Der Testing-Commands-Eintrag ist **spezifischer** und gilt für Jest-Invocations in diesem Repo; die pnpx-Präferenz bezieht sich auf generische Tool-Aufrufe. Daher bleibt `npx jest` in dieser Story — nicht „korrigieren" zu `pnpx jest`.
- **Mock-Strategie**:
  - `Reflector` mit `getAllAndOverride: jest.fn()`-Methode mocken; per Test den Rückgabewert setzen.
  - `IRollenBesetzungRepository` komplett mocken (nur `findActiveByUserIdAndEinsatzId` ist für den Guard relevant; die 5 anderen Methoden werden nicht aufgerufen).
  - `AuthService.findUserById` mocken; für User-Attribute (`id`, `stammpersonId`, `permissions`) Test-Fixtures anlegen.
  - `ExecutionContext`: `switchToHttp().getRequest()` und `switchToHttp().getResponse()` minimal faken. `context.getHandler()` + `context.getClass()` als `jest.fn()` — werden vom Reflector genutzt.
  - `ILogger`: Mock-Implementierung mit `warn: jest.fn(), error: jest.fn()` etc. — nach Call via `expect(logger.warn).toHaveBeenCalledWith(...)` asserten.
- **Permissions-Parse-Robustheit**: Tests sollten abdecken: (i) null → `[]`, (ii) `'[]'` → `[]`, (iii) `'["a","b"]'` → `['a','b']`, (iv) Garbage-String `'not-json'` → `[]` + Warn-Log, (v) Non-Array-JSON `'{"a":1}'` → `[]` + Warn-Log.
- **Quality-Gates nach Implementation** (CLAUDE.md "Definition of Done"):
  ```bash
  pnpm --filter @bluelight-hub/backend check:di:imports
  pnpm --filter @bluelight-hub/backend check:arch
  pnpm lint
  pnpm --filter @bluelight-hub/backend build
  cd packages/backend && npx jest --testPathPatterns="einsatz-scope|einsatz-param|rollen-besetzung" --no-coverage
  ```

### Konkrete Bibliotheks- & Versions-Anforderungen

Diese Story führt **keine neuen Dependencies** ein. Alle Bausteine stehen im Projekt bereits:

| Lib                                                           | Bereits in | Zweck                                                                                                                 |
| ------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `@nestjs/common`                                              | bestehend  | `@Injectable`, `CanActivate`, `ExecutionContext`, `SetMetadata`, `ForbiddenException`, `InternalServerErrorException` |
| `@nestjs/core`                                                | bestehend  | `Reflector` für Metadata-Zugriff                                                                                      |
| `@prisma/client` (generated)                                  | bestehend  | relationale Queries über `person.stamm.userAccount`                                                                   |
| `@/domain/kraefte/repositories/i-rollen-besetzung.repository` | bestehend  | Port-Erweiterung (neue Methode, kein neuer Port)                                                                      |

Fehlt irgendeine Dependency: **erst fragen**, nicht heimlich `pnpm add` ausführen (CLAUDE.md "General Behavior").

### Dedup-Strategie (für ADR-012 wichtig!)

`einsatzRollenNamen` muss im Request-Context **dedupliziert** sein (AC2). Grund: Ein User kann im selben Einsatz mehrere Rollen besetzen (z. B. S-Stab + Eigenschutz: Nachbereitung). Der nachgelagerte `EigenschutzRolleGuard` (Story 1.5) prüft „hat der User Rolle X?" — ein `Set`-basierter Inclusion-Check ist dann trivial. Ohne Dedup riskiert man Bugs in späteren Consumern, die „wie oft hat der User diese Rolle" statt „hat der User diese Rolle" prüfen.

`einsatzPermissions` dagegen ist direkter Spiegel von `User.permissions` (globale User-Permissions, nicht einsatz-scoped). Die Architekur-Design-Entscheidung (§B10 `architecture.md:699-717`): **Permissions sind User-global, kein einsatz-spezifischer Permission-Table**. Der Guard parst den JSON einfach durch. Dedup ist nicht nötig — das User-Model garantiert keine Duplikate. Falls der User-Code versehentlich Duplikate persistiert, leakt das als Rauschen, bricht aber keine Logik.

### Projektstruktur-Alignment

- ✅ **Hexagonale Schichten**: eingehalten. Port-Erweiterung in Domain, Adapter in Infrastructure, Guard in Modules.
- ✅ **Feature-Slice-Prinzip**: Der Guard ist **Plattform-Feature** und gehört explizit nicht in ein Eigenschutz-Modul — genauso wie `PushSubscription` in Story 1.1 unter `modules/push-notifications/` (nicht unter `modules/eigenschutz/`) lag.
- ✅ **Route-Nesting**: Nicht relevant für die Guard-Story selbst. Aber die ADR-012 legt den Vertrag fest, dass Consumer-Routen **unter `/api/einsaetze/:einsatzId/...`** liegen müssen, damit der Guard zieht — das ist die Plattform-Konvention (Plural `einsaetze` im Backend, Singular `einsatz` im Frontend-TanStack-Router; siehe `prd.md:666` und `architecture.md:659`).
- ⚠ **Keine Registrierung in Event-Registry erforderlich** — Guards publizieren keine Events.
- ✅ **Memory „Einsatz-Routen-Nesting"** (`feedback_route_nesting.md`): Story dokumentiert das Pattern als ADR, zementiert die Plattform-Konvention.

### Konsumenten-Referenz (für ADR-012 und Späte-Story-Dev)

So wird der Guard in Story 1.5+ und Epic 3+ eingebunden (Beispiel-Snippet für die ADR und für Eigenschutz-Controller):

```ts
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile', version: '1' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
export class PsaProfilController {
  @Post('bulk-change')
  @RequiresEigenschutzRolle('Eigenschutz: Sicherheitsbeauftragter')
  @UseGuards(EigenschutzRolleGuard) // Story 1.5 — läuft NACH EinsatzScopeGuard
  async changePsaProfil(@Param('einsatzId') einsatzId: string, @Req() req: Request) {
    const { einsatzRollenNamen, einsatzPermissions } = req.einsatzContext!;
    // einsatzRollenNamen z. B. ['Eigenschutz: Sicherheitsbeauftragter']
    // einsatzPermissions z. B. ['eigenschutz:psa:write']
    // ...
  }
}
```

Für Routen mit abweichendem Param-Namen:

```ts
@Get(':id/detail')
@EinsatzParam('id')
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
async detail(@Param('id') id: string) { /* ... */ }
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.3`] — Story-Statement + alle ACs (Given/When/Then)
- [Source: `_bmad-output/planning-artifacts/epics.md#AR2`] — Plattform-Voraussetzung F2: Guard-Platzierung
- [Source: `_bmad-output/planning-artifacts/epics.md#FR51`] — Einsatz-Binding aller Eigenschutz-Entitäten
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-S2`] — Serverseitige Autorisierung pro Endpoint
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-S7`] — Security-Log für fehlgeschlagene Autorisierung
- [Source: `_bmad-output/planning-artifacts/epics.md#NFR-M1/M2/M3`] — Quality-Gates
- [Source: `_bmad-output/planning-artifacts/architecture.md#B10 Rollen-/Permission-Auflösung`] — Guard-Kette, Rollen-Modell, Q4-Revision
- [Source: `_bmad-output/planning-artifacts/architecture.md:651-661`] — Guard-Verantwortung (4 Schritte)
- [Source: `_bmad-output/planning-artifacts/architecture.md:673-697`] — Q4-Revision (keine Schema-Änderung, keine neuen Enums)
- [Source: `_bmad-output/planning-artifacts/architecture.md:699-717`] — Permission-Inventar + FR44–FR47-Mapping
- [Source: `_bmad-output/planning-artifacts/architecture.md:764-769`] — Plattform-Spillover (F2 als ADR-012 Kandidat)
- [Source: `_bmad-output/planning-artifacts/architecture.md:1837-1838`] — Dateiplatzierung `modules/auth/guards/einsatz-scope.guard.ts`
- [Source: `_bmad-output/planning-artifacts/architecture.md:1970-1973`] — Guard-Boundary-Pattern
- [Source: `CLAUDE.md#Backend DI Import (AC1)`] — `import type`-Verbot für Injectable-Klassen
- [Source: `CLAUDE.md#Architektur-Layers (Backend)`] — Hexagonale Layer-Pflicht
- [Source: `docs/adr/adr-011-plattform-push-notifications.md`] — ADR-Struktur-Vorlage für ADR-012
- [Source: `packages/backend/prisma/schema.prisma:40-70`] — `User`-Model mit `stammpersonId @unique`, `permissions String? @db.Text`
- [Source: `packages/backend/prisma/schema.prisma:1220-1275`] — `EinsatzPerson`-Model mit `stammId`, `rollenBesetzungen`-Inverse
- [Source: `packages/backend/prisma/schema.prisma:1316-1359`] — `EinsatzRollenbesetzung`-Model mit `rollenName`-Snapshot + `freigegebenAm`-Soft-Delete
- [Source: `packages/backend/src/modules/auth/guards/roles.guard.ts`] — Guard-Pattern (Reflector, ForbiddenException-Body, Logger-Context)
- [Source: `packages/backend/src/modules/auth/guards/operative-role.guard.ts`] — Guard-Pattern (ILogger via LOGGER-Token, Secondary-Check nach Auth)
- [Source: `packages/backend/src/modules/auth/decorators/operative-roles.decorator.ts`] — `SetMetadata`-Decorator-Pattern
- [Source: `packages/backend/src/modules/auth/auth.service.ts:100-110`] — `findUserById`-Methode (existiert, wiederverwenden)
- [Source: `packages/backend/src/domain/kraefte/repositories/i-rollen-besetzung.repository.ts`] — zu erweiternder Port
- [Source: `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts:167-231`] — Impl-Pattern für neue Methode (orientiere dich an `findByEinsatzId` + `findByEinsatzIdAndRolleId`)
- [Source: `packages/backend/src/infrastructure/di-tokens.ts:118-139`] — `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` existiert
- [Source: `_bmad-output/implementation-artifacts/415-1-1-plattform-push-notifications-backend-adr-011.md`] — Story-Struktur- und Qualitäts-Vorlage
- [Source: `_bmad-output/implementation-artifacts/415-1-2-plattform-push-clients-service-worker-tauri-bridge.md`] — Story-Struktur-Vorlage (Scope-Grenze am Kopf)
- [Source: `MEMORY.md#Testing Commands`] — `npx jest --testPathPatterns=...` (nicht `pnpm --filter`)

### Review Findings

<!-- Code-Review durchgeführt: 2026-04-21 via bmad-code-review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) -->

- [x] [Review][Patch] Doppelter `logger.warn` im `user-not-found`-Pfad — verletzt AC3 „genau ein strukturierter Eintrag"; Freitext-Warn (Z. 127) + JSON-Warn (Z. 128-135) laufen direkt hintereinander [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:127-135`]
- [x] [Review][Patch] `@ts-nocheck` im Repository-Spec deaktiviert Type-Checks komplett — Signatur-Drift am Port bleibt unerkannt, andere Specs kommen ohne aus [`packages/backend/src/infrastructure/kraefte/repositories/__tests__/prisma-rollen-besetzung.repository.spec.ts:1`]
- [x] [Review][Patch] AC7-Szenario (c) „nur freigegebene Besetzungen" mockt nur `Result.ok([])` — identisch zu (b), testet Guard-Disziplin nicht; Filter-Verhalten lebt im Repo-Spec (Z. 99). Test entweder umlabeln oder auf Repo-Integration heben [`packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts:144-152`]
- [x] [Review][Patch] Silent Array-Coercion `Array.isArray(einsatzIdRaw) ? einsatzIdRaw[0] ?? '' : einsatzIdRaw` — maskiert Routing-Bug (Array-Param), verschiebt AC5-500 auf AC6-403 [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:117`]
- [x] [Review][Patch] Dreifache Duplikation des 403-Response-Body → Konstante `FORBIDDEN_RESPONSE_BODY` oder Private-Method extrahieren [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:136-141, 155-160, 181-186`]
- [x] [Review][Patch] Asymmetrische Log-Disziplin: Freitext-Warns (Z. 100, 127) vs. strukturierte JSON-Warns (Z. 147, 173, 190). NFR-S7 / AC3-Geist fordert durchgängig strukturierte Form [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:100, 127`]
- [x] [Review][Patch] `User.stammpersonId`-Null-Check lässt leeren String durch — Falsy-Check (`if (!userEntity.stammpersonId)`) ist defensiver [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:146`]
- [x] [Review][Patch] `besetzungen.map(b => b.rollenName)` ohne Non-String-Filter — defensiv `(n): n is string => typeof n === 'string' && n.length > 0` hinzufügen [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:189`]
- [x] [Review][Patch] Reflector-Metadata-Wert ohne `typeof === 'string'`-Check — ein falsch typisiertes `@EinsatzParam(...)` liefert Non-String, Fallback greift nicht [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:104`]
- [x] [Review][Patch] `einsatzId` mit extremer Länge / Non-CUID kann Prisma-Validation-Error (P2023) auslösen → `handlePrismaError` leakt als 500, verletzt AC6-Garantie „403 für non-CUID" [`packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts:68-79`]
- [x] [Review][Patch] ADR-012 referenziert `_bmad-output/planning-artifacts/...` (gitignored) — versionierte ADR darf nicht auf unversionierte Quellen verweisen; inline zitieren, nach `docs/architecture/` migrieren oder Referenz entfernen [`docs/adr/adr-012-einsatz-scope-guard.md:218-220`]
- [x] [Review][Patch] ADR-012 Memory-Link `.claude/memory/feedback_route_nesting.md` löst ins Leere — Memory liegt im User-Home, nicht im Repo. Referenz entfernen oder Konvention inline erklären [`docs/adr/adr-012-einsatz-scope-guard.md:225`]
- [x] [Review][Patch] ADR Line-Nummern-Referenzen (`architecture.md:673-697`, `schema.prisma:40-70`) — fragil gegen jede Edit der Zieldateien; auf Heading-Anker / Section-Namen umstellen [`docs/adr/adr-012-einsatz-scope-guard.md:204, 208, 218-223`]
- [x] [Review][Patch] AC7-Test (i) asserted nur `rejects.toBeInstanceOf(ForbiddenException)`, nicht den strukturierten Body (`suggestedAction`, `message`). Body-Drift bleibt grün [`packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts:281-289`]
- [x] [Review][Patch] Test-PII-Absenz-Assertion nur in Szenario (b) — (d), (h garbage), (i), permission-parse-Warns nicht abgedeckt. Shared Helper `expectNoPiiInLogPayload(logger)` einführen [`packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts:140-141`]
- [x] [Review][Patch] Coverage ≥ 80 % (AC7) nicht belegt — Diff enthält keinen Coverage-Run-Output. Coverage-Lauf ausführen und Werte im `Completion Notes List` dokumentieren
- [x] [Review][Patch] Story-Dokument-Hygiene: `Status: in-progress`, `Dev Agent Record`, `File List`, `Change Log` leer. CLAUDE.md Definition-of-Done fordert Test-Count / Status-Pflege nach Abschluss

- [x] [Review][Defer] Zirkular-Dep-Risiko mit `KraefteInfrastructureModule` bei zukünftiger Cross-Modul-Nutzung — hypothetisch, nicht blockierend — deferred, pre-existing [`packages/backend/src/modules/auth/auth.module.ts:56`]
- [x] [Review][Defer] DoS-Schutz für riesige `User.permissions`-JSON-Payloads — Länge-Limit optional, kein aktuelles Risiko — deferred, pre-existing [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:36-52`]
- [x] [Review][Defer] TOCTOU zwischen `findUserById` und Repository-Call (Stale-Read während Soft-Delete) — deferred, pre-existing [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:124-163`]
- [x] [Review][Defer] TOCTOU zwischen Guard-Check und Handler-Freigabe der Rollenbesetzung — deferred, pre-existing
- [x] [Review][Defer] Stammperson-Rebinding zwischen JWT-Ausstellung und Request — Edge-Case, nicht in Spec-Scope — deferred, pre-existing
- [x] [Review][Defer] `findUserById` differenziert `deleted` vs. `locked` nicht im Security-Log — forensische Aufteilung nachrüstbar — deferred, pre-existing
- [x] [Review][Defer] `handlePrismaError` ungetestet — preexisting Helper, nicht Scope dieser Story — deferred, pre-existing
- [x] [Review][Defer] Kein Integrationstest `JwtAuthGuard → EinsatzScopeGuard` — Unit-Tests erfüllen AC7; Integration später bei erster Consumer-Route — deferred, pre-existing
- [x] [Review][Defer] `DEFAULT_EINSATZ_PARAM_NAME` Dreifach-Wahrheit (Konstante, Fallback-String, ADR-Text) — minor DRY — deferred, pre-existing [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:23, 111`]
- [x] [Review][Defer] Repo-Spec-Tests (c)/(d) „non-existent einsatzId" / „user-ohne-stamm" sind Tautologien zum Prisma-Mock — deferred, pre-existing [`packages/backend/src/infrastructure/kraefte/repositories/__tests__/prisma-rollen-besetzung.repository.spec.ts`]
- [x] [Review][Defer] `tx`-Transaction-Pfad in `findActiveByUserIdAndEinsatzId` nicht getestet — Nutzung aktuell nicht gefordert — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m] (Claude Opus 4.7, 1M-Context) via Claude Code CLI

### Debug Log References

- **TS2345 `string | string[]` am `paramName`-Lookup**: Express-Typ erlaubt Array-Params; im Guard defensiv per `Array.isArray(einsatzIdRaw)` narrowen, damit `einsatzId` garantiert `string` ist. Behoben in `einsatz-scope.guard.ts:115` (`const einsatzId = Array.isArray(einsatzIdRaw) ? einsatzIdRaw[0] ?? '' : einsatzIdRaw`).
- **Mock-Request-Identität im Guard-Spec**: Ursprünglich lieferte der `switchToHttp().getRequest()` bei jedem Aufruf ein neues Objekt — dadurch sah der Test `request.einsatzContext` nach `canActivate` nicht. Behoben durch Helper `createMockContextAndRequest`, das Request einmal erstellt und sowohl Context als auch Request-Referenz zurückgibt.
- **Baseline-Verifikation für Full-Backend-Testlauf**: Nach `--runInBand`-Run blieben 17 Failures in `admin-jwt-guard.e2e.spec.ts` (8) und `server-access.guard.integration.spec.ts` (9). Ich habe temporär `KraefteInfrastructureModule` + `EinsatzScopeGuard` aus `auth.module.ts` entfernt und den Test erneut gelaufen lassen — identische Failure-Zahl (8/15). Änderungen sofort zurückgerollt. Baseline: die Failures sind pre-existing und nicht durch Story 1.3 verursacht.
- **Coverage-Pflicht für `prisma-rollen-besetzung.repository.ts`**: Erster Lauf lieferte nur 62% Stmts (nur neue Methode getestet, Legacy-Methoden über Integration-Test abgedeckt). Ergänzung um Happy-Path-Unit-Tests für `save`/`findById`/`findByEinsatzId`/`findByEinsatzIdAndRolleId`/`delete` + `handlePrismaError`-Pfade → 98.31% Stmts / 88.09% Branch. AC7-Threshold (≥ 80 %) sicher übertroffen.

### Completion Notes List

- ✅ Plattform-Backend-Pattern `EinsatzScopeGuard` liefert **alleinigen** Membership-Check für einsatz-scoped Routen (Guard-Kette `JwtAuthGuard → EinsatzScopeGuard → [EigenschutzRolleGuard | PermissionsGuard]`). Eigenschutz-Rollen-Match + Permission-Flag bleiben bewusst in nachgelagerten Guards (Story 1.5).
- ✅ Alle 8 ACs (AC1–AC8) erfüllt und durch Unit-Tests abgedeckt. 9 Szenarien aus AC7 (a–i) + Defense-in-Depth-Pfade abgedeckt: 18/18 Guard-Tests, 21/21 Repo-Tests, 5/5 Decorator-Tests grün.
- ✅ ADR-012 in `docs/adr/adr-012-einsatz-scope-guard.md` entsprechend ADR-011-Format angelegt: Status Akzeptiert (2026-04-21), orthogonale Guard-Kette, Q4-Revision-Alignment, vier Alternativen abgewogen, copy-paste-bereite Beispiele für Consumer-Stories.
- ✅ **Kein Schema-Change**: Q4-Revision eingehalten — kein Prisma-Enum `EigenschutzRolle`, keine `EinsatzRollenbesetzung`-Spalten-Erweiterung, keine Migration.
- ✅ **Security-Log (NFR-S7)**: Alle `logger.warn`-Aufrufe serialisieren ausschließlich `{userId, einsatzId, reason}` als JSON-String. Expliziter Test-Assertion auf Abwesenheit von `personVorname`/`personNachname` im Log-Payload.
- ✅ **Coverage-Erfüllung AC7** (nach Review-Patches, 2026-04-22):
  - `einsatz-scope.guard.ts`: 100 % Stmts / 82.92 % Branch / 100 % Funcs
  - `einsatz-param.decorator.ts`: 100 % Stmts / 100 % Branch / 100 % Funcs
  - `prisma-rollen-besetzung.repository.ts`: 98.35 % Stmts / 88.88 % Branch / 100 % Funcs
- ✅ **Keine neuen Dependencies**: Story nutzt ausschließlich Bestands-Libraries (`@nestjs/common`, `@nestjs/core`, `@prisma/client`).
- ✅ **Keine Event-Registry-Änderungen**: Guards publizieren keine Domain-Events.
- ✅ **Frontend-Relevanz: Null**: Kein Controller/DTO, keine OpenAPI-Änderung, kein `pnpm run generate-api`.
- ⚠ **Full-Backend-Test-Run**: 17 pre-existing Baseline-Failures (2 Suites, `admin-jwt-guard.e2e` + `server-access.guard.integration`) — verifiziert durch temporäre Entfernung meiner AuthModule-Änderung (Ergebnis war identisch, Änderungen zurückgerollt). Siehe Debug Log.

### File List

**Neu angelegt:**

- `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts` — Guard-Implementierung (EinsatzScopeGuard + parsePermissions-Helper)
- `packages/backend/src/modules/auth/guards/__tests__/einsatz-scope.guard.spec.ts` — 18 Unit-Tests (AC7 a-i + Defense-in-Depth)
- `packages/backend/src/modules/auth/decorators/einsatz-param.decorator.ts` — `@EinsatzParam`-SetMetadata-Decorator
- `packages/backend/src/modules/auth/decorators/__tests__/einsatz-param.decorator.spec.ts` — 5 Unit-Tests
- `packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts` — `EinsatzRequestContext`-Interface + Express-Request-Augmentation
- `packages/backend/src/infrastructure/kraefte/repositories/__tests__/prisma-rollen-besetzung.repository.spec.ts` — 21 Unit-Tests (neue Methode + Flächen-Coverage für Bestandsmethoden)
- `docs/adr/adr-012-einsatz-scope-guard.md` — ADR-012 (Akzeptiert 2026-04-21)

**Editiert:**

- `packages/backend/src/domain/kraefte/repositories/i-rollen-besetzung.repository.ts` — Port um `findActiveByUserIdAndEinsatzId(userId, einsatzId, tx?)` erweitert
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts` — Impl der neuen Methode mit 3-stufigem relationalem Filter
- `packages/backend/src/modules/auth/auth.module.ts` — `KraefteInfrastructureModule`-Import, `EinsatzScopeGuard` als Provider + Export, Seiteneffekt-Import der Request-Context-Augmentation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `415-1-3-...`-Story von `ready-for-dev` → `in-progress` → (nach dieser Änderung) `review`
- `_bmad-output/implementation-artifacts/415-1-3-einsatzscopeguard-als-plattform-pattern-adr-012.md` — Tasks abgehakt, Dev Agent Record ausgefüllt, Status-Änderung

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Author                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 2026-04-21 | Story-Implementierung abgeschlossen: `EinsatzScopeGuard`, `@EinsatzParam`-Decorator, Repository-Port-Erweiterung, `EinsatzRequestContext`-Interface, AuthModule-Registrierung, ADR-012, 44 neue Unit-Tests (100 %/98.31 %/100 % Coverage für die drei neuen Files). Status: ready-for-dev → in-progress → review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Review-Patches angewendet (17 Patches, Batch-Mode). Guard: Doppel-Log im `user-not-found`-Pfad aufgelöst, Array-Param → 500 statt stiller Coercion, `FORBIDDEN_RESPONSE_BODY`-Konstante extrahiert, einheitliche `buildSecurityLogPayload`-Helper für strukturierte Logs, Reflector-Wert mit `typeof 'string'`-Guard, `stammpersonId` Falsy-Check, defensiver `rollenName`-Filter. Repository: `P2023`/`P2009` Prisma-Validation-Errors → `Result.ok([])` (AC6-Kontrakt, keine 500-Leaks). Tests: `@ts-nocheck` im Repo-Spec entfernt, AC7-Test (i) verifiziert jetzt strukturierten Response-Body, `expectNoPiiInLogPayload`-Helper gegen PII-Regressionen. ADR: gitignorete `_bmad-output/`-Links und fragile Line-Nummer-Referenzen durch stabile Pfad-/Modell-Anker ersetzt; Broken `.claude/memory`-Link entfernt. 185 Targeted-Tests grün, Coverage-Gates erfüllt. | Ruben Vitt (mit Claude Opus 4.7) |
