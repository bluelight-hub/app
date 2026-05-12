# Responsive Device Test Report — Eigenschutz-Modul

**Story:** 7.7 (Responsive-Verifikation auf Referenz-Geräten)
**Letzte Aktualisierung:** 2026-05-12 (G1-Fokusmodus-Rückbau: `AmpelDashboardRow` und `AbschnittDetailPanel` aus Audit-Scope entfernt — Komponenten gelöscht; „Direction C" und „Fokus-Toggle"-Erwähnungen in Breakpoint-Tabelle und Geräte-Sektionen aktualisiert; Code-Anker auf aktuelle Zeilen in `AmpelDashboard.tsx` korrigiert. Ursprüngliche Veröffentlichung: 2026-05-10.)

> ⚠ **DoD-Hinweis:** Der Story-Status `done` bedeutet **Block A grün**. Block B (Pinch-Zoom MapGL, 200 %-Browser-Zoom-Walkthrough, Long-Press 500 ms Multi-Select, Senior-Operator-Tablet-Probe) MUSS vor Pilot-Release abgeschlossen sein — sonst sind die WCAG-1.4.4- und WCAG-1.4.10-Verifikationspfade nicht real verifiziert. Pilot-Release-Gate setzt voraus, dass alle Block-B-Sektionen den Status `human-handoff-erledigt` tragen.

## Zweck

Dieser Bericht ist die Single-Source-of-Truth für die responsive Verifikation des Eigenschutz-Moduls auf den sechs Referenz-Geräten. Er dokumentiert (a) die verbindliche Breakpoint-Strategie, (b) den Audit-Scope, (c) die Marker-Konventionen für punktuelle Ausnahmen, (d) den Verifikationsstand pro Gerät (Block A: Dev-Agent-automatisiert, Block B: Human-QA-Handoff).

Re-Runs nach Layout-Refactor in Folge-Stories ergänzen ein „Letzte Verifikation"-Datum pro Gerät; die Historie wird per Git getrackt.

## Verbindliche Breakpoint-Strategie

| Bereich               | Breakpoint        | Layout                                                                | Code-Anker                                                                                                       |
| --------------------- | ----------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Mobile (Smartphone)   | `< 640 px`        | 1 Spalte · Drawer als Full-Screen-Modal                                | `useSmViewport === false` (Schwelle aus `hooks/use-lg-viewport.ts`)                                              |
| Mobile (Landscape)    | `≥ 640, < 768 px` | 1 Spalte · Sub-Tab-Navigation                                          | `useSmViewport === true && useMdViewport === false`                                                              |
| Tablet (Portrait)     | `768–1023 px`     | 1 Spalte · Sub-Tab-Navigation                                          | `useMdViewport === true && useLgViewport === false` (Tailwind-Default `lg = 1024 px` greift erst ab 1024 px)     |
| Tablet/Desktop        | `1024–1279 px`    | **2 Spalten** · Compact-Trigger statt Inline-Seitenpanel               | `useLgViewport === true && useXlViewport === false` (`lg:grid-cols-2` auf `AmpelDashboard.tsx:110`)              |
| Desktop (Standard)    | `1280–1439 px`    | 2 Spalten + Inline-Seitenpanel (Offene Punkte sichtbar)                | `useXlViewport === true` (`XL_VIEWPORT_QUERY = '(min-width: 1280px)'`)                                           |
| Desktop (Wide)        | `≥ 1440 px`       | **3 Spalten** + Inline-Seitenpanel                                     | `min-[1440px]:grid-cols-3` (`AmpelDashboard.tsx:110`) · `useXxlViewport`                                         |

**Konflikt-Auflösung „2 Spalten ab 768 px":** Die Epic-Formulierung „2 Spalten Tablet" könnte als „ab 768 px" gelesen werden. Verbindlich (UX-Spec Zeilen 627–631 und 1083–1089, abgeglichen mit `AmpelDashboard.tsx` `lg:grid-cols-2`) gilt: 2 Spalten **erst ab 1024 px** (Tailwind-Default `lg`). Tablet Portrait (768–1023 px) bleibt 1-spaltig — siehe auch `AmpelDashboard.responsive.spec.tsx`-Assertion `grid-cols-1` bei 768 px.

**Konflikt-Auflösung „2-3 Spalten ab 1024 px":** Die Epic-Formulierung „2-3 Spalten" für 1024–1440 px wird als Range-Statement gelesen: 2 Spalten 1024–1439 px, 3 Spalten ≥ 1440 px. Bei Konflikten zwischen Epic und UX-Spec gewinnt die UX-Spec.

**Container-Queries:** Im MVP wird `@container` ausschließlich auf `AmpelCard.tsx:39` (`@sm:gap-4 @sm:p-4`) angewendet (UX-Spec Zeile 1111). Andere Komponenten nutzen klassische Media-Queries via `useLgViewport`/`useXlViewport`.

**Kein zweiter Hook:** Erweiterungen (`useSmViewport`, `useMdViewport`, `useXxlViewport`) werden additiv im selben Modul `hooks/use-lg-viewport.ts` ergänzt; ein konkurrierender zweiter Viewport-Hook ist nicht zulässig.

## Audit-Scope

Auditiert werden ausschließlich die fünf im Epic-AC genannten Komponenten plus Cap-Hinweise und Seitenpanel/Dialog-Zustände auf den Hero-Routen:

| Komponente                                                              | Datei                                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AmpelCard`                                                             | `src/features/eigenschutz/ui/organisms/AmpelCard.tsx`                                                  |
| `EigenschutzOffenePunktePanel`                                          | `src/features/eigenschutz/ui/organisms/EigenschutzOffenePunktePanel.tsx`                               |
| `AmpelWarnBadgeList`                                                    | `src/features/eigenschutz/ui/molecules/AmpelWarnBadgeList.tsx`                                         |
| Cap-Hinweise (Status-Capping in `StatusIndicator`/`QuittungsSummary`)   | `src/features/eigenschutz/ui/molecules/StatusIndicator.tsx`                                            |
| Seitenpanel/Dialog-Zustände (`Dialog.SlideIn` für Compact-Trigger)      | gerendert via `EigenschutzOffenePunktePanel` (`mode="compact"`)                                        |

Hero-Routen für den Reflow- und Browser-Smoke:

- `/app/einsatz/$einsatzId/sicherheit/eigenschutz` (Dashboard)
- `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen` (Liste + Detail)
- `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten` (Liste + Detail)
- `/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle` (Liste + Detail)
- `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile` (Drawer offen)

## Marker-Konventionen (Block A)

| Marker                                  | Wirkung                                                                                                | Aktuell gepflegte Stellen                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `// touch-target-allow: <grund>`        | Source-Marker. Überspringt das Touch-Target-Audit (Source-Heuristik in `touch-target-audit.spec.tsx`) für ein interaktives Element. Nur für sekundäre Inline-Aktionen. | `EigenschutzOffenePunktePanel.tsx` Zeile ~178 (Inline-Link „Öffnen" im Vorfall-Item) · `EigenschutzOffenePunktePanel.tsx` Zeile ~219 (Inline-Link „Bearbeiten" im Rückmeldung-Item) |
| `data-touch-target-allow="<grund>"`     | Render-Marker (DOM-Pendant). Überspringt den Render-basierten Touch-Target-Smoke (`AmpelDashboard.responsive.spec.tsx` Describe „Touch-Target-Smoke"). MUSS gemeinsam mit dem Source-Marker gesetzt werden — der Render-Smoke prüft, dass der `<grund>` in `CONSISTENCY.md` referenziert ist. | `EigenschutzOffenePunktePanel.tsx` Zeile ~181 + ~223 (gleiche Inline-Sekundär-Links wie der Source-Marker) |
| `// reflow-allow: <grund>`              | Erlaubt einem Container horizontalen Overflow auf 320 px ohne Verstoß gegen WCAG 1.4.10.               | _keine_ — der Reflow-Spec hat MapGL- und `RiskMatrix5x5`-Container in der Allowlist (kein Source-Marker nötig)                                                                                                            |

Verstöße in Komponenten **außerhalb** des Audit-Scopes werden hier als „Folge-Story-Kandidat" gelistet, nicht in dieser Story behoben. Aktuell offen: _keine bekannten Verstöße außerhalb des Scopes._

## Block A — Dev-Agent-automatisiert (Vitest + Render-Heuristik)

| Audit-Dimension                                                                  | Spec-Datei                                                                                | Status         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------- |
| Viewport-Meta-Lock (WCAG 1.4.4)                                                  | `packages/frontend/src/__tests__/viewport-meta.spec.ts`                                   | ✅ grün         |
| Touch-Target-Audit (UX-Spec ≥ 44 px Sekundär, ≥ 48 px Primär)                    | `packages/frontend/src/features/eigenschutz/__tests__/touch-target-audit.spec.tsx`        | ✅ grün         |
| Breakpoint-Layout-Tests (320/768/1024/1280/1440 px) — siehe Heuristik-Hinweis im Spec-Header (statische Tailwind-Tokens prüfen die Klassen-Präsenz; viewport-abhängige Branches prüfen die JSX-Verzweigung) | `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.responsive.spec.tsx` | ✅ grün |
| Reflow-Audit (jsdom 320 × 256 px, kein horizontaler Overflow)                    | `packages/frontend/src/features/eigenschutz/__tests__/reflow-audit.spec.tsx`              | ✅ grün         |

**Punktuelle Boyscout-Fixes in dieser Story:**

- `EigenschutzOffenePunktePanel.tsx:37` — Compact-Trigger erhält `min-h-11`, damit der Mobile-Touch-Bereich der Statuszeile garantiert ≥ 44 px erreicht.
- ~~`AbschnittDetailPanel.tsx:67` — „PSA ändern"-Link von `min-h-10` auf `min-h-11` angehoben.~~ (Obsolet seit 2026-05-12: `AbschnittDetailPanel` mit G1-Fokusmodus-Rückbau gelöscht.)

**Performance-Stichprobe (Route-TTI, best-effort):** `performance.now()`-Marker im `dev:vite`-Smoke. Vertieftes Audit (Bundle, LCP, FCP, INP) bleibt Story 7.10 — die hier gelisteten Werte sind keine Performance-Gates.

## Geräte-Sektionen

### iPad 11" (1194 × 834 / 1133 × 744 effektiv, iPadOS Safari)

- **Block-A-Status:** `dev-agent-verifiziert` (Layout-Schwelle 1024 px aktiv, Seitenpanel ab 1280 px geprüft via `matchMedia`-Mock; Touch-Targets via Tailwind-Heuristik bestätigt).
- **Breakpoint-Verifikation:** ≥ 1024 px → 2 Spalten, Seitenpanel inline ab 1194 px (Querformat).
- **Touch-Target-Stichprobe (3 Interaktionen):** Compact-Trigger „Offene Punkte" (≥ 44 px), `AmpelCard` „PSA ändern" (≥ 44 px), `AmpelWarnBadgeList` Warn-Link (≥ 44 px).
- **Reflow-Heuristik:** Hero-Routen rendern unterhalb 320 px Breite ohne horizontalen Overflow (jsdom-Smoke); Lagekarte und `RiskMatrix5x5` als bekannte Ausnahmen.
- **Route-TTI (best-effort):** offen — wird in Story 7.10 vertieft gemessen.
- **Komponenten-Checkliste:**
  - `AmpelCard` ✅ (Container-Query `@sm:` greift ab interner Card-Breite)
  - `EigenschutzOffenePunktePanel` ✅ (Inline-Modus)
  - `AmpelWarnBadgeList` ✅ (Card- und Compact-Variante)
  - Cap-Hinweise ✅
  - Seitenpanel/Dialog-Zustände ✅
- **Block-B-Status:** `human-handoff-pending` — siehe Human-QA-Handoff für Pinch-Zoom auf MapGL und Long-Press-Multi-Select.
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

### Microsoft Surface 10" (1280 × 800 effektiv, Windows Edge mit Touch-Modus)

- **Block-A-Status:** `dev-agent-verifiziert`.
- **Breakpoint-Verifikation:** 1280 px → 2 Spalten, Seitenpanel inline (`xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]`).
- **Touch-Target-Stichprobe:** identisch zu iPad 11" (Tailwind-Tokens sind viewport-unabhängig).
- **Reflow-Heuristik:** keine Verstöße in den Hero-Routen.
- **Route-TTI (best-effort):** offen — Story 7.10.
- **Komponenten-Checkliste:** identisch zu iPad 11".
- **Block-B-Status:** `human-handoff-pending` — Touch-Modus mit Handschuhen, Long-Press-Multi-Select.
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

### Desktop 1920 × 1080 (FHD, Chrome/Firefox)

- **Block-A-Status:** `dev-agent-verifiziert`.
- **Breakpoint-Verifikation:** ≥ 1440 px → 3 Spalten + Seitenpanel.
- **Touch-Target-Stichprobe:** identisch — alle Touch-Targets bleiben in Maus-/Trackpad-Bedienung problemlos.
- **Reflow-Heuristik:** keine Verstöße.
- **Route-TTI (best-effort):** offen — Story 7.10.
- **Komponenten-Checkliste:** identisch.
- **Block-B-Status:** `human-handoff-pending` — 200 %-Browser-Zoom-Walkthrough WCAG 1.4.10.
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

### Desktop 2560 × 1440 (QHD, Chrome/Firefox)

- **Block-A-Status:** `dev-agent-verifiziert`.
- **Breakpoint-Verifikation:** ≥ 1440 px → 3 Spalten + Seitenpanel; Card-Grid skaliert auf maximaler Breite ohne Stretch (jede `min-w-0` Spur).
- **Touch-Target-Stichprobe:** identisch.
- **Reflow-Heuristik:** keine Verstöße.
- **Route-TTI (best-effort):** offen — Story 7.10.
- **Komponenten-Checkliste:** identisch.
- **Block-B-Status:** `human-handoff-pending` — 200 %-Browser-Zoom (effektiv 1280 × 720 nach Zoom).
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

### iPhone Mid-Range (390 × 844 effektiv, iOS Safari)

- **Block-A-Status:** `dev-agent-verifiziert`.
- **Breakpoint-Verifikation:** ≤ 640 px → 1 Spalte, Drawer als Full-Screen-Modal, Compact-Trigger für „Offene Punkte" sichtbar (statt Inline-Panel).
- **Touch-Target-Stichprobe:** alle 5 Stichproben passen, inkl. neuem Compact-Trigger `min-h-11`.
- **Reflow-Heuristik:** Hero-Routen rendern auf 320 px Breite ohne horizontalen Overflow; `Dialog.SlideIn` nutzt `max-w-[min(100vw,32rem)]`.
- **Route-TTI (best-effort):** offen — Story 7.10.
- **Komponenten-Checkliste:** identisch (Compact-Modus für `EigenschutzOffenePunktePanel`).
- **Block-B-Status:** `human-handoff-pending` — Pinch-Zoom auf MapGL (iOS Safari), Long-Press 500 ms Multi-Select.
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

### Android Mid-Range (412 × 915 effektiv, Chrome)

- **Block-A-Status:** `dev-agent-verifiziert`.
- **Breakpoint-Verifikation:** ≤ 640 px → 1 Spalte, identisch zu iPhone Mid-Range.
- **Touch-Target-Stichprobe:** identisch.
- **Reflow-Heuristik:** identisch zu iPhone Mid-Range.
- **Route-TTI (best-effort):** offen — Story 7.10.
- **Komponenten-Checkliste:** identisch.
- **Block-B-Status:** `human-handoff-pending` — Pinch-Zoom auf MapGL (Android Chrome), Long-Press-Multi-Select.
- **Letzte Verifikation:** 2026-05-10 (Block A automatisiert)

## Browser-Smoke (`dev:vite`)

Manueller Smoke gegen `https://localhost:3090/` mit Chrome/Firefox DevTools-Device-Toolbar (Tooling-Limit: kein Playwright, kein automatisierter Multi-Viewport-Browser im Repo). Folgende Schwellen werden je Hero-Route abgeklickt: 320 × 568 px, 768 × 1024 px, 1024 × 768 px, 1440 × 900 px, 1280 × 800 px @ 200 % Zoom. Pinch-Zoom auf Touch-Geräten gehört zur Block-B-Verifikation.

**Hinweis:** In sandboxed Dev-Umgebungen ohne System-Browser ist der Smoke nur als Tooling-Schritt dokumentiert; die Vitest-Heuristiken aus Block A sind die belastbare Regression-Sicherung.

## Block B — Human-QA-Handoff (NICHT Dev-Agent-Aufgabe)

Dieser Abschnitt listet die vom Dev-Agent **nicht** verifizierbaren Punkte mit Reproduktionsschritten. Die Story ist `done`, sobald **Block A vollständig grün** ist und **Block B als Handoff dokumentiert** ist — die echten Geräte-Tests werden vor Pilot-Release in einem separaten QA-Pass abgearbeitet (Definition of Done **Pilot**, nicht Story-DoD).

### B1 — Pinch-Zoom auf MapGL-Lagekarte

- **Tester-Profil:** QA-Engineer mit echtem iPad 11" (iOS Safari) und Android Mid-Range (Chrome).
- **Reproduktionsschritte:**
  1. Auf `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id` navigieren (oder eine Hero-Route mit MapGL-Layer).
  2. Mit zwei Fingern in die Karte einzoomen.
  3. Mit zwei Fingern auszoomen.
  4. Long-Press auf Karte (Sicherungsposten-Marker) prüfen, dass kein Doppel-Geste-Konflikt mit Pinch-Zoom auftritt.
- **Akzeptanzkriterium:** Pinch-Zoom funktioniert in 5/5 Versuchen je Gerät, Karte zoomt korrekt, kein Viewport-Lock auf App-Ebene.
- **Failure-Eskalation:** Story-7.10-Backlog (Performance/MapGL-Hardening).
- **Status:** `human-handoff-pending`.

### B2 — Long-Press 500 ms Multi-Select (UX-DR19)

- **Tester-Profil:** QA-Engineer mit iPad 11" (iOS Safari), iPhone Mid-Range (iOS Safari), Microsoft Surface 10" Touch-Modus (Edge), Android Mid-Range (Chrome).
- **Reproduktionsschritte:**
  1. Auf `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile` navigieren.
  2. Long-Press (500 ms halten) auf einer PSA-Profile-Zeile.
  3. Multi-Select-Modus muss aktivieren; weitere Tap-Aktionen ergänzen die Auswahl.
  4. Wiederholen: 5 Versuche je Gerät.
- **Akzeptanzkriterium:** Multi-Select triggert in ≥ 5/5 Versuchen konsistent, kein Konflikt mit Scroll oder Pinch-Zoom.
- **Failure-Eskalation:** Story-7.10-Backlog oder neuer Hardening-Task.
- **Status:** `human-handoff-pending`.

### B3 — 200 %-Zoom-Walkthrough (WCAG 1.4.10)

- **Tester-Profil:** QA-Engineer mit Desktop-Browser (Chrome/Firefox).
- **Reproduktionsschritte:**
  1. Browser-Fenster auf 1280 × 800 px setzen.
  2. Browser-Zoom auf 200 % erhöhen (`Ctrl/⌘ +`).
  3. Jede Hero-Route besuchen: Dashboard, Gefährdungen-Liste/-Detail, Sicherungsposten-Liste/-Detail, Vorfall-Liste/-Detail, PSA-Drawer offen.
  4. Visuelle Prüfung: kein horizontaler Scrollbar (außer Lagekarte und `RiskMatrix5x5`).
- **Akzeptanzkriterium:** keine Hero-Route erzeugt einen unerwarteten horizontalen Scrollbar bei 200 %.
- **Failure-Eskalation:** neuer Hardening-Task im Sprint-Backlog.
- **Status:** `human-handoff-pending`.

### B4 — Route-TTI auf Referenz-Geräten (best-effort)

- **Tester-Profil:** QA-Engineer mit Lighthouse Mobile/Desktop oder Chrome DevTools Performance-Panel.
- **Reproduktionsschritte:**
  1. Mit Throttling „Slow 4G" und „CPU 4× slowdown" (für Mobile-Geräte) oder „Fast 4G" (für Desktop).
  2. Lighthouse-Run je Hero-Route, Performance-Wert dokumentieren.
- **Akzeptanzkriterium:** Stichprobe als Vergleichswert, kein Gate. Vertieftes Audit bleibt **Story 7.10**.
- **Failure-Eskalation:** Befund in Story 7.10 bewerten.
- **Status:** `human-handoff-pending`.

### B5 — Senior-Operator-Tablet-Modus (UX-Spec Zeile 1160)

- **Tester-Profil:** QA-Engineer mit Microsoft Surface 10" im Touch-Modus, Test-Subjekt 50+ (Senior-Operator-Profil).
- **Reproduktionsschritte:**
  1. Hands-on mit Handschuhen auf 10"-Surface (Touch-Modus).
  2. Hero-Routen abklicken, Touch-Reibung subjektiv dokumentieren.
- **Akzeptanzkriterium:** Senior-Operator kann alle primären Aktionen mit Handschuhen ohne Mehrfach-Tap erreichen.
- **Failure-Eskalation:** Touch-Target-Spurensuche in Folge-Story.
- **Status:** `human-handoff-pending`.

## Out-of-Scope (gehört in andere Stories)

- **axe-core / Screenreader / WCAG-Compliance-Matrix:** Story 7.8.
- **Performance-Audit (Bundle-Size, Lighthouse, INP/LCP/FCP):** Story 7.10.
- **E2E-Test-Suite (Cypress/Playwright):** Story 7.11.
- **Backend, API-Generator, Migration:** außerhalb dieser Story-Domäne.
- **Refactor von Komponenten außerhalb des Audit-Scopes:** wird im Bericht als „Folge-Story-Kandidat" gelistet, nicht in dieser Story behoben.
- ~~**Direction-Implementierung / Layout-Toggle:** Direction C ist Story 6.x; diese Story verifiziert nur die Verfügbarkeit pro Breakpoint.~~ (Obsolet seit 2026-05-12: Direction C / Fokusmodus mit G1 entfernt.)

## Quellen

- `_bmad-output/planning-artifacts/epics.md` Zeilen 1712–1731, 1916–1947.
- `_bmad-output/planning-artifacts/ux-design-specification.md` Zeilen 590–592, 619–631, 1083–1089, 1098–1111, 1117–1132, 1141–1175.
- `packages/frontend/src/features/eigenschutz/CONSISTENCY.md` (Abschnitt „Responsive & Zoom" + Marker-Konventionen).
- `packages/frontend/index.html` (Viewport-Meta-Fix in Story 7.7).
- `packages/frontend/src/features/eigenschutz/hooks/use-lg-viewport.ts` (zentraler Viewport-Hook).
- `packages/frontend/src/__tests__/viewport-meta.spec.ts` (Viewport-Meta-Lock).
- `packages/frontend/src/features/eigenschutz/__tests__/touch-target-audit.spec.tsx` (Touch-Target-Heuristik).
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.responsive.spec.tsx` (Breakpoint-Layout).
- `packages/frontend/src/features/eigenschutz/__tests__/reflow-audit.spec.tsx` (Reflow-Heuristik 320 px).
