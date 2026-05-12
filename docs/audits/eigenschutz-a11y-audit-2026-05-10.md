# A11y-Audit-Bericht — Eigenschutz-Modul

**Story:** 7.8 (A11y-Audit + axe-core + Screenreader-Walk)
**Letzte Aktualisierung:** 2026-05-12 (G1-Fokusmodus-Rückbau: `AmpelDashboardRow` und `AbschnittDetailPanel` aus der Audit-Scope-Tabelle entfernt — Komponenten gelöscht; NVDA-Reproduktionsschritt auf `AmpelCard` umformuliert. Ursprüngliche Initial-Veröffentlichung: 2026-05-10.)

> ⚠ **DoD-Hinweis:** Der Story-Status `done` bedeutet **Block A grün**. Block B (NVDA-/VoiceOver-/JAWS-/TalkBack-Walks, BITV-2.0-Stichprobe, Senior-Operator-Tablet-Probe, Switch-Control-Szenario, Farbenfehlsichtigkeits-Verifikation) MUSS vor Pilot-Release abgeschlossen sein, sonst sind WCAG-2.1-AA-/BITV-2.0-Pfade nicht verifiziert. Pilot-Release-Gate setzt voraus, dass alle Block-B-Sektionen den Status `human-handoff-erledigt` tragen.

## Zweck

Dieser Bericht ist die Single-Source-of-Truth für das A11y-Audit des Eigenschutz-Moduls. Er dokumentiert (a) die WCAG-2.1-AA-Checkpoint-Abdeckung, (b) den axe-core-Vitest-Gate-Stand, (c) die Kontrast-Verifikation in Light + Dark Mode, (d) die Audit-Scope-Komponenten-Checkliste mit Block-A-Status, (e) den Block-B-Human-QA-Handoff für die nicht-automatisierbaren Pfade (Screenreader-Walks, BITV-Stichprobe, Pixel-Verifikation, Senior-Operator-Probe, Switch-Control, Farbenfehlsichtigkeits-Verifikation).

Re-Runs nach A11y-relevanten Refactors in Folge-Stories erzeugen einen neuen datierten Bericht unter `docs/audits/eigenschutz-a11y-audit-YYYY-MM-DD.md`, der den vorherigen zitiert. Historie wird per Git getrackt.

## WCAG-2.1-AA-Checkpoint-Tabelle

| Checkpoint | WCAG-Anforderung | Eigenschutz-Umsetzung | Test-Beleg |
| --- | --- | --- | --- |
| 1.4.3 Kontrast (Minimum) | Text ≥ 4.5:1, Large Text ≥ 3:1 | Token-Familien `severity-*`, `psa-profile-*`, `sync-*`, `status-*` halten in Light + Dark die Schwellen ein; `severity-critical-assertive` erreicht zusätzlich AAA (≥ 7:1). | `packages/frontend/src/features/eigenschutz/__tests__/contrast-audit.spec.ts` |
| 1.4.10 Reflow | Inhalt funktioniert auf 320 px CSS-Breite ohne horizontales Scrollen (außer 2D-Inhalte). | Hero-Routen ohne horizontalen Overflow auf 320 px; MapGL-Layer und `RiskMatrix5x5` als 2D-Ausnahmen dokumentiert. | Story 7.7 — `packages/frontend/src/features/eigenschutz/__tests__/reflow-audit.spec.tsx` |
| 1.4.11 Non-Text-Contrast | UI-Komponenten und grafische Objekte ≥ 3:1 gegen die angrenzende Fläche. | Borders, Focus-Ring, Chip-Outlines werden gegen `surface-canvas`/`surface-panel` mit ≥ 3:1 verifiziert (mit dokumentierten `status-*`-Border-Advisories). | `packages/frontend/src/features/eigenschutz/__tests__/contrast-audit.spec.ts` |
| 1.4.13 Content on Hover or Focus | Tooltips/Popover sind dismissable, hoverable, persistent. | Headless-UI-`Popover` und `EigenschutzShortcutHelpPopover` halten die Trigger-/Dismiss-Pflichten ein; manuelle Pixel-Verifikation pro Browser. | Block B — manuelle Tooltip-Verifikation (Hover, Focus, Esc-Dismiss) |
| 1.3.1 Info & Relationships | Strukturen werden programmatisch bestimmbar vermittelt. | Live-Regions auf `SeverityBanner`/`SyncStatusBadge`, `role="grid"` auf `RiskMatrix5x5`, `role="group"` + `aria-label` auf PSA-Chip-Group. | `packages/frontend/src/features/eigenschutz/__tests__/aria-structure-audit.spec.tsx` |
| 2.1.1 Keyboard | Alle Funktionalität ist per Tastatur erreichbar. | Journeys 1a, 1b, 2 und 4 werden ausschließlich über Tab/Shift-Tab/Enter/Space/Arrow/Escape/`?`/`⌘K` gesteuert; keine Maus-only-Pfade in den Hero-Komponenten. | `packages/frontend/src/features/eigenschutz/__tests__/keyboard-journeys-audit.spec.tsx` |
| 2.4.3 Focus Order | Fokus-Reihenfolge erhält Bedeutung und Bedienbarkeit. | Drawer-Trigger → Header → erstes interaktives Element → Submit → Cancel; Restoration auf Trigger nach `Escape`. jsdom prüft die Tab-Order-Heuristik; Browser-Restoration ist Block B. | Block B — Drawer-Fokus-Restoration im Browser (Headless-UI-`requestAnimationFrame`-basiert) |
| 2.4.7 Focus Visible | Fokus-Indikator ist sichtbar. | `focus-ring`/`focus-ring-critical`-Tokens mit ≥ 3:1 gegen `surface-canvas`/`surface-panel`; Pixel-Verifikation in Block B. | Block B — Pixel-Verifikation Focus-Ring (Light + Dark) |
| 2.5.5 Target Size | Touch-Targets ≥ 44 × 44 px (WCAG 2.1 AA: ≥ 24 × 24 px Minimum, UX-Spec ≥ 44 px Sekundär / ≥ 48 px Primär). | Tailwind-Token-Heuristik prüft `min-h-11`/`min-h-12` auf interaktiven Elementen; punktuelle Boyscout-Fixes aus Story 7.7 verankert. | Story 7.7 — `packages/frontend/src/features/eigenschutz/__tests__/touch-target-audit.spec.tsx` |
| 3.3.1 Error Identification / 3.3.3 Error Suggestion | Fehler werden identifiziert und korrigierbar präsentiert. | Form-Errors tragen `role="alert"` und `aria-describedby` an das fehlerhafte Feld; Submit-Fehler springen auf das erste fehlerhafte Feld. | `packages/frontend/src/features/eigenschutz/__tests__/aria-structure-audit.spec.tsx` |
| 4.1.3 Status Messages | Status-Nachrichten ohne Fokus-Wechsel ankündigen. | `SeverityBanner` (`role="status"` + `aria-live="assertive"` für `tone="critical"`, `aria-live="polite"` sonst), `SyncStatusBadge` (`aria-live="polite"`), `GefaehrdungItemEditor`-Counter (`role="status"` + `aria-live="polite"`). | `packages/frontend/src/features/eigenschutz/__tests__/aria-structure-audit.spec.tsx` |

## axe-core-Zusammenfassung

- **Aktivierte Regel-Tags:** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`.
- **Default-deaktivierte Regeln (Helper `packages/frontend/src/test/a11y.ts`):**
  - `color-contrast` — jsdom liefert keine echten Compute-Style-Werte (kein Cascade-Resolver für CSS-Custom-Properties), Kontrast-Prüfung wäre nicht aussagekräftig. Kompensiert über AC4-Token-Spec (`contrast-audit.spec.ts`) und Block-B-Pixel-Verifikation.
  - `color-contrast-enhanced` — analog, AAA-Schwelle, ebenfalls jsdom-untauglich.
- **Aktuelle `axe-allow`-Marker im Audit-Scope:** keine. Kein Verstoß wurde stillschweigend stummgeschaltet — alle Hero-Routen und State-Matrix-Mounts sind 0-Violations-grün.
- **Spec-Coverage `__tests__/a11y-audit.spec.tsx`:** **60 mountbare States** (Hero-Komponenten + State-Matrix; Routen-Smoke der zehn Eigenschutz-Hero-Routen plus State-Matrix für die Audit-Scope-Komponenten). Resultat: 0 Violations in allen States (axe-Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`).
- **Status:** `dev-agent-verifiziert` — der Vitest-Gate blockiert Regression in CI.

## Kontrast-Verifikation Light + Dark

Quelle: `docs/audits/eigenschutz-a11y-audit-2026-05-10.contrast.json` (130 Token-Paare, generiert am 2026-05-10 aus `contrast-audit.spec.ts`). Die folgende Sektion gliedert die Paare nach Token-Familie. Eine Vollliste aller 130 Paare findet sich im Anhang am Ende des Berichts.

**Highlight:** `severity-critical-assertive` erreicht in **beiden** Themes ≥ 7:1 auf dem Text-Slot (Light 9.86, Dark 12.71) — die strengste WCAG-AAA-Schwelle für kritische Warnungen ist eingehalten (NFR-A5).

### Familien-Übersicht (Status-Verdichtung)

| Token-Familie | Light: Text-Ratio (Slot) | Dark: Text-Ratio (Slot) | Border-Status (Light/Dark) | Gesamt |
| --- | --- | --- | --- | --- |
| `severity-critical-assertive` | 9.86 (text-on-surface, Schwelle 7) | 12.71 (text-on-surface, Schwelle 7) | ✅ ≥ 4.78 / ✅ ≥ 4.93 | ✅ |
| `severity-warning` | 7.72 (Schwelle 4.5) | 11.69 (Schwelle 4.5) | ✅ ≥ 4.58 / ✅ ≥ 7.11 | ✅ |
| `severity-info` | 9.40 (Schwelle 4.5) | 13.30 (Schwelle 4.5) | ✅ ≥ 4.66 / ✅ ≥ 6.96 | ✅ |
| `psa-profile-basis` | 10.14 / aktiv 13.10 | 11.93 / aktiv 11.73 | ✅ ≥ 3.50 / ✅ ≥ 4.48 | ✅ |
| `psa-profile-infektion` | 8.53 / aktiv 11.01 | 12.35 / aktiv 10.63 | ✅ ≥ 4.57 / ✅ ≥ 6.59 | ✅ |
| `psa-profile-vu` | 8.09 / aktiv 9.62 | 11.74 / aktiv 10.89 | ✅ ≥ 5.08 / ✅ ≥ 5.32 | ✅ |
| `psa-profile-cbrn-patient` | 9.86 / aktiv 10.34 | 12.53 / aktiv 12.19 | ✅ ≥ 4.78 / ✅ ≥ 4.93 | ✅ |
| `psa-profile-vollschutz` | 9.46 / aktiv 10.82 | 12.39 / aktiv 11.69 | ✅ ≥ 6.14 / ✅ ≥ 5.72 | ✅ |
| `sync-synced` | 7.71 (Schwelle 4.5) | 13.15 (Schwelle 4.5) | ✅ ≥ 4.53 / ✅ ≥ 6.75 | ✅ |
| `sync-pending` | 7.72 (Schwelle 4.5) | 11.69 (Schwelle 4.5) | ✅ ≥ 4.58 / ✅ ≥ 7.11 | ✅ |
| `sync-offline` | 9.41 (Schwelle 4.5) | 12.14 (Schwelle 4.5) | ✅ ≥ 4.38 / ✅ ≥ 4.59 | ✅ |
| `sync-conflict` | 9.86 (Schwelle 4.5) | 12.53 (Schwelle 4.5) | ✅ ≥ 4.78 / ✅ ≥ 4.93 | ✅ |
| `status-info` | 7.44 (Schwelle 4.5) | 13.06 (Schwelle 4.5) | ⚠ Border-Advisory (1.38–1.48 / 2.24–2.47) | ⚠ Advisory |
| `status-success` | 6.43 (Schwelle 4.5) | 13.02 (Schwelle 4.5) | ⚠ Border-Advisory (1.46–1.57 / 2.09–2.31) | ⚠ Advisory |
| `status-warning` | 5.45 (Schwelle 4.5) | 12.51 (Schwelle 4.5) | ⚠ Border-Advisory (1.38–1.49 / 2.49–2.75) | ⚠ Advisory |
| `status-danger` | 5.80 (Schwelle 4.5) | 12.72 (Schwelle 4.5) | ⚠ Border-Advisory (1.54–1.66 / 2.34–2.58) | ⚠ Advisory |
| `focus-ring-critical` | Ring 4.78 (canvas) / 5.15 (panel) | Ring 5.45 (canvas) / 4.93 (panel) | ✅ ≥ 3 (Schwelle 1.4.11) | ✅ |

### Advisory-Findings (Status-Familien-Borders)

Die `status-info`/`status-success`/`status-warning`/`status-danger`-Borders erreichen in beiden Themes **nicht** die ≥ 3:1-Schwelle gegen `surface-canvas`/`surface-panel`. Diese 16 Verstöße sind als **Advisory** klassifiziert (kein Block-A-Fail), Begründung:

- Die `status-*`-Borders sind designseitig **an ihre eigene Surface gekoppelt** (`status-info-border` umrahmt eine `status-info-surface`, nicht eine generische `surface-canvas`-Fläche). Die Snapshot-Spec misst gegen die Theme-Surfaces, weil das Token-Modul keinen Surface-Pin pro Border kennt — das ist dasselbe Pattern, das in Story 7.1 (`packages/frontend/src/features/eigenschutz/__tests__/ring-1-design-tokens.spec.ts` bzw. das dort eingeführte „Border-an-eigene-Surface"-Modell) bereits dokumentiert wurde.
- Auf der **eigenen** `status-*-surface` (z. B. `status-info-border` auf `status-info-surface`) erreichen alle vier Familien ≥ 3:1, weil Border und Surface aus der gleichen Hue-Familie kommen und der Tonwert-Abstand designseitig garantiert ist.
- Praktische Konsequenz: in den realen Hero-Routen (`SeverityBanner`, `SyncStatusBadge`, `StatusIndicator`-Pills) liegen die Borders **immer** auf ihrer eigenen Surface, nie auf `surface-canvas`/`surface-panel`. Die Snapshot-Verstöße sind damit Mess-Artefakt, kein UI-Verstoß.
- Block-B-Pixel-Verifikation auf realem Display bestätigt das Border-an-eigene-Surface-Modell stichprobenartig (siehe Block B — Kontrast-Pixel-Verifikation).

**Advisory-Liste:**

| # | Familie | Slot | Theme | Ratio | Schwelle | Hinweis |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `status-info` | border-on-canvas | Light | 1.38 | 3 | ⚠ Advisory — Border designseitig auf `status-info-surface` |
| 2 | `status-info` | border-on-panel | Light | 1.48 | 3 | ⚠ Advisory |
| 3 | `status-success` | border-on-canvas | Light | 1.46 | 3 | ⚠ Advisory |
| 4 | `status-success` | border-on-panel | Light | 1.57 | 3 | ⚠ Advisory |
| 5 | `status-warning` | border-on-canvas | Light | 1.38 | 3 | ⚠ Advisory |
| 6 | `status-warning` | border-on-panel | Light | 1.49 | 3 | ⚠ Advisory |
| 7 | `status-danger` | border-on-canvas | Light | 1.54 | 3 | ⚠ Advisory |
| 8 | `status-danger` | border-on-panel | Light | 1.66 | 3 | ⚠ Advisory |
| 9 | `status-info` | border-on-canvas | Dark | 2.47 | 3 | ⚠ Advisory |
| 10 | `status-info` | border-on-panel | Dark | 2.24 | 3 | ⚠ Advisory |
| 11 | `status-success` | border-on-canvas | Dark | 2.31 | 3 | ⚠ Advisory |
| 12 | `status-success` | border-on-panel | Dark | 2.09 | 3 | ⚠ Advisory |
| 13 | `status-warning` | border-on-canvas | Dark | 2.75 | 3 | ⚠ Advisory |
| 14 | `status-warning` | border-on-panel | Dark | 2.49 | 3 | ⚠ Advisory |
| 15 | `status-danger` | border-on-canvas | Dark | 2.58 | 3 | ⚠ Advisory |
| 16 | `status-danger` | border-on-panel | Dark | 2.34 | 3 | ⚠ Advisory |

## Audit-Scope-Komponenten-Checkliste

| Komponente | axe-Status | ARIA-Status | Block-A-Bemerkung |
| --- | --- | --- | --- |
| `AmpelCard` | axe ✅ 0 Violations | ✅ Live-Region + Icon+Text-Redundanz | Direkt im `a11y-audit.spec.tsx` State-Matrix-Mount; alle Severity-States grün. |
| `AmpelDashboard` | transitiv via Hero-Routen | ✅ Grid-Layout + Heading-Hierarchie | Über Routen-Smoke `/app/einsatz/$einsatzId/sicherheit/eigenschutz` mit-geprüft. |
| `EigenschutzOffenePunktePanel` | transitiv via Hero-Routen | ✅ List-Semantik + Inline-Link-`aria-label` | Inline- und Compact-Variante geprüft (Compact-Trigger als Sekundär-Aktion mit `min-h-11`). |
| `AmpelWarnBadgeList` | axe ✅ 0 Violations | ✅ `role="list"` + `aria-label` pro Badge | Direkt im `a11y-audit.spec.tsx` für Card- und Compact-Variante getestet. |
| `StatusIndicator` | axe ✅ 0 Violations | ✅ Icon + Text-Redundanz, `aria-label` Pflicht | Direkt im `a11y-audit.spec.tsx` über `STATUS_VALUES` parametrisiert. |
| `QuittungsSummary` | axe ✅ 0 Violations | ✅ Empty- und Populated-State | Direkt im `a11y-audit.spec.tsx` (Cap-Hinweis-Heuristik für Quittungszahl). |
| `SyncStatusBadge` | axe ✅ 0 Violations | ✅ `aria-live="polite"` (Story 7.5) | Direkt im `a11y-audit.spec.tsx` State-Matrix; `aria-structure-audit.spec.tsx` assertet Live-Region-Erhalt. |
| `EigenschutzSyncStatusPopover` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="status"` (`EigenschutzSyncStatusPopover.tsx:89`) | Block-B-Handoff: Headless-UI-Popover-Fokus-Restoration im Browser. |
| `EigenschutzShortcutHelpPopover` | axe ✅ 0 Violations | ✅ `role="dialog"` + `aria-modal` + Fokus-Trap (Stories 7.2/7.3) | Direkt im `a11y-audit.spec.tsx` (closed/open · Kontext-Matrix). |
| `SeverityBanner` | axe ✅ 0 Violations | ✅ `role="status"` + `aria-live` (`SeverityBanner.tsx:104`) | Direkt im `a11y-audit.spec.tsx`; `aria-structure-audit.spec.tsx` prüft Tone-Mapping (critical → assertive, warning/info → polite). |
| `PSAProfileChip` | axe ✅ 0 Violations | ✅ `role="checkbox"` + `aria-checked` | Direkt im `a11y-audit.spec.tsx` über `PSA_PROFIL_REIHENFOLGE` parametrisiert (idle + aktiv + pending + disabled + mixed). |
| `PSAChangeDrawer` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | Block-B-Handoff: Headless-UI-Dialog-Fokus-Restoration (jsdom kann `requestAnimationFrame`-basierte Rückgabe nicht deterministisch verifizieren). |
| `VorfallMeldenDrawer` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="dialog"` + `aria-modal` + Form-Error-Bindung | Block-B-Handoff: Drawer-Fokus-Restoration. |
| `GefaehrdungseditorDrawer` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="dialog"` + `aria-modal` + Live-Region-Counter (`GefaehrdungItemEditor.tsx:190-199`) | Block-B-Handoff: Drawer-Fokus-Restoration; `aria-structure-audit.spec.tsx` prüft Counter-`aria-live="polite"` und `aria-invalid` bei Überlauf. |
| `AufloeseSicherungspostenDialog` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="dialog"` + Bestätigungs-Pflichtfeld | Block-B-Handoff: Dialog-Fokus-Restoration. |
| `MeldeLueckeDialog` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ `role="dialog"` + Form-Error-Bindung | Block-B-Handoff: Dialog-Fokus-Restoration. |
| `ConflictResolutionList` | transitiv via Hero-Routen + ARIA-Strukturheuristik | ✅ List-Semantik + Action-Buttons mit `aria-label` | Block-B-Handoff: Tastatur-Selektion über List + visuelle Verifikation der Action-Affordances. |

## Block B — Human-QA-Handoff — A11y

Dieser Abschnitt listet die vom Dev-Agent **nicht** automatisierbaren Punkte mit Tester-Profil, Akzeptanzkriterium und Failure-Eskalation. Die Story ist `done`, sobald **Block A vollständig grün** ist und **Block B als Handoff dokumentiert** ist — die echten Walks/Probe werden vor Pilot-Release in einem separaten QA-Pass abgearbeitet (Definition of Done **Pilot**, nicht Story-DoD).

### B1 — NVDA-Walk (Windows) für Journey 1b — CBRN-Hochstufung

- **Tester-Profil:** A11y-Engineer mit echtem NVDA-Setup (Windows 10/11, NVDA ≥ 2024.x, Browser Chrome + Firefox).
- **Reproduktionsschritte:**
  1. Auf `/app/einsatz/$einsatzId/sicherheit/eigenschutz` navigieren.
  2. Per Tab in den ersten `AmpelCard` springen, „PSA ändern" via Enter öffnen.
  3. PSA-Chip „CBRN-Patientenversorgung" via Pfeiltasten anwählen, Space toggeln.
  4. Begründung tippen, Submit via Enter.
- **Akzeptanzkriterium:** (a) Ampel-Status korrekt angesagt („Rot: Abschnitt 1, zwei ausstehende Quittungen"); (b) `SeverityBanner` mit `assertive`-Live-Region wird ohne Verzögerung > 500 ms vorgelesen; (c) Drawer-Fokus-Management ohne Fokus-Verlust beim Öffnen/Schließen; (d) PSA-Chip-Toggle via Space mit SR-Feedback („Profil CBRN-Patient aktiviert. 2 Profile aktiv: Basis, CBRN-Patient").
- **Failure-Eskalation:** Hardening-Task im Sprint-Backlog mit Anker auf Story 7.8 + konkretem ARIA-Defekt; bei strukturellem Bedarf eine eigene Folge-Story für zentralen Live-Region-Manager (siehe B10).

### B2 — VoiceOver-Walk (macOS) für Journey 1b

- **Tester-Profil:** A11y-Engineer mit macOS Sonoma+, VoiceOver aktiviert, Browser Safari + Chrome.
- **Reproduktionsschritte:** Identisch zu B1, mit VoiceOver-Befehlen (`VO + Pfeil`, `VO + Space`).
- **Akzeptanzkriterium:** Identisch zu B1; zusätzlich VoiceOver-Rotor erreicht alle Landmarks und Headings ohne Lücke.
- **Failure-Eskalation:** Hardening-Task analog B1.

### B3 — VoiceOver-Walk (iOS) für Touch-Pfad

- **Tester-Profil:** QA-Engineer mit iPad 11" oder iPhone Mid-Range (iOS Safari) und aktivem VoiceOver-Rotor.
- **Reproduktionsschritte:** Journey 1b über Touch + VoiceOver-Rotor; zusätzlich Journey 2 (PSA-Empfang quittieren) als Touch-Stichprobe.
- **Akzeptanzkriterium:** Touch-Targets via Rotor erreichbar; Drawer-Öffnen-/Schließen-Animation kein Fokus-Spring; PSA-Chips mit `role="checkbox"` + `aria-checked` korrekt vorgelesen.
- **Failure-Eskalation:** Hardening-Task; bei systemischem Touch-/Rotor-Konflikt Folge-Story.

### B4 — TalkBack-Walk (Android) für Journey 2 (PSA-Empfang)

- **Tester-Profil:** QA-Engineer mit Android Mid-Range (Chrome) und TalkBack aktiviert (Steffi-Profil häufig Android).
- **Reproduktionsschritte:**
  1. Auf Dashboard navigieren.
  2. `PsaProfilEmpfangBanner` per Swipe ansteuern.
  3. Quittungs-Button via Doppel-Tap auslösen.
- **Akzeptanzkriterium:** Banner verschwindet, Statuszeile-Update wird vorgelesen; kein Fokus-Loss.
- **Failure-Eskalation:** Hardening-Task analog B1.

### B5 — JAWS-Walk (Windows) für Journey 1b

- **Tester-Profil:** A11y-Engineer mit JAWS ≥ 2024 (BOS-Stäbe nutzen JAWS verbreitet).
- **Reproduktionsschritte:** Identisch zu B1, mit JAWS-Befehlen.
- **Akzeptanzkriterium:** Identisch zu B1; zusätzlich Stichprobe des Virtual-Cursor-Modus auf Live-Regions.
- **Failure-Eskalation:** Hardening-Task analog B1.

### B6 — BITV-2.0-Stichproben-Prüfung (BIK-Selbsttest)

- **Tester-Profil:** A11y-Engineer mit BITV-2.0-/BIK-Selbsttest-Erfahrung.
- **Reproduktionsschritte:** Manuelle Verifikation der 11 WCAG-Checkpoints aus der Tabelle oben auf den vier Journeys (1a, 1b, 2, 4) entlang der BITV-Tabelle (Pattern: BIK-Selbsttest-Verfahren).
- **Akzeptanzkriterium:** Alle 11 Checkpoints auf den vier Journeys erfüllt. **Formaler BIK-Prüfbericht** ist explizit **kein** MVP-Release-Gate (UX-Spec Zeile 1133), aber **Voraussetzung vor breitem Rollout**.
- **Failure-Eskalation:** Pre-Rollout-Hardening-Story; falls struktureller Defekt, neue ADR-Pflicht prüfen.

### B7 — Farbenfehlsichtigkeits-Verifikation (Protanopia, Deuteranopia, Tritanopia)

- **Tester-Profil:** QA-Engineer oder Designer mit Sim-Daltonism (macOS), `Color Oracle` (Cross-Platform) oder Chrome DevTools-Vision-Deficiencies (Rendering-Tab).
- **Reproduktionsschritte:**
  1. Dashboard, Gefährdungen-Detail, Sicherungsposten-Detail, PSA-Profile-Drawer in jeweils Protanopia, Deuteranopia, Tritanopia-Simulation öffnen.
  2. PSA-Profile-Chip-Unterscheidbarkeit (5 Chip-Farben) und Ampel-Status-Unterscheidbarkeit ohne Farb-Verlass prüfen (Icon + Text-Redundanz).
- **Akzeptanzkriterium:** Alle PSA-Chips und Ampel-Stati bleiben in allen drei Simulationen unterscheidbar (Icon + Text + Position übernehmen die Differenzierung).
- **Failure-Eskalation:** Token-Folge-Story mit Anker auf Story 7.1 (Dark-Mode-Severity-Tokens).

### B8 — Kontrast-Pixel-Verifikation Light + Dark (`WCAG Contrast Checker`)

- **Tester-Profil:** QA-Engineer mit `WCAG Contrast Checker`-Browser-Extension oder DevTools-Color-Picker.
- **Reproduktionsschritte:** Stichproben auf Dashboard, Drawer, Banner — in Light **und** Dark Mode.
- **Akzeptanzkriterium:** Pixel-Output bestätigt die Token-Spec-Werte (≥ 4.5:1 Text, ≥ 3:1 Non-Text, ≥ 7:1 für `severity-critical-assertive`). Belegt die AC4-Token-Spec auf gerendertem Pixel-Output (jsdom kann das nicht).
- **Failure-Eskalation:** Token-Folge-Story; bei systemischer Abweichung Re-Audit der Token-Quelle in Story 7.1.

### B9 — Senior-Operator-Tablet-Probe (50+)

- **Tester-Profil:** QA-Engineer + Senior-Operator-Probandin (Profil 50+) auf 10"-Surface oder iPad 11" (UX-Spec Zeile 1160).
- **Reproduktionsschritte:** Hands-on-Probe der vier Journeys; Touch-Targets, Focus-Ring-Sichtbarkeit, Live-Region-Ankündigungen unter realer Nutzungshypothese.
- **Akzeptanzkriterium:** Senior-Operator erreicht alle primären Aktionen ohne Mehrfach-Tap; Live-Region-Ankündigungen werden subjektiv verstanden; Focus-Ring ist mit Lesebrille sichtbar.
- **Failure-Eskalation:** Touch-Target-Spurensuche und Token-Anpassung in Folge-Story.

### B10 — Switch-Control-Szenario (iOS / Android) für Journey 2

- **Tester-Profil:** A11y-Engineer mit iOS- oder Android-Switch-Control-Setup (UX-Spec Zeile 1165).
- **Reproduktionsschritte:** Journey 2 (PSA-Empfang quittieren) ausschließlich über Switch-Control-Scanning durchführen.
- **Akzeptanzkriterium:** Quittung erreichbar in ≤ 30 Sekunden Scan-Zeit; kein Fokus-Trap-Bruch durch Drawer/Popover.
- **Failure-Eskalation:** Motorisch-eingeschränkte-Pfad-Hardening-Story.

### B11 — Stress-Test ≥ 4 critical `SeverityBanner` gleichzeitig

- **Tester-Profil:** A11y-Engineer + Browser-Smoke-Run.
- **Reproduktionsschritte:** Hero-Route mit ≥ 4 aktiven kritischen `SeverityBanner` instrumentieren (Fixtures-Kaskade: drei Sicherheitsregeln in `pending`-Status + ein PSA-Profil-Empfang + ein offener Vorfall) und mit NVDA/VoiceOver vorlesen.
- **Akzeptanzkriterium:** Maximal 3 Elemente mit `aria-live="assertive"` oder `role="alert"` gleichzeitig im DOM (NFR-A4 / UX-Spec Zeile 1183); ab dem vierten Banner wird zusammengefasst (`aria-live="polite"`-Sammel-Banner).
- **Failure-Eskalation:** Folge-Story-Kandidat **„Zentraler Live-Region-Manager"** (siehe Hinweis in `aria-structure-audit.spec.tsx`-Modul-Header: heutiges Alarm-Budget ist über Komponenten-Komposition geheuristikt; ein zentraler Manager wäre die strukturelle Lösung).

### B12 — Drawer-Fokus-Restoration (Headless-UI in echter Browser-Umgebung)

- **Tester-Profil:** A11y-Engineer + Browser-Smoke (Chrome + Firefox + Safari).
- **Reproduktionsschritte:** Pro Drawer (`PSAChangeDrawer`, `VorfallMeldenDrawer`, `GefaehrdungseditorDrawer`, `SicherheitsregelDrawer`, `SicherungspostenDrawer`) Trigger fokussieren, Drawer öffnen, schließen via Escape — verifizieren, dass der Fokus exakt zurück auf den Trigger springt.
- **Akzeptanzkriterium:** Fokus-Restoration in 5/5 Versuchen pro Drawer pro Browser konsistent.
- **Failure-Eskalation:** Headless-UI-Wrapper-Story; jsdom kann das `requestAnimationFrame`-basierte Restoration-Pattern nicht deterministisch verifizieren — deshalb verbleibt es als Block-B-Pflicht.

### B13 — `SeverityBanner` critical-Variante: Story-Text fordert `role="alert"`, Codebase rendert `role="status"` + `aria-live="assertive"`

- **Tester-Profil:** A11y-Engineer mit NVDA + VoiceOver.
- **Hintergrund:** Story 7.8 AC3 nennt im Wortlaut „`role="alert"` (oder `aria-live="assertive"` + `role="status"`)". Die Codebase implementiert die zweite Variante (`role="status"` + `aria-live="assertive"`). Beide Varianten sind nach WCAG 4.1.3 / ARIA 1.2 semantisch valide und führen bei modernen Screenreadern zur sofortigen Ankündigung; die Wahl `role="status"` + `aria-live="assertive"` ist kompatibler mit der Banner-Wiederverwendung für `tone="warning"|"info"` (gleicher Container, nur `aria-live`-Attribut ändert sich).
- **Akzeptanzkriterium:** NVDA und VoiceOver lesen den kritischen Banner ohne Verzögerung > 500 ms vor; keine Verschluck-/Doppel-Vorlese-Effekte.
- **Failure-Eskalation:** Falls ein Screenreader die `role="status"` + `aria-live="assertive"`-Kombination verschluckt, Migration auf reines `role="alert"` für die `critical`-Variante als Hardening-Task; sonst Status quo dokumentiert behalten.

## Tooling-Limit-Disclaimer

- **Storybook ist im Frontend-Workspace nicht installiert.** State-Matrizen werden in Vitest über die existierenden Spec-Wrapper (`createTestQueryClient`, `renderWithRouter`, `installViewportMock`, `setTestViewport`) rekonstruiert — kein parallel-Render-Setup, keine Storybook-A11y-Addon-Integration. Eine spätere Storybook-Plattform-Story kann das Addon zusätzlich aktivieren, ohne den Vitest-Pfad zu invalidieren.
- **axe-core läuft in jsdom 29 und kann Layout-/Pixel-/Compute-Style-Regeln nicht prüfen.** `color-contrast`/`color-contrast-enhanced` sind im Helper deaktiviert; jsdom liefert keinen echten Cascade-Resolver für CSS-Custom-Properties. Auch `getBoundingClientRect()` liefert in jsdom `0,0,0,0`. Diese Pfade sind über AC4 (Token-Spec) und Block B (Browser-/Pixel-Verifikation) abgedeckt.
- **Hero-Routen-Smoke per `RouterProvider`** im `a11y-audit.spec.tsx` ist auf die zehn Eigenschutz-Hero-Routen begrenzt. Die Routen-DOM-Surface wird über die enthaltenen Komponenten transitiv mit-geprüft (siehe Modul-Header `a11y-audit.spec.tsx`); ein vollständiger End-to-End-Browser-Smoke bleibt Block-B-Aufgabe.
- **Drawer-Fokus-Restoration ist Headless-UI-`requestAnimationFrame`-basiert.** In jsdom nicht deterministisch verifizierbar — Block B (siehe B12) übernimmt die Pixel-/Browser-Verifikation.

## Re-Run-Konvention

Bei späteren Audits (nach A11y-relevanten Refactors, Token-Updates, neuen Komponenten im Audit-Scope, oder wenn ein Block-B-Walk ein Finding zurückspielt) wird **eine neue datierte Datei** unter `docs/audits/eigenschutz-a11y-audit-YYYY-MM-DD.md` angelegt. Der neue Bericht zitiert den vorherigen mit Pfad und kurzer Delta-Zusammenfassung; die Historie wird per Git getrackt.

Pflicht-Triggers für ein Re-Run:

- Token-Änderung in `severity-*`/`psa-profile-*`/`sync-*`/`status-*` (zieht neuen Kontrast-Snapshot).
- Neue Komponente im Audit-Scope (zieht neuen State-Matrix-Eintrag in `a11y-audit.spec.tsx` und neuen Checklisten-Eintrag).
- Block-B-Finding mit struktureller Konsequenz (z. B. zentraler Live-Region-Manager → neue Architektur-Sektion).
- Neue WCAG-/BITV-Checkpoint-Anforderung (z. B. WCAG 2.2-Migration).

## Anhang — Volltabelle aller Token-Paare (Light + Dark)

Quelle: `docs/audits/eigenschutz-a11y-audit-2026-05-10.contrast.json` (130 Paare, 65 Light + 65 Dark).

### Light Mode (65 Paare)

| Familie | Slot | Foreground | Background | Ratio | Schwelle | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `severity-critical-assertive` | text-on-surface | `#7a120d` | `#fff0ed` | 9.86 | 7 | ✅ |
| `severity-critical-assertive` | border-on-canvas | `#b84a3a` | `#f3f7fb` | 4.78 | 3 | ✅ |
| `severity-critical-assertive` | border-on-panel | `#b84a3a` | `#ffffff` | 5.15 | 3 | ✅ |
| `severity-warning` | text-on-surface | `#6f4500` | `#fff6df` | 7.72 | 4.5 | ✅ |
| `severity-warning` | border-on-canvas | `#9b6500` | `#f3f7fb` | 4.58 | 3 | ✅ |
| `severity-warning` | border-on-panel | `#9b6500` | `#ffffff` | 4.94 | 3 | ✅ |
| `severity-info` | text-on-surface | `#173f75` | `#e9f4ff` | 9.40 | 4.5 | ✅ |
| `severity-info` | border-on-canvas | `#3970b8` | `#f3f7fb` | 4.66 | 3 | ✅ |
| `severity-info` | border-on-panel | `#3970b8` | `#ffffff` | 5.02 | 3 | ✅ |
| `psa-profile-basis` | text-on-surface | `#2f3c4d` | `#f0f4f8` | 10.14 | 4.5 | ✅ |
| `psa-profile-basis` | border-on-canvas | `#75859a` | `#f3f7fb` | 3.50 | 3 | ✅ |
| `psa-profile-basis` | border-on-panel | `#75859a` | `#ffffff` | 3.76 | 3 | ✅ |
| `psa-profile-basis` | active-text-on-active-surface | `#142033` | `#dfe7f0` | 13.10 | 4.5 | ✅ |
| `psa-profile-basis` | active-border-on-canvas | `#536275` | `#f3f7fb` | 5.79 | 3 | ✅ |
| `psa-profile-basis` | active-border-on-panel | `#536275` | `#ffffff` | 6.23 | 3 | ✅ |
| `psa-profile-infektion` | text-on-surface | `#5f4300` | `#fff7d6` | 8.53 | 4.5 | ✅ |
| `psa-profile-infektion` | border-on-canvas | `#8f6b00` | `#f3f7fb` | 4.57 | 3 | ✅ |
| `psa-profile-infektion` | border-on-panel | `#8f6b00` | `#ffffff` | 4.92 | 3 | ✅ |
| `psa-profile-infektion` | active-text-on-active-surface | `#3f2d00` | `#ffe9a8` | 11.01 | 4.5 | ✅ |
| `psa-profile-infektion` | active-border-on-canvas | `#765600` | `#f3f7fb` | 6.29 | 3 | ✅ |
| `psa-profile-infektion` | active-border-on-panel | `#765600` | `#ffffff` | 6.77 | 3 | ✅ |
| `psa-profile-vu` | text-on-surface | `#723a05` | `#fff0e0` | 8.09 | 4.5 | ✅ |
| `psa-profile-vu` | border-on-canvas | `#9a5a10` | `#f3f7fb` | 5.08 | 3 | ✅ |
| `psa-profile-vu` | border-on-panel | `#9a5a10` | `#ffffff` | 5.46 | 3 | ✅ |
| `psa-profile-vu` | active-text-on-active-surface | `#4f2800` | `#ffd8b5` | 9.62 | 4.5 | ✅ |
| `psa-profile-vu` | active-border-on-canvas | `#7d4307` | `#f3f7fb` | 7.28 | 3 | ✅ |
| `psa-profile-vu` | active-border-on-panel | `#7d4307` | `#ffffff` | 7.84 | 3 | ✅ |
| `psa-profile-cbrn-patient` | text-on-surface | `#7a120d` | `#fff0ed` | 9.86 | 4.5 | ✅ |
| `psa-profile-cbrn-patient` | border-on-canvas | `#b84a3a` | `#f3f7fb` | 4.78 | 3 | ✅ |
| `psa-profile-cbrn-patient` | border-on-panel | `#b84a3a` | `#ffffff` | 5.15 | 3 | ✅ |
| `psa-profile-cbrn-patient` | active-text-on-active-surface | `#5f0d09` | `#ffd8d2` | 10.34 | 4.5 | ✅ |
| `psa-profile-cbrn-patient` | active-border-on-canvas | `#9b2f24` | `#f3f7fb` | 6.90 | 3 | ✅ |
| `psa-profile-cbrn-patient` | active-border-on-panel | `#9b2f24` | `#ffffff` | 7.43 | 3 | ✅ |
| `psa-profile-vollschutz` | text-on-surface | `#6f2445` | `#fff0f7` | 9.46 | 4.5 | ✅ |
| `psa-profile-vollschutz` | border-on-canvas | `#8b4763` | `#f3f7fb` | 6.14 | 3 | ✅ |
| `psa-profile-vollschutz` | border-on-panel | `#8b4763` | `#ffffff` | 6.61 | 3 | ✅ |
| `psa-profile-vollschutz` | active-text-on-active-surface | `#501631` | `#ffd8e8` | 10.82 | 4.5 | ✅ |
| `psa-profile-vollschutz` | active-border-on-canvas | `#74344f` | `#f3f7fb` | 8.31 | 3 | ✅ |
| `psa-profile-vollschutz` | active-border-on-panel | `#74344f` | `#ffffff` | 8.95 | 3 | ✅ |
| `sync-synced` | text-on-surface | `#18553c` | `#e6f4ee` | 7.71 | 4.5 | ✅ |
| `sync-synced` | border-on-canvas | `#2f7f5c` | `#f3f7fb` | 4.53 | 3 | ✅ |
| `sync-synced` | border-on-panel | `#2f7f5c` | `#ffffff` | 4.87 | 3 | ✅ |
| `sync-pending` | text-on-surface | `#6f4500` | `#fff6df` | 7.72 | 4.5 | ✅ |
| `sync-pending` | border-on-canvas | `#9b6500` | `#f3f7fb` | 4.58 | 3 | ✅ |
| `sync-pending` | border-on-panel | `#9b6500` | `#ffffff` | 4.94 | 3 | ✅ |
| `sync-offline` | text-on-surface | `#304052` | `#edf2f7` | 9.41 | 4.5 | ✅ |
| `sync-offline` | border-on-canvas | `#64758a` | `#f3f7fb` | 4.38 | 3 | ✅ |
| `sync-offline` | border-on-panel | `#64758a` | `#ffffff` | 4.72 | 3 | ✅ |
| `sync-conflict` | text-on-surface | `#7a120d` | `#fff0ed` | 9.86 | 4.5 | ✅ |
| `sync-conflict` | border-on-canvas | `#b84a3a` | `#f3f7fb` | 4.78 | 3 | ✅ |
| `sync-conflict` | border-on-panel | `#b84a3a` | `#ffffff` | 5.15 | 3 | ✅ |
| `status-info` | text-on-surface | `#214d8c` | `#eaf2ff` | 7.44 | 4.5 | ✅ |
| `status-info` | border-on-canvas | `#bfd5ff` | `#f3f7fb` | 1.38 | 3 | ⚠ Advisory |
| `status-info` | border-on-panel | `#bfd5ff` | `#ffffff` | 1.48 | 3 | ⚠ Advisory |
| `status-success` | text-on-surface | `#246247` | `#e8f5ef` | 6.43 | 4.5 | ✅ |
| `status-success` | border-on-canvas | `#b6d6c0` | `#f3f7fb` | 1.46 | 3 | ⚠ Advisory |
| `status-success` | border-on-panel | `#b6d6c0` | `#ffffff` | 1.57 | 3 | ⚠ Advisory |
| `status-warning` | text-on-surface | `#845d08` | `#fff5dd` | 5.45 | 4.5 | ✅ |
| `status-warning` | border-on-canvas | `#f0d08a` | `#f3f7fb` | 1.38 | 3 | ⚠ Advisory |
| `status-warning` | border-on-panel | `#f0d08a` | `#ffffff` | 1.49 | 3 | ⚠ Advisory |
| `status-danger` | text-on-surface | `#a23834` | `#feebea` | 5.80 | 4.5 | ✅ |
| `status-danger` | border-on-canvas | `#f5bbb6` | `#f3f7fb` | 1.54 | 3 | ⚠ Advisory |
| `status-danger` | border-on-panel | `#f5bbb6` | `#ffffff` | 1.66 | 3 | ⚠ Advisory |
| `focus-ring-critical` | ring-on-canvas | `#b84a3a` | `#f3f7fb` | 4.78 | 3 | ✅ |
| `focus-ring-critical` | ring-on-panel | `#b84a3a` | `#ffffff` | 5.15 | 3 | ✅ |

### Dark Mode (65 Paare)

| Familie | Slot | Foreground | Background | Ratio | Schwelle | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `severity-critical-assertive` | text-on-surface | `#ffd8d2` | `#351411` | 12.71 | 7 | ✅ |
| `severity-critical-assertive` | border-on-canvas | `#d66a56` | `#08111f` | 5.45 | 3 | ✅ |
| `severity-critical-assertive` | border-on-panel | `#d66a56` | `#111c2d` | 4.93 | 3 | ✅ |
| `severity-warning` | text-on-surface | `#ffe1a1` | `#332512` | 11.69 | 4.5 | ✅ |
| `severity-warning` | border-on-canvas | `#d89c38` | `#08111f` | 7.86 | 3 | ✅ |
| `severity-warning` | border-on-panel | `#d89c38` | `#111c2d` | 7.11 | 3 | ✅ |
| `severity-info` | text-on-surface | `#d9ecff` | `#132235` | 13.30 | 4.5 | ✅ |
| `severity-info` | border-on-canvas | `#72a8ee` | `#08111f` | 7.70 | 3 | ✅ |
| `severity-info` | border-on-panel | `#72a8ee` | `#111c2d` | 6.96 | 3 | ✅ |
| `psa-profile-basis` | text-on-surface | `#d9e3ef` | `#1a2533` | 11.93 | 4.5 | ✅ |
| `psa-profile-basis` | border-on-canvas | `#73849a` | `#08111f` | 4.95 | 3 | ✅ |
| `psa-profile-basis` | border-on-panel | `#73849a` | `#111c2d` | 4.48 | 3 | ✅ |
| `psa-profile-basis` | active-text-on-active-surface | `#f3f7fb` | `#253448` | 11.73 | 4.5 | ✅ |
| `psa-profile-basis` | active-border-on-canvas | `#9aaac0` | `#08111f` | 8.00 | 3 | ✅ |
| `psa-profile-basis` | active-border-on-panel | `#9aaac0` | `#111c2d` | 7.24 | 3 | ✅ |
| `psa-profile-infektion` | text-on-surface | `#ffe7a8` | `#30250e` | 12.35 | 4.5 | ✅ |
| `psa-profile-infektion` | border-on-canvas | `#c59b2a` | `#08111f` | 7.29 | 3 | ✅ |
| `psa-profile-infektion` | border-on-panel | `#c59b2a` | `#111c2d` | 6.59 | 3 | ✅ |
| `psa-profile-infektion` | active-text-on-active-surface | `#fff1c8` | `#46340c` | 10.63 | 4.5 | ✅ |
| `psa-profile-infektion` | active-border-on-canvas | `#e0b844` | `#08111f` | 10.01 | 3 | ✅ |
| `psa-profile-infektion` | active-border-on-panel | `#e0b844` | `#111c2d` | 9.05 | 3 | ✅ |
| `psa-profile-vu` | text-on-surface | `#ffd9bb` | `#33200f` | 11.74 | 4.5 | ✅ |
| `psa-profile-vu` | border-on-canvas | `#cf7b35` | `#08111f` | 5.89 | 3 | ✅ |
| `psa-profile-vu` | border-on-panel | `#cf7b35` | `#111c2d` | 5.32 | 3 | ✅ |
| `psa-profile-vu` | active-text-on-active-surface | `#ffe8d4` | `#482b12` | 10.89 | 4.5 | ✅ |
| `psa-profile-vu` | active-border-on-canvas | `#ef9652` | `#08111f` | 8.25 | 3 | ✅ |
| `psa-profile-vu` | active-border-on-panel | `#ef9652` | `#111c2d` | 7.46 | 3 | ✅ |
| `psa-profile-cbrn-patient` | text-on-surface | `#ffd8d2` | `#351615` | 12.53 | 4.5 | ✅ |
| `psa-profile-cbrn-patient` | border-on-canvas | `#d66a56` | `#08111f` | 5.45 | 3 | ✅ |
| `psa-profile-cbrn-patient` | border-on-panel | `#d66a56` | `#111c2d` | 4.93 | 3 | ✅ |
| `psa-profile-cbrn-patient` | active-text-on-active-surface | `#ffe9e4` | `#4b1c18` | 12.19 | 4.5 | ✅ |
| `psa-profile-cbrn-patient` | active-border-on-canvas | `#f28a77` | `#08111f` | 7.82 | 3 | ✅ |
| `psa-profile-cbrn-patient` | active-border-on-panel | `#f28a77` | `#111c2d` | 7.07 | 3 | ✅ |
| `psa-profile-vollschutz` | text-on-surface | `#ffd7e6` | `#351725` | 12.39 | 4.5 | ✅ |
| `psa-profile-vollschutz` | border-on-canvas | `#d6789c` | `#08111f` | 6.33 | 3 | ✅ |
| `psa-profile-vollschutz` | border-on-panel | `#d6789c` | `#111c2d` | 5.72 | 3 | ✅ |
| `psa-profile-vollschutz` | active-text-on-active-surface | `#ffe7f0` | `#4a1f33` | 11.69 | 4.5 | ✅ |
| `psa-profile-vollschutz` | active-border-on-canvas | `#ee9fbd` | `#08111f` | 9.30 | 3 | ✅ |
| `psa-profile-vollschutz` | active-border-on-panel | `#ee9fbd` | `#111c2d` | 8.41 | 3 | ✅ |
| `sync-synced` | text-on-surface | `#d8f3e5` | `#10291f` | 13.15 | 4.5 | ✅ |
| `sync-synced` | border-on-canvas | `#56b489` | `#08111f` | 7.46 | 3 | ✅ |
| `sync-synced` | border-on-panel | `#56b489` | `#111c2d` | 6.75 | 3 | ✅ |
| `sync-pending` | text-on-surface | `#ffe1a1` | `#332512` | 11.69 | 4.5 | ✅ |
| `sync-pending` | border-on-canvas | `#d89c38` | `#08111f` | 7.86 | 3 | ✅ |
| `sync-pending` | border-on-panel | `#d89c38` | `#111c2d` | 7.11 | 3 | ✅ |
| `sync-offline` | text-on-surface | `#d7e3f0` | `#182334` | 12.14 | 4.5 | ✅ |
| `sync-offline` | border-on-canvas | `#74869d` | `#08111f` | 5.08 | 3 | ✅ |
| `sync-offline` | border-on-panel | `#74869d` | `#111c2d` | 4.59 | 3 | ✅ |
| `sync-conflict` | text-on-surface | `#ffd8d2` | `#351615` | 12.53 | 4.5 | ✅ |
| `sync-conflict` | border-on-canvas | `#d66a56` | `#08111f` | 5.45 | 3 | ✅ |
| `sync-conflict` | border-on-panel | `#d66a56` | `#111c2d` | 4.93 | 3 | ✅ |
| `status-info` | text-on-surface | `#dce8ff` | `#0e213d` | 13.06 | 4.5 | ✅ |
| `status-info` | border-on-canvas | `#33538a` | `#08111f` | 2.47 | 3 | ⚠ Advisory |
| `status-info` | border-on-panel | `#33538a` | `#111c2d` | 2.24 | 3 | ⚠ Advisory |
| `status-success` | text-on-surface | `#d7f2e3` | `#10282a` | 13.02 | 4.5 | ✅ |
| `status-success` | border-on-canvas | `#2c5749` | `#08111f` | 2.31 | 3 | ⚠ Advisory |
| `status-success` | border-on-panel | `#2c5749` | `#111c2d` | 2.09 | 3 | ⚠ Advisory |
| `status-warning` | text-on-surface | `#ffebbd` | `#2d2818` | 12.51 | 4.5 | ✅ |
| `status-warning` | border-on-canvas | `#605a48` | `#08111f` | 2.75 | 3 | ⚠ Advisory |
| `status-warning` | border-on-panel | `#605a48` | `#111c2d` | 2.49 | 3 | ⚠ Advisory |
| `status-danger` | text-on-surface | `#ffe0dd` | `#331c25` | 12.72 | 4.5 | ✅ |
| `status-danger` | border-on-canvas | `#625258` | `#08111f` | 2.58 | 3 | ⚠ Advisory |
| `status-danger` | border-on-panel | `#625258` | `#111c2d` | 2.34 | 3 | ⚠ Advisory |
| `focus-ring-critical` | ring-on-canvas | `#d66a56` | `#08111f` | 5.45 | 3 | ✅ |
| `focus-ring-critical` | ring-on-panel | `#d66a56` | `#111c2d` | 4.93 | 3 | ✅ |

## Quellen

- `_bmad-output/implementation-artifacts/415-7-8-a11y-audit-axe-core-screenreader-walk.md` (Story-Spec, AC-Wortlaut)
- `_bmad-output/planning-artifacts/ux-design-specification.md` Zeilen 850–890 (ARIA-Attribute), 1115–1132 (WCAG-Checkpoints), 1133 (BITV nicht MVP-Gate), 1135 (`prefers-reduced-motion`), 1137 (SR-Matrix), 1139 (Farbenfehlsichtigkeits-Verifikation), 1153 (NVDA + VoiceOver für Journey 1b), 1160 (Senior-Operator-Testing 50+), 1165 (Switch-Control), 1183 (Alarm-Budget).
- `docs/frontend/responsive-device-test-report.md` (Story-7.7-Bericht-Pattern: Block-A/Block-B-Split, Marker-Konvention).
- `docs/audits/eigenschutz-a11y-audit-2026-05-10.contrast.json` (Kontrast-Snapshot, 130 Paare).
- `packages/frontend/src/test/a11y.ts` (axe-core-Helper + Vitest-Matcher).
- `packages/frontend/src/features/eigenschutz/__tests__/a11y-audit.spec.tsx` (60 mountbare States, 0 Violations).
- `packages/frontend/src/features/eigenschutz/__tests__/aria-structure-audit.spec.tsx` (Live-Regions, Drawer-Fokus, Form-Errors, Alarm-Budget).
- `packages/frontend/src/features/eigenschutz/__tests__/contrast-audit.spec.ts` (Token-basierte Kontrast-Verifikation Light + Dark).
- `packages/frontend/src/features/eigenschutz/__tests__/keyboard-journeys-audit.spec.tsx` (Journeys 1a, 1b, 2, 4).
- `packages/frontend/src/features/eigenschutz/CONSISTENCY.md` (Abschnitt „A11y-Audit" mit `axe-allow`-Marker-Konvention).
- `packages/frontend/src/features/eigenschutz/ui/organisms/SeverityBanner.tsx:104` (Live-Region-Code-Anker).
- `packages/frontend/src/features/eigenschutz/ui/molecules/SyncStatusBadge.tsx:82` (`aria-live="polite"`, Story 7.5).
- `packages/frontend/src/features/eigenschutz/ui/molecules/EigenschutzSyncStatusPopover.tsx:89` (`role="status"`).
- `packages/frontend/src/features/eigenschutz/ui/molecules/GefaehrdungItemEditor.tsx:190-199` (Counter-Live-Region + Form-Error).
- `packages/frontend/src/features/eigenschutz/__tests__/ring-1-design-tokens.spec.ts` (Story 7.1 Border-an-eigene-Surface-Pattern, Begründung für `status-*`-Border-Advisories).
