# UI/UX — Aktueller Umsetzungsstand

> **Stand:** 2026-04-17
> **Version:** Alpha `1.0.0-alpha.102`
> **Aktueller Branch-Kontext:** `627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher`
> **Charakter:** Lebendes Dokument — bei signifikanten UX-Änderungen aktualisieren

## Zweck

Dieses Dokument ist der **Puls des Frontends**: Was ist in Ring 1, Ring 2 und Ring 3 tatsächlich gebaut? Wo liegen offene Kanten? Welche Qualitätsgates sind abgenommen, welche warten?

Es ergänzt die zeitlosen Ring-Verträge um eine momentane Bestandsaufnahme.

## Ring-Status im Überblick

| Ring | Status | Nachweis |
| --- | --- | --- |
| Ring 1 — Visuelle Sprache | ✅ stabil | [`ring-1-design-tokens.md`](./ring-1-design-tokens.md), Tests unter [`shared/ui/__tests__/ring-1-*.spec.ts`](../../packages/frontend/src/shared/ui/__tests__/) |
| Ring 2a — Workspace-Fundament | ✅ stabil | [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md), ADR-004 |
| Ring 2b — Review-Gates | 🟡 in Anwendung | [`ring-2-review-gates.md`](./ring-2-review-gates.md) — universelle Gates implementiert, manuelle Assistive-Tech-Durchläufe pro Story |
| Ring 2c — Performance-Gates | ✅ stabil | [`ring-2-performance-gates.md`](./ring-2-performance-gates.md), Guardrail-Specs für `Überblick`/`ETB`/`Befehle` |
| Ring 2d — Session/API-Vertrag | ✅ stabil | [`session-api-contract-ring-2.md`](./session-api-contract-ring-2.md) |
| Ring 3 — Komponenten-Vertrag | 🟡 dokumentiert | [`ring-3-component-contract.md`](./ring-3-component-contract.md) — Katalog vollständig, fehlende Tests pro Atom werden laufend ergänzt |

## Frontend-Inventar (Stand Projekt-Scan 2026-04-17)

| Einheit | Anzahl |
| --- | --- |
| Feature-Module | 22 |
| File-based Routes | 72 |
| TanStack-Query-Hooks | 543 |
| Custom Hooks (gesamt) | 227 |
| TanStack Stores | 57 |
| Shared Atoms | 46 |
| Shared Molecules | 30 |
| Shared Organisms | 22 |
| Shared Templates | 7 |
| Test-Dateien Frontend | 354 |
| Test-Cases Frontend | 1 474 |

## Design-Tokens

- **Token-Namespace:** `--ring-1-*` (primitive) + Tailwind-`@theme inline`-Aliase (semantisch)
- **Kategorien-Abdeckung:** Farbe ✅ · Typografie ✅ · Spacing/Density ✅ · Radius ✅ · Shadow ✅ · Warnstufen ✅ · Motion ✅
- **Light/Dark-Mode:** vollständige Abdeckung, gesteuert über `.dark` auf `<html>` via `next-themes`
- **Jüngste Erweiterung (Story 7.1):** Eigenschutz-Nacht-Einsatz-Tokens für Severity-, PSA-Profil-, Sync- und kritische Fokuszustände, inklusive Light-/Dark-Parität und automatisierten Kontrasttests
- **Offene Punkte:**
  - `Geist`/`Geist Mono` wurden in Story 1.1 bewusst nicht eingeführt — Entscheidung gilt fort, solange keine Marketing-nahe Fläche dazukommt
  - `surface-elevated` ist aktuell Alias auf `surface-raised` — bei Bedarf eigenständiger Token

## Shell und Workspace

### Kanonische Anker

| Anker | Rolle | Ring-Slot |
| --- | --- | --- |
| `WorkspaceShell` | Gesamter Shell-Rahmen | alle Slots |
| `WorkspaceContextBar` | Einsatz-Kontext, Titel, Rücksprung | Context |
| `ModuleRail` | Modul-Navigation | Navigation |
| `StatusRail` | Live-Status | Status |
| `CommandPalette` | Shell-nahe Suche/Aktionen | Overlay |
| `SingleEinsatzLayout` | Operativer Arbeitsraum für einen Einsatz | Template |

### Registry

- Modul-Registry ist typisiert und enthält pro Modul: `id`, `label`, `routeTarget`, `description`, `icon`, `shortcut`, `badgeHint`, `visibility`, `priority`, `subPages`
- Shortcut-Metadaten sind **nicht** in JSX-Strings, sondern im Contract
- `routeTarget` ist je Modul ausdrücklich modelliert, nicht implizit aus `subPages[0]`

### Status-Zustände

Der Ring-2-Vertrag fordert lesbare Zustände für: `loading`, `pending`, `warning`, `error`, `offline`, `local draft`, `syncing`, `synced`, `failed`, `conflict/retry`, `degraded connection`, `readonly/locked`, `focus/active`. Alle produzieren mindestens Text + Icon oder Zähler, nicht nur Farbe.

### Eigenschutz: Auto-Save und Versionsabschluss

Die Gefährdungsbeurteilungs-Detailseite nutzt seit Story 415-2-5 keinen generischen Speichern-Button mehr. Änderungen an Gefährdungs-Items werden nach 2 Sekunden Inaktivität über den bestehenden Update-Hook persistiert; der primäre Button heißt „Version abschließen" und führt denselben Save-Pfad sofort aus. `Ctrl/Cmd+S` triggert ebenfalls diesen Abschluss.

Die Statuszeile wird über `SyncStatusBadge` gerendert und nutzt `aria-live="polite"`. Sichtbare Zustände sind: `Änderungen offen`, `Lokal gespeichert`, `Wird synchronisiert`, `Synchronisiert`, `Version {n} gespeichert`, `Konflikt`, `Speichern fehlgeschlagen` und `Offline gespeichert`. Konflikte und Fehler bleiben inline in der bestehenden `SeverityBanner`-Fläche; es gibt keine Sonner-Toasts für Save-, Offline- oder Konfliktzustände.

Seit Story 7.1 nutzen `SeverityBanner`, PSA-Profil-Chips und `SyncStatusBadge` fachliche Ring-1-Tokenfamilien statt lokaler Tailwind-Palettenfarben. Die Abdeckung wird über Ring-1-Kontrasttests und die `AmpelCard`-Prüfmatrix für Light-/Dark-Zustände nachgewiesen; Farbenfehlsichtigkeits-Simulationen bleiben manuelle Prüfpunkte auf derselben Matrix.

Offline-Auto-Saves werden als feature-lokale Pending Commands unter `bluelight:eigenschutz:pending-commands:v1` abgelegt. Der Zugriff läuft ausschließlich über den Platform Storage Adapter. Auto-Save-Commands derselben Gefährdungsbeurteilung und `expectedVersion` werden zusammengeführt; Replay läuft FIFO. Ein echter 409 bleibt als Konflikt sichtbar, während ein bereits angewandter Payload entfernt werden kann.

Seit Story 7.5 zeigt das gemeinsame Eigenschutz-Layout zusätzlich einen zentralen `SyncStatusBadge` mit den Produktzuständen `Synchronisiert`, `Lokal · N ungesynct`, `Offline` und `Konflikt`. Der Status wird aus der bestehenden Pending-Command-Queue, der Sync-Konflikte-Query und dem TanStack-Online-State abgeleitet; `conflict` gewinnt vor `offline`, danach folgt `pending`. Ein Headless-UI-Popover zeigt Pending-Zahl, älteste lokale Änderung, letzte bekannte Sync-Zeit, Konfliktzahl und den Link zur bestehenden Konfliktliste. Offline-Wechsel erzeugen keinen Dialog, kein Modal und keinen Toast; offene Konflikte erhalten nur dann einen kompakten Summary-Banner, wenn der bestehende Live-Mikro-Banner gerade keine Notices zeigt.

### Eigenschutz: Keyboard-Shortcuts und Kbd-Legende

Seit Story 7.2 liegen die fachlichen Eigenschutz-Shortcuts zentral unter `features/eigenschutz/constants/shortcuts.constants.ts`; die Registrierung läuft über `useEigenschutzShortcuts` auf Basis von `react-hotkeys-hook`. `⌘K`/`Ctrl+K` bleibt bewusst im bestehenden Shell-Pfad der `CommandPalette`, während `/`, `N`, `V`, `?` und `Esc` kontextbezogen in den Eigenschutz-Flächen verdrahtet sind. Eingabefelder, Textareas, Selects, `contenteditable` und ARIA-Textfelder sind gegen globale Einzelbuchstaben-Hotkeys geschützt.

Das neue shared Atom `<Kbd>` rendert semantisches `<kbd>` mit Ring-1-Tokenklassen und plattformgerechter `mod`-/`cmd`-Anzeige. Gefährdungsbeurteilungen und Vorfälle zeigen zusätzlich eine ruhige Shortcut-Hilfe als kleines Overlay; die Hilfe listet nur die für den aktuellen Kontext sinnvollen Kürzel und bleibt über `?`, `Esc` und einen sichtbaren Schließen-Button bedienbar.

### Eigenschutz: Command-Palette-Aktionen

Seit Story 7.3 ergänzt die bestehende Shell-Command-Palette eine eigene Gruppe „Eigenschutz" mit operativen Einsprüngen für Gefährdungsbeurteilung, Vorfallmeldung, PSA-Profiländerung, Sicherheitsregel, Sicherungsposten, Dashboard, Konfliktauflösung und Vorfall-Archiv. Die Gruppe wird in `SingleEinsatzLayout` über den bestehenden `ModuleConfig`-Vertrag eingespeist; es gibt keine zweite Palette und keinen zusätzlichen globalen `⌘K`-/`Ctrl+K`-Listener.

Drawer-basierte Aktionen nutzen kleine, defensive Search-Params (`action=...`) und entfernen diese nach Schließen oder Speichern wieder per `replace`, damit Refresh und Browser-Back keine Wiederöffnungsschleifen erzeugen. Disabled-Zustände übernehmen den Workspace-/Rollen-Grund aus der Sicherheitsfläche; sekundäre Rollen können dadurch keine Eigenschutz-Mutationsbefehle aktiv auslösen. Die Palette-Suche normalisiert deutsche Umlaute und Keyword-Aliase, sodass sowohl `Gefährdung` als auch `Gefaehrdung` passende Befehle finden.

### Eigenschutz: Entity-Deep-Links

Seit Story 7.4 haben Eigenschutz-Entitäten stabile, kopierbare Detail-URLs. Gefährdungsbeurteilungen, Vorfälle und Sicherungsposten nutzen ihre bestehenden Detailseiten; PSA-Zuweisungen und Sicherheitsregeln ergänzen additive Detailrouten, die die vorhandenen Listen-/Drawer-Flächen öffnen. Der Link-kopieren-Button verwendet das shared `CopyButton`-Pattern mit ruhigem Inline-Status statt Toast.

Fokus-Links bleiben refreshfest: `focusItem` scrollt und fokussiert Gefährdungs-Items, PSA-Links unterscheiden echte Zuweisungs-IDs von `propagationGroupId`, und fehlende Ziele zeigen Inline-Hinweise. Desktop-Deep-Links nutzen `bluelight://open?path=...` und akzeptieren nur interne `/app/einsatz/...`-Ziele.

### Eigenschutz: Toast-freie Mutationen und destruktive Aktionen

Seit Story 7.6 ist die Eigenschutz-Linie für Mutations-Feedback in [`packages/frontend/src/features/eigenschutz/CONSISTENCY.md`](../../packages/frontend/src/features/eigenschutz/CONSISTENCY.md) dokumentiert: Erfolgreiche Mutationen erzeugen keinen Sonner-Success-Toast, sondern werden über Statusänderung sichtbar. Der Vorfall-Melden-Drawer schließt nach Erfolg und die Vorfallliste aktualisiert sich über den bestehenden Query-Pfad; PDF-/JSON-Exports bleiben bei Inline-Banner und `meta: { silentError: true }`.

Destruktive Aktionen nutzen ein einheitliches Pattern aus Pflicht-Begründung, dem Hinweis „Diese Änderung wird historisiert und kann nicht gelöscht werden." und `intent="danger"` mit `appearance="outline"`. Das frühere Last-Basis-Confirm-Modal im `PSAChangeDrawer` ist durch einen Inline-Bestätigungsblock im Drawer ersetzt. `AufloeseSicherungspostenDialog` und `MeldeLueckeDialog` folgen derselben Linie. Ein automatisierter Konsistenz-Test unter `features/eigenschutz/__tests__/consistency.spec.ts` blockiert neue `toast.success`-Aufrufe und undokumentierte Destructive-Pattern-Abweichungen.

## Komponenten (Ring 3)

### Reife pro Ebene

| Ebene | Reife | Notizen |
| --- | --- | --- |
| Atoms | ✅ stabil | Varianten-API (`intent`/`appearance`/`size`) konsistent, Tests vorhanden für Kernkomponenten |
| Molecules | ✅ stabil | Dialog-Familie (`Dialog`, `.Confirm`, `.Alert`, `.SlideIn`) bewährt; Form-Wrapper über TanStack Form |
| Organisms | 🟡 laufend | Command-Palette und Workspace-Rails komplett; Dashboard-Panels werden je Feature verfeinert |
| Templates | ✅ stabil | 4 produktive Layouts (`AuthLayout`, `AdminLayout`, `AdminDashboardLayout`, `SingleEinsatzLayout`) |

### Bewährte Muster

- `cn()`-Utility (`clsx` + `tailwind-merge`) als einziger Class-Merger
- Headless UI überall dort, wo Tastatur- und Screenreader-Verhalten heikel wird (Dialog, Combobox, Switch, Checkbox, Tabs)
- `forwardRef` für alle Form-Primitives — Ref-Zugriff aus Feature-Code funktioniert überall
- Loading-States im Button sind absolut positioniert, damit die Button-Fläche beim Laden nicht springt

### Bekannte Feinheiten

- `Dialog.SlideIn` scrollt den Content-Bereich — Combobox-/Listbox-/Menu-Optionen müssen per `anchor="bottom start"` über Floating-UI rendern, sonst schneiden sie ab
- `Dialog` nutzt `__demoMode` bei Headless UI, um `Escape` selbst zu behandeln (Capture-Phase)
- `Button.kbd` formatiert Modifier-Tasten (`cmd`→⌘, `shift`→⇧, `alt`→⌥) über eine kleine `KEY_MAP` im Atom

## Feature-Flächen (Auszug, 22 Features gesamt)

| Feature | Hauptflächen | UX-Status |
| --- | --- | --- |
| `einsatz` | `SingleEinsatzDashboard`, Wechsel-Dialog, Beitritts-Flow | stabil · Performance-Gate abgenommen |
| `etb` | `EtbPage`, `EtbEntryList`, Composer-Workspace, Kategorie-Filter | stabil · Performance-Gate abgenommen · Virtualisierung aktiv |
| `befehl` | `BefehlsListeMitEingabe`, Karten, Filter, Kommentar-Thread | stabil · Performance-Gate abgenommen |
| `lagekarte` | `LagekarteView` (MapLibre GL), Drawing-Engine, Layer-Switcher, Gefahrenzonen-Matrix-Sync (Issue #627) | aktiv in Entwicklung |
| `kraefte` | Personen, Fahrzeuge, Einheiten, Qualifikationen, Zuweisungs-Dropdowns | stabil |
| `funkverkehr` | Funkkanal-Aggregat, Zuweisungs-Flows | stabil |
| `reminders` | Multi-Eskalation, Snooze, Templates, Tauri-Audio-Alerts | stabil |
| `alarmierung` | Empfänger-Management, Nachalarmierung | stabil |
| `auth` | `LoginWindow`, Server-Auswahl, Invite-Flow, Admin-Setup | stabil · Session-API-Vertrag greift |
| `admin` | User-Management, Integrationen, Qualifikationen-Mapping | stabil |

## Qualitätsgates

### Accessibility (Ring 2a)

- Automatisierte Shell-/Landmarken-/Keyboard-/Status-Assertions laufen im Vitest-Stack
- `ModuleRail`-Shortcut-Verhalten, `StatusRail`-Live-Status, `WorkspaceContextBar`-Non-Nesting sind als Contract-Tests verankert
- Manuell pro Ring-2-Story: VoiceOver (macOS), NVDA (Windows), `200 %`-Zoom, Browser-Matrix

### Performance (Ring 2b)

Verbindliche Gates gegen die Referenzlasten:

| Fläche | Referenzlast | Grenzwert |
| --- | --- | --- |
| `Überblick` | 100 Statusobjekte | `usable-state P95 ≤ 2000 ms` · `interaction-feedback ≤ 200 ms` · `status-feedback ≤ 300 ms` · `pass-rate ≥ 95 %` bei 30 Läufen |
| `ETB` | 200 Einträge | s. o. |
| `Befehle` | 20 offene Befehle | s. o. |

Reports werden maschinenlesbar via [`ring-2-performance-metrics.ts`](../../packages/frontend/src/test/performance/ring-2-performance-metrics.ts) erzeugt.

### Browser und Assistive Tech

Referenz-Matrix Stand Story 1.2a (2026-03-16):

- Chrome 146 + Vorgänger
- Edge 146 + Vorgänger
- Safari 26.2 + 26.1
- Firefox 140.7 ESR
- VoiceOver (macOS), NVDA (Windows)

## Responsive

| Größenklasse | Erwartung |
| --- | --- |
| `< 640 px` | aktives Modul sichtbar, Modulübersicht über Overlay, Command-Trigger erreichbar |
| `640–1023 px` | kompakte Rail mit priorisierten Modulen + Overview-Button |
| `≥ 1024 px` | Desktop-Referenz — Shell vollständig, Kontext + Status parallel lesbar |
| `≥ 1536 px` | Wide-Desktop — keine erzwungene inhaltliche Verdichtung |

Touch-Targets bleiben ausreichend groß; keine Orientierung über Hover-Only-Zustände.

## Motion und Alarm-Feedback

- Alarm-Eskalation in zwei Stufen: `.animate-border-glow` → `.animate-pulse-urgent` + `.animate-border-glow-urgent`
- Audio-Ausfall-Signal: `.animate-pulse-audio-failed` (Shake + Scale)
- Update-Highlights: `.animate-highlight-new` (grün), `.animate-highlight-updated` (amber)
- `prefers-reduced-motion` liefert statische Fallbacks mit Shadow-/Opacity-Änderungen

## Desktop-Shell (Tauri)

- Tauri 2.10, Cross-Build für macOS arm64/x64, Windows, Linux, iOS, Android
- Store-Plugin via `@tauri-apps/plugin-store` (Setup: [`../frontend-tauri-plugin-store-setup.md`](../frontend-tauri-plugin-store-setup.md))
- Audio-Alerts über Tauri-Native-API bei Reminder-Eskalation
- Self-signed HTTPS im Dev-Modus (mkcert): Frontend `https://localhost:3090`, Backend `https://127.0.0.1:3091`

## Story 7.7 — Responsive-Verifikation (Stand 2026-05-10)

- **Viewport-Meta-Lock entsperrt (WCAG 1.4.4):** `packages/frontend/index.html` setzt nur noch `width=device-width, initial-scale=1.0`. Pinch-Zoom ist auf allen Touch-Geräten möglich. Regression-Sicherung: `src/__tests__/viewport-meta.spec.ts`.
- **Responsive Single-Source-of-Truth:** Verbindliche Breakpoint-Tabelle, Audit-Scope und Marker-Konventionen sind in [`responsive-device-test-report.md`](./responsive-device-test-report.md) gepflegt. Re-Runs nach Layout-Refactor ergänzen dort die Geräte-Sektionen.
- **Block-A-Audits (automatisiert):** Vitest-Heuristiken decken Touch-Target (`src/features/eigenschutz/__tests__/touch-target-audit.spec.tsx`), Breakpoint-Switch (`src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.responsive.spec.tsx` 320/768/1024/1280/1440 px) und Reflow auf 320 px (`src/features/eigenschutz/__tests__/reflow-audit.spec.tsx`) ab.
- **Block-B-Handoff (Human-QA):** Pinch-Zoom auf MapGL, Long-Press-Multi-Select, 200-%-Zoom-Walkthrough, Route-TTI-Stichprobe und Senior-Operator-Tablet-Modus sind im Bericht mit Reproduktionsschritten als `human-handoff-pending` dokumentiert. Vor dem Pilot-Release abzuarbeiten.

## Story 7.8 — A11y-Audit + axe-core + Screenreader-Walk

- **axe-core als Vitest-Gate:** Story 7.8 verdrahtet `axe-core` direkt (ohne `vitest-axe`/`jest-axe`/`@axe-core/react`). Helper liegt unter `src/test/a11y.ts` (`expectNoAxeViolations` + Vitest-Matcher `toHaveNoAxeViolations`), Default-Tags `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`/`best-practice`.
- **Vier neue Audit-Specs (Block A automatisiert):** `__tests__/a11y-audit.spec.tsx` (Hero-Routen + State-Matrix für 16+ Komponenten), `__tests__/aria-structure-audit.spec.tsx` (Live-Regions, Alarm-Budget, Drawer-Fokus, PSA-Chip-Group, Risk-Matrix, Form-Errors), `__tests__/contrast-audit.spec.ts` (token-basierte WCAG-Kontrast-Verifikation Light + Dark) und `__tests__/keyboard-journeys-audit.spec.tsx` (mausfreie Pfade für Journeys 1a, 1b, 2, 4).
- **Block-B-Handoff (Human-QA):** NVDA, VoiceOver, JAWS, TalkBack, BITV-2.0-Selbstbewertung, Senior-Operator-Probe, Switch-Control und Farbenfehlsichtigkeits-Walkthrough sind im Audit-Bericht als Human-QA-Handoff dokumentiert. Single-Source-of-Truth bleibt [`docs/audits/eigenschutz-a11y-audit-2026-05-10.md`](../audits/eigenschutz-a11y-audit-2026-05-10.md).
- **jsdom-Limit ehrlich vermerkt:** `color-contrast` und `color-contrast-enhanced` sind in den axe-Default-Optionen deaktiviert, weil jsdom keine echten Compute-Style-Werte für CSS-Custom-Properties liefert. Kompensation läuft über die Token-basierte Kontrast-Spec (Light + Dark) und den Browser-Smoke in Block B.

## Story 7.10 — Performance-Audit + Bundle-Size-Gate (Stand 2026-05-11)

- **Versionierter Audit-Bericht als Single-Source-of-Truth:** [`docs/audits/eigenschutz-performance-audit-2026-05-11.md`](../audits/eigenschutz-performance-audit-2026-05-11.md) deckt NFR-P1–P7, NFR-C1 und NFR-S5 ab. 13 Pflicht-Sektionen, YAML-Frontmatter mit `version: 1.0.0` (Semver für Re-Runs), DoD-Banner für Block-A/Block-B-Trennung.
- **Vier neue Block-A-Specs:** Bundle-Size-Gate (`src/test/bundle-size/eigenschutz-bundle.spec.ts`, ≤ 150 kB gzip via `node:zlib.gzipSync()`), Route-TTI Render-Smoke (`src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.tti.spec.tsx`, < 500 ms jsdom), NFR-P6 Offline-Sync (`src/features/eigenschutz/lib/__tests__/pending-command-queue.nfr-p6.spec.ts`, < 5 s mit scripted Mock-Latenzen), NFR-C1-Fixtures (`src/test/performance/eigenschutz-nfr-c1.fixtures.ts`).
- **Backend-Block-A-Specs:** AmpelProjection-Konsistenz (3 Invarianten + Mikrobenchmark), Cascade-Coverage-Discovery (Schema-Parser über `prisma/schema.prisma`), PDF-Renderer-Wallclock (30 Iterationen Worst-Case, p95 < 5 s), Artillery-NFR-C1-Szenario (`packages/backend/artillery/artillery-eigenschutz-nfr-c1.yml` + Seed-Skript).
- **Architektur-Hotspot-Entscheidung (AC4):** PrismaService-Direktnutzung im `list-offene-rueckmeldungen.handler.ts` → Pfad γ (Architektur-Follow-up) gewählt, dokumentiert in `_bmad-output/implementation-artifacts/deferred-work.md#story-7.10`.
- **Audit-Findings (P1-Defer-Einträge):** (1) NFR-S5 Cascade-Cover fehlt für 5 Eigenschutz-Models (`PsaProfilQuittung`, `EigenschutzVorfall`, `EigenschutzTelemetryEvent`, `AmpelProjection`, `SyncConflict`), (2) `AmpelProjection.letzteAenderungAm` regressiert bei Out-of-Order-Replay, (3) MetricsInterceptor 404-Fallback bleibt offen. Alle drei in `deferred-work.md` mit Owner + Mitigation-Pfad.
- **Block-B-Handoff (Human-QA-Pflicht vor Pilot-Cutover):** B1 Lighthouse-Walk auf Stabs-Tablet (NFR-P1 ≤ 2 s), B2 50-Client-Artillery gegen Pilot-Backend (NFR-P2/P4), B3 3-Client-Multi-Geräte-Sync (NFR-P6 ≤ 5 s), B4 Senior-Operator-Smoke, B5 Real-DB-Cascade-Discovery.
- **Pivot-Anker bewusst eingehalten:** Frontend-Code-Splitting bleibt TanStack-Router-Auto-Splitting (keine `manualChunks`), kein `rollup-plugin-visualizer`/`lighthouse-ci`/`webpack-bundle-analyzer` als Dep, Artillery-`.yml` additiv neben Story-5-3a-Baseline, NFR-P5 deterministisch im Backend statt aus Prometheus.

## Story 7.11 — E2E-Tests für Journeys 1b CBRN + 4 Export (Stand 2026-05-12)

- **Erste Browser-getriebene E2E-Coverage:** Story 7.11 verdrahtet Playwright (`@playwright/test` ≥ 1.50) als neue Frontend-DevDep und etabliert das `packages/frontend/e2e/`-Verzeichnis-Layout (Specs, Setup, Fixtures, `.auth`-Storage). Der versionierte Validierungsbericht unter [`docs/audits/eigenschutz-e2e-validierung-2026-05-12.md`](../audits/eigenschutz-e2e-validierung-2026-05-12.md) ist die Pflicht-Single-Source-of-Truth.
- **Zwei Block-A-Specs gegen echtes Pilot-ähnliches Backend:** `e2e/specs/cbrn-journey.spec.ts` (Journey 1b — Multi-`BrowserContext` × 4 für Markus + 3× Steffi-Abschnittsleiter, Outbox-Event-Verifikation via direktem Postgres-`pg`-Pool, WS-Banner-Match, Mix Grün/Amber) und `e2e/specs/vorfall-export-journey.spec.ts` (Journey 4 — Vorfall über `VorfallMeldenDrawer` aus `VorfaellePage`, Snapshot-Verifikation, PDF-Magic-Bytes `%PDF-`, JSON-Validation gegen `EigenschutzVorfallExportV1`).
- **Out-of-Process-Backend-Bootstrap (Pivot-Anker §2):** Backend läuft als separater Node-Prozess via `child_process.spawn('pnpm', ['--filter', '@bluelight-hub/backend', 'exec', 'node', 'dist/main.js'])`. In-Process `AppModule`-Import scheitert an der TS-References-Topologie (`packages/frontend/tsconfig.json` kennt nur `../shared`). Frontend wird per `vite preview` aus dem Production-Bundle ausgeliefert.
- **Soft-Gate ≤ 90 s für Journey 1b:** Operationalisiert als `test.info().annotations`-Annotation mit `console.warn` bei Überschreitung — kein Hard-Fail (Epic-7-AC11 „Sanity-Check, kein Hard-Gate").
- **CI-Wiring `linux-e2e`-Job:** Neuer Job in `.github/workflows/ci.yml` mit Postgres-17-Service analog `linux-backend-db`, `playwright install --with-deps chromium`, Artifact-Upload (`playwright-report/`, `test-results/`, Traces bei Failure), in `summary`-Job verdrahtet.
- **Boyscout-Cleanup:** `packages/frontend/cypress/` + `packages/frontend/cypress.d.ts` gelöscht, `tsconfig.app.json` bereinigt — Cypress-Stub war seit Story-1-Skeleton toter Code (Pivot-Anker §1 entscheidet sich gegen Cypress).
- **Block-B-Handoff (Human-QA-Pflicht vor Pilot-Cutover):** B1 3-Geräte-Multi-Client-Walk gegen Pilot-Backend (NFR-P6), B2 Senior-Operator-Smoke mit PDF-Title-Match im System-Viewer, B3 GitHub-Branch-Protection-Aktivierung für `linux-e2e`-Gate, B4 Pilot-Cutover-Smoke gegen Production-DB-Snapshot.
- **Sandbox-Disclaimer (ehrlich):** Lokaler Dev-Agent-Sandbox kann den E2E-Run nicht reproduzieren (kein Docker-Postgres, kein Chromium-Asset). Verifikation läuft beim ersten CI-Run + im Pilot-Cutover-Smoke (Block B4).

## Offene Kanten (Stand 2026-04-17)

- **Gefahrenzonen × Lagekarte (Issue #627 / ADR-010):** Matrix-Sync auf der Karte, Warnstufen-Darstellung mit Akut-Glow — in aktiver Entwicklung auf Branch `627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher`
- **Ring-3-Test-Abdeckung:** nicht alle 46 Atoms und 30 Molecules haben dedizierte Varianten-Matrix-Tests; wachsend
- **Storybook/Komponenten-Showcase:** bisher nicht eingeführt — Entscheidung offen, da der Katalog heute über Code + Tests belegbar ist

## Nicht im Scope

- Zweite UI-Schicht neben `shared/ui` (explizit untersagt)
- Redux, Biome, ESLint, Prettier, CSS-in-JS, Formik (per CLAUDE.md untersagt)
- Marketing-nahe Typografie/Gradients außerhalb des Auth-Ambient-Tokens
- Benutzerdefinierte Fokus-Ringe pro Fachfläche

## Wie dieses Dokument pflegen

- **Taktung:** bei jedem signifikanten UX-/Komponenten-/Gate-Wechsel, mindestens aber quartalsweise
- **Quelle für Zahlen:** [`docs/project-scan-report.json`](../project-scan-report.json) — bei Aktualisierung die Metriken hier übernehmen
- **Feature-Zeilen:** nur stabile Aussagen aufnehmen, keine spekulativen Pläne — Spekulatives gehört in [`../superpowers/plans/`](../superpowers/plans/)
- **Offene Kanten:** sichtbar halten; geschlossene Kanten mit PR-Referenz markieren und später streichen

## Verweise

- Übersicht: [`00-design-system-overview.md`](./00-design-system-overview.md)
- Tokens: [`ring-1-design-tokens.md`](./ring-1-design-tokens.md)
- Shell: [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md)
- Review-Gates: [`ring-2-review-gates.md`](./ring-2-review-gates.md)
- Performance-Gates: [`ring-2-performance-gates.md`](./ring-2-performance-gates.md)
- Session/API: [`session-api-contract-ring-2.md`](./session-api-contract-ring-2.md)
- Komponenten-Vertrag: [`ring-3-component-contract.md`](./ring-3-component-contract.md)
- Frontend-Architektur: [`../project-documentation/03-frontend-architektur.md`](../project-documentation/03-frontend-architektur.md)
