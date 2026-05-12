---
story: 7.11
date: 2026-05-12
version: 1.0.0
related_stories: [7.10, 7.8, 6.5, 5.5, 5.2, 3.4, 3.6]
audit_type: e2e
---

> ⚠️ **Validierungs-DoD (Block A vs. Block B):** Dieser Validierungsbericht ist Block-A-Story-7.11-Output. Block-B-Walltime-Verifikationen (3-Geräte-Sync gegen Pilot-Backend, Senior-Operator-Smoke auf Stabs-Tablet, GitHub-Branch-Protection-Aktivierung, Pilot-Cutover-Smoke gegen Production-Datenbank-Snapshot) sind als Human-QA-Schritte aufgeführt und MÜSSEN vor Pilot-Cutover ausgeführt werden — die Story-`done`-Markierung allein ist nicht Pilot-Freigabe.

> ⚠️ **Sandbox-Limit (ehrlich vermerkt):** Der Dev-Agent-Sandbox-Lauf hat **keine** lokale Postgres-Verfügbarkeit und **keinen** vorab-installierten Chromium-Browser. Block-A-Specs wurden statisch geschrieben und gegen Lint/Typecheck verifiziert; die Walltime-Median-Messung (n=3 lokale Probeläufe für die ≤ 90 s-Sanity) wird beim ersten erfolgreichen `linux-e2e`-CI-Run protokolliert. Erfundene Zahlen sind in diesem Bericht bewusst vermieden.

# Eigenschutz-E2E-Validierungsbericht (Story 7.11)

## 1. Voraussetzungen

| Komponente            | Stand                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Playwright            | `@playwright/test` ^1.50 als DevDep in `packages/frontend/package.json`                                                        |
| Chromium              | Wird in CI per `playwright install --with-deps chromium` provisioniert (kein Desktop-Browser nötig)                            |
| Backend-Branch-Commit | `415-eigenschutz-einsatzkraefte-sicherheit-psa` (siehe `git log` aus dem Story-Run)                                            |
| DB-Schema-Stand       | Prisma 7.7 + `prisma:deploy` auf Postgres 17 (Service-Job, analog `linux-backend-db`)                                          |
| Test-Runner           | `pnpm --filter @bluelight-hub/frontend test:e2e:ci` mit `CI=true`, JUnit + GitHub-Reporter, HTML-Report unter `playwright-report/` |
| Marker-Konvention     | Test-Daten-Prefix `E2E711-<timestamp>` über `einsaetze.nummer`, `einsatz_einheiten.name`, `"User".username` und Server-Token-`name` |
| Test-DB-Layer         | Eigener `pg`-Pool (Frontend-DevDep `pg@^8.20.0`) statt `@prisma/client`-Import — siehe Pivot-Anker §3 zur Cross-Workspace-Topologie |
| Passwort-Hashing      | `bcryptjs@^3.0.2` (pure-JS, kein native build) für Admin- und Test-User-`passwordHash` sowie Server-Access-Token-`tokenHash` |
| Permission-Modell     | Test-User bekommen `User.permissions` als JSON-Array mit allen 14 Eigenschutz-Permissions (siehe `domain/eigenschutz/enums/eigenschutz-permission.enum.ts`). **Code-Review-Verifikation 2026-05-12 (P30):** `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:183` baut `einsatzPermissions` ausschließlich aus `parsePermissions(userEntity.permissions, …)`; die `EinsatzRollenbesetzung → RollenDefinition`-Kette ist im Schema vorhanden, wird aber von den aktiven Guards **nicht** konsultiert (nur als Future-Hook dokumentiert). Eine RollenDefinitions-Bridge ist daher nicht nötig — der frühere Block-B-Item B5 wurde gestrichen (Audit-Sektion 10). |

### Block-A-Spec-Auflistung

- `packages/frontend/playwright.config.ts` — Test-Konfiguration mit `fullyParallel: false`, `workers: 1`, `retries: 0|2 (CI)`, `globalSetup`/`globalTeardown`-Verkettung, Chromium-only-Projekt.
- `packages/frontend/e2e/setup/global-setup.ts` — Backend-Process via `child_process.spawn`, `vite preview` für Frontend, HTTP-Seed, Storage-State-Export.
- `packages/frontend/e2e/setup/global-teardown.ts` — DB-Cleanup mit Marker, Process-Kill (SIGTERM → SIGKILL nach 5 s).
- `packages/frontend/e2e/setup/test-db.ts` — Eigenständiger `pg`-Pool für Outbox-Reads, Vorfall-Persistenz-Verifikation, Marker-Cleanup.
- `packages/frontend/e2e/setup/seed.ts` — Test-User-Anlage via SQL + Admin-`POST /api/auth/login` + `POST /api/v-alpha/einsatz` + Storage-State-Export pro User.
- `packages/frontend/e2e/fixtures/auth-fixtures.ts` — Sechs benannte Page-Fixtures (`markusPage`, `steffi1Page`, `steffi2Page`, `steffi3Page`, `einheitsfuehrerPage`, `sabinePage`) plus `seedState`.
- `packages/frontend/e2e/specs/cbrn-journey.spec.ts` — Journey 1b (Multi-Context, 10 `test.step()`-Schritte + Sekundärverifikationen).
- `packages/frontend/e2e/specs/vorfall-export-journey.spec.ts` — Journey 4 (Single-Primärpfad mit User-Switch + Markus-Soft-Check).

## 2. Journey 1b — Test-Schritt-Mapping

| UI-Schritt                              | Backend-Pfad (Domain → Application → Infrastructure)                                                                                                | Event-Type           | Outbox-Verifikation                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------- |
| Bulk-Select 3 Abschnitte + PSA-Drawer   | `modules/eigenschutz/controllers/psa-profil.controller.ts` (Bulk-Endpoint)                                                                          | —                    | implizit über UI-Reaktion                            |
| CBRN-Toggle + Submit                    | `application/eigenschutz/commands/change-psa-profil/change-psa-profil.handler.ts` → `PsaProfilZuweisungAggregate.aktiviereProfil(CBRN, …)`           | `PsaProfilGeaendert` | `outbox_events.event_name = 'PsaProfilGeaendert'` + Payload-Match auf `einsatzId` + CBRN-Substring |
| WS-Broadcast in 3 Abschnittsleiter-Sessions | `infrastructure/eigenschutz/websocket/eigenschutz.gateway.ts` (Story 3.4 Pattern)                                                              | dito                 | UI-Banner (`role="alert"` OR `role="status"+aria-live`) in Steffi-1/2/3-Contexts |
| Quittungen Steffi-1 + Steffi-2          | `application/eigenschutz/commands/quittiere-psa-profil/quittiere-psa-profil.handler.ts`                                                             | `PsaProfilQuittiert` | nicht primär getestet (Folge-Story)                  |
| Lücke melden Steffi-3                   | `MeldeLueckeDialog` → `application/eigenschutz/commands/melde-lueke/...`                                                                            | `LueckeGemeldet`     | nicht primär getestet                                |
| Mix-Status auf Markus-Dashboard         | `AmpelProjection`-Read-Model (Story 6.1, §B9)                                                                                                       | —                    | UI-Status-Differenz über 3 Abschnitte                |

**Capability-Coverage NFR-M1 „PSA-Hochstufung":** Erfüllt via UI-Schritt-zu-Backend-Handler-Mapping. Numerische v8-Coverage **nicht** erzeugt (siehe Sektion 7 — qualitativ ausgewiesen).

## 3. Journey 4 — Test-Schritt-Mapping

| UI-Schritt                                                | Backend-Pfad                                                                                                                                                       | Belege                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VorfallMeldenDrawer` aus `VorfaellePage`                 | `modules/eigenschutz/controllers/eigenschutz-vorfall.controller.ts`                                                                                                | Drawer wird über Button geöffnet — keine separate `/erfassen`-Route (verifiziert in `VorfaellePage.tsx`).                                                                    |
| Snapshot-Persistenz                                       | `application/eigenschutz/commands/erfasse-vorfall/erfasse-vorfall.handler.ts` + Snapshot-Auto-Build (Story 5.2)                                                     | `eigenschutz_vorfaelle.kontext_snapshot` enthält Top-Level-Keys (Polling 15 s im Test).                                                                                       |
| Filter „Unfallkassen-relevant"                            | `queries/list-vorfaelle.handler.ts` (Story 5.4) → `eigenschutz_vorfaelle.unfallkasse_relevant`                                                                      | Sabine-Listing zeigt den frisch erfassten Vorfall.                                                                                                                            |
| Read-Only-Detail-Ansicht                                  | Route `vorfaelle/$vorfallId.tsx`, Permission-Filter im Frontend für Sabine-Rolle                                                                                   | Kein „Bearbeiten"-Button (`count() === 0`), Snapshot-Region sichtbar.                                                                                                         |
| PDF-Export                                                | `infrastructure/eigenschutz/export/eigenschutz-vorfall-pdf.renderer.ts`                                                                                            | `download.suggestedFilename().endsWith('.pdf')`, Magic-Bytes `%PDF-`, `byteLength ≥ 1024`. **Title-Match** wandert in Block B (B2 Senior-Operator-Smoke mit System-PDF-Viewer). |
| JSON-Export gegen Schema V1                               | `infrastructure/eigenschutz/export/eigenschutz-vorfall-json.renderer.ts` + `packages/shared/src/schemas/eigenschutz/eigenschutz-vorfall-export.schema.ts` (Story 5.5) | `EigenschutzVorfallExportV1.safeParse(...)` ohne Drift. `schemaVersion === 1`, `kontextSnapshotIsLegacyEmpty === false`.                                                       |

**Capability-Coverage NFR-M1 „Vorfall-Erfassung":** Erfüllt — Persistenz, Snapshot-Auto-Build, PDF-/JSON-Export inkl. Schema-Validation.

## 4. Sekundärverifikationen (Epic-AC-Pflicht)

### Eigenschutz-Startseiten-Zustand nach Journey-Schritten

- **Offene-Punkte-Indikator** (`getByText(/Offene\s+(Punkte|Rückmeldungen)/i)`) — Pflicht-Check in `cbrn-journey.spec.ts` Sekundärverifikations-Block.
- **`AmpelWarnBadgeList`** — sichtbar via `getByRole('list', { name: /Warn-Badges|Warnungen/i })` (Fallback `[aria-label*="Warn"]`).
- **Fokuslink zur Rückmeldung** — `getByRole('link', { name: /Rück-Eskalation|Lücke|Rückmeldung/i })`.

### `Date`-Vertrag (kein ISO-String-Drift)

| Komponente / Spec                                                                | Verifikations-Pattern                                                                                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AmpelWarnBadgeList` (Story 6.5)                                                 | UI-Render-Check: `<time>` / `[data-time]` / `[data-testid*="last-changed"]` darf keine `\dT\d{2}:\d{2}`-Substring enthalten.   |
| Vorfall-Detail-Erfass-Zeit-Anzeige                                               | implizit über JSON-Export-Schema-Match (`exportedAt`, `vorfall.erfasstAm` mit `.datetime({ offset: true })`).                  |
| Ampel-Card-„letzteAenderungAm"                                                   | Markus-Dashboard-Reload nach Step 9 mit demselben ISO-Substring-Anti-Match.                                                    |

Anker: `cbrn-journey.spec.ts` → `test.step('Sekundärverifikation: Date-Vertrag (kein ISO-Drift)')`.

## 5. NFR-Sanity-Schwelle ≤ 90 s für Journey 1b

- **Operationalisierung:** `cbrn-journey.spec.ts` Step 5 startet die Stopwatch (`tStart = Date.now()`) auf Markus-Submit-Klick, Step 10 wertet die Differenz aus.
- **Reporting:** Bei Überschreitung schreibt der Test eine Playwright-Annotation `{ type: 'sanity-90s', description: '...' }` und einen `console.warn` — **kein** `expect()`-Hard-Fail. Das ist Epic-7-AC11-konform („Sanity-Check, kein Hard-Gate").
- **Median-Doku (Block-B-Pre-Flight):** Sandbox-Limit — der Median über `n=3` lokale Probeläufe wird beim ersten erfolgreichen `linux-e2e`-CI-Run dokumentiert. Im Pilot-Cutover-Smoke (Block B4) wird zusätzlich die Wallclock auf Pilot-Hardware gemessen.
- **Begründung gegen Hard-Gate:** Sandbox-CI-Hardware ist nicht Stabs-Tablet-äquivalent. Eine harte 90-s-Schwelle würde Sandbox-Effekte zu Story-blockierenden Failures eskalieren.

## 6. CI-Wiring (`linux-e2e`-Job)

- **Job-Block:** `.github/workflows/ci.yml` — `linux-e2e` parallel zu `linux-backend-db`, gleiche Postgres-17-Service-Konfiguration, `timeout-minutes: 30`.
- **Steps (verbindlich):**
  1. `actions/checkout@v6`
  2. `pnpm/action-setup@v5`
  3. `actions/setup-node@v6` mit `node-version-file: 'package.json'`, `cache: 'pnpm'`
  4. `pnpm install --frozen-lockfile`
  5. `pnpm --filter @bluelight-hub/backend prisma:generate`
  6. `pnpm --filter @bluelight-hub/backend prisma:deploy` (env `DATABASE_URL=postgresql://test:test@localhost:5432/testdb`)
  7. `pnpm --filter @bluelight-hub/shared build`
  8. `pnpm --filter @bluelight-hub/backend build`
  9. `pnpm --filter @bluelight-hub/frontend build` (env `VITE_API_BASE_URL=http://127.0.0.1:3091/api`)
  10. `pnpm --filter @bluelight-hub/frontend exec playwright install --with-deps chromium`
  11. `pnpm --filter @bluelight-hub/frontend test:e2e:ci` (env: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=test`, `CI=true`, `E2E_BACKEND_PORT=3091`, `E2E_FRONTEND_PORT=4173`)
- **Artifact-Upload bei `failure()`:** `packages/frontend/playwright-report/`, `packages/frontend/test-results/`, `**/trace.zip`.
- **`needs: [detect-changes]` + `if: needs.detect-changes.outputs.code == 'true'`** — analog der anderen Test-Jobs.
- **Summary-Job-Verdrahtung:** `linux-e2e.result` ist in der `summary`-Pipeline-Tabelle und im Pass/Fail-Gate aufgeführt.
- **Branch-Protection-Aktivierung:** **Block B3** — siehe Sektion 10.

## 7. NFR-M1-Coverage-Doku (qualitativ)

NFR-M1 verlangt „kritische Pfade zusätzlich mit E2E-Tests". Playwright erzeugt **keine** native v8-Backend-Coverage; eine numerische Quote wäre falsch.

| Journey-Schritt                                  | Backend-Domain-Logic-Pfad (relativ `packages/backend/src/`)                                                                                              | Aggregat                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Journey 1b Step 3 (CBRN-Toggle Submit)           | `application/eigenschutz/commands/change-psa-profil/change-psa-profil.handler.ts`                                                                        | `PsaProfilZuweisungAggregate`                           |
| Journey 1b Step 7 (Quittung)                     | `application/eigenschutz/commands/quittiere-psa-profil/quittiere-psa-profil.handler.ts`                                                                  | `PsaProfilQuittungAggregate`                            |
| Journey 1b Step 8 (Rück-Eskalation)              | `application/eigenschutz/commands/melde-lueke/melde-lueke.handler.ts`                                                                                    | `RueckmeldungAggregate`                                 |
| Journey 1b Step 9 (Mix-Status)                   | `infrastructure/eigenschutz/projections/ampel-projection.event-handler.ts`                                                                               | Read-Model `AmpelProjection`                            |
| Journey 4 Step 5 (Vorfall + Snapshot)            | `application/eigenschutz/commands/erfasse-vorfall/erfasse-vorfall.handler.ts` + `application/eigenschutz/snapshot/build-kontext-snapshot.service.ts`     | `EigenschutzVorfall` + Snapshot-Service                 |
| Journey 4 Step 9 (PDF-Export)                    | `infrastructure/eigenschutz/export/eigenschutz-vorfall-pdf.renderer.ts`                                                                                  | PDF-Renderer (Infrastruktur)                            |
| Journey 4 Step 10 (JSON-Export-Schema-Validation)| `domain/eigenschutz/schemas/eigenschutz-vorfall-export.schema.ts` (Schema-V1) + `infrastructure/eigenschutz/export/eigenschutz-vorfall-json.renderer.ts` | Schema + JSON-Renderer                                  |

Sync-Merge (Story 3.9/3.10) ist **nicht primär** Teil dieser E2E-Suite — der dortige Test-Kanon liegt in den Sync-spezifischen Specs. Die Auslagerung ist bewusst (siehe Story-Out-of-Scope).

## 8. Triage-Trennung (Epic-AC-Pflicht)

| Klasse                       | Eintrag                                                                                                                                                                                                                                                                | Owner                                       | Status                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| **Story-blockierend**        | Outbox-Event `PsaProfilGeaendert` fehlt nach CBRN-Submit (würde Spec failen)                                                                                                                                                                                            | Dev-Agent / Story 7.11                      | Verifiziert beim ersten CI-Run; aktuell ungeprüft       |
| **Sandbox-Effekt**           | `EPERM listen`-Fehler beim `vite preview`-Spawn ohne `--strictPort` (Story 7.2-Analogie). Kein Pilot-Risiko.                                                                                                                                                            | —                                           | Mitigiert durch `--strictPort` im `global-setup.ts`     |
| **Unrelated Repo-Signale**   | `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung.repository.spec.ts` — Story-6.5-dokumentierte Failure, unabhängig von Story 7.11. Triage-Pflicht aus Epic-AC.                                                       | `@bluelight-hub/backend`-Maintainer         | **Open, Mitigation-Path: Story-6.5-Folge-Story** (siehe Verlinkung unten) |
| **Unrelated Repo-Signale**   | Vitest-Baseline-Lauf (Story-7.11-Validierung, 5780 Tests): 8 Test-Failures in 4 Test-Files (`features/etb/.../EtbEntryForm.spec.tsx`, `features/lagekarte/.../MapLayerSwitcher.molecule.spec.tsx`, `routes/.../psa-profile.route.spec.tsx`, `routes/.../sicherheitsregeln.route.spec.tsx`). Symptome `Cannot read properties of null (reading 'isServer')` und `validateSearch?.(...) === undefined` deuten auf TanStack-Router-API-Drift nach `pnpm install` mit aktualisierten Minor-/Patch-Versionen. **Nicht** durch Story-7.11-Specs verursacht (Vitest matcht `e2e/`-Dateien nicht; Playwright-Tests laufen über einen separaten Runner). | Frontend-Maintainer | **Open, Sandbox-Effekt vs. Repo-Regression — Differential-Diagnose Block-B-Pre-Flight (vor Branch-Protection-Aktivierung)** |

### Story-6.5-Failure-Status-Verlinkung (Epic-AC-Pflicht, Option B)

- **Datei (verifiziert):** `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung.repository.spec.ts` (40.8 KB, existiert) — keine Tilgung im Story-7.11-Scope.
- **Status:** **Open**. Es liegt **kein** Story-7.11-Commit vor, der den Failure-Pfad fixt (Story 7.11 ist explizit E2E-Test-Story, keine Backend-Bug-Fix-Story — Out-of-Scope-Wortlaut der PRD-Story).
- **Owner-Vorschlag:** `@bluelight-hub/backend`-Maintainer.
- **Re-Verifikations-Schritt:** `pnpm --filter @bluelight-hub/backend exec jest --testPathPatterns="prisma-gefaehrdungsbeurteilung.repository.spec" --no-coverage` — Failure muss reproduzierbar sein.
- **Mitigation-Pfad:** Defer-Eintrag in `_bmad-output/implementation-artifacts/deferred-work.md#unrelated-failure-prisma-gefaehrdungsbeurteilung`, Owner-Vorschlag wie oben, Begründung „unrelated to Story 7.11 E2E-Coverage, fachlich nicht journey-relevant".

## 9. Cypress-Stub-Boyscout-Cleanup

- **Gelöschte Dateien:**
  - `packages/frontend/cypress/` (komplettes Verzeichnis inkl. `cypress/e2e/admin-login.cy.ts`)
  - `packages/frontend/cypress.d.ts`
- **Begründung:** Toter Code seit Story-1-Skeleton — Cypress-Lib ist **nicht** in `package.json` installiert, keine Build-Scripts referenzieren den Stub. Boyscout-Rule aus CLAUDE.md erlaubt scoped Cleanup.
- **Vorab-Referenz-Prüfung:**
  - `grep -rn "cypress" packages/frontend/ -l --exclude-dir=node_modules --exclude-dir=cypress` → nur `packages/frontend/tsconfig.app.json` (im `include`-Array).
  - `packages/frontend/tsconfig.app.json` `include`-Array auf `["src"]` reduziert — der Build referenziert weder das Cypress-Verzeichnis noch das gelöschte `e2e`-Verzeichnis (Playwright bringt eigenen Compile-Scope via `playwright.config.ts:testDir`).
- **Kein Boyscout-Block:** Keine indirekten Referenzen entdeckt → Cleanup wurde durchgeführt.

## 10. Block-B-Handoff-Tabelle (Human-QA-Pflicht vor Pilot-Cutover)

| Code | Titel                                                  | Hardware / Voraussetzung                                                                                                  | Pass-Schwelle                                                                                            | Geschätzte Dauer | Owner                                |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------ |
| B1   | 3-Geräte-Multi-Client-Walk für Journey 1b              | 2× Surface 10" + 1× iPad 11" im selben Netzwerk gegen Pilot-Backend; Offline-Modus möglich                                | Alle 3 Devices zeigen denselben `AmpelProjection`-State + 0 Pending-Commands ≤ 5 s nach Online-Re-Connect | 60 min           | Pilot-QA + Sicherheitsbeauftragter   |
| B2   | Senior-Operator-Smoke + PDF-Title-Match Journey 4      | 1 Stabs-Tablet (Pilot-Hardware-Profil); System-PDF-Viewer (Preview macOS / Edge Windows)                                   | Qualitatives „flüssig + erwartbar"-Feedback + Vorfall-Titel im PDF-Viewer-Header sichtbar                | 30 min           | Senior-Operator + Pilot-QA           |
| B3   | GitHub-Branch-Protection-Aktivierung `linux-e2e`        | Repo-Admin-Rechte; 3 grüne Probe-Runs des `linux-e2e`-Jobs gegen unkritische PRs                                          | Gate aktiv, kein PR ohne erfolgreichen `linux-e2e`-Run mergebar                                          | 15 min           | Repo-Admin                           |
| B4   | Pilot-Cutover-Smoke gegen Production-DB-Snapshot       | Pilot-DB-Snapshot mit realistischer Daten-Anzahl (NFR-C1-Order); lokale `pnpm test:e2e`-Ausführung                        | Beide Journey-Specs grün + Sanity-Schwelle ≤ 90 s im Median über `n=3` Runs                              | 90 min           | Pilot-QA                             |

> **P30 (Code-Review 2026-05-12):** Ehemaliges Item `B5 Eigenschutz-Rollen-Bridge im Backend-Setup persistieren` wurde **gestrichen**. Verifikation gegen `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts:183` zeigt: der aktive `EinsatzScopeGuard` baut `einsatzPermissions` ausschließlich aus `parsePermissions(userEntity.permissions, …)` (User-Spalte), nicht aus der `EinsatzRollenbesetzung → RollenDefinition`-Kette. Der Seed setzt `User.permissions` bereits korrekt; eine zusätzliche Rollen-Bridge ist redundant. Falls eine Folge-Story den Guard auf den Rollen-Pfad umstellt, wäre das ein eigener Block-A-Schritt in dieser Story.

## 11. Tooling-Limit-Disclaimer

Was die CI-Sandbox **nicht** kann:

- **Echte Stabs-Tablet-Hardware** für Pilot-Performance-Verifikation — die ≤ 90 s-Schwelle aus Block A misst Ubuntu-Runner-Walltime, nicht Tablet-Walltime.
- **Echte 3-Geräte-Netzwerk-Trennung** für Offline-Resync — Playwright-Multi-Context simuliert WS-Propagation in einem einzigen Browser-Prozess. Block B1 schließt die Lücke.
- **Echte Production-Datenbank-Größen-Order** (NFR-C1: 20 Abschnitte × 5 Einheiten × 500 Items × 200 Vorfälle) — die CI-Test-DB ist klein; Block B4 deckt das ab.
- **PDF-Inhalts-Verifikation auf Text-Ebene** — der Block-A-Test prüft Magic-Bytes + Byte-Größe, **nicht** Vorfall-Titel als Substring (FlateDecode-Komprimierung macht Raw-Bytes-Search unzuverlässig). Block B2 deckt den Title-Match im System-PDF-Viewer ab.
- **Branch-Protection-Aktivierung** — GitHub-Repo-Settings sind nicht über CI mutierbar. Block B3 deckt das manuell ab.

## 12. Re-Run-Konvention

Ein Audit-Refresh ist erforderlich:

- bei jedem neuen Journey-Schritt in 1b oder 4 (z. B. neuer Drawer-Schritt, neue Export-Variante);
- nach jedem Playwright-Major-Upgrade (z. B. 1.5x → 2.0);
- nach jedem AppModule-Bootstrap-Wechsel im Backend (neue Env-Variablen, neue Auth-Pfade);
- nach jeder `EigenschutzVorfallExportV1`-Schema-Erweiterung (Phase-2-Format ergänzt → V1 bleibt versioniert, der Bericht ergänzt eine Sektion 7-Drift-Audit).

**Versionierung:** Dieser Bericht folgt Semver — `version: 1.0.0` für die initiale Story-7.11-Auslieferung. Patches (Tippfehler, Link-Reparaturen) erhöhen die Patch-Version, neue Sektionen die Minor-Version, breaking Re-Strukturierungen die Major-Version. Anker (Markdown-Heading-Slugs) bleiben stabil — explizit **keine** Zeilennummern in externen Verweisen.
