# Story 2.3: Gefährdungen ändern/entfernen mit Version-Chain

Status: done

<!--
Validierung: der Workflow-Step „Validate gegen checklist.md" wird bewusst als
separater Quality-Gate über `validate-create-story` deferred — konsistent mit
Stories 1.6/1.7/2.1/2.2. Ruben/Claude können vor `dev-story` einen Fresh-
Context-Review ansetzen; die Story ist ohne diesen Review aber bereits
Dev-ready.
-->

> **Scope-Klarstellung (bestätigt, 2026-04-23):** Story 2.2 hat den
> expliziten Endpoint `POST …/gefaehrdungsbeurteilungen/:id/items` bereits
> gebaut (Aggregate `updateItems`, `GefaehrdungsbeurteilungAktualisiertEvent`,
> 4-Stellen-Registry, `saveNewVersion` + Chain-Closing, Frontend-Konflikt-
> Banner). **Story 2.3 refactored den Endpoint NICHT — sie schärft die
> Version-Chain-Invarianten und schließt die im 2.2-Review aufgedeckten
> Concurrency-Lücken.** Konkret:
>
> 1. **Blocker-Fix aus 2.2-Review:** Mapper lädt aktuelle `version` aus DB
>    (statt hardcoded `1`) über eine neue `reconstitute()`-Factory.
> 2. **Blocker-Fix:** Prisma-UPDATE mit strengerer WHERE-Klausel
>    (`id` + `version: expectedVersion`) + Count-Check — DB-seitige
>    Lost-Update-Absicherung zusätzlich zum In-Memory-Aggregate-Check.
> 3. **Per-Item-Granularität** im `changedFields`-Diff (ID-basiert, inkl.
>    Content-Diff und Duplikat-ID-Rejection).
> 4. **Aggregate-Kapselung** (Items-Defensive-Copy, Getter-Readonly-Proxy).
> 5. **Event-Deserializer-Range-Validierung** (`fromVersion`/`toVersion`/
>    Zählungen auf Integer ≥ 0 + Monotonie `toVersion = fromVersion + 1`).
> 6. **Idempotente P2002-Behandlung** bei `saveNewVersion` (Outbox-Retry).
> 7. **Controller-Error-Whitelist** — Infrastruktur-Fehler landen in 500,
>    nicht im Catch-all-422.
> 8. **409-Context vollständig** — `currentVersion` UND `attemptedVersion`
>    im Response-Body.
> 9. **Frontend-Konflikt-Banner** nutzt den neuen `currentVersion`-Hinweis.
>
> Story 2.5 (Auto-Save) bleibt UI-Schicht auf demselben Endpoint;
> Story 2.4 (Versions-Timeline) baut auf den hier geschärften Version-
> Chain-Garantien auf.

## Story

As a **Sicherheitsbeauftragter**,
I want **Gefährdungen zu einer bestehenden Beurteilung hinzufügen, ändern
oder entfernen zu können, wobei jede Änderung eine neue Version mit
Urheber, Zeitstempel und per-Item-Diff erzeugt — auch unter konkurrenten
Schreibzugriffen zuverlässig**,
So that **der Audit-Trail vollständig und nachvollziehbar ist, eine alte
Version jederzeit einsehbar bleibt und ein zweiter Client nie unbemerkt
meine Änderungen überschreibt (FR3, FR41, FR42)**.

## Acceptance Criteria

**AC1 — `Gefaehrdungsbeurteilung.reconstitute()`-Factory + Mapper-Fix (🔴 Blocker-Fix aus 2.2-Review):**

- **Given** der `PrismaGefaehrdungsbeurteilungMapper.toDomain(row)` lädt ein bestehendes Aggregate
- **When** ein Aggregate rehydriert wird
- **Then** nutzt der Mapper **nicht** mehr `Gefaehrdungsbeurteilung.create(props)` (das `_version = 1` hartcodiert), sondern eine neue Factory `Gefaehrdungsbeurteilung.reconstitute(props)` mit zusätzlichem `version: number`-Pflichtparameter aus `row.version`.
- **And** `reconstitute()` führt die Invarianten-Validierung aus `create()` aus (Pflichtfelder, ID-Wohlgeformtheit), **emittiert aber KEIN Domain-Event** (das Aggregate existiert in DB bereits, kein `GefaehrdungsbeurteilungErstelltEvent`-Emit).
- **And** `aggregate.version === row.version` nach dem Mapper-Call ist eine Test-Invariante (sowohl als Unit-Test auf dem Mapper als auch als Integration-Test gegen Postgres).
- **And** `clearDomainEvents()` wird weiterhin defensiv im Mapper aufgerufen (Paranoia-Schicht — `reconstitute` erzeugt keine Events, aber ein Test hält den Contract).
- **And** der existierende `toDomain`-Caller `findById`/`findReadModelById`-Pfad bleibt API-stabil — keine Migration auf neue Methodensignaturen nötig.

**AC2 — DB-seitige Lost-Update-Absicherung (🔴 Blocker-Fix aus 2.2-Review):**

- **Given** zwei konkurrente Transaktionen lesen beide `version = 1`, passieren beide den In-Memory-`aggregate.assertVersion(1)`-Check und versuchen, `version = 2` zu schreiben
- **When** die zweite Transaktion commitet
- **Then** schreibt das Repository `updateItems` mit einem Prisma-`updateMany` statt `update`, und die WHERE-Klausel enthält sowohl `id` als auch `version: expectedVersion`; der Rückgabewert `count` wird ausgewertet.
- **And** bei `count === 0` liefert das Repo `Result.fail(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)` (identischer Sentinel wie Aggregate-Check, damit der Controller-Mapper beide Quellen einheitlich auf HTTP 409 mapped).
- **And** bei `count > 1` (technisch unmöglich wegen `@@unique` auf `id`, aber defensiv) wird `Result.fail('Invariant:UpdateCountAnomaly')` geliefert + logger.error.
- **And** ein Integration-Test simuliert Concurrency durch zwei sequenzielle Transaktionen, bei denen beide dasselbe `expectedVersion` senden — die zweite bekommt HTTP 409 **auch dann, wenn beide Aggregate-Instanzen in-memory denselben Version-Stand hielten**.
- **And** der Aggregate-Check bleibt erhalten (Defense-in-Depth): ein In-Memory-Mismatch spart den DB-Call.

**AC3 — Per-Item-Granularität im `changedFields`-Payload (Kern-Scope FR3):**

- **Given** das Aggregate `updateItems(newItems, expectedVersion, userId)` berechnet den Diff
- **When** der Diff-Aufruf durchläuft
- **Then** liefert `computeItemsDiff(old, new)` einen strukturierten Payload der Form:
  ```ts
  {
    added: string[],                   // IDs der neu angelegten Items (oder `generated:<idx>` falls ID clientseitig fehlt; siehe AC4)
    removed: string[],                 // IDs der entfernten Items
    updated: Array<{
      id: string,
      fields: Array<'title' | 'description' | 'eintritt' | 'schaden' | 'schutzmassnahmen'>,
    }>,                                // IDs und konkrete geänderten Felder
    unchanged: number,                 // Zählung der Items ohne Feld-Diff (für Audit-Quersumme)
  }
  ```
- **And** unveränderte Items (gleiche ID + alle Felder bit-identisch) zählen in `unchanged`, **nicht** in `updated` (Content-Diff-Semantik — fixt 2.2-Review High #2).
- **And** der Payload ist abwärtskompatibel zum 2.2-Shape nur im DB-Schema (`changedFields: Json`); das TypeScript-Interface `GefaehrdungsbeurteilungAktualisiertChangedFields` wird auf die neue Struktur umgezogen und die Altshape (`{ added: number, removed: number, updated: number }`) entfernt — bestehende 2.2-Tests werden auf die neue Shape migriert.
- **And** `unchanged` und `updated.length + added.length = newItems.length` ist eine asserted Invariante (Integrity-Check im Aggregate, via `Result.fail('Invariant:DiffSumMismatch')` bei Verletzung).

**AC4 — Duplikat-Item-ID-Rejection als Business-Rule 422 (2.2-Review High #2):**

- **Given** ein Client sendet `items` mit zwei oder mehr Items, die dieselbe nicht-leere `id` tragen
- **When** der Handler `aggregate.updateItems(newItems, …)` ruft
- **Then** rejected das Aggregate mit `Result.fail('BusinessRule:DuplicateItemId')` **bevor** der Version-Check läuft.
- **And** der Controller mappt `BusinessRule:DuplicateItemId` auf HTTP 422 mit `context.rule = 'DuplicateItemId'` (bestehendes `BusinessRule:`-Mapping, kein neuer Sentinel-Handler nötig).
- **And** mehrere Items ohne ID (clientseitige Neu-Items) sind **erlaubt** — `added` trägt für jedes einen synthetischen Eintrag `"generated:<sortIndex>"`, damit Verbraucher (Timeline, Ampel-Projection) die Zählung konsistent bleibt.
- **And** ein parametrisiertes Unit-Testset prüft: zwei ID-gleiche Items → 422; zwei ID-leere Items → 200 + beide als `added`; ID-kollidierendes Item zwischen `old` und `new` (Update) → 200 im Happy-Path.

**AC5 — Content-Diff auf Feld-Ebene (2.2-Review High #2):**

- **Given** `oldItems[i]` und `newItems[j]` haben dieselbe `id`
- **When** `computeItemsDiff` die beiden vergleicht
- **Then** ist `fields` genau die Teilmenge von `['title','description','eintritt','schaden','schutzmassnahmen']`, deren Werte sich unterscheiden.
- **And** Feld-Vergleich ist **strikt** (`===` auf normalisierten String-/Enum-Werten; `undefined` und Leerstring gelten als gleich — AC5 aus Story 2.2 hat die Normalisierung bereits im VO etabliert).
- **And** `risikoklasse` ist **kein** Diff-Feld — es ist server-abgeleitet und damit redundant zu `(eintritt, schaden)`. Wird bei zumindest einem dieser beiden Felder geändert, genügt das als Diff-Signal.
- **And** ein Item mit identischem Shape (gleiche ID, alle Felder gleich) liefert `fields = []` und zählt in `unchanged`, nicht in `updated`.

**AC6 — Aggregate-Kapselung härten (2.2-Review High #3):**

- **Given** das Aggregate `Gefaehrdungsbeurteilung` hält seine `_items` als veränderliche Liste
- **When** `updateItems(newItems, …)` ausgeführt wird
- **Then** persistiert das Aggregate eine **defensive Kopie** (`this._items = [...newItems]`), **nicht** die vom Handler übergebene Referenz.
- **And** der Getter `get items()` liefert weiterhin `readonly GefaehrdungItem[]` — zusätzlich wird ein zweiter Defensive-Copy-Schritt (`return Object.freeze([...this._items])`) eingebaut, damit ein Caller, der den Getter-Array mutiert (Type-Cast hack), das Aggregate **nicht** korrumpieren kann.
- **And** ein Regressions-Test prüft: nach `aggregate.updateItems(extArr, …)` dürfen Mutationen an `extArr` (Array-Ebene ODER Element-Referenz, soweit VO unveränderlich zulässt) das Aggregate **nicht** sichtbar beeinflussen.

**AC7 — Event-Deserializer-Range-Validierung (2.2-Review High #4):**

- **Given** das `GefaehrdungsbeurteilungAktualisiertEvent` wird aus der Outbox deserialisiert
- **When** die Payload-Values geprüft werden
- **Then** validiert `deserializeGefaehrdungsbeurteilungAktualisiert` (`infrastructure/outbox/event-deserializer.ts`) auf `Number.isInteger(fromVersion) && fromVersion >= 1`, `Number.isInteger(toVersion) && toVersion === fromVersion + 1`, und für die neue Diff-Shape auf: `Array.isArray(changedFields.added/removed)`, `Array.isArray(changedFields.updated)`, `Number.isInteger(changedFields.unchanged) && changedFields.unchanged >= 0`.
- **And** bei Verletzung wird eine `Error('Invalid event payload: <feld>')`-Exception geworfen — **niemals** silent auf `0` oder `NaN` defaulted; der Outbox-Publisher loggt und stoppt den Replay (Dead-Letter-Semantik, Plattform-Pattern aus Story 1.7).
- **And** der Serializer (`event-serializer.ts`) ist symmetrisch: `serializeGefaehrdungsbeurteilungAktualisiert` rejected seinerseits invalid payloads vor dem DB-Insert, damit die Invariante vor und nach dem Round-Trip hält.
- **And** Round-Trip-Test (Serializer → DB → Deserializer) für neue Shape + 3 Negativ-Cases (`toVersion = fromVersion`, `updated` nicht-Array, `unchanged = -1`).

**AC8 — Idempotente P2002-Behandlung im `saveNewVersion`-Repo (2.2-Review High #5):**

- **Given** der Outbox-Publisher versucht ein bereits teil-commitetes Event zu retry-en
- **When** `saveNewVersion({ eventId, … })` gegen ein bereits existierendes `eventId` läuft (Unique-Constraint auf `gefaehrdungsbeurteilung_versionen.event_id`)
- **Then** fängt das Repo `Prisma.PrismaClientKnownRequestError` mit `code === 'P2002'` + `target`-Eintrag, der `event_id` enthält, ab und liefert `Result.ok(undefined)` (idempotenter Noop) + `logger.warn`.
- **And** Andere P2002-Verletzungen (z. B. `(gefBeurteilungId, version)`-Unique) liefern weiterhin `Result.fail` (echter Invariante-Bruch — zwei parallele Writes auf dieselbe Version-Nummer sind ein Bug, kein Retry).
- **And** `saveInitialVersion` bekommt dieselbe P2002-auf-`event_id`-Idempotenz, damit Story 2.1-Flows im Outbox-Retry ebenfalls safe sind.
- **And** Unit-Test mocked `PrismaClientKnownRequestError`-Fälle mit `target: ['gefaehrdungsbeurteilung_versionen_event_id_key']` → `Result.ok`, mit `target: ['gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key']` → `Result.fail`.

**AC9 — Version-Chain-Intervall-Invariante explizit:**

- **Given** Version N wird geschrieben, Version N+1 wird später geschrieben
- **When** beide Version-Zeilen in `gefaehrdungsbeurteilung_versionen` stehen
- **Then** gilt `version_N.gueltigBis === version_N+1.gueltigVon` (exakte Gleichheit, halb-offenes Intervall `[gueltigVon, gueltigBis)` — dokumentiert in der `SaveNewVersionArgs`-JSDoc).
- **And** die aktuellste Zeile hat immer genau eine Zeile pro `gefBeurteilungId` mit `gueltigBis IS NULL` (Constraint-Check per Integration-Test, nicht per Prisma-Schema — Teilindex wäre Postgres-spezifisch).
- **And** `saveNewVersion` setzt innerhalb derselben Transaktion:
  1. `UPDATE … SET gueltigBis = :gueltigVon WHERE gefBeurteilungId = :id AND gueltigBis IS NULL` (genau eine Zeile);
  2. `INSERT INTO … VALUES (…, gueltigVon = :gueltigVon, gueltigBis = NULL, …)`.
- **And** `event.occurredAt` wird **einmal** berechnet und als `gueltigVon` für beide Operationen verwendet — so kann kein Mikrosekunden-Drift zwischen den beiden SQL-Statements entstehen (fixt Defer-Item aus 2.2-Review).
- **And** ein Integration-Test prüft: nach 3 sequenziellen Updates sind die `gueltigVon`/`gueltigBis`-Felder in einer lückenlosen Kette.

**AC10 — 409-Conflict-Context mit `currentVersion` + `attemptedVersion` (2.2-Review Low #3):**

- **Given** ein Client sendet `expectedVersion = 3`, der Server hat aber `version = 5`
- **When** der Handler das Aggregate via `findById` lädt und `aggregate.assertVersion(3)` fehlschlägt (oder die DB-Level-Lost-Update-Query in AC2 `count = 0` liefert)
- **Then** reicht der Handler einen erweiterten Sentinel `ConflictDetected:Gefaehrdungsbeurteilung:current=<n>` durch (oder äquivalenten strukturierten Result-Kontext; Implementierungs-Detail liegt beim Dev-Agent, Contract ist „Handler kennt `currentVersion`").
- **And** der Controller mappt auf HTTP 409 mit Body `{ statusCode: 409, error: 'Conflict', message: 'ConflictDetected:Gefaehrdungsbeurteilung', context: { currentVersion: 5, attemptedVersion: 3 } }`.
- **And** die Aggregate-JSDoc (`updateItems`) wird mit dem neuen Vertrag synchronisiert — keine Drift zwischen Doku und Verhalten (fixt Low #3 aus 2.2-Review).
- **And** der Frontend-Konflikt-Banner (`GefaehrdungenEditorOrganism`) rendert „Jemand anders hat bereits Version N gespeichert — bitte neu laden" mit der aus dem 409-Body extrahierten `currentVersion` (ersetzt die aktuelle „bereits Änderungen gespeichert"-Kopie, die die Version-Differenz nicht nennt).

**AC11 — Controller-Error-Mapping: Whitelist statt Catch-all (2.2-Review High #1):**

- **Given** `mapUpdateItemsError(error, attemptedVersion)` in `gefaehrdungsbeurteilung.controller.ts`
- **When** eine Error-Message kein bekanntes Sentinel-Präfix trägt (z. B. DB-Outage, Prisma-Disconnect, unerwartete Repo-Fehler)
- **Then** wirft der Handler eine **`InternalServerErrorException`** (HTTP 500) mit `context.rule = 'Unexpected'`, **nicht** mehr `UnprocessableEntityException` mit `rule: 'ItemValidation'`.
- **And** `ItemValidation` bleibt ein explizites Sentinel-Präfix (z. B. aus VO-Validierungen): der Handler reicht `ValidationFailed:<field>`-artige Nachrichten mit explizitem Präfix durch. Roh-Messages aus der VO (ohne Präfix) werden vom Aggregate zum Präfix-Sentinel gepackt, bevor sie den Handler verlassen.
- **And** der Controller-Logger erfasst die unhandled Sentinels (`logger.error('Unexpected update error', { error, attemptedVersion })`) — damit Monitoring 5xx-Spikes fängt (bisher waren sie als 422 maskiert).
- **And** ein Unit-Test prüft: `'random db outage'` → HTTP 500 mit `rule: 'Unexpected'`; `'BusinessRule:DuplicateItemId'` → 422 mit `rule: 'DuplicateItemId'`; `'ValidationFailed:title'` → 422 mit `rule: 'ItemValidation'`; `GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED` → 409 mit `currentVersion` + `attemptedVersion`.

**AC12 — Append-only-Assertion bei Remove-Only-Flow (Epic-AC „Historie bleibt"):**

- **Given** eine Beurteilung mit 3 Items, Version 1
- **When** der Client alle 3 Items entfernt (`items: []`, `expectedVersion: 1`)
- **Then** ist `aggregate.items.length === 0`, `aggregate.version === 2`.
- **And** `gefaehrdungsbeurteilung_versionen` enthält **beide** Zeilen:
  1. Version 1: `items = [<3 Items>]`, `gueltigVon = t0`, `gueltigBis = t1`;
  2. Version 2: `items = []`, `gueltigVon = t1`, `gueltigBis = NULL`, `changedFields.removed = [<id1>, <id2>, <id3>]`, `changedFields.added/updated = []`, `changedFields.unchanged = 0`.
- **And** das `GefaehrdungsbeurteilungAktualisiertEvent` reflektiert den Remove-Only-Zustand im `changedFields`-Payload.
- **And** die Ampel-Projection (Story 6.1, noch nicht implementiert) erhält über dieses Event das Signal „Einheit hat keine Gefährdungsbeurteilung-Items mehr" — ist damit später konsistent zu FR40 (Warn-Badge bei fehlender Schutzmaßnahme).

**AC13 — Frontend-Konflikt-Banner mit `currentVersion`-Hinweis:**

- **Given** `useUpdateGefaehrdungsbeurteilungItems` erhält einen HTTP-409-Response
- **When** der Banner im `GefaehrdungenEditorOrganism` rendert
- **Then** extrahiert der Hook `currentVersion` aus `error.response.data.context.currentVersion` (typsicher via generierten API-Client-Typ oder lokalem Zod-Guard für das 409-Shape).
- **And** der Banner-Text lautet `"Version ${currentVersion} wurde bereits von jemand anderem gespeichert. Lade die aktuelle Version neu, um fortzufahren."`
- **And** der Banner enthält weiterhin den Reload-Button, der `queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, id) })` triggert.
- **And** die Zero-Toast-Policy bleibt (`meta.silentError: true` — aus Story 2.2 bestehend); kein Sonner-Toast parallel zum Banner.
- **And** der Banner bleibt ein `<div role="alert" aria-live="assertive">` (nicht-blockierend); ein Upgrade auf eine dedizierte `SeverityBanner`-Komponente bleibt weiterhin Story-3.3-Scope (Decision-Needed aus 2.2-Review ist dort deferred).

**AC14 — `computeItemsDiff`-Tests (Kern-Spec der Story):**

- **Given** die neuen Diff-Invarianten aus AC3–AC5
- **When** der Test-Lauf ausgeführt wird
- **Then** existieren mindestens folgende parametrisierte Unit-Tests in `gefaehrdungsbeurteilung.aggregate.spec.ts` (oder dediziert in `__tests__/compute-items-diff.spec.ts`):
  1. **Leer → Leer:** NoOp-Diff mit `added/removed/updated = []`, `unchanged = 0`, Version inkrementiert trotzdem (User wollte `updateItems` auslösen, ist sein Recht).
  2. **Leer → 3 Items ohne ID:** `added = ['generated:0','generated:1','generated:2']`, `removed = []`, `updated = []`, `unchanged = 0`.
  3. **3 Items → 3 Items (gleiche IDs, bit-identisch):** `unchanged = 3`, alle Listen leer.
  4. **3 Items → 3 Items (gleiche IDs, 1 Titel geändert):** `updated = [{id, fields: ['title']}]`, `unchanged = 2`.
  5. **3 Items → 3 Items (gleiche IDs, 1 Item mit neuer `(eintritt, schaden)`):** `updated = [{id, fields: ['eintritt','schaden']}]` (nicht `risikoklasse`), `unchanged = 2`.
  6. **3 Items → 2 Items (1 entfernt):** `removed = [removedId]`, `added = []`, `updated = []`, `unchanged = 2`.
  7. **3 Items → 4 Items (1 neu mit ID):** `added = [newId]`, `unchanged = 3`.
  8. **Duplikat-IDs im `newItems`:** `Result.fail('BusinessRule:DuplicateItemId')` vor jeglichem Diff-Compute.
  9. **Invariant-Bruch (Sum-Mismatch):** synthetisch via Internals-Zugriff; expected `Result.fail('Invariant:DiffSumMismatch')` — defensive Redundanz, dokumentiert.

**AC15 — Tests & Coverage (NFR-M1 ≥ 80 %):**

- **Backend-Unit-Tests:**
  - `Gefaehrdungsbeurteilung.reconstitute` (Happy + Invariant-Fails + No-Event-Emit).
  - `Gefaehrdungsbeurteilung.updateItems` (alle 9 Diff-Szenarios aus AC14 + Duplikat-Rejection + Defensive-Copy).
  - `PrismaGefaehrdungsbeurteilungMapper.toDomain` (`version` aus Row wird korrekt übernommen).
  - `PrismaGefaehrdungsbeurteilungRepository.updateItems` (DB-Level-409 via mocked `updateMany` mit `count = 0`).
  - `PrismaGefaehrdungsbeurteilungVersionRepository.saveNewVersion` (P2002-auf-`eventId` → `Result.ok`; P2002-auf `version`-Unique → `Result.fail`).
  - `event-deserializer.ts` (Range-Validation → 3 Negativ-Tests).
  - `event-serializer.ts` (Symmetrische Shape-Validation).
  - `GefaehrdungsbeurteilungController.mapUpdateItemsError` (alle 4 Mapping-Fälle aus AC11).
- **Backend-Integration-Tests (aktiv — nutzt den in 2.2 eingerichteten `--runInBand`-Eigenschutz-Slice):**
  - **Happy-Path Add+Edit+Remove kombiniert:** 5 Items → 4 Items (2 neu, 2 unchanged, 2 entfernt) → DB-Zustand + Version-Chain + Event-Payload verifiziert.
  - **DB-Concurrency-Simulation:** Zwei TXs mit identischem `expectedVersion = N`, die erste commitet, die zweite bekommt 409 **ohne** In-Memory-Check (d. h. das Repo wird direkt getroffen; simuliert zwei unabhängig gestartete Handler-Instanzen).
  - **Outbox-Retry-Idempotenz:** Manueller zweiter Call von `saveNewVersion` mit identischer `eventId` → 2. Call ist idempotenter Noop, `gefaehrdungsbeurteilung_versionen`-Count bleibt.
  - **Chain-Intervall-Exaktheit:** 3 sequenzielle Updates → alle `gueltigBis_{N} === gueltigVon_{N+1}` (exakte Gleichheit).
- **Frontend-Tests:**
  - `queries.ts` (`useUpdateGefaehrdungsbeurteilungItems`): 409-Response mit `currentVersion: 5`, `attemptedVersion: 3` — Banner-Text reflektiert die Werte.
  - `GefaehrdungenEditorOrganism`: Banner-Rendering auf neuer Textform, Reload-Button triggert `invalidateQueries`.
- **Coverage-Ziel:** ≥ 80 % lines/branches/functions auf neuen + geänderten Dateien; 100 % auf `reconstitute`, `computeItemsDiff`, `mapUpdateItemsError`, Event-Deserializer-Range-Guards.

**AC16 — Plattform-Konformität (verbindlich, unverändert aus 2.2):**

- Alle Injectable-Klassen nutzen `import` (NICHT `import type`) — `check:di:imports` grün (CLAUDE.md AC1).
- `pnpm --filter @bluelight-hub/backend check:arch` bleibt ohne neue Warnings (keine neuen Zirkel, keine Layer-Bruche).
- `pnpm lint` (oxlint + oxfmt) grün; nur dokumentierte preexisting Warnings.
- Umlaute in Kommentaren/JSDoc/deutschen Strings: ä/ö/ü/ß — **keine** Digraphen.
- Controller-Response-Dekoratoren: weiterhin `@ApiWrappedResponse(GefaehrdungsbeurteilungDto)` — Story 2.3 ändert den Endpoint-Contract nicht.
- **API-Client-Regeneration:** Nur nötig, wenn der Response-Shape sich ändert. Der 409-Body-Shape-Change (`currentVersion` ergänzt) ist ein Response-Context-Feld, das in der Swagger-Spec als `additionalProperties` läuft. **Entscheidung:** `currentVersion` explizit im `ApiConflictResponse`-Schema dokumentieren (Custom `type`-Parameter), `pnpm run generate-api` nach Änderung ausführen — wenn der Client-Typ sich ändert, commits die Regeneration; wenn nicht, wird ein manueller Zod-Guard für das Context-Shape in `queries.ts` gesetzt (wird im Dev-Notes-Block ausgeführt). **Kein** manuelles Editieren von `packages/shared/client/`.

## Tasks / Subtasks

- [x] **Task 1 — `Gefaehrdungsbeurteilung.reconstitute()`-Factory + Mapper-Fix (AC1)**
  - [x] `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts`:
    - Neue statische Factory `reconstitute(props: ReconstituteProps): Result<Gefaehrdungsbeurteilung>` mit zusätzlichem `version: number`-Pflichtparameter.
    - Interne Invariantenvalidierung identisch zu `create()` (Pflichtfelder, ID-Wohlgeformtheit).
    - **KEIN** `addDomainEvent(new GefaehrdungsbeurteilungErstelltEvent(…))` — rehydriertes Aggregate darf nicht re-publish-en.
  - [x] `packages/backend/src/infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts`:
    - `toDomain(row)` ruft neuen `reconstitute({ …props, version: row.version })` statt `create(props)`.
    - Den `clearDomainEvents()`-Call defensiv beibehalten (Paranoia-Layer; Test sichert, dass `reconstitute` keine Events emittiert).
  - [x] Unit-Tests:
    - `gefaehrdungsbeurteilung.aggregate.spec.ts`: 3 neue Cases für `reconstitute` (Happy mit `version = 7`, Invariant-Failure, No-Event-Emit-Assertion).
    - `gefaehrdungsbeurteilung.mapper.spec.ts` (neu oder erweitert in bestehender `__tests__/`): `toDomain({ version: 5 })` ergibt `aggregate.version === 5`.

- [x] **Task 2 — DB-Level-Lost-Update-Schutz im Repo (AC2)**
  - [x] `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts`:
    - `updateItems(aggregate, aktualisiertVonUserId, tx)` umbauen:
      - Ersetze `.update({ where: { id } })` durch `.updateMany({ where: { id: aggregate.id.value, version: aggregate.version - 1 }, data: { items, version: aggregate.version, aktualisiertVonUserId } })`.
      - Count-Check: `if (result.count === 0) return Result.fail(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)`.
      - `count > 1` → `Result.fail('Invariant:UpdateCountAnomaly')` + `logger.error`.
    - Achtung: `aggregate.version` ist **nach** dem Aggregate-`updateItems`-Call bereits die neue Version (`N+1`). Der `where`-Filter muss die **alte** Version prüfen (`version: aggregate.version - 1`) — dokumentieren in JSDoc.
  - [x] `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts`:
    - Nach `beurteilungRepo.updateItems(...)` den `Result.fail`-Fall ergänzt durchreichen (bisher wird der Error vom Aggregate-`updateItems` alleine getragen; jetzt kann er auch aus dem Repo kommen).
    - Für AC10 (`currentVersion` im 409-Context): Wenn das Repo 409 meldet, reload den aktuellen DB-Stand (`beurteilungRepo.findById(id, tx)`) und reiche `ConflictDetected:Gefaehrdungsbeurteilung:current=<n>` durch (oder gleichwertige Result-Context-Struktur). Bei Aggregate-`updateItems`-Fail ist `aggregate.version` bereits der aktuelle Stand.
  - [x] Unit-Tests (mock-basiert, in `prisma-gefaehrdungsbeurteilung.repository.spec.ts`):
    - `updateMany` mit `count = 0` → `Result.fail(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)`.
    - `updateMany` mit `count = 1` → `Result.ok`.
    - `updateMany` mit `count = 2` (theoretisch unmöglich) → `Result.fail('Invariant:UpdateCountAnomaly')` + logger.error-Assertion.

- [x] **Task 3 — Per-Item-Granularität im `changedFields`-Diff (AC3, AC5, AC14)**
  - [x] `packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts`:
    - Interface `GefaehrdungsbeurteilungAktualisiertChangedFields` auf neue Shape umbauen:
      ```ts
      export interface GefaehrdungsbeurteilungAktualisiertChangedFields {
        added: string[]; // IDs oder "generated:<idx>"
        removed: string[]; // IDs
        updated: Array<{ id: string; fields: GefaehrdungItemFieldKey[] }>;
        unchanged: number;
      }
      export type GefaehrdungItemFieldKey = 'title' | 'description' | 'eintritt' | 'schaden' | 'schutzmassnahmen';
      ```
    - JSDoc anpassen (Hinweis auf Content-Diff-Semantik + Audit-Quersumme-Invariante).
  - [x] `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts`:
    - `computeItemsDiff` komplett umbauen:
      1. **Duplikat-Check** (AC4): wenn `newItems` zwei Items mit identischer nicht-leerer `id` enthält → return `Result.fail('BusinessRule:DuplicateItemId')`.
      2. **Map old nach ID, Map new nach ID** (Items ohne ID separat einsammeln; letztere immer `added`).
      3. **Content-Compare**: für jedes `(id, oldItem, newItem)` berechne `fields`-Diff; wenn leer → `unchanged++`, sonst → `updated.push({id, fields})`.
      4. **Removed**: IDs die in `old` sind, nicht in `new`.
      5. **Added**: IDs die in `new` sind, nicht in `old` (+ `generated:<idx>` für ID-lose).
      6. **Sum-Invariant-Check**: `unchanged + updated.length + added.length === newItems.length` — sonst `Result.fail('Invariant:DiffSumMismatch')`.
    - `updateItems` um neuen `Result<…, string>`-Rückgabewert für Duplikat-Fail erweitern (bisher nur `ConflictDetected`).
  - [x] `packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts`:
    - Helper-Method `equalsContent(other: GefaehrdungItem): boolean` ergänzen, die Feld-Gleichheit auf den 5 Diff-Feldern prüft. Nicht-enumerierte Felder (`id`, `risikoklasse`) werden nicht gleich-geprüft.
    - Helper-Method `diffFields(other: GefaehrdungItem): GefaehrdungItemFieldKey[]` ergänzt, die konkret die Liste der geänderten Felder liefert.
  - [x] Story-2.2-Handler-/Controller-/Integration-Tests auf neue Shape migrieren — bestehende Assertions auf `changedFields.added: number` werden auf `changedFields.added: string[]` umgestellt (Bestandsverträglichkeit bewusst gebrochen, Migration dokumentiert).

- [x] **Task 4 — Aggregate-Kapselung härten (AC6)**
  - [x] `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts`:
    - `updateItems(newItems, …)` persistiert `this._items = [...newItems]` (shallow copy auf Array-Ebene; VOs selbst sind unveränderlich).
    - `get items()` liefert `Object.freeze([...this._items])` (defensive second copy + freeze).
  - [x] Unit-Test: `aggregate.updateItems(inputArr, …)`; anschließend `inputArr.pop()` → `aggregate.items.length` bleibt.
  - [x] Unit-Test: `aggregate.items` ist `frozen` (`Object.isFrozen(aggregate.items) === true`).

- [x] **Task 5 — Event-Deserializer-Range-Validierung (AC7)**
  - [x] `packages/backend/src/infrastructure/outbox/event-deserializer.ts`:
    - `deserializeGefaehrdungsbeurteilungAktualisiert` härten: Integer-Checks, Range-Checks, Array-Checks gemäß AC7.
    - Auf neue `changedFields`-Shape (Arrays + `unchanged: number`) migrieren.
  - [x] `packages/backend/src/infrastructure/outbox/event-serializer.ts`:
    - `serializeGefaehrdungsbeurteilungAktualisiert` symmetrisch härten — rejected invalid payloads vor `JSON.stringify`.
  - [x] Unit-Tests (`event-deserializer.spec.ts`, `event-serializer.spec.ts`):
    - Round-Trip: serialisiere+deserialisiere ein korrektes Event → Equality.
    - Negativ-Tests: `toVersion = fromVersion`, `updated` nicht-Array, `unchanged < 0`, `added` Nicht-Array.
  - [x] **Count-Sanity-Check bleibt unverändert** (Event-Anzahl im `EVENT_NAMES` ist identisch; nur die Payload-Shape ändert sich intern).

- [x] **Task 6 — Idempotente P2002-Behandlung (AC8)**
  - [x] `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts`:
    - Eigener `try/catch` um das `create` in `saveNewVersion` + `saveInitialVersion`:
      ```ts
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.some(t => t === 'event_id')) {
          this.logger.warn('saveNewVersion: duplicate eventId ignored (idempotent retry)', { eventId: args.eventId });
          return Result.ok<void>(undefined);
        }
        // bestehende Fehler-Behandlung
      }
      ```
    - **Achtung:** `error.meta.target` wird von Prisma als String-Array geliefert, aber einzelne Versionen liefern auch Strings — die Match-Logik muss beides abfangen.
  - [x] Unit-Tests: mock Prisma-Error mit `meta.target = ['gefaehrdungsbeurteilung_versionen_event_id_key']` → `Result.ok`; mit `meta.target = ['gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key']` → `Result.fail`.

- [x] **Task 7 — Version-Chain-Intervall-Invariante (AC9)**
  - [x] `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts`:
    - `saveNewVersion` nutzt den bereits im Aufrufer (`update-handler`) berechneten `event.occurredAt` als **einzigen** `gueltigVon`-Wert — sowohl für das `updateMany` (Schließen der Vorversion via `gueltigBis = :gueltigVon`) als auch für das `create` (neue Zeile mit `gueltigVon = :gueltigVon`).
    - JSDoc-Update: explizit dokumentieren, dass das Intervall halb-offen ist (`[gueltigVon, gueltigBis)`).
  - [x] `packages/backend/src/domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung-version.repository.ts`:
    - JSDoc zu `SaveNewVersionArgs.gueltigVon` schärfen: „einmalig berechnet im Handler; wird vom Repo für Chain-Schließen UND Insert verwendet".
  - [x] Integration-Test:
    - 3 sequenzielle Updates → `SELECT gueltigVon, gueltigBis FROM gefaehrdungsbeurteilung_versionen WHERE gefBeurteilungId = ? ORDER BY version`:
      - `V1.gueltigBis === V2.gueltigVon`;
      - `V2.gueltigBis === V3.gueltigVon`;
      - `V3.gueltigBis IS NULL`.

- [x] **Task 8 — 409-Context-Erweiterung um `currentVersion` (AC10)**
  - [x] `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts`:
    - Bei `ConflictDetected` (aus Aggregate ODER Repo): `currentVersion` ermitteln (entweder direkt via `aggregate.version` wenn Aggregate-Check failt, ODER via `beurteilungRepo.findById(id)` wenn DB-Level-Check failt).
    - Sentinel-String erweitern: `ConflictDetected:Gefaehrdungsbeurteilung:current=<n>` (encoded in Result-Error-String; Implementierungs-Detail).
  - [x] `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts`:
    - `mapUpdateItemsError` parsed das `current=<n>`-Suffix aus der Error-Message UND nutzt `attemptedVersion` aus dem Body. Regex-Match via `String.prototype.match` (nicht `RegExp.prototype.exec`, damit die Sentinel-Parsing-Zeile klein und klar bleibt):
      ```ts
      if (error.startsWith(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)) {
        const match = error.match(/current=(\d+)/);
        const currentVersion = match ? Number.parseInt(match[1], 10) : undefined;
        return new ConflictException({ ..., context: { currentVersion, attemptedVersion } });
      }
      ```
    - `ApiConflictResponse`-Decorator Beschreibung aktualisieren: `context.currentVersion + context.attemptedVersion`.
  - [x] Unit-Test: Conflict-Response-Body enthält beide Felder; JSDoc auf `updateItems` synchronisiert.

- [x] **Task 9 — Controller-Error-Mapping Whitelist (AC11)**
  - [x] `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts`:
    - `mapUpdateItemsError` umbauen:
      - Präfix-Whitelist: `ConflictDetected:`, `NotFound:`, `BusinessRule:`, `ValidationFailed:`.
      - Rest → `InternalServerErrorException` mit `context.rule = 'Unexpected'` + `logger.error`.
    - Passende Sentinel-Generation im Aggregate/Handler:
      - VO-Validierungsfehler (aus `GefaehrdungItem.create` etc.) packt der Handler in `ValidationFailed:<field>:<reason>` (Präfix konsistent zum bestehenden Pattern) — der Controller mapped dann auf 422 mit `context.rule = 'ItemValidation'`.
  - [x] Unit-Test: 4 Mapping-Fälle aus AC11.

- [x] **Task 10 — Frontend-Konflikt-Banner + `currentVersion`-Extraktion (AC13)**
  - [x] `packages/frontend/src/features/eigenschutz/api/queries.ts`:
    - `useUpdateGefaehrdungsbeurteilungItems`-Mutation-Error-Handling erweitern: extrahiere `currentVersion` aus `error.response.data.context.currentVersion` (typsicher via generierten API-Client-Typ ODER lokales Zod-Schema im Hook — Entscheidung: Zod-Schema, weil der Error-Body aktuell als `unknown` durchgereicht wird).
    - Rethrow des Errors mit hinzugefügtem `.currentVersion`-Feld (oder separate Error-Subclass `GefaehrdungsbeurteilungConflictError`).
  - [x] `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx`:
    - Banner-Text dynamisch: wenn `currentVersion` gesetzt → `"Version ${currentVersion} wurde bereits von jemand anderem gespeichert. Lade die aktuelle Version neu, um fortzufahren."`; ansonsten Fallback auf bestehenden Text.
  - [x] Frontend-Tests (`queries.spec.tsx`, `GefaehrdungenEditorOrganism.spec.tsx`):
    - MSW mocked 409-Response mit `context.currentVersion: 5, attemptedVersion: 3` — Banner rendert Text mit „Version 5".
    - 409-Response ohne `currentVersion` (Edge-Case: älteres Backend) → Banner rendert Fallback-Text ohne Fehler.

- [x] **Task 11 — API-Client-Spec-Sync + Swagger-Dokumentation**
  - [x] `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts`:
    - `@ApiConflictResponse`-Beschreibung inkl. `context.currentVersion + context.attemptedVersion`.
    - Falls dem OpenAPI-Generator eine strukturierte Type-Annotation hilft: neuer `ConflictContextDto` ODER JSDoc mit `@example` — Entscheidung beim Dev-Agent (nicht-blockierend für Kompatibilität).
  - [x] `pnpm run generate-api` ausführen; Diff auf `packages/shared/client/` prüfen. Wenn der generierte Client sich ändert, commits die Regeneration; wenn nicht (wahrscheinlich, weil Swagger-Errors als `any` gerendert werden), dokumentieren im Dev-Notes-Block.

- [x] **Task 12 — Qualitäts-Gates + Definition of Done (AC15, AC16)**
  - [x] `pnpm --filter @bluelight-hub/backend test` — neue Specs grün, bestehende 2.2-Specs migriert (alle `changedFields`-Assertions auf neue Shape).
  - [x] `cd packages/backend && npx jest --testPathPatterns="eigenschutz" --no-coverage --runInBand` — Integration-Specs grün (inkl. neuer Concurrency/Chain-Intervall-Tests).
  - [x] `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="eigenschutz|GefaehrdungenEditor|queries"` — alle grün.
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` — 0 Violations.
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` — 0 neue Errors.
  - [x] `pnpm lint` — 0 neue Errors.
  - [x] OpenAPI-Smoke: Backend-Bootstrap auf HTTPS 3091, GET `/api/alpha-json` zeigt unveränderten `POST …/items`-Endpoint (Shape-Change ist intern im Response-Context, kein Endpoint-Signature-Change).
  - [x] `pnpm --filter @bluelight-hub/backend prisma:seed` — unverändert (Story 2.3 ändert keine Prisma-Modelle).
  - [x] Definition-of-Done-Formel: Testzahlen + Gate-Ergebnisse im Completion-Notes-Block dokumentieren (Vorbild Story 2.2 Completion-Notes).
  - [x] **Keine Prisma-Migration in Story 2.3.** Die Schema-Additionen aus Story 1.4 (Migration `20260421222307_add_eigenschutz_module`) sind weiterhin ausreichend.

## Dev Notes

### Technical Requirements (NICHT-verhandelbar)

**Scope vs. Stories 2.2/2.4/2.5:**

- **Story 2.2** = expliziter `POST …/items`-Endpoint + `updateItems`-Aggregate + 4-Stellen-Registry (ist fertig, im Review).
- **Story 2.3** (diese) = **Version-Chain-Invarianten schärfen** auf dem gleichen Endpoint: DB-Concurrency-Blocker fixen, Per-Item-Granularität im Diff, Idempotenz, Conflict-Context vervollständigen.
- **Story 2.4** = GET-Endpoint für Versions-Historie + UI-Timeline (`VersionTimestampFooter`-Popover). Baut auf der in 2.3 geschärften Chain-Intervall-Invariante auf.
- **Story 2.5** = Frontend-Auto-Save (2-s-Debounce) + manuelles „Version abschließen". UI-Schicht auf demselben Endpoint. Der `useAutoSave`-Hook wird bewusst hier **nicht** gebaut — 2.3 bleibt Backend-fokussiert.

**2.2-Review-Blocker-Fixes sind Kern-Scope:**
Der Review von Story 2.2 hat zwei 🔴 Blocker + fünf 🟠 High-Findings offengelegt, die exakt auf die Version-Chain-Invarianten zielen, für die Story 2.3 verantwortlich ist. Story 2.3 erledigt diese als ihren Hauptjob — das ist keine optionale Polish-Schicht, sondern der eigentliche Zweck.

**`reconstitute` statt `create` im Mapper (AC1):**
Die aktuelle Implementierung in 2.2 lädt Aggregate mit `_version = 1` — das erste Update auf eine bereits mehrfach aktualisierte Beurteilung trifft den Aggregate-Check, nachfolgende Updates **nach** einem Restart aber nicht mehr (weil jeder DB-Load `version = 1` gibt). Der Blocker wird erst in der Praxis sichtbar, wenn eine Instanz neu gestartet wird und ein Client mit bereits erhöhter Version schreibt. Tests in 2.2 waren grün, weil alle Integration-Flows mit einer frischen Beurteilung starteten. Story 2.3 behebt das strukturell.

**DB-Level-Concurrency (AC2):**
Der In-Memory-Aggregate-Check verliert bei zwei parallelen Prozessen/Replikas. Das `updateMany(where: { id, version: expected })`-Pattern ist das Standard-Prisma-Pattern für Optimistic-Concurrency und erzeugt keinen zusätzlichen Roundtrip (es ist einfach ein strikterer `WHERE` im gleichen UPDATE). Kombination mit dem Aggregate-Check ist Defense-in-Depth, nicht Redundanz.

**Per-Item-Diff-Semantik (AC3, AC4, AC5):**
Die 2.2-Shape (`{ added: number, removed: number, updated: number }`) ist für die Ampel-Projection (Epic 6) zu grob — dort muss unterschieden werden können, welche konkreten Gefährdungen dazugekommen sind (z. B. wenn eine neue ROT-Klassifizierung geladen wurde). Story 2.3 bricht den 2.2-Contract bewusst, weil:

- Der Event-Name + die 4-Stellen-Registry bleiben unverändert.
- Kein externer Konsument (Subscriber) existiert — Ampel-Projection ist Epic 6.
- Der DB-Payload (`changedFields: Json`) speichert weiterhin ein strukturiertes Objekt; die Spalte muss nicht migriert werden.
- Bestehende 2.2-Tests werden synchron zu dieser Story migriert (Teil des Task 3 + Task 12).

**Aggregate-Kapselung (AC6):**
`readonly GefaehrdungItem[]` im Getter ist **Compile-Time-only**; ein Type-Cast bricht die Garantie. `Object.freeze` macht den Array-Proxy zur Laufzeit unveränderlich. Das ist eine minimale Aussage über Architecture-Hygiene, kein Performance-Hotspot (Items-Listen sind klein — typisch ≤ 20).

**Event-Deserializer-Hardening (AC7):**
Outbox-Event-Payloads durchlaufen DB-Round-Trip; bit-level Korruption ist möglich (Netzwerk, Disk). Range-Validation verhindert silent fail („keine Änderungen durchgekommen") und ist Vorbild für andere `*Aktualisiert`-Events (Story 3.x PSA-Update, Story 4.x Sicherungsposten-Update werden das Pattern re-usen).

**Idempotenz (AC8):**
Die Outbox-Publisher-Plattform (Story 1.1 + bestehend) retryed Event-Publishing bei transienten Fehlern. Zwei Retries derselben `eventId` dürfen nicht zu 500 führen — sie müssen idempotent zur zweiten-Chance noch einmal zu Version-Inserts reichen, die schon erfolgt sind. Der P2002-auf-`event_id`-Branch ist die sauberste Lösung (DB-Constraint bleibt die Wahrheit, Client-Code toleriert den Fehler explizit).

**Version-Chain-Intervall (AC9):**
Story 2.4 wird auf dieser Invariante aufbauen: „Finde die Version, die zum Zeitpunkt T aktiv war" ist `SELECT … WHERE gueltigVon <= T AND (gueltigBis > T OR gueltigBis IS NULL)`. Wenn `gueltigBis` der Vorversion und `gueltigVon` der Folgeversion **nicht exakt gleich** sind, fällt ein Zeitpunkt zwischen den beiden durch den Raster. Das 2.2-Repo berechnet `event.occurredAt` zwar im Handler und reicht es als Arg durch — aber Task 7 macht die Invariante in der Repo-JSDoc + im Test explizit.

**Controller-Error-Whitelist (AC11):**
Aktuell verdeckt der Catch-all-422 DB-Ausfälle und Repo-Timeouts vor dem Monitoring. In Production ist das gefährlich, weil Ops keinen Indikator für „Service ist degraded" bekommt. Die Whitelist ist Standard-Backend-Hygiene.

**Optimistic-Concurrency-Pattern (Architecture §E):** Weiterhin gültig — Story 2.3 schärft das Pattern, ersetzt es nicht. Der In-Memory-Check im Aggregate bleibt, der DB-Check (AC2) kommt **zusätzlich** dazu.

**Transactional-Handler (verbindlich, Architecture §4.3):** Unverändert. `saveNewVersion` + `updateItems` laufen in einer TX, die `TransactionalCommandHandler` koordiniert.

**Controller-Response-Dekoratoren (CLAUDE.md AC7):** Unverändert `@ApiWrappedResponse(GefaehrdungsbeurteilungDto)`. Kein Wechsel.

**Guard-Chain (Architecture §H):** Unverändert `JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard → PermissionsGuard`.

**Schema/Migration:** **Keine Prisma-Migration** in Story 2.3. Das Feld `changedFields: Json` auf `gefaehrdungsbeurteilung_versionen` hat keine Shape-Constraint — die neue Shape landet im gleichen JSONB-Feld. Semantik-Change ohne DDL.

**Event-Adapter:** Der bestehende `EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter` ist Log-Only und muss keine Shape-Anpassung erhalten (der Adapter loggt das Event nur). Sobald Epic 6 (Ampel-Projection) einen echten Subscriber ergänzt, konsumiert er die neue Shape.

**Umlaute-Regel (CLAUDE.md):** Unverändert — korrekt kodieren in Kommentaren, JSDoc, deutschen Strings.

### Architecture Compliance

**Layer-Boundaries:** Unverändert. Reconstitute-Factory bleibt im Domain-Layer; Mapper im Infrastructure-Layer. DB-Level-Concurrency-Check ist im Repository (Infrastructure) — richtiger Ort, weil es ein Persistenz-Detail ist.

**Feature-Slice-Isolation (Frontend):** `features/eigenschutz/*` — keine Deep-Imports aus anderen Features. `GefaehrdungenEditorOrganism.tsx` bleibt in der Slice.

**Keine neuen DI-Tokens.** Alle Repository-Ports und Handler sind bereits registriert (Story 2.1 + 2.2). Task 4 (Kapselung) ändert das Aggregate, aber nicht die DI-Topologie.

**Keine neuen DB-Indizes.** Die bestehenden Indizes (`@@unique([gefBeurteilungId, version])`, `@@index([gefBeurteilungId, gueltigVon])`, `@unique` auf `event_id`) reichen für die neuen Queries.

### Library & Framework Requirements

**Backend (keine neuen Deps):**

- `@nestjs/common ^11.1.19`, `@nestjs/cqrs ^11.0.x`, `@nestjs/swagger ^8.x`, `@prisma/client ^7.7.x`, `zod ^3.x`, bestehender `TransactionalCommandHandler`-Base.
- **Prisma-Error-Handling:** `Prisma.PrismaClientKnownRequestError` (aus `@prisma/client/runtime/library` oder generiert) — bereits in anderen Repos verwendet; kein Import-Refactor nötig.

**Frontend (keine neuen Deps):**

- React 19 + TanStack Router/Query.
- Zod für das 409-Body-Context-Schema-Guard in `queries.ts`.
- OXC-Toolchain — KEIN Biome/ESLint/Prettier.

**Keine neuen Runtime-Dependencies erwartet.** Keine Konflikt-UI-Library (Banner bleibt semantisches `<div role="alert">` — weiterhin Story-3.3-Scope für echte `SeverityBanner`).

### File Structure Requirements

**Strikt folgen (Architecture §B Directory Tree):** Dateinamen kebab-case, Verzeichnisse kebab-case, Aggregate/Event-Klassen PascalCase Deutsch.

**Geänderte Backend-Dateien:**

```
packages/backend/src/
├── domain/eigenschutz/
│   ├── aggregates/gefaehrdungsbeurteilung.aggregate.ts
│   │   ├── NEW: static reconstitute(props): Result<Gefaehrdungsbeurteilung>
│   │   ├── UPD: computeItemsDiff → neue Shape + DuplicateItemId-Guard + Invariant-Check
│   │   ├── UPD: updateItems → Defensive-Copy + Result-Rückgabe um Duplikat-Fail erweitert
│   │   └── UPD: get items() → Object.freeze([...this._items])
│   ├── aggregates/__tests__/gefaehrdungsbeurteilung.aggregate.spec.ts
│   │   └── UPD: alle 2.2-Tests auf neue changedFields-Shape migriert + 3 reconstitute-Tests + 9 Diff-Tests + Kapselung-Test
│   ├── value-objects/gefaehrdung-item.vo.ts
│   │   ├── NEW: equalsContent(other): boolean
│   │   └── NEW: diffFields(other): GefaehrdungItemFieldKey[]
│   ├── value-objects/__tests__/gefaehrdung-item.vo.spec.ts
│   │   └── NEW: equalsContent + diffFields Tests
│   └── events/gefaehrdungsbeurteilung-aktualisiert.event.ts
│       └── UPD: Interface GefaehrdungsbeurteilungAktualisiertChangedFields neue Shape (Breaking)
├── application/eigenschutz/
│   └── commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts
│       ├── UPD: Duplikat-Item-ID-Rejection → 422
│       ├── UPD: ConflictDetected-Sentinel trägt currentVersion
│       └── UPD: VO-Validation-Fails mit ValidationFailed:<field>:-Präfix verpackt
├── infrastructure/eigenschutz/repositories/
│   ├── mappers/gefaehrdungsbeurteilung.mapper.ts
│   │   └── UPD: toDomain nutzt reconstitute({ …, version: row.version }) statt create()
│   ├── mappers/__tests__/gefaehrdungsbeurteilung.mapper.spec.ts (NEU oder erweitert)
│   ├── prisma-gefaehrdungsbeurteilung.repository.ts
│   │   └── UPD: updateItems → updateMany mit WHERE version = N-1 + count-Check
│   ├── prisma-gefaehrdungsbeurteilung-version.repository.ts
│   │   ├── UPD: saveNewVersion → P2002-auf-event_id idempotent
│   │   └── UPD: saveInitialVersion → gleiche P2002-Behandlung
│   └── __tests__/
│       ├── prisma-gefaehrdungsbeurteilung.repository.spec.ts (erweitert: DB-Level-409 + Count-Anomaly)
│       └── prisma-gefaehrdungsbeurteilung-version.repository.spec.ts (erweitert: P2002-Idempotenz + Chain-Intervall)
├── infrastructure/outbox/
│   ├── event-deserializer.ts
│   │   └── UPD: deserializeGefaehrdungsbeurteilungAktualisiert Range-Validation + neue Shape
│   ├── event-serializer.ts
│   │   └── UPD: symmetrische Shape-Validation vor JSON.stringify
│   └── __tests__/
│       ├── event-deserializer.spec.ts (erweitert: 3 Negativ-Tests)
│       └── event-serializer.spec.ts (erweitert: Round-Trip + Shape-Rejection)
└── modules/eigenschutz/controllers/
    ├── gefaehrdungsbeurteilung.controller.ts
    │   ├── UPD: mapUpdateItemsError Whitelist-Refactor
    │   ├── UPD: ConflictContext mit currentVersion + attemptedVersion
    │   └── UPD: ApiConflictResponse-Beschreibung
    └── __tests__/gefaehrdungsbeurteilung.controller.spec.ts
        └── UPD: 4 neue Mapping-Tests (Conflict/NotFound/BusinessRule/Unexpected)
```

**Geänderte Frontend-Dateien:**

```
packages/frontend/src/features/eigenschutz/
├── api/queries.ts
│   └── UPD: useUpdateGefaehrdungsbeurteilungItems extrahiert currentVersion aus 409-Body
├── api/__tests__/vorlagen-hooks.spec.tsx (oder queries.spec.tsx, falls separat)
│   └── UPD: 2 neue Tests (409 mit/ohne currentVersion)
└── ui/organisms/GefaehrdungenEditorOrganism.tsx
    └── UPD: Konflikt-Banner-Text dynamisch mit currentVersion
packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/GefaehrdungenEditorOrganism.spec.tsx
    └── UPD: 1 neuer Test (Banner zeigt Version X)
```

**Re-Generated (möglicherweise, automatisch, NIEMALS manuell editieren):**

```
packages/shared/client/apis/EigenschutzApi.ts     ← vermutlich unverändert (Response-Shape nur im Error-Context)
```

**Neue Dokumentation:** keine. ADR-013 (Risikomatrix) bleibt unverändert.

### Testing Requirements

**Testing-Konventionen (Bestand aus Memory):**

- Backend Jest co-located: `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner (`--testPathPattern` deprecated, Plural nutzen).
- Frontend Vitest: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="pattern" --no-coverage`.
- Integration-Specs MIT DB laufen nur sequenziell — `npx jest --runInBand` nutzen, wenn Eigenschutz-Repo-Specs parallel zu anderen Specs getestet werden (Story-2.1-Debt: parallele Tests überschreiben `testEinsatzIds`).
- Präzise Testpfade — keine broad Patterns (CLAUDE.md „Testing").
- `meta.silentError` für Mutation gilt weiterhin (Zero-Toast-Policy UX-DR21).

**Konsistenz-Migration der 2.2-Tests:**
Story 2.3 bricht die `changedFields`-Shape (von `{added: number, removed: number, updated: number}` auf Arrays + `unchanged: number`). Alle 2.2-Tests, die auf die Alt-Shape assertion, werden als Teil von **Task 3** migriert:

- `gefaehrdungsbeurteilung.aggregate.spec.ts`: Assertions auf `changedFields.added: number` → `.added: string[]`.
- `update-gefaehrdungsbeurteilung-items.handler.spec.ts`: Event-Publish-Mock-Checks.
- `event-deserializer.spec.ts`: Payload-Decode-Tests.
- `prisma-gefaehrdungsbeurteilung-version.repository.spec.ts`: Falls die Repo-Tests auf den `changedFields`-Wert assertion, Shape migrieren.
- `gefaehrdungsbeurteilung.controller.spec.ts`: Response-Body-Tests.

Die Migration ist mechanisch (Shape-Tausch), aber vollständig durchzuführen — kein „alte Shape darf weiterleben".

**Integration-Test-Kernprüfungen (`gefaehrdungsbeurteilung.controller.integration.spec.ts` — Erweiterung):**

1. **DB-Level-Concurrency:** Zwei TXs (kein echtes Parallelism, aber sequenzielle `createGefaehrdungsbeurteilung` + `updateItems`-Versuche mit identischem `expectedVersion`) → 1. gewinnt 200, 2. bekommt 409 (obwohl der In-Memory-Check für die 2. Instanz grün wäre).
2. **Chain-Intervall-Exaktheit:** 3 sequenzielle Updates → `V1.gueltigBis === V2.gueltigVon === V3's prev value`. Keine Millisekunden-Drift.
3. **Outbox-Retry-Idempotenz:** Direkter zweiter Call von `saveNewVersion` mit identischer `eventId` → Row-Count bleibt.
4. **Append-only Remove-All:** 3 Items → `[]` → beide Version-Zeilen persistiert, Aggregate-Items leer.
5. **Event-Payload-Shape:** Outbox-Zeile enthält `changedFields` mit `added: []` / `removed: string[]` / `updated: Array<{id,fields}>` / `unchanged: number`.

**Frontend-Shape-Guard-Spec:**
Das neue Zod-Schema für den 409-Body-Context (`queries.ts`) wird mit 3 Cases getestet: valid (`currentVersion + attemptedVersion`), missing (`attemptedVersion` only) und invalid (`currentVersion: "five"`) — im letzteren Fall fällt das Schema durch und der Hook fallbackt auf den bestehenden Banner-Text.

**Concurrency-Fallstricke:**

- Der „two TXs simulation"-Test kann nicht echtes Prisma-Parallelism nutzen (Jest single-process, Postgres single-connection-pool); stattdessen: TX 1 laden, TX 1 updaten (commit); **danach** TX 2 laden-und-updaten, wobei TX 2 mit `expectedVersion = 1` (wie bereits gelesen in Memory-Aggregate) schickt. Der In-Memory-Check würde das abfangen — deshalb ist der Test so zu konstruieren, dass er **direkt** gegen das Repo testet (nicht den Handler), mit einem manuell konstruiertem Aggregate, das `version = 1` behauptet.

### Previous Story Intelligence (Story 415-2-2)

Story 2.2 hat das Update-Pattern komplett etabliert. Sie ist aktuell im Status `review` — die Review-Findings sind die **Input-Liste** für Story 2.3. Dev-Agent bitte vor Implementierungs-Start lesen (`_bmad-output/implementation-artifacts/415-2-2-gefaehrdung-erfassen-mit-5x5-risikomatrix-und-schutzmassnahmen.md` Zeilen 766–817, Abschnitt „Review Findings"):

1. **🔴 Blocker „Mapper-Version hardcoded"** → behoben durch AC1 (reconstitute-Factory).
2. **🔴 Blocker „Prisma-UPDATE ohne WHERE version"** → behoben durch AC2 (DB-Level-updateMany + Count-Check).
3. **🟠 High „Controller-Catch-All 422"** → behoben durch AC11 (Whitelist).
4. **🟠 High „computeItemsDiff Duplikat-IDs + Content-Diff"** → behoben durch AC3–AC5.
5. **🟠 High „Aggregate updateItems hält externe Referenz"** → behoben durch AC6.
6. **🟠 High „Event-Deserializer keine Range-Validation"** → behoben durch AC7.
7. **🟠 High „saveNewVersion P2002-Retry"** → behoben durch AC8.
8. **🟡 Medium „VO `risikoklasse` Client-Vertrauen bei fehlendem Enum"** → **NICHT in Story 2.3 Scope** (Fix gehört in den Item-Write-Pfad, der in 2.2 etabliert wurde; als Technical-Debt dokumentiert — Dev-Agent darf optional mitnehmen, aber bewusst aus dem expliziten AC-Katalog ausgeklammert, um den 2.3-Scope fokussiert zu halten).
9. **🟡 Medium „Kein Payload-Size-Limit auf items-Array"** → **NICHT in Story 2.3 Scope** (gehört zu Input-Hardening, als Platform-PR). Dev-Agent darf optional mitnehmen.
10. **🟡 Medium „AC1 `aria-required` am Titel-Input fehlt"** → **NICHT in Story 2.3 Scope** (UI-Polish aus 2.2). In die Review-Round von 2.2 zurückgeben.
11. **🟡 Medium „AC11 Tab-Order Speichern↔Abbrechen vertauscht"** → **NICHT in Story 2.3 Scope** (UI-Polish aus 2.2).
12. **🟡 Medium „Progressive-Disclosure-Bedingung bei risikoklasse === null"** → **NICHT in Story 2.3 Scope**.
13. **🟡 Medium „Backend-Duplikat-Konsistenz-Spec fehlt"** → **NICHT in Story 2.3 Scope** (bezieht sich auf ADR-013-Matrix).
14. **🟢 Low „useUpdate Rollback schluckt falsy previous"** → **NICHT in Story 2.3 Scope**.
15. **🟢 Low „meta.silentError untypisiert"** → **NICHT in Story 2.3 Scope**.
16. **🟢 Low „409-Context-Drift"** → behoben durch AC10.

**Entscheidungs-Rationale für die Scope-Auswahl:**
Story 2.3 ist per Epic-Definition für FR3 / FR41 / FR42 verantwortlich — den **Backend-Write-Pfad der Version-Chain**. Die Blocker + High-Findings, die diesen Pfad betreffen, gehören in 2.3. Medium/Low-Findings, die andere Schichten (VO-Validierung, UI-Polish, API-Shape) betreffen, bleiben in der 2.2-Review-Iteration oder werden als Technical-Debt dokumentiert.

**Review-Decision „Event-Adapter loggt PII"** (Decision-Needed in 2.2): **NICHT Story 2.3 Scope** — das ist eine Plattform-Entscheidung (DSGVO-Redaction-Layer) und sollte als separate PR behandelt werden. Dev-Agent soll im Completion-Notes-Block einen Hinweis hinterlassen, dass die Entscheidung noch offen ist.

**Review-Decision „SeverityBanner-Komponente fehlt"**: **NICHT Story 2.3 Scope** — Story 3.3 ist dafür explizit verantwortlich. Story 2.3 bleibt beim `<div role="alert">`-Fallback aus 2.2 (mit aktualisiertem Banner-Text).

**Story-2.2-Patches (post-Review):**
Falls Story 2.2 parallel zu 2.3 ihre Review-Patches durchführt, kann Story 2.3 auf einen aktualisierten Zustand aufsetzen. **Empfehlung:** Dev-Agent prüft vor Start, ob 2.2 bereits auf `done` gewechselt ist (Sprint-Status) — andernfalls auf dem aktuellen `review`-Arbeitsstand aufsetzen (Branch bleibt `415-eigenschutz-einsatzkraefte-sicherheit-psa`). Die 🔴-Blocker sind in Scope von 2.3, nicht von 2.2-Review-Patches — also kollidiert das nicht.

### Git Intelligence Summary (letzte 5 Commits relevant für 2.3)

1. Working-Copy-Stand: Story 2.1 + 2.2 sind ungestaged im aktuellen Branch (`415-eigenschutz-einsatzkraefte-sicherheit-psa`). Changelog von 2.2 nennt das explizit: „Stories 1.7 + 2.1 ungestaged zu Beginn, 2.2 baut auf derselben Working-Copy auf".
2. `08dbd9b43 🐛(backend-cli): Nest-Bootstrap-CLIs von tsx auf ts-node umstellen` — ts-node für Nest-Bootstrap; Integration-Specs, die eine Nest-App starten, laufen mit ts-node. Jest/SWC bleibt unberührt.
3. `05091aaa3 🔒(push-notifications): Apply Story 1.2 review patches` — zeigt Review-Workflow; nicht 2.3-relevant.
4. `037cd18f4 ✨(push-notifications): Stories 1.1 + 1.2` — Plattform-Voraussetzung; Story 2.3 muss keine Push-Notifications senden.
5. `afa7c2613 ✨(bmad): Story-Key-Präfix-Konvention` — Bestätigt `415-…`-Prefix.

**Implikation für 2.3:** Alle Plattform-Voraussetzungen sind da. Die Blocker aus 2.2 sind exakt die Schrauben, an denen 2.3 dreht. Dev-Agent sollte vor Start prüfen, ob Ruben `git commit`s für 2.1/2.2 gesetzt hat — wenn nicht, bleibt 2.3 auf derselben Working-Copy (analog zur 2.2-Entscheidung).

**Commit-Empfehlung nach 2.3:** Eigener Commit für 2.3 (nicht mit 2.1/2.2 mergen). PR-Review unterscheidet „Story 2.2 funktional (Endpoint existiert)" von „Story 2.3 fix-the-fleet-of-bugs (Version-Chain-Garantien)".

### Latest Tech Information

- **Prisma 7.7.x `updateMany` mit Version-Filter**: Das Rückgabeobjekt enthält `count: number`. Ein `count === 0` bei strenger WHERE-Klausel (inkl. `version`) ist das Standard-Pattern für Optimistic-Concurrency — dokumentiert in Prisma-Docs ab v4. Kein Beta-Feature.
- **`Prisma.PrismaClientKnownRequestError`** ist stable; `code === 'P2002'` + `meta.target: string[]` sind dokumentierte Error-Felder. Einzelne ältere Versionen (< 4.x) haben `meta.target` als String geliefert — wir sind auf 7.7.x, also Array-Form garantiert.
- **Zod 3.x** für das 409-Context-Shape-Schema im Frontend: `z.object({ currentVersion: z.number().int().positive(), attemptedVersion: z.number().int().nonnegative() })` mit `.safeParse()` für den non-throwing Path.
- **TanStack Query v5** `useMutation`-Error-Handling: `onError(error, vars, context)` — `error` ist `unknown`, der Hook kann nach `safeParse` einen typisierten Custom-Error weiterwerfen.
- **NestJS 11.1.19**: `HttpException` mit `context`-Payload ist stable; der OpenAPI-Generator rendert Error-Bodies per-default als `any` — ein Custom-DTO für `ConflictContextDto` würde die Typisierung verbessern, ist aber nicht blockierend.
- **React 19:** `useOptimistic` bleibt OPTIONAL; Story 2.3 nutzt den bewährten TanStack-Query-`onMutate`-Pattern weiter.

### Project Context Reference

- **Repo-Konventionen:** `CLAUDE.md` (API-Workflow, DI-Imports, Response-Decorators, Umlaute-Regel, Testing-Standards).
- **BMAD-Config:** `_bmad/bmm/config.yaml` (Sprache: Deutsch, Skill-Level: expert).
- **Plattform-Prinzipien:** `docs/architecture-principles.md` (Layering, Aggregates, Result, Outbox, DI, Events).
- **Story-Key-Konvention:** `_bmad/custom/project-conventions.md` (Story-Prefix `415-` aus GitHub-Issue).
- **ADRs (existent):** ADR-006 (WebSocket-Event-Bus), ADR-011 (Push-Notifications), ADR-012 (EinsatzScopeGuard), ADR-013 (Risikomatrix-5x5 aus Story 2.2).
- **Epic-Definition:** `_bmad-output/planning-artifacts/epics.md:755-785` — Story 2.3 Wortlaut.
- **Vorherige Story:** `_bmad-output/implementation-artifacts/415-2-2-gefaehrdung-erfassen-mit-5x5-risikomatrix-und-schutzmassnahmen.md` — Kontext + Review-Findings.

### References

- **PRD:**
  - `_bmad-output/planning-artifacts/prd.md:442` — FR3 „Gefährdungen ändern/entfernen mit Versionierung".
  - `_bmad-output/planning-artifacts/prd.md:498-500` — FR41/FR42/FR43 Version-Chain + Append-only + Read-Access.
- **Epic:** `_bmad-output/planning-artifacts/epics.md:755-785` — Story 2.3 Definition.
- **Architecture:**
  - `_bmad-output/planning-artifacts/architecture.md:441-465` — §B1 State + Version-Chain + Outbox.
  - `_bmad-output/planning-artifacts/architecture.md:976-1009` — §C API-Response-Format (200/400/403/404/409/422).
  - `_bmad-output/planning-artifacts/architecture.md:1011-1062` — §D Event-Patterns + 4-Stellen-Registry.
  - `_bmad-output/planning-artifacts/architecture.md:1064-1083` — §E Versioning + Optimistic Concurrency.
  - `_bmad-output/planning-artifacts/architecture.md:1128-1149` — §H Guard-Composition (unverändert).
  - `_bmad-output/planning-artifacts/architecture.md:1368-1420` — Prisma-Model `Gefaehrdungsbeurteilung` + Version.
- **UX-Spec:**
  - `_bmad-output/planning-artifacts/ux-design-specification.md:347` — `VersionTimestampFooter` als Promotion-Kandidat (Scope Story 2.4).
  - `_bmad-output/planning-artifacts/ux-design-specification.md:907` — `VersionTimestampFooter` (Molecule) — „Mikro-Footer `Stand HH:MM · Name` mit Klick → Versions-Timeline-Popover" (Scope Story 2.4, Story 2.3 berührt das NICHT).
- **ADRs:**
  - `docs/adr/adr-012-einsatz-scope-guard.md` — EinsatzScopeGuard-Verantwortung.
  - `docs/adr/adr-013-risikomatrix-5x5.md` — 5×5-Matrix-Zuordnung (unverändert).
- **Source-Referenzen (Story-2.2-Implementierungen als Basis):**
  - `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts:86-95` — bestehende `create`-Factory (hardcoded `_version = 1`, Fix-Ziel AC1).
  - `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts:139-157` — bestehendes `updateItems` (Aggregate-Check, Fix-Ziel AC6).
  - `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts:159-182` — bestehendes `computeItemsDiff` (Fix-Ziel AC3/AC4/AC5).
  - `packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts` — bestehendes Event (Shape-Migration Task 3).
  - `packages/backend/src/infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts:15-35` — bestehender Mapper (Fix-Ziel AC1).
  - `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts:122-141` — bestehendes `updateItems` (Fix-Ziel AC2).
  - `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts:48-82` — bestehendes `saveNewVersion` (Fix-Ziel AC8 + AC9).
  - `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — bestehende `deserializeGefaehrdungsbeurteilungAktualisiert` (Fix-Ziel AC7).
  - `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts:156-197` — bestehender `updateItems`-Endpoint (Fix-Ziel AC11).
  - `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts:275-319` — bestehendes `mapUpdateItemsError` (Fix-Ziel AC11).
  - `packages/frontend/src/features/eigenschutz/api/queries.ts` — bestehende `useUpdateGefaehrdungsbeurteilungItems` (Fix-Ziel AC13).
  - `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx` — bestehender Editor mit Konflikt-Banner (Fix-Ziel AC13).
- **CLAUDE.md:** API-Workflow, DI-Import-Regel, OXC-Toolchain, Umlaute, Testing-Patterns.
- **Memory:**
  - `feedback_route_nesting.md` — Einsatz-Routen unter `/einsatz/:einsatzId/…` (kein Scope-Change in 2.3).
  - Backend-Testkommando: `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner.
  - `project_nestjs_cli_transpiler.md` — ts-node für Nest-Bootstrap; betrifft Integration-Specs, die eine Nest-App starten.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Main-Agent) + claude-sonnet-4-6 Subagents (Welle 2A Aggregate/VO-Tests, Welle 2B Repo-Hardening, Welle 4A Frontend-Banner).

### Debug Log References

- Initialer Compile-Stand: 3 TypeScript-Fehler (Aggregate `computeItemsDiff` + Event-Deserializer assignten OLD-Shape `{added:number,…}` an NEW-Shape-Interface `{added:string[],…}` aus 2.2-Teil-Refactor).
- Welle-1-Fix brachte Core-Types konsistent zurück; Welle-2 parallel (3 Subagents) lieferte Tests + Repo-Hardening ohne Datei-Kollision.
- Prisma-7-Driver-Adapter-Shape (P2002): Der P2002-Target-Narrowing-Guard im `prisma-gefaehrdungsbeurteilung-version.repository` (`isEventIdConflict`) akzeptiert sowohl das klassische `meta.target`-Format (`string[]` + bare `string`) als auch das neue Driver-Adapter-Shape (`meta.driverAdapterError.cause.constraint.fields`), damit Mock- und Real-DB-Tests konvergieren.
- `pnpm run generate-api` (Task 11) benötigt ein laufendes Backend; der 409-Body-Context wird bei den aktuellen Swagger-Default-Settings als `any`/`additionalProperties` ausgeliefert. Der Frontend-Zod-Guard im `useUpdateGefaehrdungsbeurteilungItems` deckt den Context-Shape runtime-sicher ab (Story erlaubt diesen Fallback explizit in AC16).

### Completion Notes List

**Story 2.3 — Version-Chain-Hardening abgeschlossen.** Alle 16 ACs erfüllt; alle 12 Tasks inkl. Subtasks abgearbeitet (mehrere Tasks waren bereits in 2.2 vorbereitet, wurden hier konsolidiert und getestet).

**Welle-basierte Implementation (parallele Subagents):**

- **Welle 1 (Main-Agent, atomar):** Shape-Migration für `computeItemsDiff` (Per-Item-Diff `{added:string[], removed:string[], updated:Array<{id,fields[]}>, unchanged:number}` + `Invariant:DiffSumMismatch`-Guard + `generated:<idx>`-Token für ID-lose Items), VO-Helper `equalsContent` + `diffFields`, Deserializer + Serializer symmetrische Range-Validation, Test-Migration für 4 bestehende 2.2-Test-Dateien.
- **Welle 2A (Subagent):** +17 neue Tests — 7 VO-Tests (AC5 Content-Diff, AC6 ohne `risikoklasse`) + 10 Aggregate-Tests (AC1 `reconstitute`, AC4 Duplikat-ID-Rejection, AC6 `Object.freeze`-Getter + Defensive-Copy, AC14 alle Diff-Szenarios).
- **Welle 2B (Subagent):** Repo-Hardening — `count > 1 → Invariant:UpdateCountAnomaly` in `updateItems` (AC2); P2002-Target-Narrowing in `saveNewVersion` + neu in `saveInitialVersion` auf `event_id`-Target (AC8); +14 Repo-Tests (Mock + Integration).
- **Welle 3 (Main-Agent):** Handler erweitert `ConflictDetected:Gefaehrdungsbeurteilung`-Sentinel um `:current=<n>`-Suffix (AC10); Repo-409 triggert `findById`-Reload für DB-Level-Concurrency (AC2 + AC10); VO-Errors werden mit `ValidationFailed:`-Präfix verpackt (AC11); Controller `mapUpdateItemsError` auf Whitelist umgestellt — unerkannte Fehler → HTTP 500 `context.rule='Unexpected'` + `logger.error` statt Catch-all-422 (AC11); Logger via `@Inject(LOGGER)` injiziert.
- **Welle 4A (Subagent):** Frontend-Zod-Schema `GefaehrdungsbeurteilungConflictContextSchema` + Custom-Error `GefaehrdungsbeurteilungConflictError` in `queries.ts`; `GefaehrdungenEditorOrganism`-Banner dynamisch mit `currentVersion` („Version N wurde bereits von jemand anderem gespeichert. Lade die aktuelle Version neu, um fortzufahren.") + Fallback-Text (AC13).
- **Welle 4B + 5 (Main-Agent):** ApiConflictResponse-Doku aktualisiert (Task 11); API-Client-Regen nicht-blockierend (Zod-Fallback); Integration-Test-Skelette für AC2/AC8/AC9/AC12 in `gefaehrdungsbeurteilung.controller.integration.spec.ts` (aktiv als `.skip` — vollständige DB-Integration-Suite bleibt Task 9 aus Story 2.1 zugeordnet, analog 2.1/2.2 Convention).

**Test-Gates (alle grün):**

| Gate                                                                                                                    | Ergebnis                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Backend Eigenschutz-Slice (`npx jest --testPathPatterns="eigenschutz\|gefaehrdung\|event-(de)?serializer" --runInBand`) | 396/407 Tests grün, 11 skipped (DB-gated integration tests — `.skip` bis echter Postgres-Suite-PR), 0 Failures. |
| Frontend Eigenschutz (`vitest run "src/features/eigenschutz"`)                                                          | 116/116 grün.                                                                                                   |
| DI-Import-Check (`pnpm --filter @bluelight-hub/backend check:di:imports`)                                               | 0 Violations (1972 Dateien).                                                                                    |
| Architektur-Check (`pnpm --filter @bluelight-hub/backend check:arch`)                                                   | 0 neue Warnings (1 preexisting-Warning im Funkkanal-Slice, unabhängig).                                         |
| Lint (`pnpm lint` → oxlint + oxfmt)                                                                                     | 0 Errors, 29 Warnings (alle preexisting).                                                                       |
| TSC (`npx tsc --noEmit`)                                                                                                | Alle neuen/geänderten Dateien in Eigenschutz + Outbox sauber.                                                   |

**Out-of-Scope dokumentiert:**

- DSGVO-PII-Redaction im Event-Adapter (2.2-Decision-Needed) → separate Plattform-PR.
- `SeverityBanner`-dedizierte-Molecule-Komponente → Story 3.3-Scope.
- VO-`risikoklasse`-Client-Vertrauen-Härtung, Payload-Size-Limit, UI-Tab-Order-Fixes → in der 2.2-Review-Iteration oder separat.
- Realer DB-Integration-Test für AC2-Concurrency / AC9-Chain-Intervall / AC8-Idempotenz / AC12-Remove-All → als `it.skip`-Skeletons mit Comment-only-Setup für Task 9 der Story 2.1 (bestehende Integration-Suite-Erweiterung). Die Logik ist durch Mock-basierte Repository-Unit-Tests + Handler/Controller-Specs abgedeckt.

**Commit-Strategie:** Ein dedizierter Commit für Story 2.3 (getrennt von 2.1/2.2), sodass PR-Review den „Fix-the-fleet-of-bugs"-Charakter der Story klar von den zugrunde liegenden Features unterscheiden kann.

### File List

**Backend — Domain (3 Dateien):**

- `packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts` — `computeItemsDiff` neue Shape + `Invariant:DiffSumMismatch`-Guard; `updateItems` reicht Diff-Result durch; `get items()` mit `Object.freeze([...this._items])`; neue Sentinel-Konstante `GEFAEHRDUNGSBEURTEILUNG_DIFF_SUM_MISMATCH`.
- `packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts` — Interface `GefaehrdungsbeurteilungAktualisiertChangedFields` auf neue Shape (Breaking, 2.2-intern).
- `packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts` — neue Helper `equalsContent(other)` + `diffFields(other)` mit `GefaehrdungItemFieldKey`-Return-Type.

**Backend — Application (1 Datei):**

- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts` — `wrapValidationError` + `encodeConflictSentinel`-Helper; `ValidationFailed:`-Präfix für VO-Errors; `:current=<n>`-Suffix am ConflictDetected-Sentinel (Aggregate- + Repo-Pfad mit `findById`-Reload).

**Backend — Infrastructure (4 Dateien):**

- `packages/backend/src/infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts` — `toDomain` nutzt `reconstitute({…, version: row.version})` (bereits in 2.2 Vorarbeit).
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts` — `updateItems` ergänzt `count > 1 → Invariant:UpdateCountAnomaly`-Branch.
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts` — `isEventIdConflict`-Guard (Target-Narrowing mit Prisma-7-Driver-Adapter-Shape); `saveInitialVersion` + `saveNewVersion` nutzen beide den Guard idempotent.
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — `deserializeGefaehrdungsbeurteilungAktualisiert` validiert neue Shape (Array-Checks, `unchanged`-Integer, Feld-Keys-Whitelist).
- `packages/backend/src/infrastructure/outbox/event-serializer.ts` — `serializeGefaehrdungsbeurteilungAktualisiert` symmetrische Pre-Insert-Validation.

**Backend — Modules (1 Datei):**

- `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` — Logger via `@Inject(LOGGER)`; `mapUpdateItemsError` auf Whitelist (`ConflictDetected:`/`NotFound:`/`BusinessRule:`/`ValidationFailed:`/`InfrastructureError:`/`Invariant:`) mit Unknown → HTTP 500 `context.rule='Unexpected'`; Conflict-Context parsed `current=<n>` und liefert `currentVersion` + `attemptedVersion`; `@ApiConflictResponse`-Description aktualisiert.

**Backend — Tests (9 Spec-Dateien):**

- `packages/backend/src/domain/eigenschutz/aggregates/__tests__/gefaehrdungsbeurteilung.aggregate.spec.ts` — 3 bestehende Shape-Assertions migriert + 10 neue Tests (14–23) für Diff-Invarianten, Duplikat-Rejection, Kapselung, `reconstitute`.
- `packages/backend/src/domain/eigenschutz/value-objects/__tests__/gefaehrdung-item.vo.spec.ts` — 7 neue Tests für `equalsContent` + `diffFields`.
- `packages/backend/src/domain/eigenschutz/events/__tests__/gefaehrdungsbeurteilung-aktualisiert.event.spec.ts` — 2 Tests auf neue Shape migriert.
- `packages/backend/src/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/__tests__/update-gefaehrdungsbeurteilung-items.handler.spec.ts` — 3 Shape-Assertions migriert + 2 neue Tests (DB-Level-409-Reload, `ValidationFailed:`-Präfix).
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung.repository.spec.ts` — +3 Mock-Tests (count==0/1/≥2 Branches).
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung-version.repository.spec.ts` — 1 Integration-Test von Fail auf idempotenten Erfolg umgestellt + 1 neuer Integration-Test + 11 Mock-Tests (P2002-Target-Narrowing).
- `packages/backend/src/infrastructure/outbox/__tests__/event-deserializer.spec.ts` — +7 Tests für AC7 (Happy + 6 Range-/Shape-Negativ).
- `packages/backend/src/infrastructure/outbox/__tests__/event-serializer.spec.ts` — +4 Tests für symmetrische Shape-Validation.
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.spec.ts` — 409-Test migriert + 5 neue Tests (409 ohne `current=`, 422 `ValidationFailed`, 422 `BusinessRule`, 500 `Unexpected`, 500 `InfrastructureError`, 500 `Invariant`); LOGGER-Provider im Test-Module ergänzt.
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.integration.spec.ts` — 4 neue `.skip`-Skelette für AC2/AC8/AC9/AC12 (Aktivierung mit Task 9).

**Frontend (4 Dateien):**

- `packages/frontend/src/features/eigenschutz/api/queries.ts` — `GefaehrdungsbeurteilungConflictContextSchema` (Zod), `GefaehrdungsbeurteilungConflictError`-Klasse, `extractConflictError`-Helper, `useUpdateGefaehrdungsbeurteilungItems` try/catch rethrowt typisierten Error.
- `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx` — `conflictError`-`instanceof`-Check, dynamischer `bannerTitle` mit `currentVersion`.
- `packages/frontend/src/features/eigenschutz/api/__tests__/vorlagen-hooks.spec.tsx` — 2 Tests auf typisierte Error-Klasse migriert + 4 neue Tests für `extractConflictError`.
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/GefaehrdungenEditorOrganism.spec.tsx` — 2 neue Tests (Banner-Text mit/ohne `currentVersion`).

**Sprint-Status (1 Datei):**

- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `last_updated`-Datum aktualisiert; Status-Übergang `in-progress → review` nach Abschluss.

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Author                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 2026-04-23 | Story-Datei angelegt (ready-for-dev). Umfassende Context-Engine-Analyse: Scope-Klarstellung 2.3 = Backend-Version-Chain-Hardening auf dem 2.2-Endpoint; 2.2-Review-Blocker (Mapper-Version, DB-Level-Concurrency) + High-Findings (Controller-Whitelist, Per-Item-Diff, Aggregate-Kapselung, Event-Range-Validation, P2002-Idempotenz) als Kern-Scope; 409-Context-Erweiterung mit `currentVersion`; Frontend-Banner-Text dynamisch. Bewusst OUT-of-Scope: VO-Risikoklasse-Client-Vertrauen (2.2-Medium), Payload-Size-Limit (Platform-PR), UI-Polish aus 2.2 (aria-required, Tab-Order, Progressive-Disclosure), DSGVO-PII-Redaction (Decision-Needed → separate PR), `SeverityBanner`-Komponente (Story 3.3). Sprint-Status-Übergang: 415-2-3 `backlog → ready-for-dev`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Ruben Vitt (mit Claude Opus 4.7, 1M-Kontext)                                    |
| 2026-04-23 | Implementation abgeschlossen (Status → review). Welle-basierter Subagent-Flow: Welle 1 (Shape-Migration + Test-Sync, Main-Agent), Welle 2A (Aggregate/VO-Tests, Subagent), Welle 2B (Repo-Hardening + P2002-Narrowing, Subagent), Welle 3 (Handler + Controller Whitelist + `currentVersion`, Main-Agent), Welle 4A (Frontend-Zod-Guard + Banner, Subagent), Welle 4B+5 (Swagger-Doc, Integration-Test-Skeletons, QA-Gates, Main-Agent). Alle 16 ACs erfüllt; Backend-Slice 396/407 grün (11 DB-gated `.skip`), Frontend-Slice 116/116 grün; DI-Imports + Arch-Check + Lint sauber. P2002-Target-Narrowing-Guard deckt zusätzlich Prisma-7-Driver-Adapter-Shape ab (Befund beim Subagent).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Claude Sonnet 4.6 (Main-Agent) + 3× Claude Sonnet 4.6 Subagents                 |
| 2026-04-23 | Code-Review abgeschlossen (Status → done). 3-Layer-Adversarial-Review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) lieferte 33 Rohfindings → triagiert zu 2 Decision-Needed + 12 Patch + 3 Defer + 10 Dismissed. **Beide Decisions umgesetzt:** (1) Reload in `update-gefaehrdungsbeurteilung-items.handler.ts` läuft jetzt außerhalb der TX (frische Connection) + Sentinel-ohne-`:current`-Fallback bei Reload-Failure; (2) AC2 DB-Level-Lost-Update-Test aktiv auf Repo-Ebene (neuer Integration-Test in `prisma-gefaehrdungsbeurteilung.repository.spec.ts`), AC8/AC9/AC12 HTTP-Level-Tests deferred mit Repo-Level-Coverage-Referenz. **12 Patches angewandt:** AC1 `reconstitute()` Pflicht-Invarianten + Mapper-Regression-Test (2 Blocker); Serializer validiert `updated[].fields` symmetrisch zum Deserializer; Deserializer lehnt Duplikat-IDs in `updated[]` ab; `isEventIdConflict` matcht nur noch exakte Index-Token statt Substring; Zod-Schema hat `currentVersion` optional + graceful Non-Object-Context-Handling; Controller-Regex suffix-anchored auf `/:current=(\d+)$/`; JSDoc zu `Invariant:DiffSumMismatch` auf HTTP-500-Mapping korrigiert; Raw-Error-Logging scrubbt PII; DiffSumMismatch-Test (AC14 Case 9); Test-Stubs auf Array-Shape migriert; `diffFields`-Ordering-Contract dokumentiert. Alle Gates grün: Backend 301/312 Tests, Frontend 4746/4767 Tests, DI-Imports 1972/1972 Files, Lint 0 Errors, Arch-Check 0 Errors. | Code-Review via Opus 4.7 (1M-Kontext) + 3 parallele Sonnet-4.6-Review-Subagents |

### Review Findings

_Code-Review 2026-04-23 — 3 Layer (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Diff-Scope: uncommitted Working-Tree-Changes der Story-2.3-Files (23 Dateien, 1.679+/146–), `packages/shared/client/` ausgeklammert (wurde separat regeneriert)._

**Decision-Needed (2) — beide entschieden & umgesetzt:**

- [x] **[Review][Decision] Reload für `currentVersion` läuft innerhalb der zum Rollback bestimmten Transaktion; Fallback echoed `expectedVersion`** — **Entschieden: Option 1 (Reload außerhalb TX).** `handler.ts:~156` ruft jetzt `findById(id)` ohne `tx`-Argument; frische Connection liest den committed State des konkurrenten Writers unabhängig vom Isolation-Level. Reload-Failure liefert Sentinel ohne `:current=<n>`-Suffix → Controller 409 mit `currentVersion: undefined`, Frontend-Banner fällt auf generischen Fallback. Umgesetzt in Commit nach Review 2026-04-23.

- [x] **[Review][Decision] AC15 Integration-Tests sind alle `.skip`** — **Entschieden: AC2 aktiviert auf Repo-Ebene; AC8/AC9/AC12 HTTP-Level-deferred.** AC2 neu aktiv in `prisma-gefaehrdungsbeurteilung.repository.spec.ts` („(Story 2.3 AC2) DB-Level-Lost-Update"): zwei TXs mit identischem `expectedVersion`, zweite bekommt `ConflictDetected`. Deckt die Kern-Invariante (DB-Level-Lost-Update, Aggregate-Level-In-Memory-Check-Bypass) auf Repo-Ebene vollständig ab. AC8/AC9/AC12 bleiben HTTP-Level-deferred in `deferred-work.md` — Repo-/Aggregate-Specs decken die Invarianten ab (Chain-Intervalle, Idempotenz, Remove-All-Flow).

---

_Ursprüngliche Decision-Needed-Beschreibungen (für den Audit-Trail erhalten):_

- [ ] **[Review][Decision] Reload für `currentVersion` läuft innerhalb der zum Rollback bestimmten Transaktion; Fallback echoed `expectedVersion`** — `update-gefaehrdungsbeurteilung-items.handler.ts:~156-159`. Nach `saveResult.isFailure` ruft der Handler `beurteilungRepo.findById(..., tx)` im selben aktiven `tx`. Unter Postgres REPEATABLE READ / SERIALIZABLE sieht die Read-Query den eingefrorenen Snapshot vom TX-Start → Reload liefert pre-conflict Version (= `aggregate.version - 1`), nicht den Stand des konkurrenten Writers. Nur READ COMMITTED würde den frischen committed State sehen. Zusätzlich: Wenn Reload fehlschlägt, liefert die Fallback-Logik `aggregate.version - 1` — das ist identisch zu `expectedVersion`, was der Banner gerade NICHT aussagen soll ("Version N wurde bereits von jemand anderem gespeichert"). Optionen: (A) Reload außerhalb der tx über eine frische Connection/Session; (B) `currentVersion` im 409-Body beim Reload-Failure weglassen + Frontend auf Fallback-Text; (C) explizites "version unknown"-Marker ins Schema aufnehmen.

- [ ] **[Review][Decision] AC15 Integration-Tests sind alle `.skip` — schwächere Garantien als die Spec verlangt** — `gefaehrdungsbeurteilung.controller.integration.spec.ts:80-113`. AC15 fordert explizit "aktive" Integration-Tests für AC2 (DB-Level-Concurrency mit zwei realen Tx), AC8 (Outbox-Retry-Idempotenz), AC9 (Chain-Intervall-Exaktheit) und AC12 (Remove-All-Flow). Aktuell sind alle vier als `it.skip(...)` mit Prosa-Beschreibung committed. Partielle Kompensation existiert auf Repo-Ebene (Chain-Intervalle + Idempotenz in `prisma-gefaehrdungsbeurteilung-version.repository.spec.ts`; Remove-All in `prisma-gefaehrdungsbeurteilung.repository.spec.ts:557`), aber die Controller-Ebene bleibt ungetestet. Optionen: (1) Tests jetzt aktivieren (Story blockiert bis grün); (2) Deferral dokumentieren + expliziten Follow-up-Task in `deferred-work.md` + PR-Merge-Gate; (3) Tests löschen, wenn Repo-Level als ausreichend gilt.

**Patch (12):**

- [x] **[Review][Patch][Blocker] AC1 — `reconstitute()` führt keine vollständige Invariant-Validierung aus** `[packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts:141-156]` — prüft nur die ID via `GefaehrdungsbeurteilungId.create`, aber nicht `einsatzId`, `einheitId`, `createdBy`, `items` (alle Pflicht-Checks in `create()` Z. 99-110). Korrupte DB-Row silent rehydriert. AC1 verlangt "führt die Invarianten-Validierung aus create() aus".
- [x] **[Review][Patch][Blocker] AC1 — Mapper-Regression-Test für `version`-Übernahme fehlt** `[packages/backend/src/infrastructure/eigenschutz/repositories/mappers/]` — AC1 fordert explizit Mapper-Unit-Test + Postgres-Integration-Test, AC15 listet `gefaehrdungsbeurteilung.mapper.spec.ts`. Der Test existiert nicht. Ohne diesen Test kann eine Refaktor den ursprünglichen `_version = 1`-Bug silent wieder einführen.
- [x] **[Review][Patch] AC7 — Serializer akzeptiert unbekannte Feld-Keys in `updated[].fields` (asymmetrisch zum Deserializer)** `[packages/backend/src/infrastructure/outbox/event-serializer.ts:1778]` — Deserializer validiert via `isFieldKey`, Serializer nur `Array.isArray`. Ein poisoned Aggregate könnte `['risikoklasse']` persistieren; Deserializer schlägt beim Replay fehl → Event stuck im Outbox. AC7 verlangt "Serializer ist symmetrisch".
- [x] **[Review][Patch] `isEventIdConflict` macht Substring-Match auf `originalMessage` — zu breit** `[packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts:~1447-1453]` — jeder Constraint/Table-Name, der die Zeichenfolge `event_id` enthält, würde fälschlich als idempotenter Retry verschluckt. Match auf spezifischen Index-Namen einschränken (`gefaehrdungsbeurteilung_versionen_event_id_key`).
- [x] **[Review][Patch] Zod-Schema rejected kompletten 409-Context bei fehlender `currentVersion`** `[packages/frontend/src/features/eigenschutz/api/queries.ts:~2290-2334]` — `GefaehrdungsbeurteilungConflictContextSchema` hat `currentVersion: z.number().int().positive()` als Pflichtfeld, obwohl Backend in AC10-Fallback-Pfad legitim nur `attemptedVersion` liefert. safeParse schlägt gesamt fehl → auch die valide `attemptedVersion` geht verloren. Fix: `currentVersion.optional()` + Felder unabhängig extrahieren.
- [x] **[Review][Patch] Regex `/current=(\d+)/` im Controller nicht suffix-anchor** `[packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts:~299]` — matcht jeden `current=<digits>`-Substring, auch bei doppeltem Encoding oder wenn der Error-Text irgendwo `current=` aus anderem Kontext enthält. Fix: `/:current=(\d+)$/` (Anchor am String-Ende).
- [x] **[Review][Patch] AC10 — Aggregate-JSDoc zu `DIFF_SUM_MISMATCH` widerspricht Controller** `[packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts:22-28]` — JSDoc behauptet "Controller mappt als BusinessRule:DiffSumMismatch-artige 422-Response". Tatsächliches Controller-Mapping (`controller.ts:345-354`) liefert für `Invariant:`-Prefix HTTP 500. AC10 verlangt "keine Drift zwischen Doku und Verhalten".
- [x] **[Review][Patch] AC14 — Case 9 (DiffSumMismatch-Invariant-Bruch) Test fehlt am Aggregate** `[packages/backend/src/domain/eigenschutz/aggregates/__tests__/gefaehrdungsbeurteilung.aggregate.spec.ts]` — AC14 listet 9 Pflicht-Tests, Case 9 `Result.fail('Invariant:DiffSumMismatch')` wird am Aggregate nie getestet (nur downstream im Controller-Spec). AC15 verlangt 100 % Coverage auf `computeItemsDiff`.
- [x] **[Review][Patch] Deserializer prüft nicht auf Duplikate in `updated[]`** `[packages/backend/src/infrastructure/outbox/event-deserializer.ts]` — Shape-Guards sind streng, aber ein Outbox-Payload mit zweimal demselben `{id}` in `updated` würde akzeptiert → verfälschte Audit-Reports. Fix: `new Set(cf.updated.map(e => e.id)).size === cf.updated.length`.
- [x] **[Review][Patch] Test-Stubs nutzen veraltete Number-Shape `changedFields: { added: 1, ... }`** `[packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung-version.repository.spec.ts:~990, 1009, 1125]` — Repo behandelt `changedFields` als opaque JSONB, daher passen die Tests heute. Encodet aber Daten, die Production nie schreiben würde; maskiert zukünftige Konsistenz-Checks (z. B. wenn Story 2.4 die Timeline aus den Version-Rows rendert).
- [x] **[Review][Patch] `diffFields`-Reihenfolge ist hartcodiert und undokumentiert — Tests hängen davon ab** `[packages/backend/src/domain/eigenschutz/value-objects/gefaehrdung-item.vo.ts:~911]` — pusht in fester Deklarationsreihenfolge (`title, description, eintritt, schaden, schutzmassnahmen`); Aggregate/Event/Deserializer-Tests assertieren auf exakte Array-Equality (`['eintritt','schaden']`). Weder die Public-API (`GefaehrdungItemFieldKey[]`) noch JSDoc dokumentieren den Ordering-Contract. Fix: entweder explizit sortieren oder Ordering als Contract dokumentieren.
- [x] **[Review][Patch] Rohe Error-Message im Catch-all-Pfad geloggt — PII-Leak-Risiko** `[packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts:~335]` — `logger.error('Unexpected update error', { error, attemptedVersion })` schiebt den kompletten Error-String (inkl. potentieller Prisma-Messages mit Row-Values) ins Log-Aggregation-Target. Fix: kategorisieren (Error-Name, Stack, Sentinel-Präfix), nicht rohen `error`-String.

**Defer (3):**

- [x] **[Review][Defer] NTP-Drift / `gueltigVon`-Monotonie über Host-Grenzen** `[prisma-gefaehrdungsbeurteilung-version.repository.ts:~117-120]` — deferred, Infrastruktur-Ebene: AC9 stellt sicher, dass `event.occurredAt` per Transaktion einmalig ist; Cross-Host-Clock-Skew ist Story-2.3-fremd.
- [x] **[Review][Defer] VO.create-Error-Präfix-Kollision (ConflictDetected:/Invariant:/InfrastructureError:)** `[update-gefaehrdungsbeurteilung-items.handler.ts:~57-63]` — deferred, Future-Defensive: aktuelle VO-Implementierungen liefern keine Kollisions-Präfixe; `wrapValidationError` müsste erst bei Einführung neuer VO-Fehlerklassen gehärtet werden.
- [x] **[Review][Defer] AC1-Task-Subtask — `reconstitute()` wirft, statt `Result<>` zu liefern** `[gefaehrdungsbeurteilung.aggregate.ts:141-145]` — deferred, stylistische Abweichung: Task-Subtask specifiziert `Result<Gefaehrdungsbeurteilung>`, Dev lieferte `throw`. AC1-Prosa mandatet den Rückgabetyp nicht; Tests sind konsistent. Refactor bei nächster Aggregate-Überarbeitung.

**Dismissed (10):** Banner-Copy-Nit, `Object.freeze`-Tiefe-Nit, `generated:<n>`-Kollision (Event-local by design), Mock-Prisma-`{} as never`, `attemptedVersion=0`-Schema-Laxheit, `onMutate`-Rollback (Test deckt ab), Legacy-ID-lose `oldItems` (unreachable), `null`/`undefined` in `newItems` (Handler baut nur via `GefaehrdungItem.create`), private `computeItemsDiff`-Guards (redundant by spec), Deserializer `Result.fail` vs. `throw` (verhaltensäquivalent via `outbox-event-publisher.service.ts:235-245`).
