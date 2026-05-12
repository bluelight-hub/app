# Eigenschutz-Konsistenz

Diese Datei ist der fachliche Anker für ruhiges Feedback und destruktive Aktionen im Eigenschutz-Modul.

## Zero-Success-Toast

Erfolgreiche Mutationen zeigen keinen Sonner-Erfolgs-Toast. Erfolg wird über Statusänderung sichtbar: Drawer schließen, Listen aktualisieren, Banner verschwinden, Sync-Status wechseln oder eine Seite zeigt den neuen Eintrag. Fehler bleiben inline, damit die operative Fläche nicht durch zusätzliche Pop-ups unruhig wird.

Der Vorfall-Export bleibt bewusst auf derselben Linie. `api/use-export-vorfall-as-pdf.ts` und `api/use-export-vorfall-as-json.ts` nutzen `meta: { silentError: true }`; Retry-Informationen erscheinen über Inline-Banner und Page-Status, nicht als Export-Erfolgs-Toast. Das weicht von einzelnen Export-Patterns anderer Module ab, ist im Eigenschutz aber konsistent mit `SeverityBanner` und der Statuszeile.

## Destructive Actions Pattern

Destruktive Aktionen brauchen drei sichtbare Elemente im selben Aktionskontext:

- ein Pflichtfeld für die Begründung,
- den Hinweistext `Diese Änderung wird historisiert und kann nicht gelöscht werden.`,
- einen `Button` mit `intent="danger"` und `appearance="outline"`.

Auf Desktop steht der destruktive Confirm rechts neben Abbrechen/Speichern mit ausreichendem Abstand. Auf Mobile stapeln sich die Aktionen vertikal. Das Pflichtfeld ist die bewusste Reibung; zusätzliche „Bist du sicher?"-Modale werden nicht verwendet, wenn die Aktion bereits in einem Drawer oder Dialog bestätigt wird.

## Erlaubte Ausnahmen

`consistency-allow: destructive-pattern` ist nur für Quelltext-Stellen erlaubt, die durch die einfache Heuristik wie destruktive Aktionen aussehen, aber keine destruktive Backend-Mutation ausführen oder an einen Pattern-konformen Dialog delegieren.

Aktuell gepflegte Marker:

- `ui/pages/GefaehrdungenPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/GefaehrdungenDetailPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/SicherheitsregelnPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/SicherungspostenDetailPage.tsx` — Retry ist Fehler-Recovery; Auflösen öffnet `AufloeseSicherungspostenDialog`.
- `ui/organisms/SicherungspostenDrawer.tsx` — Personal-Entfernen betrifft nur lokale Formularzeilen.
- `ui/molecules/GefaehrdungItemEditor.tsx` — Gefährdungs-Entfernen betrifft lokale Draft-Zeilen; Persistenz bleibt versioniert im Parent-Editor.

Neue Marker müssen hier ergänzt werden. Ohne Dokumentation soll der Konsistenz-Test fehlschlagen.

## Responsive & Zoom

Das Viewport-Meta-Tag in `packages/frontend/index.html` muss `width=device-width, initial-scale=1.0` lauten und darf weder `maximum-scale` noch `user-scalable=no` setzen. Pinch-Zoom auf Touch-Geräten ist Pflicht für WCAG 1.4.4 (Resize text bis 200 %) und für die MapGL-Lagekarte (UX-Spec Zeile 1175). Regression wird durch `packages/frontend/src/__tests__/viewport-meta.spec.ts` blockiert; ein Tauri-spezifischer Override, der den Effekt rekonstruiert, ist nicht zulässig.

Verbindliche Eigenschutz-Breakpoint-Strategie ist in `docs/frontend/responsive-device-test-report.md` als Single-Source-of-Truth dokumentiert. Code-Anker bleibt der zentrale Hook `hooks/use-lg-viewport.ts` (`useSmViewport`, `useMdViewport`, `useLgViewport`, `useXlViewport`, `useXxlViewport`); konkurrierende Viewport-Hooks sind nicht erlaubt.

### Marker-Konventionen für responsive Audits

- `// touch-target-allow: <grund>` — Source-Marker, markiert ein interaktives Element, dem das Touch-Target-Audit (`__tests__/touch-target-audit.spec.tsx`) bewusst keine ≥ 44 px-Mindestgröße abverlangt. Begründung muss konkret sein (z. B. dekorative Inline-Icons in Captions, Tooltip-Trigger ohne eigene Action). Jeder Marker ist im Device-Test-Bericht zu listen.
- `data-touch-target-allow="<grund>"` — Render-Marker, das DOM-Pendant zum Source-Marker. Wird vom Render-basierten Touch-Target-Smoke (`AmpelDashboard.responsive.spec.tsx` Describe „Touch-Target-Smoke") gelesen. Pflicht-Konvention: jedes Element mit `data-touch-target-allow` MUSS auch einen `// touch-target-allow:`-Source-Marker tragen UND in der gepflegten Marker-Liste unten gelistet sein. Der Render-Smoke prüft zusätzlich, dass der `<grund>` aus dem Attribut in dieser Datei vorkommt (verhindert silent Render-only Skips).
- `// reflow-allow: <grund>` — markiert einen Container, dem das Reflow-Audit (`__tests__/reflow-audit.spec.tsx`) bewusst horizontalen Overflow auf 320 px erlaubt (z. B. `RiskMatrix5x5`, MapGL-Container, explizit mit `tabIndex={0}` scrollbare Code-Blöcke). Begründung muss die WCAG-1.4.10-Ausnahme rechtfertigen.

Aktuell gepflegte Marker für `touch-target-allow` (Source-Kommentar + Render-Attribut-`<grund>`):

- `ui/organisms/EigenschutzOffenePunktePanel.tsx` Zeile ~178/181 — Source-Kommentar UND `data-touch-target-allow="inline-secondary-link in Vorfall-Listen-Item"`. Begründung: primärer Touch-Bereich ist die umschließende Vorfall-Karte (≥ 44 px), der Inline-Link „Öffnen" ist sekundärer Quick-Pfad.
- `ui/organisms/EigenschutzOffenePunktePanel.tsx` Zeile ~219/223 — Source-Kommentar UND `data-touch-target-allow="inline-secondary-link in Rückmeldung-Listen-Item"`. Begründung: primärer Touch-Bereich ist die umschließende Rückmeldung-Karte (≥ 44 px), der Inline-Link „Bearbeiten" ist sekundärer Quick-Pfad.

Aktuell gepflegte Marker für `reflow-allow`:

- _keine_ — der Reflow-Spec deklariert MapGL- und RiskMatrix5x5-Container über die Heuristik selbst (Allowlist, nicht Source-Marker).

**Pflege-Konvention:** Jeder neue `// touch-target-allow:` oder `// reflow-allow:` Marker MUSS hier mit `<datei>: <begründung>`-Eintrag aufgeführt werden, damit der Audit-Marker-Test (`includes(<datei>) || includes(<begründung>)`) explizit greift und nicht über zufällige Substring-Matches.

## A11y-Audit

Story 7.8 hat `axe-core` direkt (ohne `vitest-axe`/`jest-axe`/`@axe-core/react`) als Vitest-Gate verdrahtet. Helper liegt unter `src/test/a11y.ts` und exportiert `expectNoAxeViolations` plus den Vitest-Matcher `toHaveNoAxeViolations` (in `src/test/setup.ts` registriert). Default-Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`. Single-Source-of-Truth für die fachliche Befundlage ist `docs/audits/eigenschutz-a11y-audit-2026-05-10.md`.

### Default-deaktivierte axe-Regeln

- `color-contrast` — jsdom liefert keine echten Compute-Style-Werte für CSS-Custom-Properties. Kontrast wird über die Token-basierte Spec `__tests__/contrast-audit.spec.ts` (Light + Dark) und Block-B-Browser-Smoke abgedeckt.
- `color-contrast-enhanced` — gleicher Grund.

### `axe-allow`-Marker-Konvention

Analog zu `touch-target-allow`/`reflow-allow`:

- Source-Marker: `// axe-allow: <regel-id> — <grund>` direkt vor der `rules: { '<id>': { enabled: false } }`-Override-Zeile in der Spec.
- Pflege-Pflicht: jeder Marker MUSS hier mit `<datei>: <regel-id> — <grund>`-Eintrag aufgeführt werden, damit die Audit-Marker-Heuristik nicht über zufällige Substring-Matches greift.
- Aktuell gepflegte `axe-allow`-Marker: _keine_ (Initialzustand, alle vier Audit-Specs laufen ohne lokale Overrides).

### Spec-Anker

- `__tests__/a11y-audit.spec.tsx` — Hero-Routen-Smoke + State-Matrix für 16+ Audit-Scope-Komponenten (axe-Run pro mountbarem State).
- `__tests__/aria-structure-audit.spec.tsx` — Live-Regions, Alarm-Budget (≤ 3 gleichzeitig assertive), Drawer-Fokus, PSA-Chip-Group, Risk-Matrix, Form-Errors.
- `__tests__/contrast-audit.spec.ts` — Token-basierte WCAG-Kontrast-Verifikation Light + Dark, JSON-Snapshot unter `docs/audits/eigenschutz-a11y-audit-2026-05-10.contrast.json`.
- `__tests__/keyboard-journeys-audit.spec.tsx` — Mausfreie Pfade für Journeys 1a, 1b, 2, 4.

## Konsistenz-Test

`__tests__/consistency.spec.ts` liest die Eigenschutz-Quellen und blockiert:

- neue `toast.success(`-Aufrufe,
- destruktive Buttons ohne Hinweistext,
- destruktive Buttons ohne Begründungsfeld,
- destruktive Buttons ohne Outline-Danger-Variante,
- nicht dokumentierte `consistency-allow`-Marker.

Fehlermeldungen nennen Datei und Regel auf Deutsch, damit die Reparatur ohne Kontextsuche möglich ist. Der A11y-Audit aus dem Abschnitt oben ist additiv und ersetzt keine bestehenden Konsistenz-Pflichten — `__tests__/consistency.spec.ts` bleibt unverändert das Gate für Toast-Linie und Destructive-Pattern.

## Code-Anker

- `ui/organisms/VorfallMeldenDrawer.tsx` — Erfolg schließt den Drawer und invalidiert die Liste über den bestehenden Hook, ohne Toast.
- `ui/organisms/PSAChangeDrawer.tsx` — Last-Basis-Entfernung nutzt Inline-Hinweis, Begründung und Outline-Danger im Drawer.
- `ui/organisms/AufloeseSicherungspostenDialog.tsx` — destruktiver Dialog mit Pflicht-Begründung und historisiertem Confirm.
- `ui/organisms/MeldeLueckeDialog.tsx` — Lückenmeldung als destruktive Rückmeldung mit Pflicht-Notiz.
- `api/use-export-vorfall-as-pdf.ts` und `api/use-export-vorfall-as-json.ts` — Export-Sonderfall mit Inline-Banner statt Toast.

## Performance-Audit (Story 7.10)

Story 7.10 verdrahtet einen versionierten Performance-Audit unter `docs/audits/eigenschutz-performance-audit-2026-05-11.md` und führt vier neue Block-A-Specs ein. Single-Source-of-Truth für die fachliche Befundlage ist der Audit-Bericht — Spec-Failures verweisen auf die jeweilige Audit-Sektion.

### Block-A-Specs

- `src/test/bundle-size/eigenschutz-bundle.spec.ts` — NFR-P7 Bundle-Size-Gate ≤ 150 kB gzip via `node:zlib.gzipSync()` über `dist/assets/*.js`, plus Code-Splitting-Strukturverifikation. Standardmäßig per `describe.runIf(...)` übersprungen; aktiviert via `RUN_BUNDLE_SIZE_SPEC=1` oder `CI=true`.
- `src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.tti.spec.tsx` — NFR-P1 Render-Smoke gegen NFR-C1-Last (20 Abschnitte × 5 Einheiten + 500 Gefährdungs-Items + 200 Vorfälle), Soft-Bound < 500 ms (jsdom). Echte TTI-Verifikation kommt aus Block-B-Lighthouse-Walk.
- `src/features/eigenschutz/lib/__tests__/pending-command-queue.nfr-p6.spec.ts` — NFR-P6 Offline-Sync-Latenz Block A, Wallclock < 5 s mit scripted Mock-Sync-Latenzen (median 80 ms, p95 250 ms).
- `src/test/performance/eigenschutz-nfr-c1.fixtures.ts` — NFR-C1-Fixtures (Abschnitte, Einheiten, Gefährdungs-Items, Vorfälle) für die TTI- und Sync-Specs.

### `data-bundle-size-allow`-Marker-Konvention

Analog zu `axe-allow` (Story 7.8), `touch-target-allow` und `reflow-allow` (Story 7.7):

- Allow-List liegt im `DATA_BUNDLE_SIZE_ALLOW`-Array am Anfang von `eigenschutz-bundle.spec.ts` als TS-Datenstruktur (`{ chunkPattern: RegExp; reason: string }`).
- Pflege-Pflicht: jeder neue Eintrag MUSS hier mit `<chunk-pattern>: <begründung>` aufgeführt werden UND einen Verweis auf den Audit-Bericht-Eintrag enthalten (Sektion NFR-P7 in `eigenschutz-performance-audit-2026-05-11.md`).
- Aktuell gepflegte Marker: _keine_ (Initialzustand, alle Eigenschutz-Chunks halten 150 kB ohne Ausnahme).

### Audit-Bericht-Anker

Der versionierte Audit-Bericht ist Pflicht-Single-Source-of-Truth für:

- Block-B-Handoff-Tabelle (B1–B5 mit Pre-Conditions, Steps, Pass/Fail).
- 5 P1-Architektur-Defer-Einträge zu NFR-S5 Cascade-Cover-Decke.
- Architektur-Hotspot-Entscheidung zu PrismaService-Direktnutzung (Pfad γ Architektur-Follow-up).
- Re-Run-Konvention + Semver-Versionierung.

## E2E-Audit (Story 7.11)

Story 7.11 etabliert die erste Browser-getriebene E2E-Coverage für Eigenschutz und verdrahtet einen versionierten Validierungsbericht unter [`docs/audits/eigenschutz-e2e-validierung-2026-05-12.md`](../../../../../docs/audits/eigenschutz-e2e-validierung-2026-05-12.md). Single-Source-of-Truth für die fachliche Befundlage ist der Validierungsbericht; Spec-Failures verweisen auf die jeweilige Sektion.

### Verzeichnis-Konvention

- Playwright-Specs leben unter `packages/frontend/e2e/specs/<journey-name>.spec.ts`.
- Setup, Teardown und HTTP-Seed unter `packages/frontend/e2e/setup/`.
- Benannte Page-Fixtures (`markusPage`, `steffi1Page`, …) unter `packages/frontend/e2e/fixtures/auth-fixtures.ts`.
- `.auth/`-Bundles (Cookies + `seed-state.json`) bleiben gitignored.

### Block-A-Specs

- `packages/frontend/e2e/specs/cbrn-journey.spec.ts` — Journey 1b CBRN-Hochstufung als Multi-`BrowserContext` × 4 (Markus + 3× Steffi-Abschnittsleiter). Outbox-Event-Verifikation via direktem Postgres-Read (`pg`-Pool), WS-Banner-Match akzeptiert sowohl `role="alert"` als auch `role="status"` + `aria-live="assertive"` (Story-7.8-Deferred-konform). Soft-Gate ≤ 90 s via `test.info().annotations`.
- `packages/frontend/e2e/specs/vorfall-export-journey.spec.ts` — Journey 4 Vorfall-Erfassung über `VorfallMeldenDrawer` aus `VorfaellePage` (keine separate `/erfassen`-Route), Snapshot-Verifikation per DB-Read, PDF-Magic-Bytes (`%PDF-` + ≥ 1024 Bytes), JSON-Validation gegen `EigenschutzVorfallExportV1`.

### `data-testid="e2e-eigenschutz-*"`-Konvention

Tests bevorzugen `getByRole`/`getByLabel` mit Name-Match (gleiches Vorgehen wie `keyboard-journeys-audit.spec.tsx`). Wenn eine Produktiv-Komponente keinen brauchbaren ARIA-Hook hat, wird ein stabiles `data-testid="e2e-eigenschutz-<bereich>-<element>"` an die Komponente gehängt — neue Marker müssen hier ergänzt werden:

- Aktuell gepflegte E2E-Marker: _keine_ (Initialzustand, alle Selectoren laufen über ARIA-Rollen).

### Multi-Context-Browser-Pattern

- Storage-State-Bundles pro Test-User werden im `global-setup.ts` per `request.newContext` + `POST /api/auth/login` exportiert.
- `BrowserContext`-Fixtures lesen die JSON-Bundles über `browser.newContext({ storageState })` und liefern eine eingeloggte `Page`.
- Konvention: Mehrere parallele Sessions (Markus + Steffi-1/2/3) laufen im gleichen Spec-`test()`, nicht über `test.describe.parallel()` — die Serialisierung schützt den Outbox-Sequenz-Vertrag.

### Backend-Bootstrap-Architektur

- Pivot-Anker §2 (verbindlich): Backend läuft **out-of-process** via `child_process.spawn('pnpm', ['--filter', '@bluelight-hub/backend', 'exec', 'node', 'dist/main.js'])`. **Kein** In-Process `Test.createTestingModule({ imports: [AppModule] })` — der Frontend-Workspace referenziert ausschließlich `../shared` via TS-References, nicht `../backend`.
- Frontend wird per `vite preview` aus dem statischen Production-Bundle ausgeliefert; `VITE_API_BASE_URL` wird **vor** `vite build` gesetzt (Vite inlined `import.meta.env.VITE_*` zur Build-Zeit).

### Audit-Bericht-Anker

Der versionierte Validierungsbericht ist Pflicht-Single-Source-of-Truth für:

- 12-Sektionen-Pflicht-Layout (Voraussetzungen, Journey-Schritt-Mappings, Sekundär-Verifikationen, Sanity-Schwelle, CI-Wiring, NFR-M1-Capability-Coverage, Triage-Trennung, Cypress-Stub-Cleanup, Block-B-Handoff, Tooling-Limit-Disclaimer, Re-Run-Konvention).
- Triage-Trennung in drei Spalten (story-blockierend / Sandbox-Effekt / unrelated Repo-Signale) inkl. Story-6.5-Failure-Status.
- Block-B-Handoff-Tabelle B1–B4 (3-Geräte-Walk, Senior-Operator-Smoke, Branch-Protection-Aktivierung, Pilot-Cutover-Smoke).
