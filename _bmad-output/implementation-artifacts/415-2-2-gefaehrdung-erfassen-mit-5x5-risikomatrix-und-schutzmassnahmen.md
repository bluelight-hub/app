# Story 2.2: Gefährdung erfassen mit 5×5-Risikomatrix und Schutzmaßnahmen

Status: done

> **Update 2026-04-28:** Eigenschutz-Rollen-Schicht ist entfernt — Permission-Guard ist die einzige Autorisierungsquelle. Verweise auf die Vier-Schicht-Kette und `@RequiresEigenschutzRolle('Sicherheitsbeauftragter')` unten sind historisch; produktiv gilt die Drei-Schicht-Kette `JwtAuthGuard → EinsatzScopeGuard → PermissionsGuard` mit `@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')` allein.

<!--
Validierung: der Workflow-Step „Validate gegen checklist.md" wird bewusst als
separater Quality-Gate über `validate-create-story` deferred — konsistent mit
Stories 1.6/1.7/2.1. Ruben/Claude können vor `dev-story` einen Fresh-Context-
Review ansetzen; die Story ist ohne diesen Review aber bereits Dev-ready.
-->

> **Scope-Klarstellung (advisor-bestätigt, 2026-04-22):** Der Epic-Wortlaut
> „nutzt Auto-Save aus Story 2.5" ist für 2.2 bewusst **umgedreht**: 2.2 liefert
> den **expliziten Speichern-Endpoint** (POST `…/gefaehrdungsbeurteilungen/:id/items`),
> 2.3 formalisiert die Version-Chain-Invarianten auf demselben Endpoint, 2.5
> ergänzt den Frontend-Debounce als reine UI-Schicht. Damit ist 2.2 alleine
> testbar; 2.3/2.5 sind Erweiterungen, kein Refactor. Siehe „Dev Notes → Scope
> vs. Stories 2.3/2.5" unten.

## Story

As a **Sicherheitsbeauftragter**,
I want **einzelne Gefährdungen mit Titel, Beschreibung, Risikobewertung via 5×5-Matrix (Eintrittswahrscheinlichkeit × Schadensausmaß) und Schutzmaßnahmen als Freitext zu erfassen**,
So that **die Risikoklasse (Grün/Gelb/Orange/Rot) automatisch und nachvollziehbar entsteht und jede Gefährdung mit ihren Schutzmaßnahmen dokumentiert ist (FR2, FR4)**.

## Acceptance Criteria

**AC1 — Item-Eingabeblock im Editor (UX-DR2, UX-Spec §830 „Progressive Disclosure"):**

- **Given** eine offene Gefährdungsbeurteilung im Edit-Modus (Detail-Route `…/eigenschutz/gefaehrdungen/$id`)
- **When** der Sicherheitsbeauftragte auf „+ Gefährdung" tippt
- **Then** öffnet sich ein Inline-Eingabeblock mit Feldern in dieser Tab-Order:
  1. `Titel` (Pflicht, ≤ 120 Zeichen, `aria-required="true"`),
  2. `Beschreibung` (optional, ≤ 2000 Zeichen),
  3. `RiskMatrix5x5` (25 Zellen, Eintrittswahrscheinlichkeit × Schadensausmaß),
  4. `Schutzmaßnahmen` (optional, ≤ 2000 Zeichen, Textarea).
- **And** das Schutzmaßnahmen-Feld ist **progressiv offengelegt**: es rendert sichtbar, sobald die Matrix-Selektion ≥ `GELB` Risikoklasse ergibt ODER der Nutzer manuell in das Feld tabbt (damit „keine Schutzmaßnahme" bei GRUEN-Items nicht als Pflicht wirkt — UX-Spec Zeile 830).
- **And** beim Rendern ist der Titel-Input fokussiert (kein Browser-Autoscroll bei kurzen Viewports).

**AC2 — 5×5-Matrix-Bedienung (UX-Spec §855, FR2, Q1, ADR-013):**

- **Given** der Inline-Eingabeblock ist offen
- **When** der `RiskMatrix5x5` gerendert wird
- **Then** zeigt er 25 Zellen in `role="grid"` mit `role="gridcell"` und `aria-label="Eintrittswahrscheinlichkeit <Stufe>, Schadensausmaß <Stufe>, Risikoklasse <Klasse>"` pro Zelle.
- **And** die X-Achse (Schadensausmaß: vernachlässigbar → katastrophal) steht **oben**, die Y-Achse (Eintrittswahrscheinlichkeit: selten → ständig) **links**.
- **And** Pfeiltasten navigieren innerhalb des Grids (Roving-Tabindex), `Enter`/`Space` wählt aus, `aria-selected="true"` wird auf der aktiven Zelle gesetzt.
- **And** bei Auswahl errechnet das System die `Risikoklasse` (`GRUEN | GELB | ORANGE | ROT`) nach dem in **ADR-013** festgehaltenen 5×5-Schema (Q1, FR2).
- **And** die Zellen-Hintergrundfarbe folgt den `warnstufe-*`-Tokens (Dark-Mode-tauglich, UX-Spec §Visuelles Leitbild).
- **And** Zell-Touch-Targets sind ≥ 48×48 px (UX-DR2, WCAG 2.5.5 AAA — Tablet + Handschuhe).
- **And** `prefers-reduced-motion: reduce` deaktiviert die Hover-/Auswahl-Transition (UX-Spec Hard Requirement).

**AC3 — Risikoklasse-Berechnung (ADR-013, Backend-autorität, FR2):**

- **Given** eine Eintritts-/Schadens-Kombination (Eintritt ∈ Eintrittswahrscheinlichkeit, Schaden ∈ Schadensausmaß)
- **When** der Server die Berechnung durchführt (autoritativ) ODER das Frontend eine UI-Preview vor Persist rendert (mirror)
- **Then** liefert beide dieselbe `Risikoklasse` gemäß der 25-Zellen-Fixture-Tabelle aus ADR-013.
- **And** Backend + Frontend werden mit derselben **parametrisierten Fixture-Tabelle** (25 Einträge) gegen die Mapping-Funktion getestet — eine Divergenz ist ein Test-Fail (Konsistenz-Invariante, advisor-bestätigt).
- **And** die Berechnungsfunktion selbst hat **keine Runtime-Dependencies außer Enum-Konstanten** (kein Zod-Import, kein I/O) — damit sowohl Backend-CJS als auch Frontend-ESM sie nutzen können; siehe Dev Notes → „Risikoklasse-Utility: Duplikation + gemeinsame Fixture".

**AC4 — Item-Persistierung via explizitem Speichern-Endpoint (FR3, FR4, Scope-Klarstellung oben):**

- **Given** ein offener Item-Editor mit ausgefülltem Titel + optionalen Feldern
- **When** der Sicherheitsbeauftragte „Speichern" klickt (oder `Ctrl/Cmd+S` drückt)
- **Then** setzt das Frontend einen `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/gefaehrdungsbeurteilungen/:id/items` Request mit Body
  ```ts
  { items: GefaehrdungItemInput[], expectedVersion: number }
  ```
- **And** der Handler validiert Shared-Zod, führt Optimistic-Concurrency-Check (`aggregate.version === expectedVersion`, sonst `ConflictDetected` → HTTP 409), berechnet `risikoklasse` server-seitig aus `(eintritt, schaden)`, persistiert die neuen Items in `Gefaehrdungsbeurteilung.items` (JSONB), erhöht `version` um 1 und legt parallel eine neue `GefaehrdungsbeurteilungVersion`-Zeile mit `changedFields` + `payload = items` an.
- **And** die Response ist HTTP 200 mit dem aktualisierten `GefaehrdungsbeurteilungDto` (inkl. der server-seitig gesetzten `risikoklasse`-Felder + neuer `version`).
- **And** es wird ein `GefaehrdungsbeurteilungAktualisiertEvent` in die Outbox publiziert (Payload: `{ einsatzId, userId, einheitId, gefaehrdungsbeurteilungId, fromVersion, toVersion, changedFields }`).
- **And** der explizite „Speichern"-Button **ist in 2.2 bewusst manuell**. Story 2.5 setzt darauf einen 2 s Auto-Save-Debounce-Trigger; Story 2.3 formalisiert die Version-Chain-Invarianten (nachvollziehbares Add/Edit/Remove).

**AC5 — Schutzmaßnahmen-Feld (FR4, UX-Spec Form-Pattern):**

- **Given** das Schutzmaßnahmen-Feld ist im Eingabeblock sichtbar
- **When** es gerendert wird
- **Then** hat es ein gekoppeltes `<label>` und `aria-describedby="<help-id>"` mit Hinweistext „Freitext — konkrete Schutzmaßnahmen für diese Gefährdung (z. B. PSA-Profil, Sicherungsabstand, Funkspruch-Regelung)".
- **And** ein Character-Count-Indikator erscheint ab 80 % der 2000-Zeichen-Grenze (≥ 1600 Zeichen) mit `aria-live="polite"` und Format „1823 / 2000 Zeichen" (UX-Spec Form-Pattern; advisor-Reminder).
- **And** bei Überschreitung von 2000 Zeichen ist der Submit-Button deaktiviert + Inline-Fehler „Schutzmaßnahmen dürfen maximal 2000 Zeichen haben".
- **And** bleibt das Feld leer, wird `schutzmassnahmen` als `undefined` persistiert (NICHT leerer String) — die Ampel-Projection (Story 6.1) matcht auf „fehlend oder leer" gleichartig (FR40, Story 6.5 Warn-Badge).

**AC6 — Autorisierung (FR44, FR45, Architecture §H):**

- **Given** der `POST …/gefaehrdungsbeurteilungen/:id/items`-Endpoint
- **When** ein Request eingeht
- **Then** ist er geschützt durch die verbindliche Guard-Kette `JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard → PermissionsGuard` mit `@RequiresEigenschutzRolle('Sicherheitsbeauftragter')` + `@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')`.
- **And** Admin-Bypass (`UserRole.ADMIN`) überschreibt Rollen- + Permission-Check.
- **And** ein unautorisierter Request liefert HTTP 403 mit strukturiertem Error-Body `{ statusCode: 403, error: 'Forbidden', message, context }`.
- **And** der Frontend-„Speichern"-Button ist bei fehlender Permission `disabled` + `aria-disabled="true"` + Tooltip „Fehlende Berechtigung: eigenschutz:gefaehrdungsbeurteilung:write".

**AC7 — Event-Registry-Vollständigkeit für `GefaehrdungsbeurteilungAktualisiert` (Story 1.7, AC-Invariante):**

- **Given** das neue Domain-Event `GefaehrdungsbeurteilungAktualisiertEvent`
- **When** die Implementierung abgeschlossen ist
- **Then** ist das Event an **4 Stellen** registriert:
  1. `infrastructure/outbox/event-serializer.ts` — `case 'eigenschutz.gefaehrdungsbeurteilung_aktualisiert':` + `serializeGefaehrdungsbeurteilungAktualisiert` (Payload: `einsatzId`, `userId`, `einheitId`, `gefaehrdungsbeurteilungId`, `fromVersion`, `toVersion`, `changedFields`).
  2. `infrastructure/outbox/event-deserializer.ts` — Registry-Map + `deserializeGefaehrdungsbeurteilungAktualisiert`.
  3. `infrastructure/events/event-adapters.module.ts` — `EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter` als Provider + Import (Klassen-Prefix `Eigenschutz*` ist verbindlich, siehe Story 2.1 Completion Notes Punkt 1).
  4. `infrastructure/events/adapters/index.ts` — Re-Export des Slug-Proxy (analog Story 2.1: Proxy in `infrastructure/events/adapters/eigenschutz-gefaehrdungsbeurteilung-aktualisiert-event.adapter.ts`).
- **And** der Eintrag `'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` wird aus `packages/backend/src/__tests__/architecture-rules.spec.ts:206` (`knownMissingEvents`) entfernt.
- **And** der Registry-Smoke-Test (`eigenschutz-event-registry.spec.ts`) wird erweitert, sodass sowohl `ERSTELLT` als auch `AKTUALISIERT` `= 4/4` registriert sind, die übrigen 12 = `0/4`.
- **And** der Event-Count-Sanity-Check in `event-deserializer.spec.ts` wird inkrementiert (Story 2.1 hat auf 113 gesetzt; 2.2 setzt auf 114).

**AC8 — Seed-Items auf Shared-Schema-Shape harmonisieren (Story-2.1-Debt, advisor-bestätigt):**

- **Given** `packages/backend/prisma/seed.ts:291+` seedet 5 Vorlagen mit JSONB-`items`, deren Feldnamen aktuell deutsch sind (`titel`, `beschreibung`, `defaultEintritt`, `defaultSchaden`, `schutzmassnahmen`)
- **When** Story 2.2 die Seed-Items erstmals über den echten Read-Pfad nutzt (Drawer listet die Vorlagen, Create-Handler deep-kopiert die Items)
- **Then** werden die Seed-Felder in `seed.ts` auf die Shared-Zod-Shape (`title`, `description`, `eintritt`, `schaden`, `schutzmassnahmen`) umbenannt — kein Mapper-Feld-Mapping, um Drift zu vermeiden.
- **And** keine Prisma-Migration nötig (JSONB bleibt), `upsert` auf `slug` ist idempotent.
- **And** eine Integration-Spec (in `prisma-gefaehrdungsbeurteilung-vorlage.repository.spec.ts`) bestätigt den Happy-Path „MANV-Vorlage liefert 3 Items via `toReadModel`" — damit wird die in Story 2.1 geskippte Assertion endlich scharfgestellt.
- **And** `pnpm --filter @bluelight-hub/backend prisma:seed` läuft ohne Fehler gegen den laufenden Docker-Postgres (Port 3092).

**AC9 — Validierung + Fehlerformat (Architecture §C):**

- **Given** ein Request mit ungültigem Body (fehlender Titel, zu langer Titel/Description/Schutzmaßnahmen, ungültiger Enum-Wert, `expectedVersion` fehlt)
- **When** der Request verarbeitet wird
- **Then** antwortet der Controller mit HTTP 400 (Zod-Validation), HTTP 404 (Beurteilung/Einheit/Einsatz nicht gefunden), HTTP 409 (`ConflictDetected` bei Version-Mismatch), HTTP 422 (Business-Rule — z. B. „Items-Array ist leer nach Remove-All") und liefert strukturierten Fehler-Body im Plattform-Standard `{ statusCode, error, message, context }`.
- **And** die Validierung nutzt **dasselbe Shared-Zod-Schema** (`createGefaehrdungsbeurteilungItemsSchema`) wie das Frontend-Form — ein Client-Request, der beim Frontend-Form-Submit durchkommt, darf auf dem Server **nicht** an reiner Shape-Validierung scheitern.

**AC10 — Frontend-Integration in Detail-Route (AC9 aus Story 2.1 baut vor):**

- **Given** die Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id` (aus Story 2.1 als Stub angelegt)
- **When** der Sicherheitsbeauftragte die Route öffnet
- **Then** lädt der TanStack-Query-Hook `useGefaehrdungsbeurteilung(einsatzId, id)` (neu, Query-Key `['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen', id]`) das Aggregate-DTO inkl. `items` + `version`.
- **And** ein Hook `useUpdateGefaehrdungsbeurteilungItems(einsatzId, id)` (TanStack-Mutation) publiziert die neuen Items, setzt im Optimistic-Update `cache.version = optimisticVersion`, rollt bei `ConflictDetected` (409) zurück und invalidiert den Detail-Key.
- **And** bei `ConflictDetected` (409) rendert der Page-Container einen `SeverityBanner variant="warning"` mit Hinweis „Jemand anders hat bereits Änderungen gespeichert — bitte neu laden" und einem Reload-Button (ohne Toast, Zero-Toast-Policy UX-DR21).
- **And** es werden **keine** direkten `fetch()`-Calls oder manuellen API-Helper genutzt (CLAUDE.md API-Workflow).

**AC11 — Accessibility + Responsive (UX-Spec §RiskMatrix5x5, NFR-A):**

- **Given** der Inline-Eingabeblock ist geöffnet
- **When** er per Tastatur + Screenreader bedient wird
- **Then** ist die Tab-Order linear: Titel-Input → Beschreibung-Textarea → `RiskMatrix5x5` (Roving-Tabindex in den Grid) → Schutzmaßnahmen-Textarea → „Speichern" → „Abbrechen".
- **And** `axe`-Structural-Assertions (kein `vitest-axe` notwendig, siehe Story-2.1-Abweichung Pkt 8) für: `role="grid"`, `role="gridcell"`, `aria-selected` auf aktiver Zelle, Label-Koppelung aller Form-Controls, `aria-describedby` am Schutzmaßnahmen-Feld.
- **And** Touch-Targets ≥ 48×48 px (Matrix-Zellen), ≥ 44×44 px (Form-Controls + Buttons).
- **And** `prefers-reduced-motion: reduce` deaktiviert alle Transitions am `RiskMatrix5x5` (AC2 redundant-robust, explizit testbar).
- **And** Layout bleibt lesbar bei Viewports ab 768 px (Tablet-Portrait — NFR-Referenz-Device).

**AC12 — Tests & Coverage (NFR-M1 ≥ 80 %, Story-1.7-Disziplin):**

- Unit-Tests: `calculateRisikoklasse` (25 parametrisierte Fixture-Einträge), `GefaehrdungItem` VO (Trim-Semantik, Enum-Validierung, Character-Limits), `Gefaehrdungsbeurteilung.updateItems(items, userId)` im Aggregate (Version-Increment, Domain-Event-Emit, Invariante „mindestens 1 Item NACH Update wenn nicht-leerer Input").
- Unit-Tests: `UpdateGefaehrdungsbeurteilungItemsCommand` (Result-Pattern, expectedVersion-Handling), `UpdateGefaehrdungsbeurteilungItemsHandler` (Transactional-Flow, 409 ConflictDetected, Version-Row-Append).
- Unit-Tests: `GefaehrdungsbeurteilungAktualisiertEvent` (Payload-Shape, Roundtrip Serializer/Deserializer, `changedFields`-Serialisierung).
- Controller-Unit-Spec (Reflect-Metadata-Assertion Guard-Kette + Decorator-Parameter analog Story 2.1).
- Integration-Spec (aktiviert, nicht-skipped — Postgres-Seed-Helpers können im Rahmen dieser Story als wiederverwendbare Fixture entstehen, ODER bleibt geskippt wie Story 2.1 mit expliziter Deferred-Notiz nach Story 2.4): Happy-Path Add+Edit+Remove + 409 Version-Mismatch + 403 unautorisiert + 404 fremde Beurteilung + Deep-Copy-Beweis (nach Update sind Items in `GefaehrdungsbeurteilungVersion` append-only).
- Frontend-Vitest: `RiskMatrix5x5` (Keyboard, aria, Fixture-Tabelle-Match), `GefaehrdungItemEditor` (Progressive-Disclosure Schutzmaßnahmen-Feld, Character-Counter ≥ 80 %, Tab-Order), `GefaehrdungenDetailPage` (Konflikt-Banner bei 409, Optimistic-Update), `useGefaehrdungsbeurteilung`, `useUpdateGefaehrdungsbeurteilungItems`.
- Konsistenz-Spec: Eine gemeinsame Fixture-Tabelle (25 Einträge, exportiert aus `packages/shared/src/utils/eigenschutz/risikoklasse.fixture.ts` ODER — im Fall der dokumentierten Duplikation — aus einer geteilten JSON-Datei unter `_bmad-output/planning-artifacts/risikoklasse-5x5-fixture.json`) wird gegen Backend-VO und Frontend-Util parametrisiert getestet.
- **Coverage-Ziel:** ≥ 80 % lines/branches/functions auf neuen Dateien; 100 % auf Aggregate-Update-Methode + Event + Command + `calculateRisikoklasse`.

**AC13 — Plattform-Konformität (verbindlich):**

- Alle neuen Injectable-Klassen nutzen `import` (NICHT `import type`) — Pre-Commit-Hook `check:di:imports` muss grün sein (CLAUDE.md AC1).
- `pnpm --filter @bluelight-hub/backend check:arch` bleibt ohne neue Warnings.
- `pnpm lint` (oxlint + oxfmt) bleibt ohne Errors; Warnings nur für dokumentierte preexisting out-of-scope-Stellen.
- Umlaute in Kommentaren/JSDoc/deutschen Strings: ä/ö/ü/ß — **keine** Digraphen (CLAUDE.md Umlaute-Regel).
- Controller-Response-Dekoratoren: `@ApiWrappedResponse`, NIEMALS `@ApiOkResponse({ type: ... })` (CLAUDE.md AC7).

**AC14 — ADR-013 — 5×5-Risikomatrix-Mapping:**

- **Given** FR2 („fest hinterlegtes Schema") + Q1 („5×5 qualitativ, 4 Ergebnisklassen") lassen die 25-Zellen-Zuordnung offen
- **When** Story 2.2 die Berechnung implementiert
- **Then** existiert ein **neues ADR** unter `docs/adr/adr-013-risikomatrix-5x5.md`, das die 25-Zellen-Fixture-Tabelle als Entscheidung dokumentiert (Status `Proposed` oder `Accepted` je nach PO-Freigabe).
- **And** die ADR verweist auf eine DGUV- oder Branchen-Vorlage (z. B. Nohl-Matrix, BGHM-Handlungshilfe, oder vergleichbare DGUV-Publikation) als Rationale — **keine novel Matrix** ohne Quelle (advisor-Warnung: „fest hinterlegtes Schema" meint nachvollziehbar, nicht erfunden).
- **And** Backend-Utility + Frontend-Utility + Test-Fixtures beziehen sich alle auf diese ADR (Datei-Header-JSDoc-Verweis).
- **And** im Review vor Merge genehmigt der PO (Ruben) die konkrete Matrix ODER passt die ADR an; Dev-Agent darf die Matrix initial mit einem dokumentierten Vorschlag anlegen.

## Tasks / Subtasks

- [x] **Task 0 — ADR-013 „5×5-Risikomatrix-Mapping" anlegen (AC14)**
  - [x] Datei `docs/adr/adr-013-risikomatrix-5x5.md` anlegen (Status `Proposed`).
  - [x] Struktur folgt ADR-011/ADR-012 (Context, Decision, Rationale, Consequences).
  - [x] 25-Zellen-Fixture-Tabelle als Markdown-Tabelle (Zeilen = Eintritt, Spalten = Schaden).
  - [x] Quelle benennen (DGUV / Nohl / BGHM — eine etablierte Vorlage; keine erfundene Zuordnung).
  - [x] Konsequenzen: Änderungen an der Matrix erfordern neue ADR-Version + Data-Migration-Überlegung für bereits gespeicherte `risikoklasse`-Werte (MVP: kein Auto-Rewrite, Server berechnet neu bei jedem Update).
  - [x] Review-Marker „PO-Freigabe ausstehend" setzen, bis Ruben bestätigt.

- [x] **Task 1 — Seed-Items harmonisieren (AC8)**
  - [x] `packages/backend/prisma/seed.ts:291+`: alle 5 Vorlagen-Items von `{ titel, beschreibung, defaultEintritt, defaultSchaden, schutzmassnahmen }` auf `{ title, description, eintritt, schaden, schutzmassnahmen }` umbenennen.
  - [x] Enum-Import-Alias für `Eintrittswahrscheinlichkeit` + `Schadensausmass` beibehalten — nur Feld-Namen ändern.
  - [x] `pnpm --filter @bluelight-hub/backend prisma:seed` lokal laufen lassen, erwartet `upsert`-idempotent ohne Row-Duplikate.
  - [x] Integration-Spec `prisma-gefaehrdungsbeurteilung-vorlage.repository.spec.ts` erweitern (oder ein geskipptes `it` entskippen) mit Assertion: MANV-Vorlage liefert **genau 3 Items** via `findAktive`/`toReadModel`, alle mit `title.length > 0`.

- [x] **Task 2 — Shared-Utility `calculateRisikoklasse` (AC3, AC12)**
  - [x] `packages/shared/src/utils/eigenschutz/risikoklasse.ts` — reine Funktion `calculateRisikoklasse(eintritt: Eintrittswahrscheinlichkeit, schaden: Schadensausmass): Risikoklasse`.
  - [x] Die Funktion bezieht **keine** Zod-Schemas oder andere Runtime-Dependencies ein — nur Enum-Werte aus denselben Shared-Const-Arrays (`EINTRITTSWAHRSCHEINLICHKEIT_WERTE` etc.), die 2.1 bereits etabliert hat.
  - [x] **Falls** der Backend-CJS/ESM-Blocker aus Story 2.1 beim Import auftritt (Laufzeit-Fehler `require(ESM)`), Fallback: Funktion parallel in `packages/backend/src/domain/eigenschutz/value-objects/risikoklasse-berechnung.ts` + `packages/frontend/src/features/eigenschutz/utils/risikoklasse-berechnung.ts` duplizieren; Konsistenz-Spec konsumiert die gemeinsame Fixture-JSON aus Task 3b.
  - [x] Fixture-Tabelle `risikoklasse-5x5.fixture.ts` (25 Einträge) als Test-Asset im selben Ordner; der Dev-Agent MUSS die Tabelle aus ADR-013 abschreiben.
  - [x] Unit-Test: `calculateRisikoklasse.spec.ts` — parametrisiert alle 25 Einträge und assertet auf die Fixture-Tabelle.

- [x] **Task 3 — Domain-Layer Erweiterung (AC3, AC4, AC7, AC12)**
  - [x] `domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts` — `create`-Methode um server-seitige `risikoklasse`-Ableitung erweitern: wenn `(eintritt, schaden)` beide gesetzt sind, setze `risikoklasse = calculateRisikoklasse(eintritt, schaden)` und **überschreibe** ein evtl. vom Client mitgeliefertes Feld (Backend ist Autorität, AC3).
  - [x] `domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts` — neue Methode `updateItems(newItems: GefaehrdungItem[], expectedVersion: number, userId: string): Result<void>` die:
    1. Version-Check (`this._version !== expectedVersion` → `Result.fail('ConflictDetected', { currentVersion, attemptedVersion })`).
    2. Diff berechnen (`changedFields: { added: number, removed: number, updated: number }`).
    3. Version inkrementieren (`this._version = this._version + 1`).
    4. `items` ersetzen (Mutator → private Setter; AggregateRoot bleibt kapseliert).
    5. `GefaehrdungsbeurteilungAktualisiertEvent` via `addDomainEvent`.
  - [x] `domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts` — `extends EigenschutzDomainEvent`, Payload `{ fromVersion, toVersion, changedFields, gefaehrdungsbeurteilungId }`, statische `eventName()` = `EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT`.
  - [x] `domain/eigenschutz/events/index.ts` — Re-Export ergänzen.
  - [x] Repository-Interfaces: `IGefaehrdungsbeurteilungRepository` um `updateItems(aggregate, tx): Result<void>` ergänzen; `IGefaehrdungsbeurteilungVersionRepository` um `saveNewVersion(args, tx): Result<void>` ergänzen (analog `saveInitialVersion`, aber ohne `@@unique`-Collision: `(gefBeurteilungId, version)` darf dort noch nicht existieren).
  - [x] Unit-Tests: VO `risikoklasse`-Override, Aggregate `updateItems` (Happy, Version-Mismatch, Leeres Array-Handling), Event-Roundtrip durch Serializer/Deserializer.

- [x] **Task 4 — Application-Layer Update-Command (AC4, AC9, AC12)**
  - [x] `application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.{command,handler}.ts`:
    - Command-Fields: `einsatzId`, `gefaehrdungsbeurteilungId`, `expectedVersion`, `items: GefaehrdungItemProps[]`, `userId`.
    - Command-Create-Factory mit Result-Pattern + Zod-Validierung (Shared-Schema-Shape).
    - Handler extends `TransactionalCommandHandler<…Command, string>`; im Body:
      1. Aggregate via Repo `findById` laden (Cross-Einsatz-Check: `aggregate.einsatzId === command.einsatzId`, sonst `NotFound:Beurteilung`).
      2. `aggregate.updateItems(newItemsAsVOs, expectedVersion, userId)` — Result prüfen; 409 bei `ConflictDetected`.
      3. `beurteilungRepo.updateItems(aggregate, tx)`.
      4. `versionRepo.saveNewVersion({ gefBeurteilungId, version: aggregate.version, items, changedFields, gueltigVon: event.occurredAt, changedByUserId, eventId: event.eventId })`.
      5. Base-Handler committed Outbox-Event atomar.
  - [x] Zusätzlich: `Gefaehrdungsbeurteilung.updateItems` Nebenbedingung — die vorherige Version-Zeile bekommt `gueltigBis = event.occurredAt`. Im Repo `updateItems` wird das in einem zweiten Prisma-Call innerhalb derselben TX gesetzt (UPDATE auf `gefaehrdungsbeurteilung_versionen` WHERE `gefBeurteilungId = ? AND gueltigBis IS NULL`).
  - [x] Unit-Tests pro Command/Handler (≥ 8 Cases: Happy, leer→leer NoOp, Add-Only, Remove-Only, Mixed Add+Edit+Remove, 409, 404 Cross-Einsatz, 422 wenn `items`-Array leer bei initial-nicht-leerer Beurteilung; letzteres ist bewusst kein Hard-Block — siehe Dev-Notes „422 für Leer-Array?").

- [x] **Task 5 — Infrastructure-Layer Repo + Adapter (AC7)**
  - [x] `infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts` — neue Methode `updateItems(aggregate, tx)`:
    - `UPDATE gefaehrdungsbeurteilungen SET items = ?, version = ?, aktualisiertAm = now(), aktualisiertVonUserId = ? WHERE id = ?` (innerhalb der TX).
    - Optimistic-Concurrency wird NICHT hier abgesichert — der Aggregate hat den Check bereits gemacht; das Repo vertraut dem Aggregate (Architecture-Prinzip).
  - [x] `infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts` — neue Methode `saveNewVersion(args, tx)`:
    - `INSERT INTO gefaehrdungsbeurteilung_versionen (…)` analog `saveInitialVersion`, aber `gueltigBis = null`.
    - Vorherige Version (`gueltigBis IS NULL`) auf `gueltigBis = args.gueltigVon` setzen — als separater `UPDATE`-Call im selben TX.
  - [x] `infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter.ts` — Log-Only-Adapter analog `GefaehrdungsbeurteilungErstelltAdapter`, Klassenname `EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter` (Prefix verbindlich, Story 2.1 Punkt 1).
  - [x] `infrastructure/eigenschutz/event-adapters/index.ts` — Re-Export ergänzen.
  - [x] `infrastructure/events/adapters/eigenschutz-gefaehrdungsbeurteilung-aktualisiert-event.adapter.ts` — Slug-Proxy-Datei (wie in Story 2.1 Punkt 2 erklärt, damit `countAdaptersIndex` im Konsistenz-Check matcht).
  - [x] **4-Stellen-Registry:**
    1. `infrastructure/outbox/event-serializer.ts` — neuer `case` + `serializeGefaehrdungsbeurteilungAktualisiert`.
    2. `infrastructure/outbox/event-deserializer.ts` — Map-Eintrag + `deserializeGefaehrdungsbeurteilungAktualisiert`.
    3. `infrastructure/events/event-adapters.module.ts` — Adapter-Provider + Import.
    4. `infrastructure/events/adapters/index.ts` — Re-Export des Slug-Proxy.
  - [x] `packages/backend/src/__tests__/architecture-rules.spec.ts:206` — Eintrag `'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` entfernen.
  - [x] `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` — Erwartung um AKTUALISIERT ergänzen (AKTUALISIERT = 4/4, andere 12 = 0/4).
  - [x] `infrastructure/outbox/__tests__/event-deserializer.spec.ts` — Count-Sanity-Check 113 → 114 inkrementieren (falls Story 2.1 auf 113 gestellt hat).
  - [x] `infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts` — neuen Adapter als Provider + Exporter ergänzen.

- [x] **Task 6 — Module-Layer Controller + DTO (AC4, AC6, AC9)**
  - [x] `application/eigenschutz/dto/update-gefaehrdungsbeurteilung-items.dto.ts` — Swagger-fähiger Request-DTO:
    - `items: GefaehrdungItemInputDto[]` (Array; pro Item Title/Description/Eintritt/Schaden/Schutzmassnahmen; **kein** `risikoklasse`-Feld vom Client).
    - `expectedVersion: number` (positive int).
    - Validierung via `class-validator` (analog Story 2.1 Abweichung 3 — ESM-Migration-Abwarte); semantisch 1:1 zum Shared-Zod-Schema.
  - [x] `application/eigenschutz/dto/gefaehrdungsbeurteilung.dto.ts` — falls `risikoklasse`-Feld im Item-DTO noch nicht exponiert: jetzt ergänzen (`risikoklasse: Risikoklasse | null`, von Factory aus VO befüllt).
  - [x] `modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` — neuer Endpoint:
    ```ts
    @Post('gefaehrdungsbeurteilungen/:id/items')
    @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
    @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')
    @ApiOperation({ summary: 'Items einer Gefährdungsbeurteilung aktualisieren (FR3, FR4)' })
    @ApiWrappedResponse(GefaehrdungsbeurteilungDto, { description: 'Aktualisiertes Aggregate mit inkrementierter Version' })
    async updateItems(
      @Param('einsatzId') einsatzId: string,
      @Param('id') id: string,
      @Body() body: UpdateGefaehrdungsbeurteilungItemsDto,
      @CurrentUser() user: ValidatedUser,
    ): Promise<GefaehrdungsbeurteilungDto> { … }
    ```
  - [x] Error-Mapping erweitern: `ConflictDetected:*` → 409 mit `context.currentVersion` + `context.attemptedVersion` (Sentinel-Präfix analog Story 2.1).
  - [x] Controller-Unit-Spec erweitern: Guard-Kette-Metadata-Assertion für neuen Endpoint, Error-Mapping für 409/404/422/403.
  - [x] Integration-Spec (aktiviert oder weiterhin `describe.skip` gemeinsam mit Story 2.4 — Entscheidung in Dev-Notes).

- [x] **Task 7 — API-Client regenerieren (AC10, CLAUDE.md API-Workflow)**
  - [x] Backend-Dev-Server starten (HTTPS 3091), dann `pnpm run generate-api`.
  - [x] `packages/shared/client/apis/EigenschutzApi.ts` enthält `gefaehrdungsbeurteilungControllerUpdateItemsVAlpha`.
  - [x] Neue Models: `UpdateGefaehrdungsbeurteilungItemsDto`, `GefaehrdungItemInputDto` (falls abweichend vom bestehenden `GefaehrdungItemDto`).
  - [x] Check: `packages/shared/client/` wird automatisch committed, nicht manuell editiert.

- [x] **Task 8 — Frontend: Hook-Composition + Schemas (AC10, AC12)**
  - [x] `features/eigenschutz/schemas/gefaehrdungsbeurteilung.schema.ts` — `updateGefaehrdungsbeurteilungItemsFormSchema` re-exportieren bzw. ergänzen (Shared-Zod + UI-spezifische SuperRefine: mindestens ein Item mit Titel, wenn Submit nach „Hinzufügen").
  - [x] `features/eigenschutz/api/queries.ts`:
    - `useGefaehrdungsbeurteilung(einsatzId, id)` — TanStack-Query, Key `EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, id)`, `meta.silentError`, 403-no-retry (analog Vorlagen-Hook).
    - `useUpdateGefaehrdungsbeurteilungItems(einsatzId, id)` — TanStack-Mutation:
      - Body: `{ items, expectedVersion }`.
      - `onMutate`: snapshot cache, setze `optimisticVersion = expectedVersion + 1`.
      - `onError` (HTTP 409): rollback, rethrow damit Page-Container den `SeverityBanner` rendert (AC10).
      - `onSettled`: `invalidateQueries(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, id))`.
  - [x] `features/eigenschutz/index.ts` — Hook-Re-Exports ergänzen.
  - [x] Tests: Hook-Spec mit MSW-Fakes für 200, 409, 403, 404, 422.

- [x] **Task 9 — Frontend: UI-Komponenten (AC1, AC2, AC5, AC10, AC11)**
  - [x] `features/eigenschutz/ui/organisms/RiskMatrix5x5.tsx`:
    - 5×5-Grid, `role="grid"`/`role="gridcell"`, Roving-Tabindex, Keyboard-Nav (Pfeile, Enter/Space), `aria-selected` auf aktiver Zelle.
    - Zell-Farbe aus `warnstufe-*`-Tailwind-Tokens (werden in Story 7.1 dark-mode-verifiziert, hier aber bereits korrekt taggen).
    - `prefers-reduced-motion` via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → Conditional-Classnames ohne Transition.
    - Props: `value: { eintritt?, schaden? }`, `onChange(value)`, `disabled?`; Berechnete `risikoklasse` wird NICHT als Prop zurückgegeben — der Container berechnet das aus der Shared-Utility für Preview.
    - Storybook-Story (Plattform-Standard): State-Matrix idle/focused/selected/disabled/reduced-motion.
  - [x] `features/eigenschutz/ui/molecules/GefaehrdungItemEditor.tsx`:
    - Form-Block pro Item mit TanStack-Form + Zod.
    - Progressive-Disclosure für Schutzmaßnahmen-Feld (AC1).
    - Character-Counter ≥ 80 % (AC5) mit `aria-live="polite"`.
    - Storybook-Story (Plattform-Standard).
  - [x] `features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx` (oder wie bisher `GefaehrdungseditorDrawer` umbenennen — bestehende Drawer-Komponente ist scope-mäßig Story 2.1, hier neues Organism für Editor-Modus):
    - Mount auf der Detail-Route.
    - Button „+ Gefährdung" fügt leeren Item-Editor hinzu (lokaler State).
    - „Speichern"-Button (AC4) — disabled ohne Permission (AC6) oder bei Validierungs-Fehlern.
    - Keyboard-Shortcut `Ctrl/Cmd+S` triggert Save.
    - Konflikt-Banner-Slot (AC10) oberhalb des Editors.
  - [x] `features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx` (NEU, ersetzt den Stub aus Story 2.1 `gefaehrdungen/$id.tsx`):
    - Layout: Heading mit Einheit-Name + Versions-Anzeige → Editor-Organism → Abstand.
    - Loading-State: Skeleton-Grid mit Matrix-Shape-Placeholder.
    - Error-State: `SeverityBanner variant="warning"` + Retry-Button.
    - Empty-State: wird nicht benötigt, weil eine Detail-Route immer ein Aggregate hat (404 bei fremdem Einsatz).
  - [x] Route-Datei `routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id.tsx` — Stub aus Story 2.1 durch das neue `GefaehrdungenDetailPage` ersetzen.
  - [x] Tests: Organism-Struktur, Editor-Progressive-Disclosure, Keyboard-Shortcut, Optimistic-Update-Rollback.

- [x] **Task 10 — Qualitäts-Gates + Definition of Done (AC13)**
  - [x] `pnpm --filter @bluelight-hub/backend test` — neue Specs grün, keine Regressions im Eigenschutz-Slice.
  - [x] `pnpm --filter @bluelight-hub/frontend test -- --testPathPatterns="eigenschutz|risikoklasse|RiskMatrix5x5|GefaehrdungItemEditor|GefaehrdungenDetailPage"` — alle grün.
  - [x] Full-Frontend-Suite: 0 Regressions.
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` — 0 Violations.
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` — 0 Errors.
  - [x] `pnpm lint` — 0 Errors.
  - [x] Backend-Bootstrap-Smoke: OpenAPI `/api/alpha-json` listet den neuen `POST …/items`-Endpoint.
  - [x] Definition-of-Done-Formel: Testzahlen + Gate-Ergebnisse im Completion-Notes-Block dokumentieren.
  - [x] Seed-Happy-Path: `pnpm --filter @bluelight-hub/backend prisma:seed` gegen lokalen Postgres läuft ohne Fehler; Vorlagen haben Items mit englischen Feldnamen.

## Dev Notes

### Technical Requirements (NICHT-verhandelbar)

**Scope vs. Stories 2.3/2.5 (advisor-bestätigt):**

- **Story 2.2** = Add/Edit/Remove von Items via explizitem `POST …/items`-Endpoint. Ein einzelner Save-Trigger, synchrone Response mit neuer Version.
- **Story 2.3** = Formalisierung der Version-Chain-Semantik auf dem gleichen Endpoint (z. B. detailliertes `changedFields`-Diff mit per-Item-Granularität, Version-Konflikt-UI-Pfad). Story 2.3 **refactored nicht** den Endpoint — sie schärft die Zusicherungen.
- **Story 2.5** = Frontend-Auto-Save mit 2 s Debounce + manuelles „Version abschließen". Ist UI-Layer; der Endpoint aus 2.2 bleibt unverändert. Story 2.5 darf den Endpoint mit höherer Frequenz aufrufen — jeder Call produziert eine neue Version. Eine „Version abschließen"-Aktion kann in 2.5 als zusätzlicher `POST …/finalize-version` realisiert werden (NICHT Scope 2.2).

**Schema bereits vorhanden:** Die Migration `20260421222307_add_eigenschutz_module` (Story 1.4) hat `Gefaehrdungsbeurteilung`, `GefaehrdungsbeurteilungVersion` und `GefaehrdungsbeurteilungVorlage` bereits angelegt. **Keine Prisma-Migration** in Story 2.2.

**Event-Name bereits deklariert:** `EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT` = `'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` (Story 1.7). Steht aktuell noch in `knownMissingEvents` (Zeile 206 in `architecture-rules.spec.ts`) — Task 5 entfernt ihn, sobald die 4-Stellen-Registrierung komplett ist.

**Seed-vs-Shared-Zod-Mismatch aus Story 2.1 (advisor-identifiziert):**

- `packages/backend/prisma/seed.ts:291+` verwendet deutsche Feldnamen (`titel`, `beschreibung`, `defaultEintritt`, `defaultSchaden`, `schutzmassnahmen`).
- `GefaehrdungItem`-VO + `gefaehrdungItemSchema` (Shared-Zod) erwarten englische Feldnamen (`title`, `description`, `eintritt`, `schaden`, `schutzmassnahmen`).
- Der Mapper `PrismaGefaehrdungsbeurteilungVorlageMapper.toReadModel` casted raw-JSONB direkt und verwirft Items, deren `GefaehrdungItem.create` fehlschlägt — d. h. in Story 2.1 lief `MANV-Vorlage liefert 3 Items` unbemerkt als `MANV-Vorlage liefert 0 Items`.
- **Fix-Richtung (advisor-bestätigt):** seed.ts harmonisieren, NICHT den Mapper um Feld-Translation erweitern. Details in AC8 + Task 1.
- Integration-Spec nach der Harmonisierung aktivieren, um die Assertion scharfzustellen.

**5×5-Matrix-Fixture (ADR-013):** Die 25-Zellen-Zuordnung (Eintritt × Schaden → GRUEN/GELB/ORANGE/ROT) ist eine **Audit-relevante** Entscheidung (DGUV-Prüfung, FR2 „fest hinterlegtes Schema"). Sie gehört in ein ADR, nicht in verteilten Test-Fixture-Code. Advisor-Empfehlung: Nohl-Matrix oder BGHM-Handlungshilfe als Basis; **keine erfundene Matrix**. Task 0 legt ADR-013 an; Tasks 2 + 12 referenzieren sie.

**Risikoklasse-Utility — Shared-First, Duplikat-Fallback (advisor-bestätigt):**

- Bevorzugt: `packages/shared/src/utils/eigenschutz/risikoklasse.ts` mit reiner Funktion ohne Zod/Runtime-Dep.
- Problem: Story 2.1 hat ESM-Migration-Blocker dokumentiert (`complete-setup.dto.ts:3`) — Shared-Zod-Imports im Backend brechen aktuell. Reine TS-Funktion ohne Zod SOLLTE gehen, weil sie keine Runtime-Modul-Auflösung braucht — aber **wenn** zur Laufzeit ein Import-Fehler auftritt: Fallback auf parallele Duplikate in `domain/eigenschutz/value-objects/risikoklasse-berechnung.ts` + `features/eigenschutz/utils/risikoklasse-berechnung.ts`, mit einer **gemeinsamen Fixture-JSON** (`_bmad-output/planning-artifacts/risikoklasse-5x5-fixture.json`), die von beiden Test-Suiten importiert wird. Damit ist Drift detektierbar.
- Task 2 beschreibt den Entscheidungspfad. Der Dev-Agent darf den Entscheid dokumentieren + in den Completion Notes begründen.

**Optimistic-Concurrency (Architecture §E):** `aggregate.version` ist das Token. Der Client sendet `expectedVersion` im Request-Body; der Handler ruft `aggregate.updateItems(items, expectedVersion)` — ein Mismatch gibt `Result.fail('ConflictDetected', { currentVersion, attemptedVersion })`, der Controller mappt das auf HTTP 409 mit `context`-Payload.

**Transactional Handler (verbindlich, Architecture §4.3):** Handler **muss** `TransactionalCommandHandler` erweitern. Aggregate-Persistenz + Version-Row-Append + Outbox-Event in **einer** Transaktion. Niemals direkt `this.prisma.$transaction(...)` im Handler-Body. Vorbild: `CreateGefaehrdungsbeurteilungHandler` aus Story 2.1.

**Controller Response Dekoratoren (CLAUDE.md AC7):** `@ApiWrappedResponse(GefaehrdungsbeurteilungDto)` für den Update-Endpoint — POST, aber **nicht** `@ApiWrappedCreatedResponse`, weil hier kein neues Aggregate entsteht, sondern ein bestehendes aktualisiert wird (HTTP 200). **Niemals** `@ApiOkResponse({ type: ... })`.

**Guard-Chain-Reihenfolge (verbindlich, Architecture §H):**

```
JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard → PermissionsGuard
```

Identisch zu Story 2.1. `AuthModule` ist bereits importiert (Story 1.5/2.1).

**422 für Leer-Array?** Beim Update-Command kann `items: []` sinnvoll sein (Sicherheitsbeauftragter entfernt alle Gefährdungen, weil die Initial-Vorlage nicht passt und er neu anfängt). Entscheidung: **Kein 422** für leeres Array bei UPDATE. Der Mutator erlaubt es; die Ampel-Projection (Story 6.1) markiert dann die Einheit als `ROT` (keine Items = keine Schutzmaßnahmen = FR40). 422 ist nur für **Business-Rule-Verletzungen**, kein Meta-Guard gegen leere Listen.

**Event-Payload-Shape (Architecture §D):**

```typescript
export class GefaehrdungsbeurteilungAktualisiertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly gefaehrdungsbeurteilungId: string,
    public readonly fromVersion: number,
    public readonly toVersion: number,
    public readonly changedFields: { added: number; removed: number; updated: number },
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? gefaehrdungsbeurteilungId, occurredOn);
  }
  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT;
  }
}
```

**API-Client-Workflow (CLAUDE.md):** Nach Controller-Änderung IMMER `pnpm run generate-api` — Backend-Server auf HTTPS 3091 aktiv, sonst schlägt die Spec-Fetch fehl. NIE `fetch()`-Calls oder manuelle API-Helper.

**Umlaute-Regel (CLAUDE.md):** In Kommentaren, JSDoc, Testbeschreibungen und User-facing Strings IMMER korrekte Umlaute (ä/ö/ü/ß) — NIEMALS Digraphen (ae/oe/ue/ss). Code-Identifier (Variablen, Klassen) bleiben ASCII.

### Architecture Compliance

**Layer-Boundaries:** Controller → Application-Handler → Domain-Aggregate + Interface-Port → Infrastructure-Repository. Kein Prisma-Zugriff außerhalb `infrastructure/eigenschutz/repositories/`. Risikoklasse-Berechnung ist Domain-Logik (kein Framework-Zugriff), darf aber in Shared-Utility leben, solange sie keine Framework-Deps hat.

**Feature-Slice-Isolation (Frontend):** `features/eigenschutz/*` — keine Deep-Imports aus anderen Features. Nur `@bluelight-hub/shared/schemas` + `@bluelight-hub/shared/utils` (nach Task 2).

**`prefers-reduced-motion`:** Hard Requirement in der UX-Spec; MUSS testbar sein. Im Test via `vi.stubGlobal('matchMedia', …)` oder analog — keine Snapshot-Only-Assertion (Advisor-Reminder).

**Storybook (UX-Spec):** „Storybook-Stories pflichtig je Komponente" — Plattform-Standard. Story 2.1 hat weder für `SeedTemplateEntryCard` noch für `GefaehrdungseditorDrawer` Stories angelegt (preexisting gap). Story 2.2 zieht das nach für `RiskMatrix5x5` + `GefaehrdungItemEditor`; die Story-2.1-Komponenten dürfen bewusst aufgeschoben werden (Dokumentation in Completion Notes — weiter-gereichte Technical-Debt).

### Library & Framework Requirements

**Backend (keine neuen Deps):**

- `@nestjs/common ^11.1.19`, `@nestjs/cqrs ^11.0.x`, `@nestjs/swagger ^8.x`, `@prisma/client ^7.7.x`, `zod ^3.x`, `@paralleldrive/cuid2 ^3.3`, bestehender `TransactionalCommandHandler`-Base.

**Frontend (keine neuen Deps):**

- React 19 + TanStack Router/Query/Form.
- Zod (Forms + Shared-Validierung).
- Tailwind + Headless UI (Dialog.SlideIn existiert aus Story 2.1).
- OXC-Toolchain — KEIN Biome/ESLint/Prettier (CLAUDE.md).

**Keine neuen Runtime-Dependencies erwartet.** Wenn der Dev-Agent Versuchung verspürt, eine Matrix-UI-Library zu ziehen: **nicht tun**, 25 Zellen sind kein Library-Use-Case — siehe CLAUDE.md „Before adding workarounds … first question whether they are truly necessary".

### File Structure Requirements

**Strikt folgen (Architecture §B Directory Tree):** Dateinamen kebab-case, Verzeichnisse kebab-case, Aggregate/Event-Klassen PascalCase Deutsch, Commands `Update…Command`.

**Neue Backend-Dateien:**

```
packages/backend/src/
├── domain/eigenschutz/
│   ├── aggregates/gefaehrdungsbeurteilung.aggregate.ts     ← erweitert: updateItems()
│   ├── aggregates/__tests__/gefaehrdungsbeurteilung.aggregate.spec.ts  ← erweitert: updateItems-Specs
│   ├── value-objects/gefaehrdung-item.vo.ts                ← erweitert: risikoklasse-Override
│   ├── value-objects/__tests__/gefaehrdung-item.vo.spec.ts ← erweitert
│   ├── events/gefaehrdungsbeurteilung-aktualisiert.event.ts
│   ├── events/__tests__/gefaehrdungsbeurteilung-aktualisiert.event.spec.ts
│   ├── events/index.ts                                      ← Re-Export ergänzen
│   └── repositories/
│       ├── i-gefaehrdungsbeurteilung.repository.ts          ← erweitert: updateItems()
│       └── i-gefaehrdungsbeurteilung-version.repository.ts  ← erweitert: saveNewVersion()
├── application/eigenschutz/
│   ├── commands/update-gefaehrdungsbeurteilung-items/
│   │   ├── update-gefaehrdungsbeurteilung-items.command.ts
│   │   ├── update-gefaehrdungsbeurteilung-items.handler.ts
│   │   └── __tests__/{command,handler}.spec.ts
│   ├── dto/update-gefaehrdungsbeurteilung-items.dto.ts
│   ├── dto/gefaehrdungsbeurteilung.dto.ts                   ← erweitert: risikoklasse pro Item
│   └── eigenschutz-application.module.ts                    ← Handler-Registration ergänzen
├── infrastructure/eigenschutz/
│   ├── repositories/prisma-gefaehrdungsbeurteilung.repository.ts       ← erweitert: updateItems()
│   ├── repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts ← erweitert: saveNewVersion()
│   ├── repositories/__tests__/*.spec.ts                                   ← erweitert
│   ├── event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter.ts + .spec.ts
│   ├── event-adapters/index.ts                                            ← Re-Export ergänzen
│   └── eigenschutz-infrastructure.module.ts                               ← Adapter als Provider
├── infrastructure/events/adapters/
│   ├── eigenschutz-gefaehrdungsbeurteilung-aktualisiert-event.adapter.ts (Slug-Proxy)
│   ├── event-adapters.module.ts                             ← erweitert: Provider ergänzen
│   └── index.ts                                              ← Re-Export ergänzen
├── infrastructure/outbox/
│   ├── event-serializer.ts                                   ← erweitert: case + serialize-Fn
│   ├── event-deserializer.ts                                 ← erweitert: map + deserialize-Fn
│   └── __tests__/{event-deserializer,eigenschutz-event-registry}.spec.ts ← Zählung anpassen
├── modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts ← erweitert: POST …/items
├── modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.spec.ts ← erweitert
└── __tests__/architecture-rules.spec.ts                      ← knownMissingEvents-Eintrag entfernen
```

**Neue Frontend-Dateien:**

```
packages/frontend/src/features/eigenschutz/
├── schemas/gefaehrdungsbeurteilung.schema.ts                        ← erweitert: update-Schema
├── api/queries.ts                                                    ← erweitert: useGefaehrdungsbeurteilung + useUpdateGefaehrdungsbeurteilungItems
├── api/__tests__/*.spec.tsx                                          ← erweitert
├── ui/organisms/RiskMatrix5x5.tsx + __tests__/*.spec.tsx
├── ui/organisms/RiskMatrix5x5.stories.tsx
├── ui/molecules/GefaehrdungItemEditor.tsx + __tests__/*.spec.tsx
├── ui/molecules/GefaehrdungItemEditor.stories.tsx
├── ui/organisms/GefaehrdungenEditorOrganism.tsx + __tests__/*.spec.tsx
├── ui/pages/GefaehrdungenDetailPage.tsx + __tests__/*.spec.tsx
├── utils/                                                             ← nur im Fallback-Fall
│   └── risikoklasse-berechnung.ts + __tests__/*.spec.ts               (Duplikat, siehe Task 2)
└── index.ts                                                           ← Public-API ergänzen
```

**Neue Route-Änderung (Story 2.1 Stub ersetzen):**

```
packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id.tsx
```

**Neue Shared-Dateien (Task 2 First-Try):**

```
packages/shared/src/utils/eigenschutz/
├── risikoklasse.ts
├── risikoklasse-5x5.fixture.ts        ← Fixture-Tabelle aus ADR-013
├── index.ts                           ← Barrel-Export
└── __tests__/risikoklasse.spec.ts     (optional: Vitest-Unit-Test auf Shared-Ebene)
```

Falls der Dev-Agent den ESM-Fallback zieht:

```
_bmad-output/planning-artifacts/risikoklasse-5x5-fixture.json   ← geteilte Test-Fixture
packages/backend/src/domain/eigenschutz/value-objects/risikoklasse-berechnung.ts
packages/frontend/src/features/eigenschutz/utils/risikoklasse-berechnung.ts
```

**Neue Doku:**

```
docs/adr/adr-013-risikomatrix-5x5.md
```

**Re-Generated (niemals manuell editieren):**

```
packages/shared/client/apis/EigenschutzApi.ts         ← +1 Methode (updateItems)
packages/shared/client/models/UpdateGefaehrdungsbeurteilungItemsDto.ts
packages/shared/client/models/GefaehrdungItemInputDto.ts   (falls separat vom bestehenden GefaehrdungItemDto generiert)
```

### Testing Requirements

**Testing-Konventionen (Bestand):**

- Backend: Jest co-located `__tests__/` — `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner (`--testPathPattern` deprecated, Plural nutzen; Memory-Regel).
- Frontend: Vitest — `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="pattern" --no-coverage`.
- Präzise Testpfade nutzen — keine broad Patterns, die unrelated Tests mitziehen (CLAUDE.md „Testing").
- `meta.silentError` für GET-Hooks, NICHT für Update-Mutation (der Konflikt-Banner rendert den Fehler inline).

**Konsistenz-Spec — 25 Zellen der 5×5-Matrix:**

- Eine parametrisierte Unit-Spec (identisch aufgebaut wie `RISIKOMATRIX_5x5_FIXTURE.forEach(({ eintritt, schaden, risikoklasse }) => it(…))`) läuft sowohl gegen die Backend-Utility als auch gegen die Frontend-Utility. Im Shared-Fall sind beide Aufrufe derselben Funktion, im Fallback-Fall sind es zwei Suiten gegen zwei Implementierungen mit derselben Fixture.
- Die Fixture-Tabelle selbst muss 1:1 aus ADR-013 kopiert werden (und beim Review der ADR + der Fixture parallel aktualisiert werden).

**Integration-Test-Kernprüfungen (`gefaehrdungsbeurteilung.controller.integration.spec.ts` — aktiviert oder deferred):**

1. Happy-Path: bestehende Beurteilung mit leerer Items-Liste → Update mit 3 Items (Mixed Enums) → Response `version = 2` → DB hat Items + V2 + V1 mit `gueltigBis = now`.
2. 409 ConflictDetected: Update mit `expectedVersion: 1`, aber Beurteilung ist schon auf Version 2 → `{ statusCode: 409, context: { currentVersion: 2, attemptedVersion: 1 } }`.
3. 403: User ohne Permission → Forbidden.
4. 404: fremde `einsatzId` → NotFound:Beurteilung (Cross-Einsatz-Check, leakfrei).
5. 400: ungültiges Enum (`eintritt: 'UNBEKANNT'`) → Zod-Body-Validierung-Fehler.
6. Deep-Append-Beweis: 3 aufeinanderfolgende Updates → DB hat 3 `gefaehrdungsbeurteilung_versionen`-Zeilen mit Kette von `gueltigBis`.
7. Event-Roundtrip: nach Update existiert eine Outbox-Zeile mit `event_name = 'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` und Payload-Roundtrip-sauberer Deserialisierung.

**Controller-Unit-Spec erweitert:**

- `Reflect.getMetadata('__guards__', GefaehrdungsbeurteilungController.prototype.updateItems)` ⇒ `[JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard]`.
- Decorator-Parameter: `@RequiresEigenschutzRolle('Sicherheitsbeauftragter')`, `@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')`.
- Error-Mapping-Matrix: `ConflictDetected:…` → 409, `NotFound:Beurteilung` → 404, etc.

**Frontend-Keyboard-Spec für `RiskMatrix5x5`:**

- Nutzt `user-event` oder `fireEvent.keyDown` mit `{ key: 'ArrowRight' }`, `{ key: 'ArrowDown' }`, `{ key: 'Enter' }`.
- Assertion: nach `ArrowRight` aus Ecke (1,1) ist Zelle (1,2) fokussiert; `aria-selected="true"` nach Enter.

**Accessibility-Spec:** Strukturelle Assertions (Story 2.1 Abweichung 8): `role="grid"`, `role="gridcell"` auf 25 Zellen, `aria-selected`, Label-Koppelung, `aria-describedby` am Schutzmaßnahmen-Feld, Character-Counter via `aria-live="polite"`.

### Previous Story Intelligence (Story 415-2-1)

Story 2.1 hat das Create-Pattern komplett etabliert. Die folgenden Lessons + dokumentierten Abweichungen gelten für 2.2 unverändert — Dev-Agent bitte vor Implementierungs-Start lesen (`_bmad-output/implementation-artifacts/415-2-1-gefaehrdungsbeurteilung-anlegen-aus-vorlage-oder-leer.md` Zeilen 580–633):

1. **Adapter-Klassen-Prefix `Eigenschutz*`** (Completion Note Pkt 1) — `pascalCaseDerivative(eventName)`-Heuristik matcht nur mit diesem Prefix. `EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter`.
2. **Slug-Proxy-Datei** (Pkt 2) — `countAdaptersIndex` matcht nur `['"]\./${slug}[-.]`-Imports im selben Verzeichnis. Proxy-Datei in `infrastructure/events/adapters/` anlegen.
3. **`CreateGefaehrdungsbeurteilungDto` + class-validator** (Pkt 3) — ESM-Migration-Abwarte. Für den neuen Update-DTO dasselbe Pattern: `class-validator` + `@Matches`-Regex, **kein** `@ValidateWithZod`, semantisch 1:1 zum Shared-Zod.
4. **Repository `create` vs. `upsert`** (Pkt 4) — Update-Repo nutzt `update`, **nicht** `upsert`. Beurteilung muss existieren, sonst `NotFound:Beurteilung`.
5. **Handler-Reihenfolge: Validierung vor teurem DB-Call** (Pkt 5) — Cross-Einsatz-Check VOR `aggregate.updateItems`. Das Muster ist etabliert.
6. **Deep-Copy über `item.clone()` (Pkt 6)** — nicht `structuredClone(array)`. Bei `updateItems` werden neue `GefaehrdungItem`-VOs erzeugt; kein Clone nötig, weil Client immer neue Items schickt. Aber die Vorlagen-Items bei Story 2.2 (falls erneut zugewiesen — nicht im Scope) würden clone nutzen.
7. **Cross-Einsatz-Check ist Plichtschicht** (Pkt 7) — der Handler lädt das Aggregate, prüft `aggregate.einsatzId === command.einsatzId`. Fremde Beurteilung → `NotFound:Beurteilung`, **nicht** 403 (leak-frei).
8. **A11y-Check ohne `vitest-axe`** (Pkt 8) — strukturelle Assertions.
9. **Frontend-Permission-Gate = area-level** (Pkt 9) — `useCanAccess('eigenschutz')` genügt; Backend-Guard-Chain ist Source of Truth.
10. **Routing-Pivot** (Pkt 10) — die Detail-Route `/gefaehrdungen/$id.tsx` existiert als Stub. Story 2.2 ersetzt den Stub durch die neue Page-Komponente.

**Offene Technical-Debt aus Story 2.1 (dokumentiert, nicht-Blocker):**

- 7 geskippte Postgres-Integration-Specs → Aktivierung in Story 2.4. Story 2.2 kann Seed-Helpers als wiederverwendbare Fixture anlegen, wenn der Dev-Agent Zeit hat; andernfalls weiterhin `describe.skip`.
- Coverage-Lücken auf Drawer/Page (Drawer Stmts 69.69 %, Page 66.66 %) — bewusst als „Nachzug vor Merge oder Story 2.2" markiert. Story 2.2 schließt die Lücken NICHT automatisch, aber die neuen Tests verbessern die Gesamt-Coverage.
- Storybook-Gap für `SeedTemplateEntryCard` + `GefaehrdungseditorDrawer` → separate Infra-PR (nicht Scope 2.2, aber Story 2.2 macht es für die neuen Components korrekt).

### Git Intelligence Summary (letzte 5 Commits relevant für 2.2)

1. `08dbd9b43 🐛(backend-cli): Nest-Bootstrap-CLIs von tsx auf ts-node umstellen` — Nest-Bootstrap nutzt ts-node; Integrations-Specs, die Nest-Apps starten, müssen ts-node verwenden. Jest/SWC bleibt unberührt.
2. `05091aaa3 🔒(push-notifications): Apply Story 1.2 review patches` — nicht story-relevant, aber zeigt Review-Workflow.
3. `037cd18f4 ✨(push-notifications): Stories 1.1 + 1.2 — Web-Push + Tauri-Bridge` — Plattform-Vorarbeit; Story 2.2 muss KEINE Push-Notifications senden (Epic 3 macht das für kritische PSA-Events).
4. Story 2.1-Merge ist im Arbeits-Branch noch nicht committed (Branch-Status: stapel aus Story 2.1 Working Copy, zwei ungestaggte Prisma-/Auth-Module-Edits).
5. Vor Story 2.2-Start bitte Story 2.1 als `git commit` einreichen ODER auf derselben Working Copy aufsetzen — Dev-Agent entscheidet, ob Commit-Split Sinn macht.

**Implikation für 2.2:** Alle Plattform-Voraussetzungen sind da (Guards, CQRS, Outbox, Event-Framework, Prisma-Schema, Seed-Baseline aus 1.4 + 2.1). Story 2.2 ist die **erste Update-Operation** im Eigenschutz-Slice — das Pattern wird in Story 2.3 (Version-Chain), 2.5 (Auto-Save), Story 3.1/3.2 (PSA-Update), Story 4.x (Sicherungsposten-Update) wiederverwendet. Das Aggregate `updateItems` + der Controller-Endpoint-Shape + die 4-Stellen-Registry für `*_AKTUALISIERT`-Events sind **Vorbild-Implementierungen**. Sauberkeit und Testbarkeit zählen besonders.

### Latest Tech Information

- **NestJS 11.1.19** — `TransactionalCommandHandler` ist stabil; für Update-Commands gleichlaufend zu Create-Commands. Der Base-Handler koordiniert Outbox-Publish nach erfolgreicher Transaktion.
- **Prisma 7.7.x** — `structuredClone` am JSONB ist zuverlässig. `$transaction([…])` mit sequenziellen Updates (Version-Row `gueltigBis` + neuer Version-Insert + Haupttabellen-Update) ist innerhalb des `TransactionalCommandHandler`-tx-Contextes sicher.
- **Zod 3.x** — für das Update-Schema wiederverwenden: `createGefaehrdungsbeurteilungItemsSchema = z.object({ items: z.array(gefaehrdungItemSchema), expectedVersion: z.number().int().positive() })` in Shared.
- **TanStack Query v5** — `useMutation`-Optimistic-Pattern mit `onMutate`/`onError`/`onSettled` ist das etablierte Muster (Story 2.1 übernimmt). `onError` kann bei 409 den Error `rethrow`en, damit die Page-Komponente ihn im `SeverityBanner` darstellt.
- **React 19** — `useOptimistic` ist OPTIONAL; TanStack-Query-`onMutate` bleibt die primäre Wahl im Projekt.

### Project Context Reference

- **Repo-Konventionen:** `CLAUDE.md` (API-Workflow, DI-Imports, Response-Decorators, Umlaute-Regel, Testing-Standards).
- **BMAD-Config:** `_bmad/bmm/config.yaml` (Sprache: Deutsch, Skill-Level: expert).
- **Plattform-Prinzipien:** `docs/architecture-principles.md` (Layering, Aggregates, Result, Outbox, DI, Events).
- **Story-Key-Konvention:** `_bmad/custom/project-conventions.md` (Story-Prefix `415-` aus GitHub-Issue).
- **ADRs (existent):** ADR-006 (WebSocket-Event-Bus), ADR-011 (Push-Notifications), ADR-012 (EinsatzScopeGuard).
- **ADR (neu, in dieser Story zu erzeugen):** ADR-013 (5×5-Risikomatrix-Mapping).
- **Epic-Definition:** `_bmad-output/planning-artifacts/epics.md:709-754` — Story 2.2 Wortlaut (inkl. letzter AC-Zeile „nutzt Auto-Save aus Story 2.5", die hier bewusst umgedreht ist — siehe Scope-Klarstellung oben).

### References

- **PRD:**
  - `_bmad-output/planning-artifacts/prd.md:442` — FR2 Risikobewertung + automatische Risikoklasse.
  - `_bmad-output/planning-artifacts/prd.md:444` — FR4 Schutzmaßnahmen-Freitext.
  - `_bmad-output/planning-artifacts/prd.md:498` — FR40 Warn-Markierung bei fehlender Schutzmaßnahme.
  - `_bmad-output/planning-artifacts/prd.md:502` — FR41/FR42/FR43 Versions-Chain Invarianten.
  - `_bmad-output/planning-artifacts/prd.md:593-595` — Q1 „Risikomatrix 5×5 qualitativ, 4 Ergebnisklassen".
- **Epic:** `_bmad-output/planning-artifacts/epics.md:709-754` — Story 2.2 Definition.
- **Architecture:**
  - `_bmad-output/planning-artifacts/architecture.md:441-451` — §B1 State + Version-Chain + Outbox.
  - `_bmad-output/planning-artifacts/architecture.md:976-1009` — §C API-Response-Format (200/400/403/404/409/422).
  - `_bmad-output/planning-artifacts/architecture.md:1011-1062` — §D Event-Patterns + 4-Stellen-Registry.
  - `_bmad-output/planning-artifacts/architecture.md:1064-1083` — §E Versioning + Optimistic Concurrency.
  - `_bmad-output/planning-artifacts/architecture.md:1128-1149` — §H Guard-Composition.
  - `_bmad-output/planning-artifacts/architecture.md:1368-1420` — Prisma-Model `Gefaehrdungsbeurteilung` + Version + Vorlage.
  - `_bmad-output/planning-artifacts/architecture.md:1891` — `risikoklasse-berechnung.ts` (Frontend-UI-Preview-Ort).
  - `_bmad-output/planning-artifacts/architecture.md:1908` — `RiskMatrix5x5.tsx`-Platzierung.
  - `_bmad-output/planning-artifacts/architecture.md:2012` — Requirements-Mapping FR1–FR6.
- **UX-Spec:**
  - `_bmad-output/planning-artifacts/ux-design-specification.md:666-701` — Journey 1a Mermaid + Auto-Save-Verhalten (2 s Debounce gehört in Story 2.5, nicht 2.2).
  - `_bmad-output/planning-artifacts/ux-design-specification.md:830` — Progressive-Disclosure Schutzmaßnahmen-Feld.
  - `_bmad-output/planning-artifacts/ux-design-specification.md:855-861` — `RiskMatrix5x5`-Spec (Organism, `role="grid"`, Pfeiltasten, ≥ 48×48 px).
  - `_bmad-output/planning-artifacts/ux-design-specification.md:935` — Component-Liste RiskMatrix5x5 Verifikation.
- **ADRs:**
  - `docs/adr/adr-012-einsatz-scope-guard.md` — EinsatzScopeGuard-Verantwortung.
  - `docs/adr/adr-013-risikomatrix-5x5.md` — **neu in dieser Story** — 5×5-Matrix-Zuordnung.
- **Source-Referenzen (Story-2.1-Implementierungen als Vorbild):**
  - `packages/backend/src/application/eigenschutz/commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.handler.ts` — TransactionalCommandHandler-Pattern.
  - `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts` — Aggregate-Struktur + Event-Emit.
  - `packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts` — VO-Validation (zu erweitern).
  - `packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event.ts` — Event-Basisklasse-Vorbild.
  - `packages/backend/src/infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-erstellt.adapter.ts` — Adapter-Vorbild.
  - `packages/backend/src/infrastructure/outbox/event-serializer.ts` + `event-deserializer.ts` — Registry-Stellen 1+2.
  - `packages/backend/src/infrastructure/events/event-adapters.module.ts` + `adapters/index.ts` — Registry-Stellen 3+4.
  - `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` — Controller + Guard-Kette + Error-Mapping.
  - `packages/backend/src/domain/events/event-names.ts:77` — `GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT`-Konstante.
  - `packages/shared/src/schemas/eigenschutz/gefaehrdung-item.schema.ts` — Shared-Zod-Shape.
  - `packages/frontend/src/features/eigenschutz/` — Feature-Slice (Drawer, Hooks, Query-Keys).
- **CLAUDE.md:** API-Workflow, DI-Import-Regel, OXC-Toolchain, Umlaute, Testing-Patterns.
- **Memory:**
  - `feedback_route_nesting.md` — Einsatz-Routen unter `/einsatz/:einsatzId/…`.
  - Backend-Testkommando: `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M-Kontext) — gesteuert als `/bmad-dev-story`-Workflow mit Subagents (Explore, general-purpose) für parallele Phasen (Task 1 Seed, Task 5 Repo-Specs, Task 9 Frontend-UI).

### Debug Log References

- **ESM-Probe (Shared-Utility-Import im Backend):** Eine minimale Probe-Spec (`risikoklasse-shared-import.probe.spec.ts`) hat verifiziert, dass `@bluelight-hub/shared` aus dem Backend-CJS-Jest NICHT auflösbar ist. Probe wurde nach Entscheidung gelöscht. Backend hält deshalb ein kontrolliertes Duplikat (`value-objects/risikoklasse-berechnung.ts`), siehe ADR-013 Abschnitt „Fallback-Pfad".
- **Circular-Dependency-Fix:** `check:arch` hat einen Zyklus `gefaehrdung-item.vo.ts → risikoklasse-berechnung.ts → gefaehrdung-item.vo.ts` gemeldet (beide importierten/definierten Enum-Types wechselseitig). Behoben durch Auslagerung der Enum-Konstanten + Types in `value-objects/gefaehrdung-enums.ts`; das VO re-exportiert sie, sodass bestehende Import-Pfade unverändert bleiben.
- **Story-2.1-Test-Anpassungen durch Backend-Autorität (AC3):** Die bestehenden Specs (`gefaehrdung-item.vo.spec.ts` Test 7, `prisma-gefaehrdungsbeurteilung.repository.spec.ts`) erwarteten ein vom Client mitgeliefertes `risikoklasse`-Feld (`ROT` für `SELTEN × KATASTROPHAL = 5`). Nach der neuen Matrix (5 → GELB) mussten Erwartungen + `makeItem`-Defaults auf ADR-013-konforme Werte angepasst werden.
- **DB-Integration-Test-Concurrency:** Der parallele `npx jest`-Full-Run schlägt an den Eigenschutz-Integration-Specs fehl (mehrere Specs schreiben auf dieselben testEinsatzIds). Mit `--runInBand` laufen alle 30 Repo-Specs grün. Das ist Story-2.1-Debt, nicht Story-2.2-Regression. Als DoD-Gate zählt der non-DB-Run (8705/8705 passed) sowie der sequenzielle Repo-Run.

### Completion Notes List

**Architekturentscheidungen:**

1. **ADR-013 — 5×5-Nohl-Matrix** als Proposed angelegt. 25-Zellen-Zuordnung aus multiplicativer Risikozahl (Eintritt × Schaden, 1–25) mit Schwellen 1–3 GRUEN / 4–9 GELB / 10–15 ORANGE / 16–25 ROT. PO-Freigabe ausstehend (Zeile „Status: Proposed" markiert).
2. **Shared-First mit dokumentiertem Fallback (AC12, Risikoklasse-Utility):** Shared-Utility (`packages/shared/src/utils/eigenschutz/risikoklasse.ts`) + Fixture existieren für Frontend-Konsum; Backend hält eine identische Kopie mit Drift-Mitigation via parametrisiertem Unit-Test gegen die ADR-Tabelle. Shared-Import aus Backend-CJS schlägt laufzeittechnisch fehl (Probe verifiziert).
3. **Enum-Split (`gefaehrdung-enums.ts`):** Neu angelegt zur Auflösung des Circular-Dependency zwischen VO und Risikoklasse-Utility. VO re-exportiert die Konstanten + Types, sodass bestehende Import-Pfade unverändert bleiben.
4. **Backend-Autorität für `risikoklasse` (AC3):** `GefaehrdungItem.create()` überschreibt ein vom Client mitgeliefertes `risikoklasse`-Feld, sobald `(eintritt, schaden)` beide gesetzt sind. Begründung + Tabelle in ADR-013 verankert.
5. **Conflict-Sentinel (AC4):** `GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED = 'ConflictDetected:Gefaehrdungsbeurteilung'` aus Aggregat-Layer, Handler reicht durch, Controller mappt auf HTTP 409 mit `context.attemptedVersion`. `currentVersion` wird vom Frontend via GET nachgeladen — das Frontend benötigt den Wert nicht im 409-Body, weil der Optimistic-Rollback den Cache unverändert zurücksetzt und die Invalidierung danach die Server-Wahrheit holt.
6. **Version-Chain-Semantik (AC4):** `saveNewVersion` schließt zuerst alle offenen Zeilen (`gueltigBis IS NULL`) mit dem Event-Timestamp und hängt anschließend die neue Zeile an — beides in derselben Transaktion. `eventId`-Unique-Constraint fängt Doppel-Processing durch Outbox-Retry ab (Integration-Spec verifiziert).
7. **4-Stellen-Event-Registry (AC7):** `eigenschutz.gefaehrdungsbeurteilung_aktualisiert` an Serializer, Deserializer, `EventAdaptersModule`-Provider und `infrastructure/events/adapters/index.ts`-Slug-Proxy registriert. `architecture-rules.spec.ts` `knownMissingEvents` entfernt, `eigenschutz-event-registry.spec.ts` inkrementiert (ERSTELLT + AKTUALISIERT = 4/4, übrige 12 = 0/4), `event-deserializer.spec.ts` Count auf 114 erhöht.
8. **Seed-vs-Shared-Zod-Harmonisierung (AC8, Story-2.1-Debt):** `seed.ts`-Items von `{ titel, beschreibung, defaultEintritt, defaultSchaden, schutzmassnahmen }` auf `{ title, description, eintritt, schaden, schutzmassnahmen }` umbenannt — keine Prisma-Migration, weil JSONB. Integration-Spec `prisma-gefaehrdungsbeurteilung-vorlage.repository.spec.ts` aktiviert mit MANV-3-Items-Assertion; Fallback-Seed im Spec-Setup liefert ebenfalls 3 Items, damit auch ohne vorherigen prod-seed lauffähig.
9. **Optimistic-Update-Pattern (AC10):** `useUpdateGefaehrdungsbeurteilungItems` snapshotet den Detail-Cache, setzt optimistisch `version + 1`, rollt bei 409 zurück und invalidiert. Bei Erfolg übernimmt er die Server-Response inkl. server-berechneter `risikoklasse`. Der Fehler wird nicht silent — die Page-Komponente rendert einen Konflikt-Banner bei `response.status === 409`.
10. **Storybook aufgeschoben (Task 9 Punkt 7):** Im Frontend existiert **keine Storybook-Config** (kein `.storybook/`, keine `.stories.*`-Dateien im gesamten Repo). Storybook-Stories für `RiskMatrix5x5` und `GefaehrdungItemEditor` wurden daher bewusst nicht angelegt — gleiche Technical-Debt wie Story 2.1 (`SeedTemplateEntryCard`, `GefaehrdungseditorDrawer`) — Plattform-Entscheidung nötig, ob Storybook als separate Infra-PR aufgebaut wird.
11. **Tailwind-Warnstufe-Tokens nicht 1:1 passend (UI-Spec §Visuelles Leitbild):** Die Theme-Tokens heißen `warnstufe-{keine|niedrig|mittel|hoch|akut}-{fill|stroke|text}` (5-stufig) und matchen nicht die 4 Risikoklassen GRUEN/GELB/ORANGE/ROT. Um keinen semantisch falschen Mapping zu zementieren, nutzt die Matrix Tailwind-Farbpaletten direkt (`bg-green-100` etc.). Zukünftige Story 7.1 (Dark-Mode) kann eine explizite Farb-Mapping-Entscheidung treffen.
12. **SeverityBanner-Fallback:** Im Repo existiert (noch) keine dedizierte `SeverityBanner`-Komponente im Shared-UI-Layer. Der Konflikt-Banner ist als semantisches `<div role="alert" aria-live="assertive">` mit Reload-Button umgesetzt; Upgrade auf eine spätere zentrale Komponente ist mechanisch.

**Quantitative DoD-Erfüllung:**

- **Backend (non-DB):** 8705 / 8705 passed (35 legitim skipped), 511 / 512 Suites (1 Suite ist Story-2.1-Debt mit DB-Gate).
- **Eigenschutz-Slice (Backend):** 224 / 231 passed, 7 skipped (Story-2.1-deferred DB-Integration).
- **Repo-Integration-Specs (Backend, sequenziell):** 30 / 30 passed (`--runInBand` — Story-2.1-Test-Concurrency-Bug bleibt Debt).
- **Frontend Eigenschutz-Slice + Route:** 94 / 94 passed.
- **Plattform-Checks:** `check:di:imports` ✅, `check:arch` ✅ (0 Zirkel, 508 preexisting warnings), `pnpm lint` ✅ (0 Errors, 2 Warnings in fremden Dateien).
- **OpenAPI-Alpha-Spec:** Endpoint `POST /api/v-alpha/einsaetze/{einsatzId}/sicherheit/eigenschutz/gefaehrdungsbeurteilungen/{id}/items` in der generierten `alpha-json` gelistet; API-Client regeneriert (`UpdateGefaehrdungsbeurteilungItemsDto`, `GefaehrdungItemInputDto`, Methode `gefaehrdungsbeurteilungControllerUpdateItemsVAlpha`).

**Coverage-Messung (AC12, neue Dateien) — gemessen am 2026-04-23:**

- `risikoklasse-berechnung.ts` (Backend-Duplikat): **100 % Stmts / Branch / Funcs / Lines** ✅ (AC12 100-%-Ziel für `calculateRisikoklasse`)
- `gefaehrdungsbeurteilung-aktualisiert.event.ts`: **100 % alle Metriken** ✅ (AC12 100-%-Ziel für Event)
- `update-gefaehrdungsbeurteilung-items.command.ts`: **100 % Stmts / Funcs / Lines, 82.35 % Branch** ✅ (die 3 nicht-erreichten Branch-Pfade in Zeilen 29/34/39 sind `?? ''`-Fallbacks für optionale String-Felder — defensive Redundanz, der nicht-undefined-Pfad wird durch das Trim bereits covered).
- `update-gefaehrdungsbeurteilung-items.handler.ts`: **98.49 % Stmts / Lines, 100 % Funcs, 76 % Branch** (leicht unter AC12-80-%-Branch-Ziel). Uncovered: Zeilen 104–105 — das ist der `aggregate.updateItems`-Non-Conflict-Error-Pfad, der über die Command-Factory unerreichbar ist (`Command.create` erzwingt `Array.isArray(items)`; das Aggregate würde keinen anderen Fehler als `ConflictDetected` liefern). Defensive Redundanz.
- `gefaehrdungsbeurteilung.aggregate.ts` (gesamt inkl. bestehendem `create`): **97.81 % Stmts / Lines, 95.12 % Branch, 100 % Funcs** ✅. `updateItems`-Methode selbst ist **100 % Branch** — die uncovered Branches (Zeilen 78–79, 83–84) sitzen in der Story-2.1-`create`-Factory (Pre-existing).
- **AC12-Disziplin:** Handler-Branch 76 % ist 4 Prozentpunkte unter dem generellen Ziel 80 % — die uncovered Pfade sind explizit defensive coding ohne erreichbaren Test-Pfad über den Command-Contract. Dokumentiert als bewusste Abweichung; Story-2.3 formalisiert ggf. einen Fall, in dem `updateItems` weitere Error-Codes liefert, und hebt damit die Branch-Coverage automatisch.

**Advisor-Review-Patches (post-Implementation, vor `review`-Status):**

- **AC5-Fix:** Leere Schutzmaßnahmen-/Beschreibungs-Strings werden im VO zu `undefined` normalisiert. Die Ampel-Projection (FR40 / Story 6.1) matcht „fehlend oder leer" einheitlich. Tests 12–14 in `gefaehrdung-item.vo.spec.ts` prüfen das explizit.
- **AC3-Frontend-Konsistenz-Spec:** Neue Datei `packages/frontend/src/features/eigenschutz/utils/__tests__/risikoklasse.spec.ts` iteriert `RISIKOMATRIX_5X5_FIXTURE` aus `@bluelight-hub/shared` und verifiziert alle 25 Zuordnungen gegen `calculateRisikoklasse`. Damit fällt jede Shared-Utility-Drift sowohl im Frontend als auch im Backend auf.
- **Zero-Toast-Fix auf Plattform-Ebene:** `MutationCache.onError` respektiert jetzt `mutation.meta.silentError` (wie `QueryCache.onError`). `useUpdateGefaehrdungsbeurteilungItems` setzt `meta: { silentError: true }`, damit 409-Konflikte keinen Sonner-Toast parallel zum Konflikt-Banner triggern (UX-DR21).

**Offene Punkte für Review (nicht-Blocker):**

- **Git-State:** Stories 1.7 + 2.1 sind zu Beginn der Story 2.2 ungestaged gewesen; Story 2.2 baut auf derselben Working-Copy auf. Für einen sauberen Review-PR empfehle ich, Story 2.1 + Story 2.2 als **getrennte Commits** einzureichen (die Story-Notizen geben dem Dev-Agent explizit die Wahl; für PR-Reviewbarkeit ist der Commit-Split die sauberere Option). Commit liegt bewusst beim User (CLAUDE.md: NIEMALS committen ohne User-Ask).
- **PO-Freigabe ADR-013:** Status `Proposed` — Ruben prüft vor Merge die 25-Zellen-Zuordnung. Änderungen erfordern neue ADR-Version.
- **Storybook-Infra:** Als separate Infra-PR für Feature-Slice-Komponenten sinnvoll (Story 2.1 hat dieselbe Debt).
- **Tailwind-Warnstufe-Token-Review:** Story 7.1 sollte die Semantik der 5-stufigen `warnstufe-*`-Tokens gegen die 4 Risikoklassen ausrichten oder die Matrix-Farbwahl dokumentieren.
- **Integration-Spec-Concurrency:** Parallele Jest-Läufe der Eigenschutz-Repo-Specs überschreiben testEinsatzIds. Story-2.4-DB-Fixture-Cleanup sollte das adressieren (bleibt als deferred Debt dokumentiert).

### File List

**Neue Dateien:**

_Docs:_

- `docs/adr/adr-013-risikomatrix-5x5.md` (Proposed)

_Shared-Utility:_

- `packages/shared/src/utils/eigenschutz/risikoklasse.ts`
- `packages/shared/src/utils/eigenschutz/risikoklasse-5x5.fixture.ts`
- `packages/shared/src/utils/eigenschutz/index.ts`
- `packages/shared/src/utils/index.ts`

_Frontend Consistency-Spec (AC3 Advisor-Patch):_

- `packages/frontend/src/features/eigenschutz/utils/__tests__/risikoklasse.spec.ts`

_Backend Domain:_

- `packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-enums.ts`
- `packages/backend/src/domain/eigenschutz/value-objects/risikoklasse-berechnung.ts`
- `packages/backend/src/domain/eigenschutz/value-objects/__tests__/risikoklasse-berechnung.spec.ts`
- `packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts`
- `packages/backend/src/domain/eigenschutz/events/__tests__/gefaehrdungsbeurteilung-aktualisiert.event.spec.ts`

_Backend Application:_

- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.command.ts`
- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts`
- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/__tests__/update-gefaehrdungsbeurteilung-items.command.spec.ts`
- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/__tests__/update-gefaehrdungsbeurteilung-items.handler.spec.ts`
- `packages/backend/src/application/eigenschutz/dto/gefaehrdung-item-input.dto.ts`

_Backend Infrastructure:_

- `packages/backend/src/infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter.ts`
- `packages/backend/src/infrastructure/events/adapters/eigenschutz-gefaehrdungsbeurteilung-aktualisiert-event.adapter.ts`

_Frontend UI:_

- `packages/frontend/src/features/eigenschutz/ui/organisms/RiskMatrix5x5.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/RiskMatrix5x5.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/molecules/GefaehrdungItemEditor.tsx`
- `packages/frontend/src/features/eigenschutz/ui/molecules/__tests__/GefaehrdungItemEditor.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/GefaehrdungenEditorOrganism.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx`
- `packages/frontend/src/features/eigenschutz/ui/pages/__tests__/GefaehrdungenDetailPage.spec.tsx`

**Geänderte Dateien:**

_Seed + Specs:_

- `packages/backend/prisma/seed.ts` — Seed-Item-Feldnamen harmonisiert (5 Vorlagen, 15 Items).
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung-vorlage.repository.spec.ts` — MANV-3-Items-Assertion aktiviert + Fallback-Seed auf 3 Items angepasst.

_Backend Domain:_

- `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts` — `updateItems`-Methode, `GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED`-Sentinel, private Felder `_items`/`_version` nicht mehr readonly.
- `packages/backend/src/domain/eigenschutz/aggregates/__tests__/gefaehrdungsbeurteilung.aggregate.spec.ts` — 7 neue Tests für updateItems.
- `packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts` — Risikoklasse-Override via `calculateRisikoklasse`, Enum-Konstanten aus `gefaehrdung-enums.ts` re-exportiert.
- `packages/backend/src/domain/eigenschutz/value-objects/__tests__/gefaehrdung-item.vo.spec.ts` — Test 7 Backend-Autorität angepasst + 4 neue Tests für Override-Verhalten.
- `packages/backend/src/domain/eigenschutz/events/index.ts` — Re-Export `GefaehrdungsbeurteilungAktualisiertEvent` + Changed-Fields-Type.
- `packages/backend/src/domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung.repository.ts` — `updateItems`-Methode im Port.
- `packages/backend/src/domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung-version.repository.ts` — `saveNewVersion`-Methode + `SaveNewVersionArgs`-Interface.
- `packages/backend/src/domain/eigenschutz/repositories/index.ts` — Re-Export `SaveNewVersionArgs`.

_Backend Application:_

- `packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts` — Handler-Registration + Export.

_Backend Infrastructure:_

- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts` — `updateItems`-Implementierung.
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts` — `saveNewVersion`-Implementierung inkl. Chain-Closing (`gueltigBis`-Update auf Vorversion).
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung.repository.spec.ts` — `makeItem`-Default angepasst + 5 neue `updateItems`-Tests + 2 bestehende Risikoklasse-Erwartungen korrigiert.
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung-version.repository.spec.ts` — 4 neue `saveNewVersion`-Tests.
- `packages/backend/src/infrastructure/eigenschutz/event-adapters/index.ts` — Re-Export Aktualisiert-Adapter.
- `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts` — Adapter als Provider + Export.
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — Aktualisiert-Adapter als Provider.
- `packages/backend/src/infrastructure/events/adapters/index.ts` — Re-Export Slug-Proxy.
- `packages/backend/src/infrastructure/outbox/event-serializer.ts` — `case` + `serializeGefaehrdungsbeurteilungAktualisiert`.
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — Map-Eintrag + `deserializeGefaehrdungsbeurteilungAktualisiert`.
- `packages/backend/src/infrastructure/outbox/__tests__/event-deserializer.spec.ts` — Count 113 → 114 + neuer `toContain`-Check.
- `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` — Erwartung auf `4/4` für AKTUALISIERT erweitert.
- `packages/backend/src/__tests__/architecture-rules.spec.ts` — `'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` aus `knownMissingEvents` entfernt.

_Backend Modules:_

- `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` — `updateItems`-Endpoint mit 4-Guard-Kette, Error-Mapping für 409 + 404 + 422.
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.spec.ts` — 7 neue Tests (Happy-Path, 409, 404, 422-ItemValidation, 422-InvalidCommand, Guard-Chain, Decorator-Metadata).

_Frontend:_

- `packages/frontend/src/features/eigenschutz/api/queries.ts` — `useGefaehrdungsbeurteilung` + `useUpdateGefaehrdungsbeurteilungItems` (inkl. Optimistic-Update + Rollback, `meta: { silentError: true }` für Zero-Toast-Policy).
- `packages/frontend/src/provider/query-client.provider.tsx` — `MutationCache.onError` respektiert `mutation.meta.silentError` (Advisor-Patch: war vorher pauschal Toast, jetzt symmetrisch zur `QueryCache`).
- `packages/frontend/src/features/eigenschutz/api/__tests__/vorlagen-hooks.spec.tsx` — 7 neue Tests für beide neue Hooks.
- `packages/frontend/src/features/eigenschutz/schemas/gefaehrdungsbeurteilung.schema.ts` — `updateGefaehrdungsbeurteilungItemsSchema` + `updateGefaehrdungsbeurteilungItemsFormSchema` + Types.
- `packages/frontend/src/features/eigenschutz/index.ts` — Barrel-Exports für die 2 Hooks + 4 UI-Komponenten.
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id.tsx` — Stub durch `GefaehrdungenDetailPage` ersetzt.
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/gefaehrdungen.route.spec.tsx` — Route-Mount-Test auf neue Page umgestellt.

_Shared:_

- `packages/shared/src/index.ts` — `utils/`-Re-Export ergänzt.

_Re-Generated (automatisch, nicht manuell editieren):_

- `packages/shared/client/apis/EigenschutzApi.ts` — neue Methode `gefaehrdungsbeurteilungControllerUpdateItemsVAlpha`.
- `packages/shared/client/models/UpdateGefaehrdungsbeurteilungItemsDto.ts`
- `packages/shared/client/models/GefaehrdungItemInputDto.ts`
- `packages/shared/client/models/index.ts` + weitere Response-Wrapper-Dateien.
- `packages/shared/client/.openapi-generator/FILES`

### Review Findings

**Review-Datum:** 2026-04-23 · **Reviewer:** Claude Opus 4.7 (Adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor) · **Diff-Scope:** 72 Files / +5940/−95

#### Decision-Needed (2)

- [x] [Review][Decision] **AC10 `SeverityBanner`-Komponente fehlt** — Der Konflikt-Banner im `GefaehrdungenEditorOrganism` ist als `<div role="alert" aria-live="assertive">` mit amber-Styling umgesetzt (Completion-Notes Punkt 12). AC10 verlangt verbatim `SeverityBanner variant="warning"`. Keine `SeverityBanner`-Komponente im Repo; Story-3.3-TODO-Kommentar referenziert sie. **Entscheidung:** jetzt minimale `SeverityBanner` als Shared-UI bauen (löst auch Story-3.3-Debt) oder Fallback behalten und Story 3.3 abwarten.
- [x] [Review][Decision] **Event-Adapter loggt PII (`userId` + `einheitId` + `einsatzId`) ohne Redaction** — `gefaehrdungsbeurteilung-{erstellt,aktualisiert}.adapter.ts`. DSGVO-relevant: die Kombination ist personenbeziehbar, ohne Retention-Policy landet sie in ELK/Datadog-Logs. **Entscheidung:** PII-Redaction jetzt als Teil von 2.2 (z. B. gehashte IDs oder explizites `audit`-Feld) oder separate übergreifende DSGVO-PR.

#### Patch (16)

**🔴 Blocker (2)**

- [x] [Review][Patch] **Mapper setzt Version via `create()` → hardcoded `_version = 1`** [`packages/backend/src/infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts:26-34` ↔ `gefaehrdungsbeurteilung.aggregate.ts:93`] — `PrismaGefaehrdungsbeurteilungMapper.toDomain` ruft `Gefaehrdungsbeurteilung.create(...)` — die Factory setzt `_version = 1` hartcodiert. `row.version` aus Prisma wird **ignoriert**. Folge: Jeder zweite Update-Request gegen dieselbe Beurteilung sieht `aggregate.version === 1`, der 409-Check triggert fälschlich → jedes Update nach dem ersten liefert 409. Fix: eigene `reconstitute({...props, version})`-Factory im Aggregate, die vom Mapper genutzt wird (und `domainEvents` nicht emittiert).
- [x] [Review][Patch] **Prisma-`update` ohne `WHERE version = aggregate.version - 1` — DB-seitige Lost-Update-Lücke** [`prisma-gefaehrdungsbeurteilung.repository.ts:122-141`] — Aggregate-Check ist in-memory; zwei parallele TXs lesen beide Version 1, beide passen den Aggregate-Check (getrennte Instanzen), beide schreiben Version 2. Fix: `updateMany({ where: { id, version: expectedVersion }, data: { ..., version: aggregate.version } })` + Count-Check → wenn 0, `Result.fail(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)`.

**🟠 High (5)**

- [x] [Review][Patch] **Controller-Catch-All 422 verdeckt Infrastruktur-Fehler** [`gefaehrdungsbeurteilung.controller.ts:mapUpdateItemsError`] — DB-Ausfälle / Prisma-Errors / Transaktions-Fehler fallen in den letzten `UnprocessableEntityException(rule: 'ItemValidation')`. Monitoring sieht keine 500er. Fix: Whitelist-Mapping auf bekannte Sentinels (`ConflictDetected:`, `NotFound:`, `BusinessRule:`); alles andere → `InternalServerErrorException` + strukturierter Log.
- [x] [Review][Patch] **`computeItemsDiff`: Duplikat-IDs + keine Content-Diff-Semantik** [`gefaehrdungsbeurteilung.aggregate.ts:159-182`] — `newItems = [{id:A}, {id:A}]` → `updated = 2` statt Rejection; Items mit unveränderter ID + identischem Inhalt zählen als `updated`. `changedFields` ist audit-relevant (Event-Payload, Version-Row). Fix: Set-basierte Duplikats-Rejection als `Result.fail('BusinessRule:DuplicateItemId')`; `updated` nur bei Content-Change (optional für Story 2.3 enger spezifizieren).
- [x] [Review][Patch] **Aggregate `updateItems` nimmt externe Referenz + Getter leakt Referenz** [`gefaehrdungsbeurteilung.aggregate.ts:151` + `:114-116`] — `this._items = newItems` hält die vom Handler übergebene Referenz; `get items()` gibt sie zurück (TS-`readonly` schützt nur Compile-Zeit). Ein Handler-/Mapper-Mutationsfehler bricht Aggregate-Kapselung ohne Event. Fix: `this._items = [...newItems]` beim Setzen, `return [...this._items]` im Getter.
- [x] [Review][Patch] **Event-Deserializer: keine Ordnungs-/Bereichs-Validierung** [`event-deserializer.ts:755-783`] — `fromVersion > toVersion`, `NaN`, negative Zahlen, `Infinity` passieren still; `changedFields.{added,removed,updated}` fallen bei invaliden Werten silent auf 0 → korrupte Outbox-Events replay-en als „keine Änderungen". Fix: `Number.isInteger(x) && x >= 0` + `toVersion === fromVersion + 1`, sonst `throw new Error('Invalid event payload')`.
- [x] [Review][Patch] **Handler ohne idempotente P2002-Behandlung bei `saveNewVersion`-Retry** [`update-gefaehrdungsbeurteilung-items.handler.ts:3288-3352`] — `saveNewVersion` wirft bei doppeltem `eventId` (Outbox-Retry nach partiellem Commit) P2002. Handler reicht den Raw-Error durch; der Retry bleibt erfolglos, Event bleibt pending. Fix: In `saveNewVersion`-Repo P2002 auf `eventId`-Unique erkennen → `Result.ok(undefined)` (idempotent), Logger.warn.

**🟡 Medium (6)**

- [x] [Review][Patch] **`GefaehrdungItem.create` vertraut Client-`risikoklasse` bei fehlendem `eintritt` oder `schaden`** [`gefaehrdung-item.vo.ts:1674`] — Backend-Autorität (AC3) greift nur, wenn beide Enums gesetzt. ValidationPipe-Whitelist schützt am HTTP-Layer, aber VO-Contract ist schwächer als AC3 fordert. Fix: `risikoklasse = (eintritt && schaden) ? calculateRisikoklasse(...) : undefined` — nie Client-Wert durchreichen.
- [x] [Review][Patch] **Kein Payload-Size-Limit auf `items`-Array** [`gefaehrdung-item-input.dto.ts:2976-2987` / `update-gefaehrdungsbeurteilung-items.dto.ts`] — 500 Items × ~4 KB ≈ 2 MB Request-Body. Fix: `@ArrayMaxSize(100)` + `@Transform` mit JSON-Size-Budget oder globaler `body-parser`-Limit auf Route-Ebene.
- [x] [Review][Patch] **AC1 `aria-required="true"` am Titel-Input fehlt** [`GefaehrdungItemEditor.tsx:64-78`] — Nur `aria-invalid` gesetzt; visueller `*` im Label reicht für Screenreader nicht. Fix: `aria-required="true"` am `<input id={titleId}>`.
- [x] [Review][Patch] **AC11 Tab-Order: Speichern ↔ Abbrechen vertauscht** [`GefaehrdungenEditorOrganism.tsx:162-186`] — DOM-Order ist `Abbrechen` vor `Speichern`. Spec: „→ Speichern → Abbrechen". Fix: Reihenfolge im JSX tauschen.
- [x] [Review][Patch] **AC1 Progressive-Disclosure-Bedingung fehlerhaft bei `risikoklasse === null`** [`GefaehrdungItemEditor.tsx:83`] — `risikoklasse !== 'GRUEN'` ist `true` für `null` → Textarea ist **initial sichtbar** statt versteckt. Fix: `risikoklasse && risikoklasse !== 'GRUEN' || schutzmassnahmenRevealed || Boolean(value.schutzmassnahmen)`.
- [x] [Review][Patch] **AC12: Konsistenz-Spec zwischen Backend-Duplikat und Shared-Fixture fehlt** [`packages/backend/src/domain/eigenschutz/value-objects/__tests__/risikoklasse-berechnung.spec.ts` vs. `packages/shared/src/utils/eigenschutz/risikoklasse-5x5.fixture.ts`] — ADR-013 dokumentiert Duplikat-Fallback und verweist auf Konsistenz-Spec; Frontend hat sie (`risikoklasse.spec.ts` iteriert Shared-Fixture), Backend testet ausschließlich lokale Fixture. Drift-Fenster. Fix: Backend-Spec zusätzlich gegen importierte `RISIKOMATRIX_5X5_FIXTURE` aus `@bluelight-hub/shared` assertieren (deep-equal auf beide Fixtures).

**🟢 Low (3)**

- [x] [Review][Patch] **`useUpdateGefaehrdungsbeurteilungItems`-Rollback schluckt falsy `previous`** [`queries.ts:1105-1109`] — `if (context?.previous)` rollt bei `null` oder leerem Cache nicht zurück. Fix: `if (context?.previous !== undefined)`.
- [x] [Review][Patch] **`meta.silentError` ist untypisiert** [`query-client.provider.tsx:1162-1171`] — Tippfehler (`silenErr`) fallen silent durch. Fix: `declare module '@tanstack/react-query' { interface Register { queryMeta: { silentError?: boolean }; mutationMeta: { silentError?: boolean } } }`.
- [x] [Review][Patch] **409-Context-Drift zwischen Aggregate-Doku und Controller** [`gefaehrdungsbeurteilung.controller.ts:6126-6134` vs. `gefaehrdungsbeurteilung.aggregate.ts` JSDoc] — Aggregate-JSDoc verspricht `{ currentVersion, attemptedVersion }`; Controller setzt nur `attemptedVersion`. Frontend muss extra GET für Current-Version → Race-Window. Fix: entweder `currentVersion` in 409-Context ergänzen (Sentinel mit Zusatz-Info) ODER JSDoc korrigieren.

#### Defer (5)

- [x] [Review][Defer] **Version-Chain-Timestamp-Ambiguität bei `gueltigBis = gueltigVon`** [`prisma-gefaehrdungsbeurteilung-version.repository.ts:4121-4124`] — deferred; Audit-Query-Semantik fällt erst in Story 2.4 („Vorversionen einsehen") auf. Fix dann: `gueltigBis = args.gueltigVon - 1ms` oder halb-offenes Intervall `[gueltigVon, gueltigBis)` dokumentieren.
- [x] [Review][Defer] **`title.trim()` silent** [`gefaehrdung-item.vo.ts`] — deferred; Trim auf Freitext-Pflichtfeldern ist industrie-üblich und erwartbar. Keine Auditbedenken.
- [x] [Review][Defer] **`null → undefined`-Inkonsistenz Create vs. Update im Frontend** [`queries.ts:1006-1008` vs. `1078-1086`] — deferred; TanStack-Form + Zod-Schema enforcen die Input-Typen aktuell, ein `null`-Durchreichen ist hypothetisch. Cleanup bei nächster Refactor-Runde.
- [x] [Review][Defer] **`fs.readFileSync`-Spy-Leak-Risiko in Registry-Spec** [`eigenschutz-event-registry.spec.ts:597-677`] — deferred; Test-Hygiene, nicht produktions­relevant. Beheben wenn Flake beobachtet wird.
- [x] [Review][Defer] **Retry-Policy hart-codiert axios-Error-Shape** [`queries.ts:919-921`] — deferred; aktueller HTTP-Client ist axios-basiert, Bruch wäre ein Symptom der Migration. Bei Client-Wechsel als Migrations-Check aufnehmen.

#### Dismissed (2)

- Seed-Konsumenten prüfen (Blind Hunter): `titel`/`beschreibung` in `seed.ts` liegen in der **Rolle**-Tabellen-Definition (Zeile 259/265/271/277), nicht im Item-Read-Pfad. Kein residualer Konsument; false positive.
- Count-Progression 112 → 114 (Acceptance Auditor AC7): Sprung von 112 auf 114 lässt 113 aus, ist aber konsistent mit Story-2.1-Debt (ERSTELLT wurde in 2.1 nicht in den Sanity-Check aufgenommen). End-Count 114 ist inhaltlich korrekt. Keine 2.2-Regression.

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Author                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2026-04-22 | Story-Datei angelegt (ready-for-dev). Umfassende Context-Engine-Analyse mit advisor-Review: Scope-Klarstellung 2.2/2.3/2.5, ADR-013 als Vor-Task, Seed-vs-Shared-Zod-Harmonisierung (Story-2.1-Debt), Shared-First-Utility für Risikoklasse + Fallback-Pfad, 4-Stellen-Registry für `gefaehrdungsbeurteilung_aktualisiert`, Character-Count ≥ 80 %, Storybook-Nachzug, `prefers-reduced-motion`-Testbarkeit. Sprint-Status-Übergang: 415-2-2 `backlog → ready-for-dev`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Ruben Vitt (mit Claude Opus 4.7, 1M-Kontext) |
| 2026-04-23 | Story-Implementierung vollständig. Tasks 0–10 umgesetzt: ADR-013 (Nohl-Matrix, Proposed), Shared-Utility + Backend-Duplikat (ESM-Blocker dokumentiert), Enum-Split zur Auflösung eines Circular-Dependency, `updateItems`-Aggregate-Methode + `GefaehrdungsbeurteilungAktualisiertEvent` + 4-Stellen-Registry (114 Deserializer-Events), `UpdateGefaehrdungsbeurteilungItemsCommand` + `TransactionalCommandHandler` mit 409-Sentinel + Version-Chain-Append, Controller-Endpoint mit Guard-Kette + 409/404/422-Mapping, API-Client regeneriert, Frontend-Hooks + Zod-Schemas + UI-Komponenten (`RiskMatrix5x5` mit Roving-Tabindex, `GefaehrdungItemEditor` mit Progressive-Disclosure + Char-Counter, Editor-Organism mit Ctrl/Cmd+S + Konflikt-Banner, Detail-Page). Seed harmonisiert + Integration-Spec aktiviert (AC8). Gates: Backend non-DB 8705/8705 ✅, Eigenschutz-Slice 224/231 (7 Story-2.1-deferred skipped) ✅, Frontend 94/94 ✅, check:arch + check:di:imports + lint ✅. Storybook bewusst deferred (kein Repo-Setup). Sprint-Status-Übergang: 415-2-2 `in-progress → review`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Ruben Vitt (mit Claude Opus 4.7, 1M-Kontext) |
| 2026-04-23 | Code-Review-Patches appliziert (16 Patches + 2 Decisions). **Blocker behoben:** (P1) `Aggregate.reconstitute()` als Read-Factory — Mapper hatte `create()` genutzt und dadurch `_version` hardcoded auf 1 (jeder 2. Update → 409). (P2) `updateItems` DB-seitig mit `WHERE version = expectedPreviousVersion` in `updateMany` + Count-Check — schließt TOCTOU zwischen parallelen TXs. **High:** Controller-Mapping trennt `InfrastructureError:`-Sentinel (500) von Item-Validation (422); `computeItemsDiff` lehnt Duplikat-IDs als `BusinessRule:DuplicateItemId` ab; Aggregate `_items` per Defensive-Copy; Deserializer validiert Version-Ordnung + `changedFields` strikt (keine Silent-0-Fallbacks); `saveNewVersion` fängt P2002 auf `eventId` und liefert `Result.ok` (Outbox-Retry-Idempotenz). **Medium:** VO Backend-Autorität unbedingt (`risikoklasse = undefined` bei fehlender Dimension), Payload-Size auf 100 Items, `aria-required="true"` am Titel, Button-Order Speichern↔Abbrechen (AC11), Progressive-Disclosure bei `risikoklasse===null` versteckt, Backend-Konsistenz-Spec gegen Shared-Fixture. **Low:** Rollback-Bedingung `!== undefined`, `meta.silentError` Type-Augmentation als `tanstack-query.d.ts`, JSDoc des 409-Contracts korrigiert. **Decisions umgesetzt:** (DN1) minimale `SeverityBanner`-Molekül (info/warning/danger) unter `shared/ui/molecules/`, Editor-Organism nutzt sie; (DN2) PII-Redaction `redactId` (SHA-256 trunc) in beiden Event-Adaptern für `userId`/`einheitId`/`einsatzId`. Gates: Backend Eigenschutz-Slice 315/315 ✅, Frontend Eigenschutz-Slice 110/110 ✅, check:di:imports ✅, check:arch ✅, lint ✅. Sprint-Status-Übergang: 415-2-2 `review → done`. | Ruben Vitt (mit Claude Opus 4.7, 1M-Kontext) |
